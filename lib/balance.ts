import { Strand, STRAND_META } from '../constants/strands';

export interface SessionLike {
  strand: string;
  durationMinutes: number;
}

export interface SnoozeLike {
  strand: string;
  snoozedUntil: string; // ISO datetime string
  snoozeCountThisWeek: number;
}

export type PressureMessage =
  | null
  | string
  | { question: string; reasons: string[] };

export interface BalanceResult {
  minutesPerStrand: Record<string, number>;
  percentagePerStrand: Record<string, number>;
  balanceScore: number;
  weakestStrand: Strand;
  suggestion: string;
  avoidanceLevel: 0 | 1 | 2 | 3;
  pressureMessage: PressureMessage;
  allSnoozed: boolean;
}

export function calculateBalance(
  sessions: SessionLike[],
  snoozes: SnoozeLike[] = []
): BalanceResult {
  const minutesPerStrand: Record<string, number> = {
    [Strand.INPUT]: 0,
    [Strand.OUTPUT]: 0,
    [Strand.FORM]: 0,
    [Strand.FLUENCY]: 0,
  };

  for (const session of sessions) {
    if (session.strand in minutesPerStrand) {
      minutesPerStrand[session.strand] += session.durationMinutes;
    }
  }

  const totalMinutes = Object.values(minutesPerStrand).reduce((a, b) => a + b, 0);

  const percentagePerStrand: Record<string, number> = {};
  for (const strand of Object.keys(minutesPerStrand)) {
    percentagePerStrand[strand] =
      totalMinutes === 0 ? 0 : (minutesPerStrand[strand] / totalMinutes) * 100;
  }

  // Balance score: 100 when all strands exactly 25%. Map totalDeviation 0->100, 150->0.
  let totalDeviation = 0;
  for (const strand of Object.keys(minutesPerStrand)) {
    totalDeviation += Math.abs(percentagePerStrand[strand] - 25);
  }
  const balanceScore = Math.max(0, Math.min(100, 100 - (totalDeviation / 150) * 100));

  // Determine which strands are currently snoozed (snoozedUntil in the future)
  const now = new Date();
  const activeSnoozesByStrand: Record<string, SnoozeLike | undefined> = {};
  for (const snooze of snoozes) {
    const until = new Date(snooze.snoozedUntil);
    if (until > now) {
      const existing = activeSnoozesByStrand[snooze.strand];
      if (!existing || snooze.snoozeCountThisWeek > existing.snoozeCountThisWeek) {
        activeSnoozesByStrand[snooze.strand] = snooze;
      }
    }
  }

  const snoozedStrands = new Set(Object.keys(activeSnoozesByStrand));
  const allSnoozed = Object.values(Strand).every((s) => snoozedStrands.has(s));

  // Find weakest strand, skipping snoozed ones (unless all are snoozed)
  let weakestStrand = Strand.INPUT;
  let maxDeficit = -Infinity;
  for (const strand of Object.values(Strand)) {
    if (!allSnoozed && snoozedStrands.has(strand)) continue;
    const deficit = 25 - percentagePerStrand[strand];
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      weakestStrand = strand;
    }
  }

  // Avoidance level: max snoozeCountThisWeek for the weakest strand
  const weeklySnoozeCount = snoozes
    .filter((s) => s.strand === weakestStrand)
    .reduce((max, s) => Math.max(max, s.snoozeCountThisWeek), 0);

  let avoidanceLevel: 0 | 1 | 2 | 3;
  if (weeklySnoozeCount === 0) avoidanceLevel = 0;
  else if (weeklySnoozeCount === 1) avoidanceLevel = 1;
  else if (weeklySnoozeCount === 2) avoidanceLevel = 2;
  else avoidanceLevel = 3;

  const strandLabel = STRAND_META[weakestStrand].label;

  let pressureMessage: PressureMessage = null;
  if (avoidanceLevel === 1) {
    pressureMessage = `You've skipped ${strandLabel} once this week — it's where you'll improve most right now.`;
  } else if (avoidanceLevel === 2) {
    pressureMessage = `You've skipped ${strandLabel} twice this week. Avoiding your weak spot is exactly what keeps it weak — even ten minutes counts.`;
  } else if (avoidanceLevel === 3) {
    pressureMessage = {
      question: `You've skipped ${strandLabel} three times this week. What's getting in the way?`,
      reasons: [
        "I don't know where to start",
        "I don't have anyone to practise with",
        "I've been too busy",
      ],
    };
  }

  const suggestion = allSnoozed
    ? `All strands snoozed — ${STRAND_META[weakestStrand].description} (genuinely weakest)`
    : STRAND_META[weakestStrand].description;

  return {
    minutesPerStrand,
    percentagePerStrand,
    balanceScore,
    weakestStrand,
    suggestion,
    avoidanceLevel,
    pressureMessage,
    allSnoozed,
  };
}
