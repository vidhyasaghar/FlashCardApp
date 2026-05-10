import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Animated, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useTheme, Typography, Spacing, Radius, Colors } from '../src/theme';
import { useProfileStore } from '../src/stores/profileStore';
import { getDatabase } from '../src/db/database';
import { createProfile } from '../src/db/queries/profiles';
import { Profile } from '../src/types';

const PAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profiles, loadProfiles, unlockProfile } = useProfileStore();

  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [newName, setNewName] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      await loadProfiles(db);
      setLoading(false);
    })();
  }, []);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleProfileTap = (profile: Profile) => {
    if (profile.pin_hash === null) {
      unlockProfile('', profile).then(() => router.push('/(home)/decks'));
      return;
    }
    setSelectedProfile(profile);
    setPin('');
    setPinError(false);
  };

  const handlePinSubmit = async (pinValue: string) => {
    if (!selectedProfile || submitting) return;
    setSubmitting(true);
    await unlockProfile(pinValue, selectedProfile);
    setSubmitting(false);
    const { isUnlocked } = useProfileStore.getState();
    if (isUnlocked) {
      router.push('/(home)/decks');
    } else {
      setPinError(true);
      triggerShake();
      setPin('');
    }
  };

  const handlePadPress = (key: string) => {
    if (!key || submitting) return;
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      setPinError(false);
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    setPinError(false);
    if (next.length === 4) {
      handlePinSubmit(next);
    }
  };

  const handleCreateProfile = async () => {
    setFormError('');
    if (!newName.trim()) { setFormError('Name is required'); return; }
    if (usePin) {
      if (newPin.length !== 4) { setFormError('PIN must be 4 digits'); return; }
      if (newPin !== confirmPin) { setFormError('PINs do not match'); return; }
    }
    setCreating(true);
    try {
      const db = await getDatabase();
      const pinHash = usePin
        ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPin)
        : undefined;
      await createProfile(db, newName.trim(), pinHash);
      await loadProfiles(db);
      setModalVisible(false);
      setNewName(''); setUsePin(false); setNewPin(''); setConfirmPin('');
    } finally {
      setCreating(false);
    }
  };

  const s = styles(theme);

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: theme.background }]}>
        <View style={s.center}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      {/* Nav bar — surface bg, accent text, extends behind status bar */}
      <View style={[s.header, { backgroundColor: theme.surface, paddingTop: insets.top, borderBottomColor: theme.border }]}>
        <Text style={[s.appName, { color: theme.accent }]}>FlashCard</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.greeting, { color: theme.text }]}>
          {profiles.length > 0 ? 'Welcome back' : "Let's get started"}
        </Text>

        {profiles.map(profile => (
          <TouchableOpacity
            key={profile.id}
            style={[s.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => handleProfileTap(profile)}
            activeOpacity={0.7}
          >
            <View style={[s.avatar, { backgroundColor: theme.accent }]}>
              <Text style={s.avatarLetter}>{profile.name[0].toUpperCase()}</Text>
            </View>
            <Text style={[s.profileName, { color: theme.text }]}>{profile.name}</Text>
            {profile.pin_hash !== null && (
              <Ionicons name="lock-closed" size={16} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        ))}

        {/* Inline PIN entry with built-in number pad */}
        {selectedProfile && (
          <View style={s.pinSection}>
            <Text style={[s.pinLabel, { color: theme.textSecondary }]}>
              Enter PIN for {selectedProfile.name}
            </Text>

            {/* 4 PIN boxes */}
            <Animated.View style={[s.pinBoxRow, { transform: [{ translateX: shakeAnim }] }]}>
              {[0, 1, 2, 3].map(i => (
                <View
                  key={i}
                  style={[
                    s.pinBox,
                    {
                      backgroundColor: pin.length > i ? theme.accentLight : theme.surface,
                      borderColor: pinError ? theme.danger
                        : pin.length > i ? theme.accent
                        : theme.borderStrong,
                    },
                  ]}
                >
                  {pin.length > i && (
                    <View style={[s.pinDot, { backgroundColor: pinError ? theme.danger : theme.accent }]} />
                  )}
                </View>
              ))}
            </Animated.View>

            {/* Custom number pad */}
            <View style={s.pad}>
              {PAD_ROWS.map((row, ri) => (
                <View key={ri} style={s.padRow}>
                  {row.map((key, ci) => key === '' ? (
                    <View key={ci} style={s.padBtn} />
                  ) : (
                    <TouchableOpacity
                      key={ci}
                      style={[s.padBtn, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
                      onPress={() => handlePadPress(key)}
                      disabled={submitting}
                      activeOpacity={0.65}
                    >
                      {key === '⌫' ? (
                        <Ionicons name="backspace-outline" size={22} color={theme.text} />
                      ) : (
                        <Text style={[s.padText, { color: theme.text }]}>{key}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {submitting && <ActivityIndicator color={theme.accent} style={{ marginTop: Spacing.sm }} />}

            <TouchableOpacity onPress={() => { setSelectedProfile(null); setPin(''); }}>
              <Text style={[s.cancel, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add profile — outlined button */}
      <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[s.addBtn, { borderColor: theme.accent }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={theme.accent} />
          <Text style={[s.addBtnText, { color: theme.accent }]}>Add profile</Text>
        </TouchableOpacity>
      </View>

      {/* Create profile bottom sheet */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={s.modalDismiss} onPress={() => setModalVisible(false)} />
          <View style={[s.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={[s.sheetHandle, { backgroundColor: theme.borderStrong }]} />
            <Text style={[s.sheetTitle, { color: theme.text }]}>New profile</Text>

            <Text style={[s.inputLabel, { color: theme.textSecondary }]}>NAME</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.textTertiary}
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
            />

            <TouchableOpacity style={s.toggleRow} onPress={() => { setUsePin(p => !p); setNewPin(''); setConfirmPin(''); }}>
              <Text style={[Typography.body, { color: theme.text }]}>Add PIN</Text>
              <View style={[s.toggle, { backgroundColor: usePin ? theme.accent : theme.border }]}>
                <View style={[s.toggleThumb, { transform: [{ translateX: usePin ? 18 : 2 }] }]} />
              </View>
            </TouchableOpacity>

            {usePin && (
              <>
                <Text style={[s.inputLabel, { color: theme.textSecondary }]}>PIN (4 digits)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  placeholder="····" placeholderTextColor={theme.textTertiary}
                  value={newPin} onChangeText={t => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad" secureTextEntry
                />
                <Text style={[s.inputLabel, { color: theme.textSecondary }]}>CONFIRM PIN</Text>
                <TextInput
                  style={[s.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  placeholder="····" placeholderTextColor={theme.textTertiary}
                  value={confirmPin} onChangeText={t => setConfirmPin(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad" secureTextEntry
                />
              </>
            )}

            {formError ? <Text style={[s.formError, { color: theme.danger }]}>{formError}</Text> : null}

            <TouchableOpacity
              style={[s.createBtn, { backgroundColor: theme.accent, opacity: creating ? 0.6 : 1 }]}
              onPress={handleCreateProfile}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.createBtnText}>Create profile</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = (_theme: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  appName: { ...Typography.h2 },
  scroll: { padding: Spacing.lg },
  greeting: { ...Typography.h2, marginBottom: Spacing.lg },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 0.5, marginBottom: Spacing.sm, gap: Spacing.sm,
    elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { ...Typography.h3, color: '#fff' },
  profileName: { ...Typography.h3, flex: 1 },
  pinSection: { marginTop: Spacing.lg, alignItems: 'center', gap: Spacing.md },
  pinLabel: { ...Typography.body },
  pinBoxRow: { flexDirection: 'row', gap: Spacing.md },
  pinBox: {
    width: 56, height: 64, borderRadius: Radius.md, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  pinDot: { width: 12, height: 12, borderRadius: 6 },
  pad: { gap: Spacing.sm, marginTop: Spacing.sm },
  padRow: { flexDirection: 'row', gap: Spacing.sm },
  padBtn: {
    width: 80, height: 64, borderRadius: Radius.md, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  padText: { ...Typography.h2 },
  cancel: { ...Typography.body, paddingVertical: Spacing.sm },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, height: 52, borderRadius: Radius.full, borderWidth: 1.5,
  },
  addBtnText: { ...Typography.h3 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetTitle: { ...Typography.h2, marginBottom: Spacing.md },
  inputLabel: { ...Typography.label, marginBottom: Spacing.xs, textTransform: 'uppercase' },
  input: {
    height: 48, borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.md, ...Typography.body,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  toggle: { width: 42, height: 24, borderRadius: 12, justifyContent: 'center' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  formError: { ...Typography.bodySmall, marginBottom: Spacing.sm },
  createBtn: { height: 52, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  createBtnText: { ...Typography.h3, color: '#fff' },
});
