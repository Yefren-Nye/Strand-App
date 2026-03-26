import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Strand, STRAND_META, STRAND_ORDER, STRAND_EXAMPLES } from '../constants/strands';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';
const DEFAULT_USER_ID = 'seed-user-ay';

const ACTIVITY_TYPES = [
  'Reading', 'Listening', 'Speaking', 'Writing',
  'Shadowing', 'Grammar', 'Vocabulary', 'Other',
];

const DURATIONS = [5, 10, 15, 20, 30, 45, 60];

const ACTIVITY_STRAND_HINT: Record<string, Strand> = {
  Reading: Strand.INPUT,
  Listening: Strand.INPUT,
  Speaking: Strand.OUTPUT,
  Writing: Strand.OUTPUT,
  Shadowing: Strand.FLUENCY,
  Grammar: Strand.FORM,
  Vocabulary: Strand.FORM,
  Other: Strand.INPUT,
};

// ── Focus Rating Modal ────────────────────────────────────────────────────────

function FocusRatingModal({ onRate }: { onRate: (rating: number | null) => void }) {
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalBg}>
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>How focused were you?</Text>
          <Text style={styles.ratingSubtitle}>1 = distracted, 5 = fully focused</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((r) => (
              <TouchableOpacity key={r} style={styles.ratingBtn} onPress={() => onRate(r)}>
                <Text style={styles.ratingBtnText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => onRate(null)}>
            <Text style={styles.skipRating}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Strand Info Panel ─────────────────────────────────────────────────────────

function StrandInfoPanel({ strand, targetLanguage }: { strand: Strand; targetLanguage: string }) {
  const meta = STRAND_META[strand];
  const langKey = targetLanguage in STRAND_EXAMPLES ? targetLanguage : 'default';
  const examples = STRAND_EXAMPLES[langKey][strand];

  return (
    <View style={styles.infoPanel}>
      <Text style={styles.infoParagraph}>{meta.longDescription}</Text>
      <Text style={styles.infoExamplesLabel}>Example activities:</Text>
      {examples.map((ex, i) => (
        <View key={i} style={styles.infoExampleRow}>
          <Text style={[styles.infoExampleDot, { color: meta.color }]}>•</Text>
          <Text style={styles.infoExampleText}>{ex}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main Log Screen ───────────────────────────────────────────────────────────

export default function LogSession() {
  const router = useRouter();
  const [source, setSource] = useState('');
  const [activityType, setActivityType] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [strand, setStrand] = useState<Strand | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Timer state
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus rating state
  const [showRating, setShowRating] = useState(false);

  // Info panel state
  const [expandedInfo, setExpandedInfo] = useState<Strand | null>(null);

  const suggestedStrand = activityType ? ACTIVITY_STRAND_HINT[activityType] : null;

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  function handleTimerToggle() {
    if (timerEnabled) {
      setTimerEnabled(false);
      setTimerRunning(false);
      setTimerSeconds(0);
      setDuration(null);
    } else {
      setTimerEnabled(true);
      setDuration(null);
    }
  }

  function handleStartTimer() {
    setTimerSeconds(0);
    setTimerRunning(true);
  }

  function handleStopTimer() {
    setTimerRunning(false);
    const mins = Math.max(1, Math.round(timerSeconds / 60));
    setDuration(mins);
    // Show focus rating, then save
    setShowRating(true);
  }

  async function doSubmit(focusRating: number | null) {
    if (!activityType) { Alert.alert('Missing field', 'Please choose an activity type.'); return; }
    if (!duration) { Alert.alert('Missing field', 'Please choose a duration.'); return; }
    if (!strand) { Alert.alert('Missing field', 'Please choose which strand this belongs to.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${SERVER_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          strand,
          durationMinutes: duration,
          activityType: activityType.toLowerCase(),
          source: source.trim() || null,
          notes: notes.trim() || null,
          focusRating,
          loggedExternally: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', (err as any).error || `Server error ${res.status}`);
        return;
      }
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not reach server');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!activityType) { Alert.alert('Missing field', 'Please choose an activity type.'); return; }
    if (!timerEnabled && !duration) { Alert.alert('Missing field', 'Please choose a duration.'); return; }
    if (!strand) { Alert.alert('Missing field', 'Please choose which strand this belongs to.'); return; }

    // Show focus rating modal; save happens after rating
    setShowRating(true);
  }

  function handleFocusRated(rating: number | null) {
    setShowRating(false);
    doSubmit(rating);
  }

  const mm = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const ss = String(timerSeconds % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.safe}>
      {showRating && <FocusRatingModal onRate={handleFocusRated} />}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.back}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Log a session</Text>
          </View>

          {/* Timer toggle */}
          <View style={styles.section}>
            <View style={styles.timerToggleRow}>
              <Text style={styles.label}>Use timer</Text>
              <TouchableOpacity
                style={[styles.toggle, timerEnabled && styles.toggleOn]}
                onPress={handleTimerToggle}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, timerEnabled && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>

            {timerEnabled && (
              <View style={styles.timerWidget}>
                <Text style={styles.timerDisplay}>{mm}:{ss}</Text>
                {!timerRunning ? (
                  <TouchableOpacity style={styles.timerBtn} onPress={handleStartTimer}>
                    <Text style={styles.timerBtnText}>Start timer</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.timerBtn, styles.timerBtnStop]} onPress={handleStopTimer}>
                    <Text style={styles.timerBtnText}>Stop timer and log</Text>
                  </TouchableOpacity>
                )}
                {timerEnabled && duration !== null && (
                  <Text style={styles.timerRecorded}>Recorded: {duration} min</Text>
                )}
              </View>
            )}
          </View>

          {/* Source */}
          <View style={styles.section}>
            <Text style={styles.label}>What did you use?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 财新 article, conversation with Wei"
              placeholderTextColor="#bbb"
              value={source}
              onChangeText={setSource}
            />
          </View>

          {/* Activity type */}
          <View style={styles.section}>
            <Text style={styles.label}>What did you do?</Text>
            <View style={styles.chipRow}>
              {ACTIVITY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, activityType === type && styles.chipSelected]}
                  onPress={() => {
                    setActivityType(type);
                    if (!strand) setStrand(ACTIVITY_STRAND_HINT[type]);
                  }}
                >
                  <Text style={[styles.chipText, activityType === type && styles.chipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Duration — hidden when timer enabled */}
          {!timerEnabled && (
            <View style={styles.section}>
              <Text style={styles.label}>How long?</Text>
              <View style={styles.chipRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, duration === d && styles.chipSelected]}
                    onPress={() => setDuration(d)}
                  >
                    <Text style={[styles.chipText, duration === d && styles.chipTextSelected]}>
                      {d} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Strand selector with info icons */}
          <View style={styles.section}>
            <Text style={styles.label}>Which type of practice was this?</Text>
            {suggestedStrand && strand !== suggestedStrand && (
              <Text style={styles.hint}>
                Looks like {STRAND_META[suggestedStrand].label} — tap to confirm or choose another.
              </Text>
            )}
            <View style={styles.strandCards}>
              {STRAND_ORDER.map((s) => {
                const meta = STRAND_META[s];
                const isSelected = strand === s;
                const isSuggested = suggestedStrand === s && !isSelected;
                const infoExpanded = expandedInfo === s;

                return (
                  <View key={s}>
                    <TouchableOpacity
                      style={[
                        styles.strandCard,
                        isSelected && { borderColor: meta.color, borderWidth: 2, backgroundColor: meta.color + '12' },
                        isSuggested && { borderColor: meta.color, borderWidth: 1 },
                      ]}
                      onPress={() => setStrand(s)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.strandDot, { backgroundColor: meta.color }]} />
                      <Text style={styles.strandDescription}>{meta.description}</Text>
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          setExpandedInfo(infoExpanded ? null : s);
                        }}
                        style={styles.infoBtn}
                      >
                        <View style={[styles.infoCircle, { borderColor: meta.color }]}>
                          <Text style={[styles.infoI, { color: meta.color }]}>i</Text>
                        </View>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {infoExpanded && (
                      <StrandInfoPanel strand={s} targetLanguage="Mandarin Chinese" />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Anything worth remembering about this session…"
              placeholderTextColor="#bbb"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit — hidden while timer is actively running */}
          {(!timerEnabled || !timerRunning) && (
            <TouchableOpacity
              style={[styles.submitBtn, (submitting || (timerEnabled && duration === null)) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={submitting || (timerEnabled && duration === null)}
              activeOpacity={0.85}
            >
              <Text style={styles.submitText}>{submitting ? 'Saving…' : 'Save session'}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  back: { fontSize: 15, color: '#378ADD' },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: '#888', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', backgroundColor: '#fafafa',
  },
  notesInput: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa',
  },
  chipSelected: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  strandCards: { gap: 10 },
  strandCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e8e8e8',
    backgroundColor: '#fafafa', gap: 12,
  },
  strandDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  strandDescription: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  infoBtn: { flexShrink: 0 },
  infoCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  infoI: { fontSize: 11, fontWeight: '700', fontStyle: 'italic' },

  // Info panel
  infoPanel: {
    backgroundColor: '#f8f8f8', borderRadius: 10,
    padding: 14, marginTop: 2, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee',
  },
  infoParagraph: { fontSize: 13, color: '#444', lineHeight: 20, marginBottom: 10 },
  infoExamplesLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoExampleRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  infoExampleDot: { fontSize: 14, lineHeight: 20 },
  infoExampleText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 20 },

  // Timer
  timerToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: '#ddd', justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#111' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { marginLeft: 20 },
  timerWidget: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  timerDisplay: { fontSize: 48, fontWeight: '200', color: '#111', letterSpacing: -1, marginBottom: 12 },
  timerBtn: {
    backgroundColor: '#111', paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 8, alignItems: 'center',
  },
  timerBtnStop: { backgroundColor: '#D4537E' },
  timerBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  timerRecorded: { marginTop: 8, fontSize: 13, color: '#888' },

  submitBtn: {
    marginHorizontal: 24, backgroundColor: '#111',
    paddingVertical: 15, borderRadius: 12, alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Focus rating modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  ratingCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    margin: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  ratingTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 6 },
  ratingSubtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
  ratingRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  ratingBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  ratingBtnText: { fontSize: 18, fontWeight: '600', color: '#111' },
  skipRating: { fontSize: 13, color: '#aaa', paddingVertical: 8 },
});
