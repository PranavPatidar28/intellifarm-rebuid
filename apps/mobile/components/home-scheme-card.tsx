import { Pressable, Text, View } from 'react-native';

import { ArrowRight, FileHeart } from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { MetricBadge } from '@/components/metric-badge';
import type { HomeSchemeHighlight } from '@/lib/home-news';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function HomeSchemeCard({
  scheme,
  loading,
  onOpenScheme,
  onViewAllSchemes,
}: {
  scheme: HomeSchemeHighlight | null;
  loading?: boolean;
  onOpenScheme: () => void;
  onViewAllSchemes: () => void;
}) {
  return (
    <InsetCard padding={14} borderColor="rgba(174, 162, 214, 0.28)">
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
                color: palette.lilac,
                fontFamily: typography.bodyStrong,
                fontSize: 11,
                textTransform: 'uppercase',
              }}
            >
              Schemes
            </Text>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 16,
              }}
            >
              Support you can use
            </Text>
          </View>

          <MetricBadge
            label={
              scheme
                ? scheme.badgeLabel
                : loading
                  ? 'Finding'
                  : 'Browse'
            }
            tone={scheme?.badgeTone ?? 'neutral'}
          />
        </View>

        {scheme ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: palette.lilacSoft,
                }}
              >
                <FileHeart color={palette.lilac} size={18} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: palette.inkMuted,
                    fontFamily: typography.bodyStrong,
                    fontSize: 11,
                    textTransform: 'uppercase',
                  }}
                >
                  {scheme.eyebrow}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 15,
                    lineHeight: 20,
                  }}
                >
                  {scheme.title}
                </Text>
              </View>
            </View>

            <Text
              numberOfLines={3}
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {scheme.summary}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <Pressable
                onPress={onOpenScheme}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <View
                  style={{
                    minHeight: 36,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.pill,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: 'rgba(174, 162, 214, 0.34)',
                    backgroundColor: palette.lilacSoft,
                  }}
                >
                  <Text
                    style={{
                      color: palette.ink,
                      fontFamily: typography.bodyStrong,
                      fontSize: 12,
                    }}
                  >
                    {scheme.ctaLabel}
                  </Text>
                  <ArrowRight color={palette.ink} size={14} />
                </View>
              </Pressable>

              <Pressable
                onPress={onViewAllSchemes}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <View
                  style={{
                    minHeight: 36,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.pill,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.outlineStrong,
                    backgroundColor: palette.white,
                  }}
                >
                  <Text
                    style={{
                      color: palette.inkSoft,
                      fontFamily: typography.bodyStrong,
                      fontSize: 12,
                    }}
                  >
                    View all schemes
                  </Text>
                </View>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 14,
              }}
            >
              {loading ? 'Looking for relevant support...' : 'No highlighted scheme right now'}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              Browse current scheme options for your crop and location whenever you want to explore official support.
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <Pressable
                onPress={onViewAllSchemes}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <View
                  style={{
                    minHeight: 36,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.pill,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.outlineStrong,
                    backgroundColor: palette.white,
                  }}
                >
                  <Text
                    style={{
                      color: palette.inkSoft,
                      fontFamily: typography.bodyStrong,
                      fontSize: 12,
                    }}
                  >
                    View all schemes
                  </Text>
                  <ArrowRight color={palette.inkSoft} size={14} />
                </View>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </InsetCard>
  );
}
