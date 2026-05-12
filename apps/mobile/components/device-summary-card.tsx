import { ActivityIndicator, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { ChevronRight, Cpu, Droplets, WifiOff } from 'lucide-react-native';

import { Button } from '@/components/button';
import { InsetCard } from '@/components/inset-card';
import { MotionPressable } from '@/components/motion-pressable';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet } from '@/lib/api';
import type { FarmDeviceResponse, FarmPlot } from '@/lib/api-types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function DeviceSummaryCard({ plot }: { plot: FarmPlot }) {
  const router = useRouter();
  const { token } = useSession();

  const deviceQuery = useCachedQuery({
    cacheKey: `device-summary:${plot.id}`,
    queryKey: ['device-summary', token, plot.id],
    enabled: Boolean(token),
    queryFn: () => apiGet<FarmDeviceResponse>(`/farm-plots/${plot.id}/device`, token),
  });

  const isLoading = deviceQuery.isLoading;
  const device = deviceQuery.data?.device;

  if (isLoading) {
    return (
      <InsetCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: typography.bodyStrong, fontSize: 16, color: palette.ink }}>{plot.name}</Text>
          <ActivityIndicator size="small" color={palette.leafDark} />
        </View>
      </InsetCard>
    );
  }

  if (!device) {
    return (
      <InsetCard>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: typography.bodyStrong, fontSize: 16, color: palette.ink }}>{plot.name}</Text>
            <View style={{ backgroundColor: palette.parchment, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm }}>
              <Text style={{ fontFamily: typography.bodyStrong, fontSize: 11, color: palette.inkSoft }}>NO DEVICE</Text>
            </View>
          </View>
          <Text style={{ fontFamily: typography.bodyRegular, fontSize: 13, color: palette.inkSoft }}>
            No smart irrigation node is linked to this plot.
          </Text>
          <Button
            label="Pair New Device"
            variant="secondary"
            onPress={() => {
              // TODO: Navigate to pairing flow
              alert('Pairing flow coming soon!');
            }}
          />
        </View>
      </InsetCard>
    );
  }

  const isOnline = device.status === 'ONLINE';

  return (
    <MotionPressable
      onPress={() => router.push(`/device/${plot.id}` as any)}
      style={{
        backgroundColor: palette.white,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: palette.outline,
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: typography.bodyStrong, fontSize: 16, color: palette.ink }}>{plot.name}</Text>
          <Text style={{ fontFamily: typography.bodyRegular, fontSize: 12, color: palette.inkSoft }}>{device.name}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: isOnline ? palette.leafMist : palette.parchment,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: radii.sm,
          }}
        >
          {isOnline ? (
            <Cpu size={12} color={palette.leafDark} />
          ) : (
            <WifiOff size={12} color={palette.inkSoft} />
          )}
          <Text style={{ fontFamily: typography.bodyStrong, fontSize: 11, color: isOnline ? palette.leafDark : palette.inkSoft }}>
            {device.status}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1, backgroundColor: palette.parchment, borderRadius: radii.md, padding: spacing.sm, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Droplets size={14} color={palette.sky} />
            <Text style={{ fontFamily: typography.bodyRegular, fontSize: 12, color: palette.inkSoft }}>Moisture</Text>
          </View>
          <Text style={{ fontFamily: typography.bodyStrong, fontSize: 18, color: palette.ink }}>
            {device.latestReading?.soilMoisturePercent != null
              ? `${Math.round(device.latestReading.soilMoisturePercent)}%`
              : '--'}
          </Text>
        </View>

        <View style={{ flex: 1, backgroundColor: palette.parchment, borderRadius: radii.md, padding: spacing.sm, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} color={device.pumpState === 'ON' ? palette.leafDark : palette.inkSoft} />
            <Text style={{ fontFamily: typography.bodyRegular, fontSize: 12, color: palette.inkSoft }}>Pump State</Text>
          </View>
          <Text
            style={{
              fontFamily: typography.bodyStrong,
              fontSize: 18,
              color: device.pumpState === 'ON' ? palette.leafDark : palette.ink,
            }}
          >
            {device.pumpState}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.xs }}>
        <Text style={{ fontFamily: typography.bodyStrong, fontSize: 13, color: palette.leafDark }}>
          Manage Device
        </Text>
        <ChevronRight size={16} color={palette.leafDark} />
      </View>
    </MotionPressable>
  );
}
