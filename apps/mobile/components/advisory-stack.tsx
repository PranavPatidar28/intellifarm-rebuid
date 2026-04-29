import { Text, View } from 'react-native';

import { AlertTriangle, CircleAlert, ShieldCheck } from 'lucide-react-native';

import type { WeatherSummary } from '@/lib/api-types';
import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

export function AdvisoryStack({
  advisories,
}: {
  advisories: WeatherSummary['advisories'];
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {advisories.map((advisory) => {
        const tone =
          advisory.severity === 'HIGH' || advisory.severity === 'CRITICAL'
            ? { backgroundColor: 'rgba(255,238,230,0.96)', color: semanticColors.danger }
            : advisory.severity === 'MEDIUM'
              ? { backgroundColor: 'rgba(255,246,219,0.96)', color: semanticColors.warning }
              : { backgroundColor: 'rgba(230,245,236,0.96)', color: semanticColors.success };

        return (
          <View
            key={`${advisory.title}-${advisory.message}`}
            style={{
              padding: spacing.md,
              borderRadius: radii.lg,
              backgroundColor: tone.backgroundColor,
              gap: spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {advisory.severity === 'HIGH' || advisory.severity === 'CRITICAL' ? (
                <AlertTriangle color={tone.color} size={16} />
              ) : advisory.severity === 'MEDIUM' ? (
                <CircleAlert color={tone.color} size={16} />
              ) : (
                <ShieldCheck color={tone.color} size={16} />
              )}
              <Text
                style={{
                  color: tone.color,
                  fontFamily: typography.bodyStrong,
                  fontSize: 13,
                }}
              >
                {advisory.title}
              </Text>
            </View>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {advisory.message}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyStrong,
                fontSize: 12,
              }}
            >
              {advisory.recommendedAction}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
