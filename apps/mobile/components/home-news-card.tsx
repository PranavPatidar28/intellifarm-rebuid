import { Text, View } from 'react-native';

import {
  ArrowRight,
  Bell,
  CloudSun,
  FileHeart,
  ShieldAlert,
  Sparkles,
  Wallet,
} from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { MetricBadge } from '@/components/metric-badge';
import { MotionPressable } from '@/components/motion-pressable';
import type { HomeNewsItem } from '@/lib/home-news';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function HomeNewsCard({
  items,
  onOpenItem,
  onViewAllAlerts,
}: {
  items: HomeNewsItem[];
  onOpenItem: (item: HomeNewsItem) => void;
  onViewAllAlerts: () => void;
}) {
  const leadItem = items[0] ?? null;
  const supportingItems = items.slice(1, 3);

  return (
    <InsetCard padding={14} borderColor="rgba(217, 177, 93, 0.26)">
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: palette.mustard,
                fontFamily: typography.bodyStrong,
                fontSize: 11,
                textTransform: 'uppercase',
              }}
            >
              News
            </Text>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 16,
              }}
            >
              Latest updates
            </Text>
          </View>

          <MotionPressable
            onPress={onViewAllAlerts}
            contentStyle={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyStrong,
                fontSize: 12,
              }}
            >
              All alerts
            </Text>
            <ArrowRight color={palette.inkSoft} size={14} />
          </MotionPressable>
        </View>

        {leadItem ? (
          <MotionPressable
            onPress={() => onOpenItem(leadItem)}
          >
            <View
              style={{
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: 'rgba(217, 177, 93, 0.22)',
                backgroundColor: palette.mustardSoft,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <View style={{ flexDirection: 'row', flex: 1, gap: spacing.sm }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: palette.white,
                    }}
                  >
                    {renderNewsIcon(leadItem.iconKind)}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        color: palette.inkMuted,
                        fontFamily: typography.bodyStrong,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}
                    >
                      {leadItem.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: palette.ink,
                        fontFamily: typography.bodyStrong,
                        fontSize: 15,
                      }}
                    >
                      {leadItem.title}
                    </Text>
                  </View>
                </View>
                <MetricBadge label={leadItem.badgeLabel} tone={leadItem.badgeTone} />
              </View>

              <Text
                numberOfLines={2}
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {leadItem.summary}
              </Text>
            </View>
          </MotionPressable>
        ) : (
          <View
            style={{
              gap: spacing.xs,
              paddingVertical: spacing.xs,
            }}
          >
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 14,
              }}
            >
              No major updates right now
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              Alerts, mandi movement, and weather updates will show up here as they matter.
            </Text>
          </View>
        )}

        {supportingItems.length ? (
          <View style={{ gap: spacing.xs }}>
            {supportingItems.map((item) => (
              <MotionPressable
                key={item.id}
                onPress={() => onOpenItem(item)}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.sm,
                    borderRadius: radii.lg,
                    borderCurve: 'continuous',
                    backgroundColor: palette.white,
                    borderWidth: 1,
                    borderColor: palette.outline,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: palette.parchmentSoft,
                    }}
                  >
                    {renderNewsIcon(item.iconKind, 16)}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: palette.ink,
                        fontFamily: typography.bodyStrong,
                        fontSize: 13,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: palette.inkSoft,
                        fontFamily: typography.bodyRegular,
                        fontSize: 12,
                      }}
                    >
                      {item.badgeLabel} - {item.summary}
                    </Text>
                  </View>
                  <ArrowRight color={palette.inkMuted} size={14} />
                </View>
              </MotionPressable>
            ))}
          </View>
        ) : null}
      </View>
    </InsetCard>
  );
}

function renderNewsIcon(kind: HomeNewsItem['iconKind'], size = 18) {
  if (kind === 'weather') {
    return <CloudSun color={palette.sky} size={size} />;
  }

  if (kind === 'market') {
    return <Wallet color={palette.mustard} size={size} />;
  }

  if (kind === 'disease') {
    return <ShieldAlert color={palette.terracotta} size={size} />;
  }

  if (kind === 'scheme') {
    return <FileHeart color={palette.lilac} size={size} />;
  }

  if (kind === 'task') {
    return <Bell color={palette.leafDark} size={size} />;
  }

  return <Sparkles color={palette.leafDark} size={size} />;
}
