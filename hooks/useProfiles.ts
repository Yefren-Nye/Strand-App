import { useState, useEffect, useCallback } from 'react';

export interface Profile {
  id: string;
  userId: string;
  targetLanguage: string;
  nativeLanguage: string;
  level: string;
  isActive: number; // SQLite stores booleans as 0/1
  createdAt: string;
}

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';
const DEFAULT_USER_ID = 'seed-user-ay';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/profiles?userId=${DEFAULT_USER_ID}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setProfiles(await res.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const activeProfile = profiles.find((p) => p.isActive === 1) ?? profiles[0] ?? null;

  const activate = useCallback(async (profileId: string): Promise<void> => {
    try {
      const res = await fetch(`${SERVER_URL}/profiles/${profileId}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEFAULT_USER_ID }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      await fetch_();
    } catch {
      // refresh anyway
      await fetch_();
    }
  }, [fetch_]);

  const create = useCallback(async (targetLanguage: string, nativeLanguage: string, level: string): Promise<Profile | null> => {
    try {
      const res = await fetch(`${SERVER_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEFAULT_USER_ID, targetLanguage, nativeLanguage, level }),
      });
      if (!res.ok) return null;
      const profile: Profile = await res.json();
      await fetch_();
      return profile;
    } catch {
      return null;
    }
  }, [fetch_]);

  return { profiles, activeProfile, loading, error, refresh: fetch_, activate, create };
}
