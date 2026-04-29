import { Stack, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PageShell } from '@/components/page-shell';
import { palette } from '@/theme/tokens';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <PageShell
        eyebrow="Lost path"
        title="This field path does not exist"
        subtitle="Head back to the farm dashboard, schemes, or crop plan."
      >
        <EmptyState
          title="Nothing is planted here yet"
          description="The link may be outdated, or the route is not part of the current demo flow."
        />
        <View style={{ gap: 12 }}>
          <Button label="Open home dashboard" onPress={() => router.replace('/home')} />
          <Text style={{ color: palette.inkSoft, textAlign: 'center' }}>
            IntelliFarm routes stay focused on the demo-ready farmer journey.
          </Text>
        </View>
      </PageShell>
    </>
  );
}
