import { Pressable, ScrollView, Text, View } from 'react-native';

import { CheckCircle2, Sprout } from 'lucide-react-native';

import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

type SeasonOption = {
  id: string;
  cropName: string;
  currentStage: string;
  farmPlotName: string;
  status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';
};

export function SeasonSwitcherStrip({
  seasons,
  selectedSeasonId,
  onSelect,
}: {
  seasons: SeasonOption[];
  selectedSeasonId: string;
  onSelect: (seasonId: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm }}
    >
      {seasons.map((season) => {
        const active = season.id === selectedSeasonId;

        return (
          <Pressable
            key={season.id}
            onPress={() => onSelect(season.id)}
            style={{
              minWidth: 178,
              padding: spacing.md,
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              backgroundColor: active ? palette.leafDark : 'rgba(255,255,255,0.92)',
              borderWidth: 1,
              borderColor: active ? 'transparent' : palette.outline,
              boxShadow: shadow.soft,
              gap: spacing.xs,
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
                  color: active ? palette.white : palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              >
                {season.cropName}
              </Text>
              {active ? (
                <CheckCircle2 color={palette.mustardSoft} size={18} />
              ) : (
                <Sprout color={palette.leaf} size={17} />
              )}
            </View>
            <Text
              style={{
                color: active ? 'rgba(255,255,255,0.82)' : palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {season.currentStage}
            </Text>
            <Text
              style={{
                color: active ? 'rgba(255,255,255,0.66)' : palette.inkMuted,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              {season.farmPlotName}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
