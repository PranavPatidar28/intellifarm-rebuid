import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, X } from 'lucide-react-native';

import { Button } from '@/components/button';
import { ProfileStatusCard } from '@/components/profile-status-card';
import { SelectField } from '@/components/select-field';
import { SheetFormCard } from '@/components/sheet-form-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { apiPost, ApiError } from '@/lib/api';
import type { CommunityPostResponse } from '@/lib/api-types';
import {
  buildImagePart,
  communityPostCategoryOptions,
  emptyCommunityComposerDraft,
  formatCommunityContextLabel,
  type CommunityComposerDraft,
} from '@/lib/community';
import { storageKeys } from '@/lib/constants';
import { getAllSeasons } from '@/lib/domain';
import { storage } from '@/lib/storage';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type StatusMessage = {
  tone: 'success' | 'warning';
  text: string;
} | null;

export default function NewCommunityPostRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { token, profile } = useSession();
  const seasons = useMemo(
    () =>
      getAllSeasons(profile).filter(
        (season) => season.status === 'ACTIVE' || season.status === 'PLANNED',
      ),
    [profile],
  );
  const defaultSeasonId =
    seasons.find((season) => season.status === 'ACTIVE')?.id ?? seasons[0]?.id ?? null;
  const [form, setForm] = useState<CommunityComposerDraft>(() => {
    const saved = storage.get<CommunityComposerDraft>(
      storageKeys.communityComposerDraft,
      emptyCommunityComposerDraft,
    );

    return {
      ...saved,
      cropSeasonId: saved.cropSeasonId ?? defaultSeasonId,
    };
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [openField, setOpenField] = useState<'category' | 'context' | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);
  const trimmedTitle = form.title.trim();
  const trimmedBody = form.body.trim();
  const titleError =
    form.title.length > 0 && trimmedTitle.length < 4 ? 'Use at least 4 characters.' : null;
  const bodyError =
    form.body.length > 0 && trimmedBody.length < 8 ? 'Add at least 8 characters.' : null;
  const canSubmit =
    Boolean(token) &&
    !busy &&
    !network.isOffline &&
    trimmedTitle.length >= 4 &&
    trimmedBody.length >= 8;

  useEffect(() => {
    if (!form.cropSeasonId && defaultSeasonId) {
      setForm((current) => ({
        ...current,
        cropSeasonId: current.cropSeasonId ?? defaultSeasonId,
      }));
    }
  }, [defaultSeasonId, form.cropSeasonId]);

  useEffect(() => {
    storage.set(storageKeys.communityComposerDraft, form);
  }, [form]);

  const seasonOptions = [
    { value: 'GENERAL', label: 'General discussion' },
    ...seasons.map((season) => ({
      value: season.id,
      label: formatCommunityContextLabel(season),
    })),
  ];

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      setStatusMessage({
        tone: 'warning',
        text: 'Photo access is needed to attach a field image.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setImageUri(result.assets[0].uri);
    setStatusMessage(null);
  };

  const submitPost = async () => {
    if (!token) {
      return;
    }

    if (network.isOffline) {
      setStatusMessage({
        tone: 'warning',
        text: 'Community posting needs an active internet connection.',
      });
      return;
    }

    if (trimmedTitle.length < 4 || trimmedBody.length < 8) {
      setStatusMessage({
        tone: 'warning',
        text: 'Add a clear title and a few more details before publishing.',
      });
      return;
    }

    setBusy(true);
    setStatusMessage(null);
    setOpenField(null);

    try {
      const formData = new FormData();
      formData.append('category', form.category);
      formData.append('title', trimmedTitle);
      formData.append('body', trimmedBody);

      if (form.cropSeasonId) {
        formData.append('cropSeasonId', form.cropSeasonId);
      }

      if (imageUri) {
        formData.append('image', buildImagePart(imageUri));
      }

      const response = await apiPost<CommunityPostResponse>(
        '/community/posts',
        formData,
        token,
      );

      storage.remove(storageKeys.communityComposerDraft);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts', token] }),
      ]);
      router.replace({
        pathname: '/community/post/[id]',
        params: { id: response.post.id },
      } as never);
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError
            ? error.message
            : 'Could not publish the post right now.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Create post' }} />
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
          title="Create a post"
          subtitle="Ask one clear question or share one useful field update."
        >
          <View style={{ gap: spacing.md }}>
            <SelectField
              label="Category"
              value={form.category}
              options={communityPostCategoryOptions}
              open={openField === 'category'}
              onOpenChange={(open) => setOpenField(open ? 'category' : null)}
              onChange={(value) => {
                setForm((current) => ({ ...current, category: value }));
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />

            <SelectField
              label="Crop context"
              value={form.cropSeasonId ?? 'GENERAL'}
              options={seasonOptions}
              open={openField === 'context'}
              onOpenChange={(open) => setOpenField(open ? 'context' : null)}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  cropSeasonId: value === 'GENERAL' ? null : value,
                }));
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
              helper="Use general only when the post is not tied to a saved crop."
            />

            <TextField
              label="Title"
              value={form.title}
              error={titleError}
              placeholder="What do you want help with?"
              onChangeText={(value) => {
                setForm((current) => ({ ...current, title: value }));
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
              helper="Short and specific works best."
            />

            <TextField
              label="Details"
              value={form.body}
              error={bodyError}
              placeholder="Share what you noticed, what you tried, and what answer would help most."
              multiline
              onChangeText={(value) => {
                setForm((current) => ({ ...current, body: value }));
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />

            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: palette.ink,
                      fontFamily: typography.bodyStrong,
                      fontSize: 13,
                    }}
                  >
                    Optional photo
                  </Text>
                  <Text
                    style={{
                      color: palette.inkMuted,
                      fontFamily: typography.bodyRegular,
                      fontSize: 11,
                    }}
                  >
                    Add one clear field photo only when it improves the discussion.
                  </Text>
                </View>
                <Button
                  label={imageUri ? 'Change' : 'Add'}
                  fullWidth={false}
                  variant="soft"
                  icon={<Camera color={palette.leafDark} size={16} />}
                  onPress={() => {
                    void choosePhoto();
                  }}
                />
              </View>

              {imageUri ? (
                <View
                  style={{
                    overflow: 'hidden',
                    borderRadius: radii.xl,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.outline,
                    backgroundColor: palette.white,
                  }}
                >
                  <Image
                    source={imageUri}
                    contentFit="cover"
                    style={{ width: '100%', height: 164 }}
                  />
                  <View
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Button
                      label="Remove"
                      fullWidth={false}
                      variant="ghost"
                      icon={<X color={palette.leafDark} size={14} />}
                      onPress={() => setImageUri(null)}
                    />
                  </View>
                </View>
              ) : null}
            </View>

            {network.isOffline ? (
              <ProfileStatusCard
                message="Draft saved locally. Reconnect to publish the post."
                tone="warning"
              />
            ) : null}

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
            label={busy ? 'Publishing...' : 'Publish post'}
            loading={busy}
            disabled={!canSubmit}
            onPress={() => {
              void submitPost();
            }}
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </>
  );
}
