import { useState, useEffect, useCallback } from 'react';
import { Strand } from '../constants/strands';

export interface Exercise {
  type: 'sentence-production' | 'comprehension';
  targetWord: string;
  definition: string;
  promptSentence: string;
}

export interface DirectiveItem {
  strand: Strand;
  activityType: string;
  instruction: string;
  contentReference: string | null;
  isInAppExercise: boolean;
  exercise?: Exercise;
}

export interface PracticeData extends DirectiveItem {
  suggestedResource: { title: string; url: string; reason: string } | null;
  avoidanceLevel: 0 | 1 | 2 | 3;
  pressureMessage: null | string | { question: string; reasons: string[] };
  allSnoozed: boolean;
  allDirectives: DirectiveItem[];
}

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';
const DEFAULT_USER_ID = 'seed-user-ay';

export function usePractice() {
  const [data, setData] = useState<PracticeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/practice?userId=${DEFAULT_USER_ID}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load practice data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const snooze = useCallback(async (strand: Strand, reason?: string): Promise<PracticeData | null> => {
    try {
      const res = await fetch(`${SERVER_URL}/practice/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEFAULT_USER_ID, strand, reason }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const updated: PracticeData = await res.json();
      setData(updated);
      return updated;
    } catch {
      return null;
    }
  }, []);

  const complete = useCallback(async (
    strand: Strand,
    durationMinutes: number,
    focusRating?: number,
    exerciseResult?: { wordId?: string; correct?: boolean }
  ) => {
    try {
      const res = await fetch(`${SERVER_URL}/practice/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEFAULT_USER_ID, strand, durationMinutes, focusRating, exerciseResult }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      await fetch_();
    } catch {
      // Fail silently, refresh anyway
      await fetch_();
    }
  }, [fetch_]);

  const evaluate = useCallback(async (
    targetWord: string,
    definition: string,
    promptSentence: string,
    userResponse: string
  ): Promise<string> => {
    try {
      const res = await fetch(`${SERVER_URL}/practice/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWord, definition, promptSentence, userResponse }),
      });
      if (!res.ok) return 'Good attempt — keep practising.';
      const json = await res.json();
      return json.feedback || 'Keep practising.';
    } catch {
      return 'Good attempt — keep practising.';
    }
  }, []);

  const getAvoidanceHelp = useCallback(async (
    reason: string,
    strand: Strand,
    targetLanguage?: string,
    level?: string
  ): Promise<string> => {
    try {
      const res = await fetch(`${SERVER_URL}/practice/avoidance-help`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, strand, targetLanguage, level }),
      });
      if (!res.ok) return 'Start small — even two minutes counts.';
      const json = await res.json();
      return json.content || 'Start small — even two minutes counts.';
    } catch {
      return 'Start small — even two minutes counts.';
    }
  }, []);

  return { data, loading, error, refresh: fetch_, snooze, complete, evaluate, getAvoidanceHelp };
}
