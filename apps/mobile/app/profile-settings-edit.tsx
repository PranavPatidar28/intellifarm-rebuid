import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { FilterChipRow } from '@/components/filter-chip-row';
import { ProfileStatusCard } from '@/components/profile-status-card';
import { SheetFormCard } from '@/components/sheet-form-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { apiPatch, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/api-types';
import { languages, storageKeys } from '@/lib/constants';
import { storage } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

type ProfileFormState = {
  name: string;
  state: string;
  district: string;
  village: string;
};

type StatusMessage = {
  tone: 'success' | 'warning';
  text: string;
} | null;

const languageOptions = languages
  .filter((item) => item.enabled)
  .map((item) => ({
    value: item.code as AuthUser['preferredLanguage'],
    label: item.label,
  }));

export default function ProfileSettingsEditRoute() {
  const router = useRouter();
  const { authUser, token, setLanguage, refreshSession } = useSession();
  const [form, setForm] = useState<ProfileFormState>({
    name: '',
    state: '',
    district: '',
    village: '',
  });
  const [selectedLanguage, setSelectedLanguage] = useState<AuthUser['preferredLanguage']>('en');
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    setForm({
      name: authUser.name,
      state: authUser.state,
      district: authUser.district,
      village: authUser.village,
    });
    setSelectedLanguage(authUser.preferredLanguage);
  }, [authUser]);

  const saveProfile = async () => {
    if (!token) {
      return;
    }

    setBusy(true);
    setStatusMessage(null);

    try {
      await apiPatch(
        '/me',
        {
          name: form.name.trim(),
          preferredLanguage: selectedLanguage,
          state: form.state.trim(),
          district: form.district.trim(),
          village: form.village.trim(),
        },
        token,
      );
      setLanguage(selectedLanguage);
      await refreshSession();
      storage.set(storageKeys.profileSettingsNotice, 'Profile saved.');
      router.back();
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError ? error.message : 'Could not save the profile right now.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit details' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 120,
          gap: spacing.md,
          backgroundColor: palette.canvas,
        }}
      >
        <SheetFormCard
          title="Edit farmer details"
          subtitle="Keep your name, language, and village details current so guidance stays local."
        >
          <View style={{ gap: spacing.md }}>
            <TextField
              label="Farmer name"
              value={form.name}
              onChangeText={(value) => {
                setForm((current) => ({ ...current, name: value }));
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />
            <TextField
              label="State"
              value={form.state}
              onChangeText={(value) => {
                setForm((current) => ({ ...current, state: value }));
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />
            <TextField
              label="District"
              value={form.district}
              onChangeText={(value) => {
                setForm((current) => ({ ...current, district: value }));
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />
            <TextField
              label="Village"
              value={form.village}
              onChangeText={(value) => {
                setForm((current) => ({ ...current, village: value }));
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: palette.ink,
                  fontSize: 13,
                  fontFamily: typography.bodyStrong,
                }}
              >
                Language
              </Text>
              <FilterChipRow
                value={selectedLanguage}
                options={languageOptions}
                onChange={(value) => {
                  setSelectedLanguage(value);
                  if (statusMessage) {
                    setStatusMessage(null);
                  }
                }}
              />
            </View>
            {statusMessage ? (
              <ProfileStatusCard
                message={statusMessage.text}
                tone={statusMessage.tone}
              />
            ) : null}
          </View>
        </SheetFormCard>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={busy ? 'Saving details...' : 'Save changes'}
            loading={busy}
            onPress={() => {
              void saveProfile();
            }}
          />
          <Button label="Cancel" variant="soft" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </>
  );
}
