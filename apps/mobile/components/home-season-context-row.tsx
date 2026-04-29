import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChevronDown, ChevronUp, Sprout } from 'lucide-react-native';

import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

type SeasonSwitcherItem = {
  cropSeasonId: string;
  cropName: string;
};

export function HomeSeasonContextRow({
  cropName,
  currentStage,
  farmPlotName,
  stageProgressPercent,
  selectedSeasonId,
  seasonOptions,
  onSeasonChange,
}: {
  cropName: string;
  currentStage: string;
  farmPlotName: string;
  stageProgressPercent: number;
  selectedSeasonId: string;
  seasonOptions: SeasonSwitcherItem[];
  onSeasonChange: (cropSeasonId: string) => void;
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const hasMultipleSeasons = seasonOptions.length > 1;
  const progress = Math.max(0, Math.min(100, stageProgressPercent));
  const summaryText = useMemo(
    () => `${cropName} / ${currentStage} / ${farmPlotName}`,
    [cropName, currentStage, farmPlotName],
  );
  const activeSeason = seasonOptions.find((season) => season.cropSeasonId === selectedSeasonId);

  return (
    <View
      style={{
        overflow: 'hidden',
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.white,
        boxShadow: shadow.soft,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress}%`,
          backgroundColor: 'rgba(47, 125, 78, 0.14)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: `${Math.max(progress - 4, 0)}%`,
          top: 0,
          bottom: 0,
          width: 18,
          backgroundColor: 'rgba(47, 125, 78, 0.08)',
        }}
      />

      <View
        style={{
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 10,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.white,
            borderWidth: 1,
            borderColor: 'rgba(47, 125, 78, 0.12)',
          }}
        >
          <Sprout color={palette.leafDark} size={16} />
        </View>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 14,
          }}
        >
          {summaryText}
        </Text>

        {hasMultipleSeasons ? (
          <Pressable onPress={() => setSwitcherOpen((current) => !current)}>
            <View
              style={{
                minHeight: 34,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: spacing.sm,
                borderRadius: radii.pill,
                borderCurve: 'continuous',
                backgroundColor: switcherOpen ? palette.leaf : 'rgba(255,255,255,0.86)',
                borderWidth: 1,
                borderColor: switcherOpen ? palette.leafDark : palette.outline,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  maxWidth: 78,
                  color: switcherOpen ? palette.white : palette.leafDark,
                  fontFamily: typography.bodyStrong,
                  fontSize: 12,
                }}
              >
                {activeSeason?.cropName ?? 'Switch'}
              </Text>
              {switcherOpen ? (
                <ChevronUp color={switcherOpen ? palette.white : palette.leafDark} size={14} />
              ) : (
                <ChevronDown
                  color={switcherOpen ? palette.white : palette.leafDark}
                  size={14}
                />
              )}
            </View>
          </Pressable>
        ) : null}
      </View>

      {hasMultipleSeasons && switcherOpen ? (
        <View
          style={{
            gap: spacing.xs,
            paddingHorizontal: spacing.sm,
            paddingTop: 0,
            paddingBottom: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: 'rgba(30, 42, 34, 0.06)',
            backgroundColor: 'rgba(255,255,255,0.72)',
          }}
        >
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyStrong,
              fontSize: 11,
              textTransform: 'uppercase',
            }}
          >
            Choose active season
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {seasonOptions.map((season) => {
              const active = season.cropSeasonId === selectedSeasonId;

              return (
                <Pressable
                  key={season.cropSeasonId}
                  onPress={() => {
                    onSeasonChange(season.cropSeasonId);
                    setSwitcherOpen(false);
                  }}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 8,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: active ? palette.leaf : palette.outline,
                    backgroundColor: active ? palette.leaf : palette.white,
                  }}
                >
                  <Text
                    style={{
                      color: active ? palette.white : palette.inkSoft,
                      fontFamily: active ? typography.bodyStrong : typography.bodyRegular,
                      fontSize: 12,
                    }}
                  >
                    {season.cropName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
