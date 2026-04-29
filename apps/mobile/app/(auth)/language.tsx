import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { LanguageCard } from '@/components/language-card';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { languages } from '@/lib/constants';
import { resolveRouteForStep } from '@/lib/routing';
import { palette, spacing, typography } from '@/theme/tokens';

export default function LanguageSelectionRoute() {
  const router = useRouter();
  const { language, setLanguage, onboardingStep } = useSession();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(language);

  const enabledSelection = useMemo(
    () => (selectedLanguage && ['en', 'hi'].includes(selectedLanguage) ? selectedLanguage : null),
    [selectedLanguage],
  );

  return (
    <PageShell
      eyebrow="Step 1"
      title="Choose your language"
      subtitle="Use a large card selection now. More regional languages are visible and on the way."
    >
      <SunriseCard accent="brand" title="Voice-first, field-friendly">
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          Start with the language that feels easiest in the field. English and Hindi are fully active in this MVP.
        </Text>
      </SunriseCard>
      <View style={{ gap: spacing.md }}>
        {languages.map((item) => (
          <LanguageCard
            key={item.code}
            label={item.label}
            nativeLabel={item.nativeLabel}
            active={selectedLanguage === item.code}
            enabled={item.enabled}
            onPress={() => {
              if (item.enabled) {
                setSelectedLanguage(item.code);
              }
            }}
          />
        ))}
      </View>
      <Button
        label={enabledSelection ? 'Continue' : 'Select English or Hindi'}
        disabled={!enabledSelection}
        onPress={() => {
          if (!enabledSelection) {
            return;
          }

          setLanguage(enabledSelection);
          router.replace(resolveRouteForStep(onboardingStep === 'language' ? 'login' : onboardingStep));
        }}
      />
    </PageShell>
  );
}
