import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { LocateFixed } from 'lucide-react-native';

import { Button } from '@/components/button';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { apiPost, ApiError } from '@/lib/api';
import type { FarmPlot } from '@/lib/api-types';
import { irrigationOptions, soilOptions } from '@/lib/constants';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export default function PlotSetupRoute() {
  const router = useRouter();
  const { authUser, token, refreshSession } = useSession();
  const location = useDeviceLocation();
  const [name, setName] = useState('North Plot');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [area, setArea] = useState('2.5');
  const [irrigationType, setIrrigationType] = useState('RAIN_FED');
  const [soilType, setSoilType] = useState('NOT_SURE');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setState(authUser?.state ?? '');
    setDistrict(authUser?.district ?? '');
    setVillage(authUser?.village ?? '');
  }, [authUser]);

  return (
    <PageShell
      eyebrow="Step 2 of 3"
      title="Add your first plot"
      subtitle="One good plot record is enough to unlock weather, mandi distance, and crop-stage guidance."
      hero={
        <SunriseCard accent="warning" title="Location improves quality">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            GPS is optional. You can still continue with village details only, then refine the plot later.
          </Text>
        </SunriseCard>
      }
    >
      <TextField label="Plot name" value={name} onChangeText={setName} />
      <TextField label="State" value={state} onChangeText={setState} />
      <TextField label="District" value={district} onChangeText={setDistrict} />
      <TextField label="Village" value={village} onChangeText={setVillage} />
      <TextField
        label="Approx. area"
        value={area}
        onChangeText={setArea}
        keyboardType="numeric"
        helper="Area is stored as a number for the current backend contract."
      />
      <OptionSelector
        title="Irrigation type"
        value={irrigationType}
        options={irrigationOptions.map((item) => ({
          value: item.value,
          label: item.label,
        }))}
        onChange={setIrrigationType}
      />
      <OptionSelector
        title="Soil type"
        value={soilType}
        options={soilOptions.map((item) => ({ value: item.value, label: item.label }))}
        onChange={setSoilType}
      />
      <View style={{ gap: spacing.sm }}>
        <Button
          label="Use current GPS"
          variant="soft"
          icon={<LocateFixed color={palette.ink} size={18} />}
          onPress={() => {
            void location.refreshLocation();
          }}
        />
        {location.message ? (
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
            }}
          >
            {location.message}
          </Text>
        ) : null}
      </View>
      {message ? (
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
          }}
        >
          {message}
        </Text>
      ) : null}
      <Button
        label="Save plot and continue"
        loading={busy}
        onPress={() => {
          if (!token) {
            return;
          }

          setBusy(true);
          setMessage(null);

          void apiPost<{ farmPlot: FarmPlot }>(
            '/farm-plots',
            {
              name,
              state,
              district,
              village,
              area: Number(area),
              latitude: location.location?.latitude ?? null,
              longitude: location.location?.longitude ?? null,
              irrigationType,
              soilType,
            },
            token,
          )
            .then(async (response) => {
              await refreshSession();
              router.replace({
                pathname: '/season',
                params: { farmPlotId: response.farmPlot.id },
              });
            })
            .catch((error) => {
              setMessage(
                error instanceof ApiError
                  ? error.message
                  : 'Could not save the plot right now.',
              );
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      />
    </PageShell>
  );
}

function OptionSelector({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 14,
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((item) => {
          const active = item.value === value;
          return (
            <ButtonChip
              key={item.value}
              label={item.label}
              active={active}
              onPress={() => onChange(item.value)}
            />
          );
        })}
      </View>
    </View>
  );
}

function ButtonChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        minWidth: '30%',
      }}
    >
      <Button
        label={label}
        fullWidth={false}
        variant={active ? 'primary' : 'soft'}
        onPress={onPress}
      />
    </View>
  );
}
