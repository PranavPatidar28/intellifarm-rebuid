import { Pressable, Text, View } from 'react-native';

import { Image } from 'expo-image';
import { Volume2 } from 'lucide-react-native';

import { Button } from '@/components/button';
import type { AssistantThreadResponse } from '@/lib/api-types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type Message = AssistantThreadResponse['thread']['messages'][number] & {
  pendingState?: 'sending' | 'typing';
};

export function ConversationBubbleCard({
  message,
  onSpeak,
  onOpenRoute,
  mediaHeaders,
}: {
  message: Message;
  onSpeak?: () => void;
  onOpenRoute?: (route: string) => void;
  mediaHeaders?: Record<string, string>;
}) {
  const assistant = message.role === 'ASSISTANT';
  const answer =
    typeof message.answer === 'string' && message.answer.trim()
      ? message.answer
      : message.content;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const sources = Array.isArray(message.sources) ? message.sources : [];
  const actionCards = Array.isArray(message.actionCards) ? message.actionCards : [];
  const safetyLevel = message.safetyLevel ?? 'INFO';
  const safetyTone =
    safetyLevel === 'ESCALATE'
      ? palette.terracotta
      : safetyLevel === 'CAUTION'
        ? palette.mustard
        : palette.sky;

  return (
    <View
      style={{
        alignSelf: assistant ? 'stretch' : 'flex-end',
        gap: spacing.xs,
      }}
    >
      <View
        style={{
          alignSelf: assistant ? 'stretch' : 'flex-end',
          maxWidth: '94%',
          padding: spacing.md,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          backgroundColor: assistant ? 'rgba(255,255,255,0.94)' : palette.leaf,
          borderWidth: 1,
          borderColor: assistant ? palette.outline : 'transparent',
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text
              selectable
              style={{
                color: assistant ? palette.ink : 'rgba(255,255,255,0.84)',
                fontFamily: typography.bodyStrong,
                fontSize: 12,
                textTransform: 'uppercase',
              }}
            >
              {assistant ? 'IntelliFarm' : 'You'}
            </Text>
            {message.pendingState ? (
              <Text
                selectable
                style={{
                  color: assistant ? palette.inkSoft : 'rgba(255,255,255,0.72)',
                  fontFamily: typography.bodyRegular,
                  fontSize: 11,
                }}
              >
                {message.pendingState === 'typing' ? 'Thinking...' : 'Sending...'}
              </Text>
            ) : null}
          </View>
          {assistant && onSpeak ? (
            <Pressable onPress={onSpeak}>
              <Volume2 color={palette.leaf} size={16} />
            </Pressable>
          ) : null}
        </View>

        {assistant ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {message.confidenceLabel ? (
              <Chip
                label={`Confidence ${message.confidenceLabel.toLowerCase()}`}
                color={palette.leafDark}
                backgroundColor={palette.leafMist}
              />
            ) : null}
            <Chip
              label={safetyLevel.toLowerCase()}
              color={assistant ? safetyTone : palette.white}
              backgroundColor={
                safetyLevel === 'ESCALATE'
                  ? palette.terracottaSoft
                  : safetyLevel === 'CAUTION'
                    ? palette.mustardSoft
                    : palette.skySoft
              }
            />
          </View>
        ) : null}

        <Text
          selectable
          style={{
            color: assistant ? palette.ink : palette.white,
            fontFamily: typography.bodyRegular,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          {assistant ? answer : message.content}
        </Text>

        {attachments.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {attachments.map((attachment) => (
              <View
                key={`${message.id}-${attachment.url}`}
                style={{
                  width: 108,
                  height: 108,
                  overflow: 'hidden',
                  borderRadius: radii.md,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: assistant ? palette.outline : 'rgba(255,255,255,0.2)',
                  backgroundColor: assistant ? palette.parchmentSoft : 'rgba(255,255,255,0.1)',
                }}
              >
                <Image
                  source={buildMediaSource(attachment.url, mediaHeaders)}
                  contentFit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
            ))}
          </View>
        ) : null}

        {assistant && sources.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {sources.map((source) => (
              <Chip
                key={`${message.id}-${source.type}-${source.referenceId ?? source.label}`}
                label={source.label}
                color={palette.inkSoft}
                backgroundColor={palette.parchmentSoft}
              />
            ))}
          </View>
        ) : null}

        {assistant && actionCards.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {actionCards.map((card) => (
              <Button
                key={`${message.id}-${card.ctaRoute}-${card.ctaLabel}`}
                label={card.ctaLabel}
                fullWidth={false}
                variant={card.tone === 'expert' ? 'secondary' : 'soft'}
                onPress={() => onOpenRoute?.(card.ctaRoute)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Chip({
  label,
  color,
  backgroundColor,
}: {
  label: string;
  color: string;
  backgroundColor: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
        borderCurve: 'continuous',
        backgroundColor,
      }}
    >
      <Text
        selectable
        style={{
          color,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function buildMediaSource(url: string, mediaHeaders?: Record<string, string>) {
  if (url.startsWith('file://')) {
    return url;
  }

  return mediaHeaders ? { uri: url, headers: mediaHeaders } : url;
}
