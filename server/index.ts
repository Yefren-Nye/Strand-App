import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from './lib/db';
import { calculateBalance } from './lib/balance';
import { Strand, STRAND_META } from './constants/strands';

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

function weekStartDate(): Date {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Prisma returns DateTime as Date objects; SnoozeLike.snoozedUntil expects a string.
function normaliseSnoozeLike(s: any) {
  return {
    ...s,
    snoozedUntil: s.snoozedUntil instanceof Date ? s.snoozedUntil.toISOString() : s.snoozedUntil,
  };
}

async function getActiveProfile(userId: string): Promise<any | null> {
  const db = getDb();
  return db.profile.findFirst({ where: { userId, isActive: true } });
}

async function buildDirective(strand: Strand, profile: any, recentSessions: any[]): Promise<{
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
}> {
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
    const db = getDb();
    const profileId = profile?.id ?? null;
    const userId = profile?.userId ?? '';

    const orConditions: any[] = [{ userId }];
    if (profileId) orConditions.unshift({ profileId });

    const dueFilter = {
      AND: [
        { nextReview: { lte: new Date() } },
        { OR: orConditions },
      ],
    };

    const dueWord = await db.userWord.findFirst({
      where: dueFilter,
      orderBy: { nextReview: 'asc' },
      include: { corpusWord: true },
    });

    const dueCount = await db.userWord.count({ where: dueFilter });

    if (dueWord && dueCount > 0) {
      return {
        strand,
        activityType: 'vocab-review',
        instruction: `You have ${dueCount} word${dueCount > 1 ? 's' : ''} due for review. Start with "${dueWord.corpusWord.word}"${dueWord.corpusWord.reading ? ` (${dueWord.corpusWord.reading})` : ''} — ${dueWord.corpusWord.definition}.`,
        contentReference: dueWord.corpusWord.word,
        isInAppExercise: true,
        exercise: {
          type: 'sentence-production',
          targetWord: dueWord.corpusWord.word,
          definition: dueWord.corpusWord.definition,
          promptSentence: `Use "${dueWord.corpusWord.word}" in a sentence that shows you understand its meaning.`,
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

// ── GET /health ───────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── POST /sessions ────────────────────────────────────────────────────────────

app.post('/sessions', async (req, res) => {
  const { userId, strand, durationMinutes, activityType, notes, source, focusRating, loggedExternally } = req.body;

  if (!userId || !strand || !durationMinutes || !activityType) {
    res.status(400).json({ error: 'userId, strand, durationMinutes, and activityType are required' });
    return;
  }

  const db = getDb();
  const profile = await getActiveProfile(userId);
  const profileId = profile?.id ?? null;
  const id = randomUUID();
  const createdAt = new Date();

  const session = await db.session.create({
    data: {
      id,
      userId,
      profileId,
      strand,
      durationMinutes,
      activityType,
      notes: notes ?? null,
      source: source ?? null,
      focusRating: focusRating ?? null,
      loggedExternally: loggedExternally ? true : false,
      createdAt,
    },
  });

  const todayStart = new Date(todayString() + 'T00:00:00.000Z');
  const todaySessions = await db.session.findMany({
    where: { userId, createdAt: { gte: todayStart } },
  });

  const balance = calculateBalance(todaySessions);

  await db.strandBalance.upsert({
    where: { userId_date: { userId, date: todayString() } },
    update: {
      profileId,
      inputMinutes: balance.minutesPerStrand[Strand.INPUT],
      outputMinutes: balance.minutesPerStrand[Strand.OUTPUT],
      formMinutes: balance.minutesPerStrand[Strand.FORM],
      fluencyMinutes: balance.minutesPerStrand[Strand.FLUENCY],
      balanceScore: balance.balanceScore,
    },
    create: {
      id: randomUUID(),
      userId,
      profileId,
      date: todayString(),
      inputMinutes: balance.minutesPerStrand[Strand.INPUT],
      outputMinutes: balance.minutesPerStrand[Strand.OUTPUT],
      formMinutes: balance.minutesPerStrand[Strand.FORM],
      fluencyMinutes: balance.minutesPerStrand[Strand.FLUENCY],
      balanceScore: balance.balanceScore,
    },
  });

  res.status(201).json(session);
});

// ── GET /sessions ─────────────────────────────────────────────────────────────

app.get('/sessions', async (req, res) => {
  const days = parseInt((req.query.days as string) || '7', 10);
  const userId = (req.query.userId as string) || null;
  const since = new Date(daysAgoString(days) + 'T00:00:00.000Z');
  const db = getDb();

  let sessions: any[];
  if (userId) {
    const profile = await getActiveProfile(userId);
    if (profile) {
      sessions = await db.session.findMany({
        where: { profileId: profile.id, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      sessions = await db.session.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
      });
    }
  } else {
    sessions = await db.session.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
  }

  res.json(sessions);
});

// ── GET /balance ──────────────────────────────────────────────────────────────

app.get('/balance', async (req, res) => {
  const userId = (req.query.userId as string) || 'seed-user-ay';
  const db = getDb();
  const since = new Date(daysAgoString(7) + 'T00:00:00.000Z');

  const profile = await getActiveProfile(userId);
  const profileId = profile?.id ?? null;

  let sessions: any[];
  let snoozes: any[] = [];

  if (profileId) {
    sessions = await db.session.findMany({
      where: { profileId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });
    snoozes = await db.strandSnooze.findMany({
      where: { profileId, weekStartDate: { gte: weekStartDate() } },
    });
  } else {
    sessions = await db.session.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });
  }

  const balance = calculateBalance(sessions, snoozes.map(normaliseSnoozeLike));

  const daily: Record<string, { date: string; inputMinutes: number; outputMinutes: number; formMinutes: number; fluencyMinutes: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    daily[key] = { date: key, inputMinutes: 0, outputMinutes: 0, formMinutes: 0, fluencyMinutes: 0 };
  }
  for (const s of sessions) {
    const dateKey = (s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt as string).split('T')[0];
    if (dateKey in daily) {
      const day = daily[dateKey];
      if (s.strand === Strand.INPUT) day.inputMinutes += s.durationMinutes;
      else if (s.strand === Strand.OUTPUT) day.outputMinutes += s.durationMinutes;
      else if (s.strand === Strand.FORM) day.formMinutes += s.durationMinutes;
      else if (s.strand === Strand.FLUENCY) day.fluencyMinutes += s.durationMinutes;
    }
  }

  const todayStart = new Date(todayString() + 'T00:00:00.000Z');
  const todaySessions = profileId
    ? await db.session.findMany({ where: { profileId, createdAt: { gte: todayStart } }, orderBy: { createdAt: 'desc' } })
    : await db.session.findMany({ where: { userId, createdAt: { gte: todayStart } }, orderBy: { createdAt: 'desc' } });

  res.json({ ...balance, daily: Object.values(daily), todaySessions, profileId, profile });
});

// ── GET /practice ─────────────────────────────────────────────────────────────

app.get('/practice', async (req, res) => {
  const userId = (req.query.userId as string) || 'seed-user-ay';
  const db = getDb();
  const since14 = new Date(daysAgoString(14) + 'T00:00:00.000Z');

  const profile = await getActiveProfile(userId);
  const profileId = profile?.id ?? null;

  let sessions: any[];
  let snoozes: any[] = [];

  if (profileId) {
    sessions = await db.session.findMany({
      where: { profileId, createdAt: { gte: since14 } },
      orderBy: { createdAt: 'desc' },
    });
    snoozes = await db.strandSnooze.findMany({
      where: { profileId, weekStartDate: { gte: weekStartDate() } },
    });
  } else {
    sessions = await db.session.findMany({
      where: { userId, createdAt: { gte: since14 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  const balance = calculateBalance(sessions, snoozes.map(normaliseSnoozeLike));
  const weakest = balance.weakestStrand;

  const allDirectives = await Promise.all(
    Object.values(Strand).map((s) => buildDirective(s as Strand, profile, sessions))
  );
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
  const profile = await getActiveProfile(userId);
  const profileId = profile?.id;
  if (!profileId) { res.status(404).json({ error: 'No active profile found' }); return; }

  const now = new Date();
  const snoozedUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const weekStart = weekStartDate();

  const existing = await db.strandSnooze.findFirst({
    where: { profileId, strand, weekStartDate: weekStart },
    orderBy: { snoozeCountThisWeek: 'desc' },
  });

  const newCount = (existing?.snoozeCountThisWeek ?? 0) + 1;

  await db.strandSnooze.create({
    data: {
      id: randomUUID(),
      profileId,
      strand,
      snoozedUntil,
      snoozeCountThisWeek: newCount,
      weekStartDate: weekStart,
    },
  });

  await db.avoidanceEvent.create({
    data: {
      id: randomUUID(),
      profileId,
      strand,
      reason: reason ?? null,
    },
  });

  const since14 = new Date(daysAgoString(14) + 'T00:00:00.000Z');
  const sessions = await db.session.findMany({
    where: { profileId, createdAt: { gte: since14 } },
    orderBy: { createdAt: 'desc' },
  });
  const snoozes = await db.strandSnooze.findMany({
    where: { profileId, weekStartDate: { gte: weekStart } },
  });
  const balance = calculateBalance(sessions, snoozes.map(normaliseSnoozeLike));
  const allDirectives = await Promise.all(
    Object.values(Strand).map((s) => buildDirective(s as Strand, profile, sessions))
  );
  const primaryDirective = allDirectives.find((d) => d.strand === balance.weakestStrand)!;

  res.json({ ...primaryDirective, suggestedResource: null, avoidanceLevel: balance.avoidanceLevel, pressureMessage: balance.pressureMessage, allSnoozed: balance.allSnoozed, allDirectives });
});

// ── POST /practice/complete ───────────────────────────────────────────────────

app.post('/practice/complete', async (req, res) => {
  const { userId = 'seed-user-ay', strand, durationMinutes, focusRating, exerciseResult } = req.body;
  if (!strand || !durationMinutes) { res.status(400).json({ error: 'strand and durationMinutes are required' }); return; }

  const db = getDb();
  const profile = await getActiveProfile(userId);
  const profileId = profile?.id ?? null;
  const id = randomUUID();
  const createdAt = new Date();

  await db.session.create({
    data: {
      id,
      userId,
      profileId,
      strand,
      durationMinutes,
      activityType: 'practice',
      focusRating: focusRating ?? null,
      loggedExternally: false,
      createdAt,
    },
  });

  if (exerciseResult?.wordId) {
    const word = await db.userWord.findUnique({ where: { id: exerciseResult.wordId } });
    if (word) {
      const ef = exerciseResult.correct ? Math.min(4.0, word.easeFactor + 0.1) : Math.max(1.3, word.easeFactor - 0.2);
      const iv = exerciseResult.correct ? Math.max(1, Math.round(word.interval * ef)) : 1;
      const nr = new Date(Date.now() + iv * 24 * 60 * 60 * 1000);
      await db.userWord.update({
        where: { id: exerciseResult.wordId },
        data: {
          easeFactor: ef,
          interval: iv,
          nextReview: nr,
          status: 'LEARNING',
          encounters: { increment: 1 },
          lastEncountered: createdAt,
        },
      });
    }
  }

  const since = new Date(daysAgoString(7) + 'T00:00:00.000Z');
  const sessions = profileId
    ? await db.session.findMany({ where: { profileId, createdAt: { gte: since } } })
    : await db.session.findMany({ where: { userId, createdAt: { gte: since } } });
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

app.get('/profiles', async (req, res) => {
  const userId = (req.query.userId as string) || 'seed-user-ay';
  const db = getDb();
  res.json(await db.profile.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }));
});

// ── POST /profiles ────────────────────────────────────────────────────────────

app.post('/profiles', async (req, res) => {
  const { userId = 'seed-user-ay', targetLanguage, nativeLanguage, level } = req.body;
  if (!targetLanguage || !nativeLanguage || !level) {
    res.status(400).json({ error: 'targetLanguage, nativeLanguage, and level are required' });
    return;
  }

  const db = getDb();
  const profile = await db.profile.create({
    data: {
      id: randomUUID(),
      userId,
      targetLanguage,
      nativeLanguage,
      level,
      isActive: false,
    },
  });
  res.status(201).json(profile);
});

// ── PATCH /profiles/:id/activate ─────────────────────────────────────────────

app.patch('/profiles/:id/activate', async (req, res) => {
  const { id } = req.params;
  const userId = (req.body.userId as string) || 'seed-user-ay';
  const db = getDb();

  await db.profile.updateMany({ where: { userId }, data: { isActive: false } });
  try {
    const profile = await db.profile.update({ where: { id }, data: { isActive: true } });
    res.json(profile);
  } catch {
    res.status(404).json({ error: 'Profile not found' });
  }
});

// ── GET /words/due ────────────────────────────────────────────────────────────

app.get('/words/due', async (req, res) => {
  const db = getDb();
  const words = await db.userWord.findMany({
    where: { nextReview: { lte: new Date() } },
    orderBy: { nextReview: 'asc' },
    take: 20,
    include: { corpusWord: true },
  });
  res.json(words.map((w) => ({
    ...w,
    word: w.corpusWord.word,
    reading: w.corpusWord.reading,
    definition: w.corpusWord.definition,
    language: w.corpusWord.language,
    frequencyRank: w.corpusWord.frequencyRank,
    corpusLevel: w.corpusWord.level,
  })));
});

// ── PATCH /words/:id ──────────────────────────────────────────────────────────

app.patch('/words/:id', async (req, res) => {
  const { id } = req.params;
  const { easeFactor, interval, nextReview, status, encounters, lastEncountered } = req.body;
  const db = getDb();

  const data: any = {};
  if (easeFactor !== undefined) data.easeFactor = easeFactor;
  if (interval !== undefined) data.interval = interval;
  if (nextReview !== undefined) data.nextReview = new Date(nextReview);
  if (status !== undefined) data.status = status;
  if (encounters !== undefined) data.encounters = encounters;
  if (lastEncountered !== undefined) data.lastEncountered = new Date(lastEncountered);

  if (Object.keys(data).length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

  const word = await db.userWord.update({ where: { id }, data });
  res.json(word);
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Strand server running on port ${PORT}`);
});
