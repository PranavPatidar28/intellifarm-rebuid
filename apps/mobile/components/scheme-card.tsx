import { Linking, Text, View } from 'react-native';

import { BanknoteArrowUp } from 'lucide-react-native';

import { Button } from '@/components/button';
import type { SchemesResponse } from '@/lib/api-types';
import { palette, radii, semanticColors, shadow, spacing, typography } from '@/theme/tokens';

export function SchemeCard({
  scheme,
  onDetails,
}: {
  scheme: SchemesResponse['schemes'][number];
  onDetails?: () => void;
}) {
  return (
    <View
      style={{
        padding: spacing.lg,
        gap: spacing.md,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: 'rgba(255,255,255,0.96)',
        boxShadow: shadow.soft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: semanticColors.schemeSoft,
          }}
        >
          <BanknoteArrowUp color={semanticColors.scheme} size={20} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              color: semanticColors.scheme,
              fontFamily: typography.bodyStrong,
              fontSize: 12,
              textTransform: 'uppercase',
            }}
          >
            {scheme.category}
          </Text>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 17,
            }}
          >
            {scheme.title}
          </Text>
        </View>
      </View>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 14,
        }}
      >
        {scheme.benefitSummary}
      </Text>
      <Text
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyRegular,
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        {scheme.whyRelevant}
      </Text>
      <Text
        style={{
          color:
            scheme.priority === 'HIGH'
              ? semanticColors.danger
              : scheme.priority === 'MEDIUM'
                ? semanticColors.warning
                : semanticColors.success,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
        }}
      >
        {scheme.priority === 'HIGH'
          ? 'High priority'
          : scheme.priority === 'MEDIUM'
            ? 'Worth checking'
            : 'Optional support'}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Check details"
          onPress={onDetails}
          variant="soft"
          fullWidth={false}
        />
        <Button
          label="Official link"
          onPress={() => {
            void Linking.openURL(scheme.officialLink);
          }}
          variant="ghost"
          fullWidth={false}
        />
      </View>
    </View>
  );
}
