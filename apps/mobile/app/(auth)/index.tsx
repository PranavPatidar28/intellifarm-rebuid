import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { CloudSun, Sprout, Wheat } from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { LoadingScreen } from '@/components/loading-screen';
import { useSession } from '@/features/session/session-provider';
import { resolveRouteForStep } from '@/lib/routing';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

export default function SplashRoute() {
  const router = useRouter();
  const { bootstrapped, onboardingStep } = useSession();

  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace(resolveRouteForStep(onboardingStep));
    }, 1800);

    return () => clearTimeout(timer);
  }, [bootstrapped, onboardingStep, router]);

  if (!bootstrapped) {
    return <LoadingScreen label="Gathering your farm context" />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.canvas,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        justifyContent: 'center',
        gap: spacing.xl,
      }}
    >
      <View
        style={{
          alignSelf: 'center',
          width: 236,
          height: 236,
          borderRadius: 999,
          backgroundColor: palette.parchmentSoft,
          borderWidth: 1,
          borderColor: palette.outline,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: shadow.soft,
        }}
      >
        <View
          style={{
            width: 180,
            height: 180,
            borderRadius: 999,
            backgroundColor: palette.leafMist,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 136,
              height: 72,
              borderRadius: radii.xxl,
              backgroundColor: palette.mintStrong,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: spacing.md,
            }}
          >
            <Sprout color={palette.leafDark} size={26} />
            <CloudSun color={palette.sky} size={24} />
            <Wheat color={palette.mustard} size={24} />
          </View>
          <View
            style={{
              width: 150,
              height: 24,
              borderRadius: radii.pill,
              backgroundColor: palette.soil,
            }}
          />
        </View>
      </View>

      <View style={{ gap: spacing.sm, alignItems: 'center' }}>
        <Text
          style={{
            color: palette.inkMuted,
            fontFamily: typography.bodyStrong,
            fontSize: 12,
            textTransform: 'uppercase',
          }}
        >
          Farmer assistant
        </Text>
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.displayBold,
            fontSize: 36,
            lineHeight: 42,
          }}
        >
          IntelliFarm
        </Text>
        <Text
          style={{
            maxWidth: 280,
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 15,
            lineHeight: 22,
            textAlign: 'center',
          }}
        >
          From Sowing to Selling, Smarter Decisions
        </Text>
      </View>

      <InsetCard tone="neutral" padding={16}>
        <View style={{ gap: spacing.md }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 16,
            }}
          >
            Calm weekly farming help
          </Text>
          <SplashFeature
            icon={<Sprout color={palette.leafDark} size={18} />}
            title="Plan your week"
            detail="See the next farm action before the field gets busy."
          />
          <SplashFeature
            icon={<CloudSun color={palette.sky} size={18} />}
            title="Protect the crop"
            detail="Turn weather and disease signals into simpler actions."
          />
          <SplashFeature
            icon={<Wheat color={palette.mustard} size={18} />}
            title="Price with context"
            detail="Compare mandi rates, storage, and support in one place."
          />
        </View>
      </InsetCard>
    </View>
  );
}

function SplashFeature({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View
        style={{
          width: 38,
          height: 38,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.pill,
          backgroundColor: palette.parchmentSoft,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 14,
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
          {detail}
        </Text>
      </View>
    </View>
  );
}
