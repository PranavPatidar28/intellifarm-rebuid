import { Modal, Pressable, Text, View } from 'react-native';

import { CheckCircle2 } from 'lucide-react-native';

import { Button } from '@/components/button';
import { GradientFeatureCard } from '@/components/gradient-feature-card';
import { gradients, palette, radii, spacing, typography } from '@/theme/tokens';

export function ProgressCelebrationSheet({
  visible,
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(24,34,23,0.28)',
          padding: spacing.lg,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <GradientFeatureCard colors={gradients.sunriseField} padding={22}>
            <View style={{ gap: spacing.md }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.pill,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                }}
              >
                <CheckCircle2 color={palette.white} size={28} />
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text
                  style={{
                    color: palette.white,
                    fontFamily: typography.display,
                    fontSize: 24,
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.86)',
                    fontFamily: typography.bodyRegular,
                    fontSize: 14,
                    lineHeight: 21,
                  }}
                >
                  {message}
                </Text>
              </View>
              <View style={{ gap: spacing.sm }}>
                <Button label={primaryLabel} variant="soft" onPress={onPrimaryPress} />
                {secondaryLabel && onSecondaryPress ? (
                  <Button
                    label={secondaryLabel}
                    variant="ghost"
                    onPress={onSecondaryPress}
                  />
                ) : null}
              </View>
            </View>
          </GradientFeatureCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
