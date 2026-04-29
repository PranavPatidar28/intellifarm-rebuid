import { Text, View } from 'react-native';

import { CloudOff } from 'lucide-react-native';

import { formatRelativeTime } from '@/lib/format';
import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

export function OfflineBanner({
  cachedAt,
  pendingLabel,
}: {
  cachedAt?: string | null;
  pendingLabel?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: semanticColors.warning,
        backgroundColor: semanticColors.warningSoft,
      }}
    >
      <CloudOff color={semanticColors.warning} size={18} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 13,
          }}
        >
          Offline safe mode
        </Text>
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {cachedAt
            ? `Showing saved advice from ${formatRelativeTime(cachedAt)}.`
            : 'Showing saved advice until the network returns.'}
          {pendingLabel ? ` ${pendingLabel}` : ''}
        </Text>
      </View>
    </View>
  );
}
