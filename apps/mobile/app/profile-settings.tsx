import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { Bell, CloudOff, Wallet } from 'lucide-react-native';

import { Button } from '@/components/button';
import { CompactListCard } from '@/components/compact-list-card';
import { PageShell } from '@/components/page-shell';
import { ProfileHeroCard } from '@/components/profile-hero-card';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { apiPatch, apiPost, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/api-types';
import { languages } from '@/lib/constants';
import { titleCase } from '@/lib/format';
import { palette, radii, spacing, typography } from '@/theme/tokens';

function buildImagePart(uri: string) {
  const extension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  return {
    uri,
    name: `profile-photo.${extension}`,
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
  } as unknown as Blob;
}

export default function ProfileSettingsRoute() {
  const router = useRouter();
  const { authUser, profile, token, language, setLanguage, signOut, refreshSession } = useSession();
  const [form, setForm] = useState({
    name: '',
    state: '',
    district: '',
    village: '',
  });
  const [selectedLanguage, setSelectedLanguage] = useState(language ?? 'en');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

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

  const currentCrops = useMemo(
    () =>
      profile?.farms.flatMap((farm) =>
        farm.cropSeasons.map((season) => `${season.cropName} - ${titleCase(season.status)}`),
      ) ?? [],
    [profile],
  );

  const uploadPhoto = async () => {
    if (!token) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setMessage('Photo access is needed to update the profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setPhotoBusy(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', buildImagePart(result.assets[0].uri));
      await apiPost<{ user: AuthUser }>('/me/photo', formData, token);
      await refreshSession();
      setMessage('Profile photo updated.');
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : 'Could not upload the profile photo.',
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!token) {
      return;
    }

    setBusy(true);
    setMessage(null);

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
      setMessage('Profile saved.');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not save the profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Profile & settings' }} />
      <PageShell
        eyebrow="Farmer profile"
        title="Profile and settings"
        subtitle="Manage identity, language, offline tools, and quick access to the new expense tracker."
        heroTone="scheme"
      >
        <ProfileHeroCard
          user={authUser}
          farmCount={profile?.farmCount ?? 0}
          cropCount={currentCrops.length}
        />

        <SunriseCard accent="soft" title="Profile photo">
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <View
              style={{
                overflow: 'hidden',
                width: 72,
                height: 72,
                borderRadius: radii.lg,
                backgroundColor: palette.parchmentSoft,
              }}
            >
              {authUser?.profilePhotoUrl ? (
                <Image source={authUser.profilePhotoUrl} contentFit="cover" style={{ width: '100%', height: '100%' }} />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: palette.leaf,
                      fontFamily: typography.displayBold,
                      fontSize: 24,
                    }}
                  >
                    {authUser?.name?.slice(0, 1)?.toUpperCase() ?? 'F'}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              >
                {authUser?.phone ?? 'Phone not available'}
              </Text>
              <Button
                label={photoBusy ? 'Uploading photo...' : 'Change photo'}
                variant="soft"
                fullWidth={false}
                loading={photoBusy}
                onPress={() => {
                  void uploadPhoto();
                }}
              />
            </View>
          </View>
        </SunriseCard>

        <SunriseCard accent="brand" title="Farmer details">
          <View style={{ gap: spacing.md }}>
            <TextField label="Farmer name" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
            <TextField label="State" value={form.state} onChangeText={(value) => setForm((current) => ({ ...current, state: value }))} />
            <TextField label="District" value={form.district} onChangeText={(value) => setForm((current) => ({ ...current, district: value }))} />
            <TextField label="Village" value={form.village} onChangeText={(value) => setForm((current) => ({ ...current, village: value }))} />
          </View>
        </SunriseCard>

        <SunriseCard accent="scheme" title="Language">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {languages
              .filter((item) => item.enabled)
              .map((item) => (
                <Button
                  key={item.code}
                  label={item.label}
                  fullWidth={false}
                  variant={selectedLanguage === item.code ? 'primary' : 'soft'}
                  onPress={() => setSelectedLanguage(item.code)}
                />
              ))}
          </View>
        </SunriseCard>

        <SunriseCard accent="info" title="Current farm summary">
          <View style={{ gap: spacing.xs }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              Farm plots: {profile?.farmCount ?? 0}
            </Text>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              Current crops: {currentCrops.length ? currentCrops.join(', ') : 'None yet'}
            </Text>
          </View>
        </SunriseCard>

        <View style={{ gap: spacing.sm }}>
          <CompactListCard
            title="Expense tracker"
            subtitle="Track seed, labour, and transport spending."
            prefix={<Wallet color={palette.leafDark} size={18} />}
            onPress={() => router.push('/expenses' as never)}
          />
          <CompactListCard
            title="Alerts and reminders"
            subtitle="Open weather, crop-health, and market reminders."
            prefix={<Bell color={palette.mustard} size={18} />}
            onPress={() => router.push('/alerts')}
          />
          <CompactListCard
            title="Offline tools"
            subtitle="View cached advice and pending sync items."
            prefix={<CloudOff color={palette.sky} size={18} />}
            onPress={() => router.push('/offline')}
          />
        </View>

        {message ? (
          <SunriseCard accent="warning" title="Settings note">
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {message}
            </Text>
          </SunriseCard>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Button label={busy ? 'Saving profile...' : 'Save profile'} loading={busy} onPress={() => { void saveProfile(); }} />
          <Button label="Log out" variant="ghost" onPress={() => { void signOut().then(() => router.replace('/login')); }} />
        </View>
      </PageShell>
    </>
  );
}
