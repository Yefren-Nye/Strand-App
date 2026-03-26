import { useState, useEffect, useCallback } from 'react';
import { Strand } from '../constants/strands';

export interface DailyBar {
  date: string;
  inputMinutes: number;
  outputMinutes: number;
  formMinutes: number;
  fluencyMinutes: number;
}

export interface SessionFeedItem {
  id: string;
  strand: Strand;
  durationMinutes: number;
  activityType: string;
  source: string | null;
  createdAt: string;
}

export interface BalanceData {
  minutesPerStrand: Record<string, number>;
  percentagePerStrand: Record<string, number>;
  balanceScore: number;
  weakestStrand: Strand;
  suggestion: string;
  avoidanceLevel: 0 | 1 | 2 | 3;
  pressureMessage: null | string | { question: string; reasons: string[] };
  allSnoozed: boolean;
  daily: DailyBar[];
  todaySessions: SessionFeedItem[];
  profileId: string | null;
  profile: any | null;
}

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';

export function useBalance() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/balance?userId=seed-user-ay`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { data, loading, error, refresh: fetch_ };
}
