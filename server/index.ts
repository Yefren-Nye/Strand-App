import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../lib/db';
import { calculateBalance } from '../lib/balance';
import { Strand, STRAND_META } from '../constants/strands';

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function weekStartString(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getActiveProfile(userId: string): any | null {
  const db = getDb();
  return db.prepare("SELECT * FROM Profile WHERE userId = ? AND isActive = 1 LIMIT 1").get(userId) ?? null;
}

function buildDirective(strand: Strand, profile: any, recentSessions: any[]): {
  strand: Strand;
  activityType: string;
  instruction: string;
  contentReference: string | null;
  isInAppExercise: boolean;
  exercise?: {
    type: 'sentence-production' | 'comprehension';
    targetWord: string;
    definition: string;
    promptSentence: string;
  };
} {
  const db = getDb();
  const targetLang = profile?.targetLanguage || 'your target language';

  const lastForStrand = recentSessions.find((s) => s.strand === strand);
  const crossRef = recentSessions.find((s) => s.strand !== strand && (s.source || s.notes));
  const crossSource = crossRef?.source || crossRef?.notes || null;

  let daysSince: number | null = null;
  if (lastForStrand) {
    const then = new Date(lastForStrand.createdAt);
    daysSince = Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (strand === Strand.FORM) {
    const profileId = profile?.id ?? '';
    const userId = profile?.userId ?? '';
    const dueWord = db.prepare(`
      SELECT uw.*, cw.word, cw.reading, cw.definition
      FROM UserWord uw
      JOIN CorpusWord cw ON cw.id = uw.corpusWordId
      WHERE (uw.profileId = ? OR uw.userId = ?)
        AND uw.nextReview <= datetime('now')
      ORDER BY uw.nextReview ASC LIMIT 1
    `).get(profileId, userId) as any;

    const dueCount = (db.prepare(`
      SELECT COUNT(*) as c FROM UserWord uw
      WHERE (uw.profileId = ? OR uw.userId = ?) AND uw.nextReview <= datetime('now')
    `).get(profileId, userId) as any)?.c ?? 0;

    if (dueWord && dueCount > 0) {
      return {
        strand,
        activityType: 'vocab-review',
        instruction: `You have ${dueCount} word${dueCount > 1 ? 's' : ''} due for review. Start with "${dueWord.word}"${dueWord.reading ? ` (${dueWord.reading})` : ''} — ${dueWord.definition}.`,
        contentReference: dueWord.word,
        isInAppExercise: true,
        exercise: {
          type: 'sentence-production',
          targetWord: dueWord.word,
          definition: dueWord.definition,
          promptSentence: `Use "${dueWord.word}" in a sentence that shows you understand its meaning.`,
        },
      };
    }

    const cross = crossSource ? ` You recently used "${crossSource}" — look up a grammar point from it.` : '';
    return {
      strand,
      activityType: 'grammar',
      instruction: daysSince === null
        ? `You haven't done any Form practice recently. Pick one grammar point you find difficult and work through it for 10 minutes.${cross}`
        : `Spend 10 minutes on a grammar or vocabulary point. Focus on one thing you weren't confident about recently.`,
      contentReference: lastForStrand?.source ?? null,
      isInAppExercise: false,
    };
  }

  if (strand === Strand.INPUT) {
    if (daysSince === null || daysSince >= 2) {
      return {
        strand,
        activityType: 'reading',
        instruction: `You haven't done any Input in ${daysSince === null ? 'a while' : `${daysSince} day${daysSince !== 1 ? 's' : ''}`} — spend 15 minutes reading or listening to ${targetLang} without pausing.`,
        contentReference: null,
        isInAppExercise: false,
      };
    }
    if (lastForStrand?.source) {
      return {
        strand,
        activityType: lastForStrand.activityType || 'reading',
        instruction: `You ${lastForStrand.activityType === 'listening' ? 'listened to' : 'read'} "${lastForStrand.source}" recently — go back to it and push for deeper comprehension without stopping.`,
        contentReference: lastForStrand.source,
        isInAppExercise: false,
      };
    }
    return {
      strand,
      activityType: 'reading',
      instruction: `Read or listen to something in ${targetLang} for at least 15 minutes. Focus on the flow — no stopping.`,
      contentReference: null,
      isInAppExercise: false,
    };
  }

  if (strand === Strand.OUTPUT) {
    if (daysSince === null || daysSince >= 3) {
      const ref = crossSource ? ` Base it on "${crossSource}" if you need a topic.` : '';
      return {
        strand,
        activityType: 'speaking',
        instruction: `You haven't done any Output in ${daysSince === null ? 'a while' : `${daysSince} day${daysSince !== 1 ? 's' : ''}`} — record a two-minute monologue in ${targetLang}.${ref}`,
        contentReference: crossSource,
        isInAppExercise: false,
      };
    }
    if (crossSource) {
      return {
        strand,
        activityType: 'speaking',
        instruction: `You recently worked with "${crossSource}" — record a two-minute monologue in ${targetLang} about what you took from it.`,
        contentReference: crossSource,
        isInAppExercise: false,
      };
    }
    return {
      strand,
      activityType: 'speaking',
      instruction: `Record yourself speaking in ${targetLang} for two minutes. Don't script it — just talk.`,
      contentReference: null,
      isInAppExercise: false,
    };
  }

  // FLUENCY
  if (daysSince === null || daysSince >= 2) {
    const ref = lastForStrand?.source ?? crossSource;
    const refText = ref ? ` Use "${ref}" — you've already heard or read it.` : '';
    return {
      strand,
      activityType: 'shadowing',
      instruction: `You haven't practised Fluency in ${daysSince === null ? 'a while' : `${daysSince} day${daysSince !== 1 ? 's' : ''}`} — find a short clip you've heard before and shadow it for 3 minutes.${refText}`,
      contentReference: ref ?? null,
      isInAppExercise: false,
    };
  }
  if (lastForStrand?.source) {
    return {
      strand,
      activityType: 'shadowing',
      instruction: `Shadow "${lastForStrand.source}" again — speak along at full speed, no pausing.`,
      contentReference: lastForStrand.source,
      isInAppExercise: false,
    };
  }
  return {
    strand,
    activityType: 'shadowing',
    instruction: `Find something you know well and shadow it at full speed for 3 minutes.`,
    contentReference: null,
    isInAppExercise: false,
  };
}

// ── POST /sessions ────────────────────────────────────────────────────────────

app.post('/sessions', (req, res) => {
  const { userId, strand, durationMinutes, activityType, notes, source, focusRating, loggedExternally } = req.body;

  if (!userId || !strand || !durationMinutes || !activityType) {
    res.status(400).json({ error: 'userId, strand, durationMinutes, and activityType are required' });
    return;
  }

  const db = getDb();
  const profile = getActiveProfile(userId);
  const profileId = profile?.id ?? null;
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO Session (id, userId, profileId, strand, durationMinutes, activityType, notes, source, focusRating, loggedExternally, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, profileId, strand, durationMinutes, activityType, notes ?? null, source ?? null, focusRating ?? null, loggedExternally ? 1 : 0, createdAt);

  const session = db.prepare('SELECT * FROM Session WHERE id = ?').get(id) as any;

  const todayStart = todayString() + 'T00:00:00.000Z';
  const todaySessions = db.prepare(
    'SELECT * FROM Session WHERE userId = ? AND createdAt >= ?'
  ).all(userId, todayStart) as any[];

  const balance = calculateBalance(todaySessions);

  db.prepare(`
    INSERT INTO StrandBalance (id, userId, profileId, date, inputMinutes, outputMinutes, formMinutes, fluencyMinutes, balanceScore, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, date) DO UPDATE SET
      profileId = excluded.profileId,
      inputMinutes = excluded.inputMinutes,
      outputMinutes = excluded.outputMinutes,
      formMinutes = excluded.formMinutes,
      fluencyMinutes = excluded.fluencyMinutes,
      balanceScore = excluded.balanceScore
  `).run(
    randomUUID(), userId, profileId, todayString(),
    balance.minutesPerStrand[Strand.INPUT],
    balance.minutesPerStrand[Strand.OUTPUT],
    balance.minutesPerStrand[Strand.FORM],
    balance.minutesPerStrand[Strand.FLUENCY],
    balance.balanceScore,
    createdAt
  );

  res.status(201).json(session);
});

// ── GET /sessions ─────────────────────────────────────────────────────────────

app.get('/sessions', (req, res) => {
  const days = parseInt((req.query.days as string) || '7', 10);
  const userId = (req.query.userId as string) || null;
  const since = daysAgoString(days) + 'T00:00:00.000Z';
  const db = getDb();

  let sessions: any[];
  if (userId) {
    const profile = getActiveProfile(userId);
    if (profile) {
      sessions = db.prepare('SELECT * FROM Session WHERE profileId = ? AND createdAt >= ? ORDER BY createdAt DESC').all(profile.id, since);
    } else {
      sessions = db.prepare('SELECT * FROM Session WHERE userId = ? AND createdAt >= ? ORDER BY createdAt DESC').all(userId, since);
    }
  } else {
    sessions = db.prepare('SELECT * FROM Session WHERE createdAt >= ? ORDER BY createdAt DESC').all(since);
  }

  res.json(sessions);
});

// ── GET /balance ──────────────────────────────────────────────────────────────

app.get('/balance', (req, res) => {
  const userId = (req.query.userId as string) || 'seed-user-ay';
  const db = getDb();
  const since = daysAgoString(7) + 'T00:00:00.000Z';

  const profile = getActiveProfile(userId);
  const profileId = profile?.id ?? null;

  let sessions: any[];
  let snoozes: any[] = [];

  if (profileId) {
    sessions = db.prepare('SELECT * FROM Session WHERE profileId = ? AND createdAt >= ? ORDER BY createdAt ASC').all(profileId, since);
    snoozes = db.prepare('SELECT * FROM StrandSnooze WHERE profileId = ? AND weekStartDate >= ?').all(profileId, weekStartString());
  } else {
    sessions = db.prepare('SELECT * FROM Session WHERE userId = ? AND createdAt >= ? ORDER BY createdAt ASC').all(userId, since);
  }

  const balance = calculateBalance(sessions, snoozes);

  const daily: Record<string, { date: string; inputMinutes: number; outputMinutes: number; formMinutes: number; fluencyMinutes: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    daily[key] = { date: key, inputMinutes: 0, outputMinutes: 0, formMinutes: 0, fluencyMinutes: 0 };
  }
  for (const s of sessions) {
    const dateKey = (s.createdAt as string).split('T')[0];
    if (dateKey in daily) {
      const day = daily[dateKey];
      if (s.strand === Strand.INPUT) day.inputMinutes += s.durationMinutes;
      else if (s.strand === Strand.OUTPUT) day.outputMinutes += s.durationMinutes;
      else if (s.strand === Strand.FORM) day.formMinutes += s.durationMinutes;
      else if (s.strand === Strand.FLUENCY) day.fluencyMinutes += s.durationMinutes;
    }
  }

  const todayStart = todayString() + 'T00:00:00.000Z';
  const todaySessions = profileId
    ? db.prepare('SELECT * FROM Session WHERE profileId = ? AND createdAt >= ? ORDER BY createdAt DESC').all(profileId, todayStart)
    : db.prepare('SELECT * FROM Session WHERE userId = ? AND createdAt >= ? ORDER BY createdAt DESC').all(userId, todayStart);

  res.json({ ...balance, daily: Object.values(daily), todaySessions, profileId, profile });
});

// ── GET /practice ─────────────────────────────────────────────────────────────

app.get('/practice', async (req, res) => {
  const userId = (req.query.userId as string) || 'seed-user-ay';
  const db = getDb();
  const since14 = daysAgoString(14) + 'T00:00:00.000Z';

  const profile = getActiveProfile(userId);
  const profileId = profile?.id ?? null;

  let sessions: any[];
  let snoozes: any[] = [];

  if (profileId) {
    sessions = db.prepare('SELECT * FROM Session WHERE profileId = ? AND createdAt >= ? ORDER BY createdAt DESC').all(profileId, since14);
    snoozes = db.prepare('SELECT * FROM StrandSnooze WHERE profileId = ? AND weekStartDate >= ?').all(profileId, weekStartString());
  } else {
    sessions = db.prepare('SELECT * FROM Session WHERE userId = ? AND createdAt >= ? ORDER BY createdAt DESC').all(userId, since14);
  }

  const balance = calculateBalance(sessions, snoozes);
  const weakest = balance.weakestStrand;

  const allDirectives = Object.values(Strand).map((s) => buildDirective(s as Strand, profile, sessions));
  const primaryDirective = allDirectives.find((d) => d.strand === weakest)!;

  let suggestedResource: { title: string; url: string; reason: string } | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const recentTopics = sessions
        .slice(0, 5)
        .map((s) => s.source || s.notes || s.activityType)
        .filter(Boolean)
        .join(', ');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
        messages: [{
          role: 'user',
          content: `I am studying ${profile?.targetLanguage || 'a language'} at ${profile?.level || 'intermediate'} level. Recent study materials: ${recentTopics || 'none yet'}. I need to practise ${STRAND_META[weakest].label}: ${STRAND_META[weakest].description}. Find one specific real online resource. Return ONLY: {"title": "...", "url": "https://...", "reason": "one sentence"}`,
        }],
      });

      const textBlock = response.content.find((b: any) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*?"title"[\s\S]*?"url"[\s\S]*?"reason"[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title && parsed.url && parsed.reason) {
            suggestedResource = { title: parsed.title, url: parsed.url, reason: parsed.reason };
          }
        }
      }
    } catch {
      suggestedResource = null;
    }
  }

  res.json({
    ...primaryDirective,
    suggestedResource,
    avoidanceLevel: balance.avoidanceLevel,
    pressureMessage: balance.pressureMessage,
    allSnoozed: balance.allSnoozed,
    allDirectives,
  });
});

// ── POST /practice/snooze ─────────────────────────────────────────────────────

app.post('/practice/snooze', async (req, res) => {
  const { userId = 'seed-user-ay', strand, reason } = req.body;
  if (!strand) { res.status(400).json({ error: 'strand is required' }); return; }

  const db = getDb();
  const profile = getActiveProfile(userId);
  const profileId = profile?.id;
  if (!profileId) { res.status(404).json({ error: 'No active profile found' }); return; }

  const now = new Date();
  const snoozedUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const weekStart = weekStartString();

  const existing = db.prepare(
    "SELECT * FROM StrandSnooze WHERE profileId = ? AND strand = ? AND weekStartDate = ? ORDER BY snoozeCountThisWeek DESC LIMIT 1"
  ).get(profileId, strand, weekStart) as any;

  const newCount = (existing?.snoozeCountThisWeek ?? 0) + 1;

  db.prepare(`INSERT INTO StrandSnooze (id, profileId, strand, snoozedUntil, snoozeCountThisWeek, weekStartDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), profileId, strand, snoozedUntil, newCount, weekStart, now.toISOString());

  db.prepare(`INSERT INTO AvoidanceEvent (id, profileId, strand, reason, createdAt) VALUES (?, ?, ?, ?, ?)`)
    .run(randomUUID(), profileId, strand, reason ?? null, now.toISOString());

  const since14 = daysAgoString(14) + 'T00:00:00.000Z';
  const sessions = db.prepare('SELECT * FROM Session WHERE profileId = ? AND createdAt >= ? ORDER BY createdAt DESC').all(profileId, since14) as any[];
  const snoozes = db.prepare('SELECT * FROM StrandSnooze WHERE profileId = ? AND weekStartDate >= ?').all(profileId, weekStart) as any[];
  const balance = calculateBalance(sessions, snoozes);
  const allDirectives = Object.values(Strand).map((s) => buildDirective(s as Strand, profile, sessions));
  const primaryDirective = allDirectives.find((d) => d.strand === balance.weakestStrand)!;

  res.json({ ...primaryDirective, suggestedResource: null, avoidanceLevel: balance.avoidanceLevel, pressureMessage: balance.pressureMessage, allSnoozed: balance.allSnoozed, allDirectives });
});

// ── POST /practice/complete ───────────────────────────────────────────────────

app.post('/practice/complete', (req, res) => {
  const { userId = 'seed-user-ay', strand, durationMinutes, focusRating, exerciseResult } = req.body;
  if (!strand || !durationMinutes) { res.status(400).json({ error: 'strand and durationMinutes are required' }); return; }

  const db = getDb();
  const profile = getActiveProfile(userId);
  const profileId = profile?.id ?? null;
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`INSERT INTO Session (id, userId, profileId, strand, durationMinutes, activityType, focusRating, loggedExternally, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`)
    .run(id, userId, profileId, strand, durationMinutes, 'practice', focusRating ?? null, createdAt);

  if (exerciseResult?.wordId) {
    const word = db.prepare('SELECT * FROM UserWord WHERE id = ?').get(exerciseResult.wordId) as any;
    if (word) {
      const ef = exerciseResult.correct ? Math.min(4.0, word.easeFactor + 0.1) : Math.max(1.3, word.easeFactor - 0.2);
      const iv = exerciseResult.correct ? Math.max(1, Math.round(word.interval * ef)) : 1;
      const nr = new Date(Date.now() + iv * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`UPDATE UserWord SET easeFactor = ?, interval = ?, nextReview = ?, status = 'LEARNING', encounters = encounters + 1, lastEncountered = ? WHERE id = ?`)
        .run(ef, iv, nr, createdAt, exerciseResult.wordId);
    }
  }

  const since = daysAgoString(7) + 'T00:00:00.000Z';
  const sessions = profileId
    ? db.prepare('SELECT * FROM Session WHERE profileId = ? AND createdAt >= ?').all(profileId, since) as any[]
    : db.prepare('SELECT * FROM Session WHERE userId = ? AND createdAt >= ?').all(userId, since) as any[];
  const balance = calculateBalance(sessions);

  res.json({ balance, sessionId: id });
});

// ── POST /practice/evaluate ───────────────────────────────────────────────────

app.post('/practice/evaluate', async (req, res) => {
  const { targetWord, definition, promptSentence, userResponse } = req.body;
  if (!targetWord || !userResponse) { res.status(400).json({ error: 'targetWord and userResponse are required' }); return; }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.json({ feedback: 'Good effort — keep practising with this word in different contexts.' });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 120,
      system: 'You evaluate a language learner\'s sentence. Give exactly one sentence of feedback. No score, no grade. Focus on one specific observation about their language use.',
      messages: [{ role: 'user', content: `Word: "${targetWord}" — ${definition}\nPrompt: "${promptSentence}"\nLearner wrote: "${userResponse}"\nOne sentence of feedback:` }],
    });
    const t = response.content.find((b: any) => b.type === 'text');
    res.json({ feedback: t?.type === 'text' ? t.text : 'Keep practising.' });
  } catch {
    res.json({ feedback: 'Good attempt — try using the word in a few more sentences.' });
  }
});

// ── POST /practice/avoidance-help ─────────────────────────────────────────────

app.post('/practice/avoidance-help', async (req, res) => {
  const { reason, strand, targetLanguage, level } = req.body;
  if (!reason || !strand) { res.status(400).json({ error: 'reason and strand are required' }); return; }

  const strandLabel = STRAND_META[strand as Strand]?.label || strand;

  if (!process.env.ANTHROPIC_API_KEY) {
    res.json({ content: 'Try starting with just five minutes — open something in your target language and see where it takes you.' });
    return;
  }

  const prompts: Record<string, string> = {
    "I don't know where to start": `A learner studying ${targetLanguage || 'a language'} at ${level || 'intermediate'} level needs to practise ${strandLabel} but doesn't know where to start. Give exactly 3 numbered concrete first steps. Each is one specific sentence. No preamble.`,
    "I don't have anyone to practise with": `A learner studying ${targetLanguage || 'a language'} wants to practise ${strandLabel} but has no one to practise with. Suggest exactly 3 specific platforms or communities. Use bullet points (•). Each is one sentence naming the platform and how to use it. No preamble.`,
    "I've been too busy": `A learner studying ${targetLanguage || 'a language'} needs to practise ${strandLabel} but is too busy. Describe exactly one two-minute version of this activity that fits in a short break. Be specific. One short paragraph, max 3 sentences.`,
  };

  const prompt = prompts[reason] || `Help a ${targetLanguage || 'language'} learner who wants to practise ${strandLabel} but says: "${reason}". Give one concrete specific suggestion in two sentences.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const t = response.content.find((b: any) => b.type === 'text');
    res.json({ content: t?.type === 'text' ? t.text : 'Start small — even two minutes counts.' });
  } catch {
    res.json({ content: 'Start with just two minutes. Open your learning app and do one small thing.' });
  }
});

// ── GET /profiles ─────────────────────────────────────────────────────────────

app.get('/profiles', (req, res) => {
  const userId = (req.query.userId as string) || 'seed-user-ay';
  const db = getDb();
  res.json(db.prepare('SELECT * FROM Profile WHERE userId = ? ORDER BY createdAt ASC').all(userId));
});

// ── POST /profiles ────────────────────────────────────────────────────────────

app.post('/profiles', (req, res) => {
  const { userId = 'seed-user-ay', targetLanguage, nativeLanguage, level } = req.body;
  if (!targetLanguage || !nativeLanguage || !level) {
    res.status(400).json({ error: 'targetLanguage, nativeLanguage, and level are required' });
    return;
  }

  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(`INSERT INTO Profile (id, userId, targetLanguage, nativeLanguage, level, isActive, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)`)
    .run(id, userId, targetLanguage, nativeLanguage, level, createdAt);

  res.status(201).json(db.prepare('SELECT * FROM Profile WHERE id = ?').get(id));
});

// ── PATCH /profiles/:id/activate ─────────────────────────────────────────────

app.patch('/profiles/:id/activate', (req, res) => {
  const { id } = req.params;
  const userId = (req.body.userId as string) || 'seed-user-ay';
  const db = getDb();

  db.prepare('UPDATE Profile SET isActive = 0 WHERE userId = ?').run(userId);
  db.prepare('UPDATE Profile SET isActive = 1 WHERE id = ? AND userId = ?').run(id, userId);

  const profile = db.prepare('SELECT * FROM Profile WHERE id = ?').get(id);
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
  res.json(profile);
});

// ── GET /words/due ────────────────────────────────────────────────────────────

app.get('/words/due', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`
    SELECT uw.*, cw.word, cw.reading, cw.definition, cw.language, cw.frequencyRank, cw.level as corpusLevel
    FROM UserWord uw JOIN CorpusWord cw ON cw.id = uw.corpusWordId
    WHERE uw.nextReview <= datetime('now')
    ORDER BY uw.nextReview ASC LIMIT 20
  `).all());
});

// ── PATCH /words/:id ──────────────────────────────────────────────────────────

app.patch('/words/:id', (req, res) => {
  const { id } = req.params;
  const { easeFactor, interval, nextReview, status, encounters, lastEncountered } = req.body;
  const db = getDb();
  const updates: string[] = [];
  const values: any[] = [];

  if (easeFactor !== undefined) { updates.push('easeFactor = ?'); values.push(easeFactor); }
  if (interval !== undefined) { updates.push('interval = ?'); values.push(interval); }
  if (nextReview !== undefined) { updates.push('nextReview = ?'); values.push(nextReview); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (encounters !== undefined) { updates.push('encounters = ?'); values.push(encounters); }
  if (lastEncountered !== undefined) { updates.push('lastEncountered = ?'); values.push(lastEncountered); }

  if (updates.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

  values.push(id);
  db.prepare(`UPDATE UserWord SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM UserWord WHERE id = ?').get(id));
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Strand server running on port ${PORT}`);
});
