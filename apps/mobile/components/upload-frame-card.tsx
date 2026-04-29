import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ImagePlus } from 'lucide-react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function UploadFrameCard({
  title,
  caption,
  preview,
  onPress,
}: {
  title: string;
  caption: string;
  preview?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 164,
        padding: spacing.lg,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: palette.outlineStrong,
        backgroundColor: palette.white,
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radii.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.parchmentSoft,
        }}
      >
        <ImagePlus color={palette.leafDark} size={20} />
      </View>
      <View style={{ gap: 4 }}>
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 15,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {caption}
        </Text>
      </View>
      {preview}
    </Pressable>
  );
}
