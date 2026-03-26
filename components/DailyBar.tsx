import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Strand, STRAND_META, STRAND_ORDER } from '../constants/strands';

const SCREEN_W = Dimensions.get('window').width;
const BAR_MAX_H = 96;
const BAR_AREA_W = SCREEN_W - 48; // 24px padding each side

interface DailyData {
  date: string;
  inputMinutes: number;
  outputMinutes: number;
  formMinutes: number;
  fluencyMinutes: number;
}

interface Props {
  daily: DailyData[];
}

function minutesForStrand(day: DailyData, strand: Strand): number {
  if (strand === Strand.INPUT) return day.inputMinutes;
  if (strand === Strand.OUTPUT) return day.outputMinutes;
  if (strand === Strand.FORM) return day.formMinutes;
  return day.fluencyMinutes;
}

function totalMinutes(day: DailyData): number {
  return day.inputMinutes + day.outputMinutes + day.formMinutes + day.fluencyMinutes;
}

export function DailyBar({ daily }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const hasData = daily.some((d) => totalMinutes(d) > 0);
  if (!hasData) return null;

  const maxTotal = Math.max(...daily.map(totalMinutes), 1);
  const barW = Math.floor(BAR_AREA_W / daily.length) - 6;

  const selectedDay = selectedIdx !== null ? daily[selectedIdx] : null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>This week</Text>

      <View style={styles.barsRow}>
        {daily.map((day, idx) => {
          const total = totalMinutes(day);
          const isSelected = selectedIdx === idx;

          return (
            <TouchableOpacity
              key={day.date}
              style={[styles.barCol, { width: barW }]}
              onPress={() => setSelectedIdx(isSelected ? null : idx)}
              activeOpacity={0.75}
            >
              {/* Bar */}
              <View style={[styles.barTrack, { height: BAR_MAX_H }]}>
                {total === 0 ? (
                  <View style={styles.emptyBar} />
                ) : (
                  // Stack from bottom: FLUENCY on top visually = first in JSX with flex-end
                  <View style={[styles.barStack, { height: Math.max(4, (total / maxTotal) * BAR_MAX_H) }]}>
                    {[Strand.FLUENCY, Strand.FORM, Strand.OUTPUT, Strand.INPUT].map((s) => {
                      const mins = minutesForStrand(day, s);
                      if (mins === 0) return null;
                      const segH = (mins / maxTotal) * BAR_MAX_H;
                      return (
                        <View
                          key={s}
                          style={{
                            width: '100%',
                            height: segH,
                            backgroundColor: STRAND_META[s].color,
                          }}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
              {/* Date label */}
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                {day.date.slice(5).replace('-', '/')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tooltip Modal */}
      {selectedDay !== null && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.tooltipOverlay}
            onPress={() => setSelectedIdx(null)}
            activeOpacity={1}
          >
            <View style={styles.tooltipCard}>
              <Text style={styles.tooltipDate}>{selectedDay.date}</Text>
              {STRAND_ORDER.map((s) => {
                const mins = minutesForStrand(selectedDay, s);
                return (
                  <View key={s} style={styles.tooltipRow}>
                    <View style={[styles.tooltipDot, { backgroundColor: STRAND_META[s].color }]} />
                    <Text style={styles.tooltipLabel}>{STRAND_META[s].label}</Text>
                    <Text style={styles.tooltipMins}>{mins} min</Text>
                  </View>
                );
              })}
              <Text style={styles.tooltipTotal}>
                Total: {totalMinutes(selectedDay)} min
              </Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#888',
    marginBottom: 12, paddingHorizontal: 24,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    gap: 6,
  },
  barCol: { alignItems: 'center' },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  barStack: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 3,
    justifyContent: 'flex-end',
  },
  emptyBar: {
    width: '100%',
    height: 3,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
  },
  dayLabel: { fontSize: 10, color: '#bbb', textAlign: 'center' },
  dayLabelSelected: { color: '#111', fontWeight: '600' },

  // Tooltip
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipDate: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 12 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tooltipDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  tooltipLabel: { flex: 1, fontSize: 13, color: '#444' },
  tooltipMins: { fontSize: 13, fontWeight: '600', color: '#111' },
  tooltipTotal: { marginTop: 8, fontSize: 13, color: '#888', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee', paddingTop: 8 },
});
