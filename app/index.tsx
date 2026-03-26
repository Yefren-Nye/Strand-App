import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBalance } from '../hooks/useBalance';
import { useProfiles, Profile } from '../hooks/useProfiles';
import { Strand, STRAND_META } from '../constants/strands';
import { StrandRing } from '../components/StrandRing';
import { DailyBar } from '../components/DailyBar';

// ── Profile Switcher Bottom Sheet ─────────────────────────────────────────────

function ProfileSheet({
  profiles,
  activeProfile,
  onActivate,
  onCreate,
  onClose,
}: {
  profiles: Profile[];
  activeProfile: Profile | null;
  onActivate: (id: string) => void;
  onCreate: (lang: string, native: string, level: string) => void;
  onClose: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [targetLang, setTargetLang] = useState('');
  const [nativeLang, setNativeLang] = useState('');
  const [level, setLevel] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!targetLang.trim() || !nativeLang.trim() || !level.trim()) return;
    setSaving(true);
    await onCreate(targetLang.trim(), nativeLang.trim(), level.trim());
    setSaving(false);
    setShowForm(false);
    setTargetLang('');
    setNativeLang('');
    setLevel('');
  }

  return (
    <Modal visible transparent animationType="slide">
      <TouchableOpacity style={sh.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={sh.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={sh.handle} />
          <Text style={sh.sheetTitle}>Languages</Text>

          {profiles.map((p) => {
            const isActive = p.isActive === 1;
            return (
              <TouchableOpacity
                key={p.id}
                style={[sh.profileRow, isActive && sh.profileRowActive]}
                onPress={() => { onActivate(p.id); onClose(); }}
                activeOpacity={0.8}
              >
                <View style={sh.profileInfo}>
                  <Text style={sh.profileLang}>{p.targetLanguage}</Text>
                  <Text style={sh.profileLevel}>{p.level} · {p.nativeLanguage}</Text>
                </View>
                {isActive && <View style={sh.activeDot} />}
              </TouchableOpacity>
            );
          })}

          {!showForm ? (
            <TouchableOpacity style={sh.addBtn} onPress={() => setShowForm(true)}>
              <Text style={sh.addBtnText}>+ Add language</Text>
            </TouchableOpacity>
          ) : (
            <View style={sh.form}>
              <TextInput
                style={sh.formInput}
                placeholder="Target language (e.g. Japanese)"
                placeholderTextColor="#bbb"
                value={targetLang}
                onChangeText={setTargetLang}
              />
              <TextInput
                style={sh.formInput}
                placeholder="Native language (e.g. English)"
                placeholderTextColor="#bbb"
                value={nativeLang}
                onChangeText={setNativeLang}
              />
              <TextInput
                style={sh.formInput}
                placeholder="Level (e.g. N3, B2, Intermediate)"
                placeholderTextColor="#bbb"
                value={level}
                onChangeText={setLevel}
              />
              <View style={sh.formBtns}>
                <TouchableOpacity style={sh.cancelBtn} onPress={() => setShowForm(false)}>
                  <Text style={sh.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sh.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  <Text style={sh.saveBtnText}>{saving ? 'Saving…' : 'Add'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Nudge card ────────────────────────────────────────────────────────────────
function NudgeCard({ suggestion, weakestStrand }: { suggestion: string; weakestStrand: Strand }) {
  const color = STRAND_META[weakestStrand].color;
  return (
    <View style={[styles.nudgeCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Text style={styles.nudgeText}>{suggestion}</Text>
    </View>
  );
}

// ── Session feed ──────────────────────────────────────────────────────────────
function SessionFeed({ sessions }: { sessions: any[] }) {
  if (sessions.length === 0) {
    return (
      <View style={styles.emptyFeed}>
        <Text style={styles.emptyFeedText}>No sessions logged today.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Today</Text>
      {sessions.map((s) => (
        <View key={s.id} style={styles.sessionRow}>
          <View style={[styles.sessionDot, { backgroundColor: STRAND_META[s.strand as Strand]?.color || '#ccc' }]} />
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionSource}>{s.source || s.activityType}</Text>
            <Text style={styles.sessionMeta}>
              {s.activityType} · {s.durationMinutes} min
              {s.focusRating ? ` · focus ${s.focusRating}/5` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const { data, loading, error, refresh } = useBalance();
  const { profiles, activeProfile, activate, create, refresh: refreshProfiles } = useProfiles();
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  const onRefresh = useCallback(() => { refresh(); refreshProfiles(); }, [refresh, refreshProfiles]);

  async function handleActivate(profileId: string) {
    await activate(profileId);
    refresh(); // re-fetch balance for new profile
  }

  async function handleCreate(lang: string, native: string, lv: string) {
    await create(lang, native, lv);
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#378ADD" />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>Could not reach server.</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {showProfileSheet && (
        <ProfileSheet
          profiles={profiles}
          activeProfile={activeProfile}
          onActivate={handleActivate}
          onCreate={handleCreate}
          onClose={() => setShowProfileSheet(false)}
        />
      )}

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.appName}>Strand</Text>
          <View style={styles.headerRight}>
            {activeProfile && (
              <TouchableOpacity
                style={styles.profilePill}
                onPress={() => setShowProfileSheet(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.profilePillText}>
                  {activeProfile.targetLanguage} · {activeProfile.level}
                </Text>
              </TouchableOpacity>
            )}
            {data && (
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor(data.balanceScore) }]}>
                <Text style={styles.scoreText}>{Math.round(data.balanceScore)}</Text>
              </View>
            )}
          </View>
        </View>

        {data && (
          <>
            <StrandRing percentages={data.percentagePerStrand} />
            <NudgeCard suggestion={data.suggestion} weakestStrand={data.weakestStrand} />
            {data.daily && data.daily.length > 0 && <DailyBar daily={data.daily} />}
            <SessionFeed sessions={data.todaySessions} />
          </>
        )}

        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => router.push('/log')}
          activeOpacity={0.85}
        >
          <Text style={styles.logBtnText}>Log a session</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return '#1D9E75';
  if (score >= 55) return '#EF9F27';
  return '#D4537E';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  appName: { fontSize: 22, fontWeight: '700', color: '#111', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profilePill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  profilePillText: { fontSize: 12, color: '#444', fontWeight: '500' },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  nudgeCard: {
    marginHorizontal: 24, marginBottom: 16,
    padding: 14, backgroundColor: '#f8f8f8', borderRadius: 10,
  },
  nudgeText: { fontSize: 14, color: '#222', lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 10, paddingHorizontal: 24 },
  emptyFeed: { paddingHorizontal: 24, paddingVertical: 12 },
  emptyFeedText: { fontSize: 13, color: '#aaa' },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  sessionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  sessionInfo: { flex: 1 },
  sessionSource: { fontSize: 14, color: '#111', fontWeight: '500' },
  sessionMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  logBtn: {
    marginHorizontal: 24, marginTop: 24, backgroundColor: '#111',
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  logBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  errorText: { fontSize: 16, color: '#111', marginBottom: 8 },
  errorSub: { fontSize: 13, color: '#888', marginBottom: 16 },
  retryBtn: { backgroundColor: '#111', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
});

const sh = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 24, paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 16 },
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  profileRowActive: { backgroundColor: '#f8f8f8', marginHorizontal: -24, paddingHorizontal: 24, borderRadius: 0 },
  profileInfo: { flex: 1 },
  profileLang: { fontSize: 15, fontWeight: '600', color: '#111' },
  profileLevel: { fontSize: 12, color: '#888', marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1D9E75' },
  addBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  addBtnText: { fontSize: 15, color: '#378ADD', fontWeight: '500' },
  form: { paddingTop: 16, gap: 10 },
  formInput: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111',
  },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelBtnText: { color: '#555', fontSize: 14 },
  saveBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: '#111', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
