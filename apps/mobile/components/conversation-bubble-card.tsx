import { Pressable, Text, View } from 'react-native';

import { Volume2 } from 'lucide-react-native';

import type { AssistantThreadResponse } from '@/lib/api-types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type Message = AssistantThreadResponse['thread']['messages'][number];

export function ConversationBubbleCard({
  message,
  onSpeak,
}: {
  message: Message;
  onSpeak?: () => void;
}) {
  const assistant = message.role === 'ASSISTANT';

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
          maxWidth: '92%',
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
          <Text
            style={{
              color: assistant ? palette.ink : 'rgba(255,255,255,0.84)',
              fontFamily: typography.bodyStrong,
              fontSize: 12,
              textTransform: 'uppercase',
            }}
          >
            {assistant ? 'IntelliFarm' : 'You'}
          </Text>
          {assistant && onSpeak ? (
            <Pressable onPress={onSpeak}>
              <Volume2 color={palette.leaf} size={16} />
            </Pressable>
          ) : null}
        </View>
        <Text
          style={{
            color: assistant ? palette.ink : palette.white,
            fontFamily: typography.bodyRegular,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          {assistant ? message.answer : message.content}
        </Text>
        {assistant && message.sources.length ? (
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
            }}
          >
            Sources: {message.sources.map((source) => source.label).join(', ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
