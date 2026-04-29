import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import {
  Camera,
  ImagePlus,
  MessageSquarePlus,
  Send,
  X,
} from 'lucide-react-native';

import { AppHeroHeader } from '@/components/app-hero-header';
import { Button } from '@/components/button';
import { ConversationBubbleCard } from '@/components/conversation-bubble-card';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SunriseCard } from '@/components/sunrise-card';
import { VoiceOrb } from '@/components/voice-orb';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { createAssistantThread, sendAssistantMessage, type AssistantComposerImage } from '@/lib/assistant';
import { apiGet, ApiError } from '@/lib/api';
import type {
  AssistantThreadResponse,
  AssistantThreadsResponse,
} from '@/lib/api-types';
import { assistantPrompts, storageKeys } from '@/lib/constants';
import { findSeasonContext } from '@/lib/domain';
import { formatRelativeTime } from '@/lib/format';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

type RouteParams = {
  prompt?: string | string[];
  originRoute?: string | string[];
  focusCropSeasonId?: string | string[];
  focusFarmPlotId?: string | string[];
};

type PendingMessage = AssistantThreadResponse['thread']['messages'][number] & {
  pendingState?: 'sending' | 'typing';
};

export default function VoiceAssistantRoute() {
  const params = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { token, authUser, profile, language } = useSession();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [activeThreadId, setActiveThreadId] = useState('');
  const [composer, setComposer] = useState('');
  const [attachments, setAttachments] = useState<AssistantComposerImage[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [optimisticUserMessage, setOptimisticUserMessage] =
    useState<PendingMessage | null>(null);

  const promptParam = normalizeRouteParam(params.prompt);
  const originRoute = normalizeRouteParam(params.originRoute);
  const focusCropSeasonId = normalizeRouteParam(params.focusCropSeasonId) || selectedSeasonId;
  const focusFarmPlotId = normalizeRouteParam(params.focusFarmPlotId);
  const focusSeason = findSeasonContext(profile, focusCropSeasonId);
  const mediaHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  const threadsQuery = useCachedQuery({
    cacheKey: 'assistant-threads',
    queryKey: ['assistant-threads', token],
    enabled: Boolean(token),
    queryFn: () => apiGet<AssistantThreadsResponse>('/assistant/threads', token),
  });
  const threads = threadsQuery.data?.threads ?? [];

  useEffect(() => {
    if (!activeThreadId && threads[0]) {
      setActiveThreadId(threads[0].id);
    }
  }, [activeThreadId, threads]);

  useEffect(() => {
    if (promptParam && !composer.trim()) {
      setComposer(promptParam);
    }
  }, [composer, promptParam]);

  const threadQuery = useCachedQuery({
    cacheKey: `assistant-thread:${activeThreadId || 'draft'}`,
    queryKey: ['assistant-thread', token, activeThreadId],
    enabled: Boolean(token && activeThreadId),
    queryFn: () => apiGet<AssistantThreadResponse>(`/assistant/threads/${activeThreadId}`, token),
  });

  const messages = threadQuery.data?.thread.messages ?? [];
  const visibleMessages = useMemo(() => {
    const items: PendingMessage[] = [...messages];

    if (optimisticUserMessage) {
      items.push(optimisticUserMessage);
    }

    if (busy) {
      items.push({
        id: 'assistant-typing',
        role: 'ASSISTANT',
        content: 'Thinking through your farm context...',
        answer: 'Thinking through your farm context...',
        spokenSummary: 'Thinking through your farm context...',
        attachments: [],
        sources: [],
        safetyLevel: 'INFO',
        safetyFlags: [],
        confidenceLabel: null,
        actionCards: [],
        suggestedNextStep: null,
        createdAt: new Date().toISOString(),
        pendingState: 'typing',
      });
    }

    return items;
  }, [busy, messages, optimisticUserMessage]);

  const sendCurrentMessage = async (overrideContent?: string) => {
    const content = (overrideContent ?? composer).trim();

    if (!content || !token || busy) {
      return;
    }

    if (network.isOffline) {
      setStatusMessage(
        'Assistant is read-only while offline. You can browse saved chats, but new questions need internet.',
      );
      return;
    }

    const optimisticAttachments = attachments.map((attachment) => ({
      type: 'image' as const,
      url: attachment.uri,
      mimeType: attachment.mimeType,
      fileName: attachment.fileName,
    }));

    setStatusMessage(null);
    setBusy(true);
    setOptimisticUserMessage({
      id: `pending-${Date.now()}`,
      role: 'USER',
      content,
      answer: content,
      spokenSummary: content,
      attachments: optimisticAttachments,
      sources: [],
      safetyLevel: 'INFO',
      safetyFlags: [],
      confidenceLabel: null,
      actionCards: [],
      suggestedNextStep: null,
      createdAt: new Date().toISOString(),
      pendingState: 'sending',
    });

    try {
      let threadId = activeThreadId;

      if (!threadId) {
        const created = await createAssistantThread(token, content.slice(0, 80));
        threadId = created.thread.id;
        setActiveThreadId(threadId);
      }

      await sendAssistantMessage({
        token,
        threadId,
        content,
        focusCropSeasonId: focusCropSeasonId || undefined,
        focusFarmPlotId: focusFarmPlotId || undefined,
        originRoute: originRoute || undefined,
        language: authUser?.preferredLanguage ?? language ?? undefined,
        attachments,
      });

      setComposer('');
      setAttachments([]);
      setOptimisticUserMessage(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assistant-threads', token] }),
        queryClient.invalidateQueries({ queryKey: ['assistant-thread', token, threadId] }),
      ]);
    } catch (error) {
      setStatusMessage(
        error instanceof ApiError
          ? error.message
          : 'Could not contact IntelliFarm right now.',
      );
      setOptimisticUserMessage(null);
    } finally {
      setBusy(false);
    }
  };

  const startNewConversation = () => {
    setActiveThreadId('');
    setComposer(promptParam ?? '');
    setAttachments([]);
    setStatusMessage(null);
    setOptimisticUserMessage(null);
  };

  const pickAttachment = async (mode: 'camera' | 'library') => {
    if (attachments.length >= 2) {
      setStatusMessage('You can attach up to 2 images per question.');
      return;
    }

    const permission =
      mode === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      setStatusMessage(
        mode === 'camera'
          ? 'Camera permission is needed to capture crop photos.'
          : 'Photo library permission is needed to attach crop photos.',
      );
      return;
    }

    const result =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      setStatusMessage('Could not read that image.');
      return;
    }

    setAttachments((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uri: asset.uri,
        mimeType: asset.mimeType ?? inferMimeType(asset.uri),
        fileName:
          asset.fileName ??
          `assistant-photo-${current.length + 1}.${getFileExtension(asset.uri)}`,
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.canvas }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeroHeader
        eyebrow="Ask IntelliFarm"
        title="Assistant"
        subtitle={
          network.isOffline
            ? 'Read saved conversations while offline. New questions need internet.'
            : 'Grounded help across weather, markets, tasks, crop health, and schemes.'
        }
        tone="assistant"
        action={
          <Button
            label="New chat"
            fullWidth={false}
            variant="soft"
            icon={<MessageSquarePlus color={palette.leafDark} size={15} />}
            onPress={startNewConversation}
          />
        }
        hero={
          <View style={{ gap: spacing.md }}>
            <SunriseCard accent="soft" title="Use text, photos, and device dictation">
              <View style={{ gap: spacing.md }}>
                <VoiceOrb
                  label="Use keyboard mic"
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setStatusMessage(
                      'Use your phone keyboard microphone, then tap Send. For crop-health image questions, attach the close-up first and the full-crop view second.',
                    );
                  }}
                />
                <Text
                  selectable
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Attach up to 2 images per question. For crop problems, add the affected part
                  first and the full plant or field view second.
                </Text>
              </View>
            </SunriseCard>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              <ThreadChip
                label="New draft"
                active={!activeThreadId}
                onPress={startNewConversation}
              />
              {threads.map((thread) => (
                <ThreadChip
                  key={thread.id}
                  label={`${thread.title} · ${formatRelativeTime(thread.updatedAt)}`}
                  active={activeThreadId === thread.id}
                  onPress={() => {
                    setActiveThreadId(thread.id);
                    setStatusMessage(null);
                    setOptimisticUserMessage(null);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        }
      />

      {focusSeason ? (
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginTop: spacing.sm,
            padding: spacing.md,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            backgroundColor: palette.white,
            borderWidth: 1,
            borderColor: palette.outline,
          }}
        >
          <Text
            selectable
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 13,
            }}
          >
            Focused season: {focusSeason.cropName} · {focusSeason.currentStage}
          </Text>
          <Text
            selectable
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
              lineHeight: 18,
              marginTop: spacing.xs,
            }}
          >
            Questions from this screen will prioritize {focusSeason.farmPlot.name} in the
            assistant context.
          </Text>
        </View>
      ) : null}

      {statusMessage ? (
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginTop: spacing.sm,
            padding: spacing.md,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            backgroundColor: palette.mustardSoft,
            borderWidth: 1,
            borderColor: palette.outline,
          }}
        >
          <Text
            selectable
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {statusMessage}
          </Text>
        </View>
      ) : null}

      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationBubbleCard
            message={item}
            mediaHeaders={mediaHeaders}
            onOpenRoute={(route) => router.push(route as never)}
            onSpeak={
              item.role === 'ASSISTANT'
                ? () => {
                    Speech.stop();
                    Speech.speak(item.spokenSummary || item.answer);
                  }
                : undefined
            }
          />
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          gap: spacing.sm,
        }}
        ListEmptyComponent={
          <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
            <RichEmptyState
              title="Ask your first question"
              description="Try weather, mandi prices, crop stress, schemes, or attach crop photos for grounded help."
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {assistantPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  label={prompt}
                  fullWidth={false}
                  variant="soft"
                  onPress={() => {
                    void sendCurrentMessage(prompt);
                  }}
                />
              ))}
            </View>
          </View>
        }
      />

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
          gap: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: palette.outline,
          backgroundColor: palette.parchmentSoft,
        }}
      >
        {attachments.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {attachments.map((attachment) => (
              <View
                key={attachment.id}
                style={{
                  width: 96,
                  gap: spacing.xs,
                }}
              >
                <View
                  style={{
                    width: 96,
                    height: 96,
                    overflow: 'hidden',
                    borderRadius: radii.md,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.outline,
                  }}
                >
                  <Image
                    source={attachment.uri}
                    contentFit="cover"
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
                <Pressable
                  onPress={() =>
                    setAttachments((current) =>
                      current.filter((item) => item.id !== attachment.id),
                    )
                  }
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                  }}
                >
                  <X color={palette.terracotta} size={14} />
                  <Text
                    selectable
                    style={{
                      color: palette.terracotta,
                      fontFamily: typography.bodyStrong,
                      fontSize: 11,
                    }}
                  >
                    Remove
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button
            label="Gallery"
            fullWidth={false}
            variant="soft"
            disabled={network.isOffline || busy}
            icon={<ImagePlus color={palette.leafDark} size={15} />}
            onPress={() => {
              void pickAttachment('library');
            }}
          />
          <Button
            label="Camera"
            fullWidth={false}
            variant="soft"
            disabled={network.isOffline || busy}
            icon={<Camera color={palette.leafDark} size={15} />}
            onPress={() => {
              void pickAttachment('camera');
            }}
          />
        </View>

        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: palette.outline,
            backgroundColor: palette.white,
            boxShadow: shadow.soft,
            gap: spacing.sm,
          }}
        >
          <TextInput
            value={composer}
            onChangeText={(value) => {
              setComposer(value);
              if (statusMessage) {
                setStatusMessage(null);
              }
            }}
            editable={!network.isOffline && !busy}
            multiline
            placeholder={
              network.isOffline
                ? 'Assistant is read-only while offline.'
                : 'Ask about irrigation, mandi timing, crop stress, schemes, or attach photos.'
            }
            placeholderTextColor={palette.inkMuted}
            textAlignVertical="top"
            style={{
              minHeight: 64,
              color: palette.ink,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 21,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <Text
              selectable
              style={{
                flex: 1,
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 11,
                lineHeight: 17,
              }}
            >
              {originRoute
                ? `This question is being grounded from the ${originRoute} screen.`
                : 'Assistant responses combine your IntelliFarm data with general farming guidance.'}
            </Text>
            <Button
              label={busy ? 'Sending...' : 'Send'}
              fullWidth={false}
              loading={busy}
              disabled={!composer.trim() || network.isOffline}
              icon={<Send color={palette.white} size={15} />}
              onPress={() => {
                void sendCurrentMessage();
              }}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ThreadChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.pill,
        borderCurve: 'continuous',
        backgroundColor: active ? palette.leaf : palette.white,
        borderWidth: 1,
        borderColor: active ? palette.leafDark : palette.outline,
      }}
    >
      <Text
        selectable
        style={{
          color: active ? palette.white : palette.leafDark,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function normalizeRouteParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function inferMimeType(uri: string) {
  const extension = getFileExtension(uri).toLowerCase();

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

function getFileExtension(uri: string) {
  return uri.split('.').pop()?.split('?')[0] ?? 'jpg';
}
