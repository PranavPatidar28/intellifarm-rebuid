import { Text, View } from 'react-native';

import { Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet } from '@/lib/api';
import type { SchemesResponse } from '@/lib/api-types';
import { palette, spacing, typography } from '@/theme/tokens';
import { Linking } from 'react-native';

export default function SchemeDetailRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();

  const schemesQuery = useCachedQuery({
    cacheKey: 'schemes:default',
    queryKey: ['schemes', token, 'detail-default'],
    enabled: Boolean(token),
    queryFn: () => apiGet<SchemesResponse>('/schemes', token),
  });

  const scheme = schemesQuery.data?.schemes.find((item) => item.id === params.id) ?? null;

  if (!scheme) {
    return (
      <PageShell
        eyebrow="Scheme detail"
        title="Scheme not available"
        subtitle="The scheme detail could not be restored from the current saved list."
      >
        <SunriseCard accent="scheme" title="Try again">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            Return to the schemes list and open another item after the latest list refresh completes.
          </Text>
        </SunriseCard>
      </PageShell>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: scheme.title }} />
      <PageShell
        eyebrow="Scheme detail"
        title={scheme.title}
        subtitle={`${scheme.category} · ${scheme.applicableState}`}
      >
        <SunriseCard accent="scheme" title="What is this scheme?">
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyRegular,
              fontSize: 15,
              lineHeight: 23,
            }}
          >
            {scheme.description}
          </Text>
        </SunriseCard>
        <SunriseCard accent="info" title="Who should check it next">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            Farmers in {scheme.applicableState} who want support around {scheme.category.toLowerCase()} should verify the latest official criteria before applying.
          </Text>
        </SunriseCard>
        <SunriseCard accent="warning" title="Simple next steps">
          <View style={{ gap: spacing.sm }}>
            <Text style={bulletStyle}>Read the official scheme page once.</Text>
            <Text style={bulletStyle}>Check the required documents and deadlines.</Text>
            <Text style={bulletStyle}>Ask for help locally if the wording feels unclear.</Text>
          </View>
        </SunriseCard>
        <Button
          label="Open official website"
          onPress={() => {
            void Linking.openURL(scheme.officialLink);
          }}
        />
      </PageShell>
    </>
  );
}

const bulletStyle = {
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 14,
  lineHeight: 21,
};
