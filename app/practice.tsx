import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePractice, DirectiveItem, PracticeData } from '../hooks/usePractice';
import { useProfiles } from '../hooks/useProfiles';
import { Strand, STRAND_META } from '../constants/strands';

type ScreenState = 'directive' | 'timer' | 'alternatives';

// ── Focus Rating ──────────────────────────────────────────────────────────────

function FocusRating({ onRate }: { onRate: (rating: number | null) => void }) {
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

// ── Timer View ────────────────────────────────────────────────────────────────

function TimerView({
  directive,
  onFinish,
}: {
  directive: DirectiveItem;
  onFinish: (seconds: number) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const color = STRAND_META[directive.strand].color;

  useEffect(() => {
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerReminder}>{directive.instruction}</Text>
      <Text style={[styles.timerDisplay, { color }]}>{mm}:{ss}</Text>
      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: color }]} onPress={() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onFinish(seconds);
      }}>
        <Text style={styles.primaryBtnText}>Finish session</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Exercise Card ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, evaluate }: {
  exercise: NonNullable<DirectiveItem['exercise']>;
  evaluate: (targetWord: string, definition: string, prompt: string, response: string) => Promise<string>;
}) {
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  async function handleSubmit() {
    if (!response.trim()) return;
    setEvaluating(true);
    const fb = await evaluate(exercise.targetWord, exercise.definition, exercise.promptSentence, response.trim());
    setFeedback(fb);
    setEvaluating(false);
  }

  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.exerciseWord}>{exercise.targetWord}</Text>
      <Text style={styles.exerciseDef}>{exercise.definition}</Text>
      <Text style={styles.exercisePrompt}>{exercise.promptSentence}</Text>
      <TextInput
        style={styles.exerciseInput}
        placeholder="Write your sentence here…"
        placeholderTextColor="#bbb"
        value={response}
        onChangeText={setResponse}
        multiline
        numberOfLines={3}
      />
      <TouchableOpacity
        style={[styles.exerciseSubmit, (!response.trim() || evaluating) && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={!response.trim() || evaluating}
      >
        <Text style={styles.exerciseSubmitText}>{evaluating ? 'Evaluating…' : 'Submit'}</Text>
      </TouchableOpacity>
      {feedback && <Text style={styles.feedbackText}>{feedback}</Text>}
    </View>
  );
}

// ── Avoidance Level 3 ─────────────────────────────────────────────────────────

function AvoidanceReasons({
  pressureMsg,
  strand,
  targetLanguage,
  level,
  getAvoidanceHelp,
}: {
  pressureMsg: { question: string; reasons: string[] };
  strand: Strand;
  targetLanguage?: string;
  level?: string;
  getAvoidanceHelp: (reason: string, strand: Strand, tl?: string, lv?: string) => Promise<string>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [helpText, setHelpText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReason(reason: string) {
    setSelected(reason);
    setHelpText(null);
    setLoading(true);
    const text = await getAvoidanceHelp(reason, strand, targetLanguage, level);
    setHelpText(text);
    setLoading(false);
  }

  return (
    <View style={styles.avoidanceBlock}>
      <Text style={styles.avoidanceQuestion}>{pressureMsg.question}</Text>
      <View style={styles.reasonChips}>
        {pressureMsg.reasons.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.reasonChip, selected === r && styles.reasonChipSelected]}
            onPress={() => handleReason(r)}
          >
            <Text style={[styles.reasonChipText, selected === r && styles.reasonChipTextSelected]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading && <ActivityIndicator size="small" color="#555" style={{ marginTop: 12 }} />}
      {helpText && <Text style={styles.helpText}>{helpText}</Text>}
    </View>
  );
}

// ── Alternative Strand Picker ─────────────────────────────────────────────────

function AlternativePicker({
  primaryStrand,
  allDirectives,
  onChoose,
  onBack,
}: {
  primaryStrand: Strand;
  allDirectives: DirectiveItem[];
  onChoose: (directive: DirectiveItem) => void;
  onBack: () => void;
}) {
  const others = allDirectives.filter((d) => d.strand !== primaryStrand);

  return (
    <View style={styles.altContainer}>
      <Text style={styles.altHeading}>What can you do right now?</Text>
      {others.map((d) => {
        const meta = STRAND_META[d.strand];
        return (
          <View key={d.strand} style={[styles.altCard, { borderLeftColor: meta.color, borderLeftWidth: 4 }]}>
            <View style={styles.altCardHeader}>
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
              <Text style={styles.altStrandLabel}>{meta.label}</Text>
            </View>
            <Text style={styles.altInstruction}>{d.instruction}</Text>
            <TouchableOpacity style={[styles.altBtn, { backgroundColor: meta.color }]} onPress={() => onChoose(d)}>
              <Text style={styles.altBtnText}>Do this instead</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      <TouchableOpacity onPress={onBack} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Go back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Practice Screen ──────────────────────────────────────────────────────

export default function Practice() {
  const { data, loading, error, refresh, snooze, complete, evaluate, getAvoidanceHelp } = usePractice();
  const { activeProfile } = useProfiles();

  const [screen, setScreen] = useState<ScreenState>('directive');
  const [activeDirective, setActiveDirective] = useState<DirectiveItem | null>(null);
  const [showFocusRating, setShowFocusRating] = useState(false);
  const [finishedSeconds, setFinishedSeconds] = useState(0);
  const [snoozing, setSnoozing] = useState(false);

  const directive = activeDirective ?? data;

  function handleStartSession() {
    setActiveDirective(data);
    setScreen('timer');
  }

  function handleTimerFinish(seconds: number) {
    setFinishedSeconds(seconds);
    setShowFocusRating(true);
  }

  async function handleFocusRated(rating: number | null) {
    setShowFocusRating(false);
    const mins = Math.max(1, Math.round(finishedSeconds / 60));
    await complete(directive!.strand, mins, rating ?? undefined);
    setActiveDirective(null);
    setScreen('directive');
  }

  async function handleCantDoThis() {
    setScreen('alternatives');
  }

  async function handleChooseAlternative(d: DirectiveItem) {
    setSnoozing(true);
    if (data) await snooze(data.strand);
    setSnoozing(false);
    setActiveDirective(d);
    setScreen('timer');
  }

  const color = directive ? STRAND_META[directive.strand].color : '#378ADD';

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator size="large" color="#378ADD" /></View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load practice data.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {showFocusRating && <FocusRating onRate={handleFocusRated} />}

      {screen === 'timer' && directive && (
        <View style={styles.fill}>
          <TimerView directive={directive} onFinish={handleTimerFinish} />
        </View>
      )}

      {screen === 'alternatives' && data && (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 24 }}>
          <AlternativePicker
            primaryStrand={data.strand}
            allDirectives={data.allDirectives}
            onChoose={handleChooseAlternative}
            onBack={() => setScreen('directive')}
          />
        </ScrollView>
      )}

      {screen === 'directive' && data && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.screenTitle}>Practice</Text>

          {/* Pressure banner — level 1 or 2 */}
          {data.avoidanceLevel === 1 || data.avoidanceLevel === 2 ? (
            typeof data.pressureMessage === 'string' && (
              <View style={[styles.pressureBanner, { borderLeftColor: color }]}>
                <Text style={styles.pressureText}>{data.pressureMessage}</Text>
              </View>
            )
          ) : null}

          {/* Avoidance level 3 — reason chips */}
          {data.avoidanceLevel === 3 && data.pressureMessage && typeof data.pressureMessage === 'object' && 'question' in data.pressureMessage && (
            <AvoidanceReasons
              pressureMsg={data.pressureMessage as { question: string; reasons: string[] }}
              strand={data.strand}
              targetLanguage={activeProfile?.targetLanguage}
              level={activeProfile?.level}
              getAvoidanceHelp={getAvoidanceHelp}
            />
          )}

          {/* Main directive card */}
          <View style={[styles.directiveCard, { borderTopColor: color, borderTopWidth: 3 }]}>
            <View style={styles.strandBadge}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={[styles.strandBadgeLabel, { color }]}>{STRAND_META[data.strand].label}</Text>
            </View>
            <Text style={styles.instructionText}>{data.instruction}</Text>
          </View>

          {/* Suggested resource */}
          {data.suggestedResource && (
            <TouchableOpacity
              style={styles.resourceCard}
              onPress={() => Linking.openURL(data.suggestedResource!.url)}
              activeOpacity={0.8}
            >
              <Text style={styles.resourceTitle}>{data.suggestedResource.title}</Text>
              <Text style={styles.resourceReason}>{data.suggestedResource.reason}</Text>
              <Text style={styles.resourceLink}>{data.suggestedResource.url}</Text>
            </TouchableOpacity>
          )}

          {/* In-app exercise */}
          {data.isInAppExercise && data.exercise && (
            <ExerciseCard exercise={data.exercise} evaluate={evaluate} />
          )}

          {/* Actions */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: color }, snoozing && { opacity: 0.6 }]}
            onPress={handleStartSession}
            disabled={snoozing}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Start session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleCantDoThis}
            disabled={snoozing}
          >
            <Text style={styles.secondaryBtnText}>I can't do this right now</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  fill: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 20, letterSpacing: -0.5 },

  // Pressure banner
  pressureBanner: {
    backgroundColor: '#f9f4ee',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  pressureText: { fontSize: 13, color: '#444', lineHeight: 19 },

  // Avoidance
  avoidanceBlock: { marginBottom: 20 },
  avoidanceQuestion: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 12, lineHeight: 22 },
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  reasonChipSelected: { backgroundColor: '#111', borderColor: '#111' },
  reasonChipText: { fontSize: 13, color: '#555' },
  reasonChipTextSelected: { color: '#fff', fontWeight: '600' },
  helpText: { marginTop: 14, fontSize: 14, color: '#333', lineHeight: 21, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 },

  // Directive card
  directiveCard: {
    borderRadius: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    padding: 20,
    marginBottom: 16,
  },
  strandBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  strandBadgeLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  instructionText: { fontSize: 18, color: '#111', lineHeight: 27, fontWeight: '400' },

  // Resource
  resourceCard: {
    backgroundColor: '#f0f6ff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d8e8f8',
  },
  resourceTitle: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 4 },
  resourceReason: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 4 },
  resourceLink: { fontSize: 12, color: '#378ADD' },

  // Exercise
  exerciseCard: {
    backgroundColor: '#fffbf0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0e8d0',
  },
  exerciseWord: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 4 },
  exerciseDef: { fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 19 },
  exercisePrompt: { fontSize: 14, color: '#444', marginBottom: 12, lineHeight: 20 },
  exerciseInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 15, color: '#111',
    backgroundColor: '#fff', minHeight: 80, textAlignVertical: 'top',
    marginBottom: 10,
  },
  exerciseSubmit: {
    backgroundColor: '#EF9F27', paddingVertical: 10,
    borderRadius: 8, alignItems: 'center',
  },
  exerciseSubmitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  feedbackText: { marginTop: 12, fontSize: 14, color: '#333', lineHeight: 20, fontStyle: 'italic' },

  // Buttons
  primaryBtn: {
    paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  secondaryBtnText: { color: '#555', fontSize: 15 },

  // Timer
  timerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  timerReminder: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  timerDisplay: { fontSize: 72, fontWeight: '200', letterSpacing: -2, marginBottom: 48 },

  // Alternatives
  altContainer: { paddingBottom: 20 },
  altHeading: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 20, letterSpacing: -0.5 },
  altCard: {
    backgroundColor: '#fafafa', borderRadius: 12,
    borderWidth: 1, borderColor: '#eee',
    padding: 16, marginBottom: 14,
  },
  altCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  altStrandLabel: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.8 },
  altInstruction: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 12 },
  altBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  altBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  backLink: { alignItems: 'center', paddingVertical: 12 },
  backLinkText: { color: '#378ADD', fontSize: 14 },

  // Focus rating modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  ratingCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 28, margin: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  ratingTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 6 },
  ratingSubtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
  ratingRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  ratingBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  ratingBtnText: { fontSize: 18, fontWeight: '600', color: '#111' },
  skipRating: { fontSize: 13, color: '#aaa', paddingVertical: 8 },

  // Errors
  errorText: { fontSize: 15, color: '#111', marginBottom: 16 },
  retryBtn: { backgroundColor: '#111', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
});
