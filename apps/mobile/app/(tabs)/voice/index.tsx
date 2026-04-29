import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { ActionCTAGroup } from '@/components/action-cta-group';
import { Button } from '@/components/button';
import { ConversationBubbleCard } from '@/components/conversation-bubble-card';
import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { VoiceOrb } from '@/components/voice-orb';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type {
  AssistantMessageResponse,
  AssistantThreadResponse,
  AssistantThreadsResponse,
} from '@/lib/api-types';
import { assistantPrompts } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/format';
import { palette, spacing, typography } from '@/theme/tokens';

export default function VoiceAssistantRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [activeThreadId, setActiveThreadId] = useState('');
  const [composer, setComposer] = useState('');
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const threadQuery = useCachedQuery({
    cacheKey: `assistant-thread:${activeThreadId || 'draft'}`,
    queryKey: ['assistant-thread', token, activeThreadId],
    enabled: Boolean(token && activeThreadId),
    queryFn: () => apiGet<AssistantThreadResponse>(`/assistant/threads/${activeThreadId}`, token),
  });

  const messages = threadQuery.data?.thread.messages ?? [];
  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === 'ASSISTANT') ?? null,
    [messages],
  );

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || !token) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setTranscript(trimmed);

    try {
      let threadId = activeThreadId;

      if (!threadId) {
        const created = await apiPost<AssistantThreadResponse>(
          '/assistant/threads',
          { title: trimmed.slice(0, 80) },
          token,
        );
        threadId = created.thread.id;
        setActiveThreadId(threadId);
      }

      await apiPost<AssistantMessageResponse>(
        `/assistant/threads/${threadId}/messages`,
        { content: trimmed },
        token,
      );

      setComposer('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assistant-threads', token] }),
        queryClient.invalidateQueries({ queryKey: ['assistant-thread', token, threadId] }),
      ]);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : 'Could not contact IntelliFarm right now.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      eyebrow="Ask IntelliFarm"
      title="Voice and text assistant"
      subtitle="Use the mic orb, device dictation, or a typed question to get grounded farm guidance."
      heroTone="assistant"
      hero={
        <SunriseCard accent="soft" title="Quick voice help">
          <View style={{ gap: spacing.md }}>
            <VoiceOrb
              label="Tap, then dictate"
              onPress={() => {
                void Haptics.selectionAsync();
                setTranscript('Tip: use the keyboard microphone on your phone, then tap Send.');
              }}
            />
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Expo Go-safe voice mode: real audio playback, plus device dictation or typed questions for input.
            </Text>
          </View>
        </SunriseCard>
      }
    >
      <SunriseCard accent="brand" title="Ask something simple">
        <View style={{ gap: spacing.md }}>
          <TextField
            label="Question"
            value={composer}
            onChangeText={setComposer}
            placeholder="Should I irrigate today?"
            multiline
          />
          <Button
            label={busy ? 'Asking IntelliFarm...' : 'Send question'}
            loading={busy}
            onPress={() => {
              void sendMessage(composer);
            }}
          />
        </View>
      </SunriseCard>

      <SectionTitle eyebrow="Prompt ideas" title="Try one tap questions" />
      <ActionCTAGroup
        actions={assistantPrompts.map((prompt) => ({
          label: prompt,
          variant: 'soft' as const,
          onPress: () => {
            void sendMessage(prompt);
          },
        }))}
      />

      {transcript ? (
        <SunriseCard accent="soft" title="Latest transcript">
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {transcript}
          </Text>
        </SunriseCard>
      ) : null}

      {message ? (
        <SunriseCard accent="warning" title="Assistant note">
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

      <SectionTitle eyebrow="Conversations" title="Recent threads" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {threads.length ? (
          threads.map((thread) => (
            <Button
              key={thread.id}
              label={`${thread.title} - ${formatRelativeTime(thread.updatedAt)}`}
              fullWidth={false}
              variant={activeThreadId === thread.id ? 'primary' : 'soft'}
              onPress={() => setActiveThreadId(thread.id)}
            />
          ))
        ) : (
          <RichEmptyState
            title="No threads yet"
            description="Your first question creates the first saved conversation."
          />
        )}
      </View>

      <SectionTitle eyebrow="Answer" title="Current conversation" />
      <View style={{ gap: spacing.sm }}>
        {messages.length ? (
          messages.map((item) => (
            <ConversationBubbleCard
              key={item.id}
              message={item}
              onSpeak={
                item.role === 'ASSISTANT'
                  ? () => {
                      Speech.stop();
                      Speech.speak(item.spokenSummary || item.answer);
                    }
                  : undefined
              }
            />
          ))
        ) : (
          <RichEmptyState
            title="Ask the first question"
            description="Try weather, mandi prices, crop stress, or scheme discovery."
          />
        )}
      </View>

      {lastAssistantMessage?.actionCards?.length ? (
        <SunriseCard accent="soft" title="Suggested actions">
          <ActionCTAGroup
            actions={lastAssistantMessage.actionCards.map((card) => ({
              label: card.ctaLabel,
              variant: card.tone === 'expert' ? 'secondary' : 'soft',
              onPress: () => router.push(card.ctaRoute as never),
            }))}
          />
        </SunriseCard>
      ) : null}
    </PageShell>
  );
}
