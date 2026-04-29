import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { apiPatch, ApiError } from '@/lib/api';
import { palette, spacing, typography } from '@/theme/tokens';

export default function ProfileSetupRoute() {
  const router = useRouter();
  const { authUser, token, refreshSession } = useSession();
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(authUser?.name ?? '');
    setState(authUser?.state ?? '');
    setDistrict(authUser?.district ?? '');
    setVillage(authUser?.village ?? '');
  }, [authUser]);

  return (
    <PageShell
      eyebrow="Step 1 of 3"
      title="Tell us about you"
      subtitle="Keep this light. These details localize weather, schemes, support, and weekly planning."
      hero={
        <SunriseCard accent="info" title="Low paperwork, strong context">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            You can edit these later. Right now we only need enough to make the farm guidance feel relevant and trustworthy.
          </Text>
        </SunriseCard>
      }
    >
      <TextField label="Farmer name" value={name} onChangeText={setName} />
      <TextField label="State" value={state} onChangeText={setState} />
      <TextField label="District" value={district} onChangeText={setDistrict} />
      <TextField label="Village" value={village} onChangeText={setVillage} />
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
        label="Save and continue"
        loading={busy}
        onPress={() => {
          if (!token) {
            return;
          }

          setBusy(true);
          setMessage(null);

          void apiPatch(
            '/me',
            {
              name,
              preferredLanguage: authUser?.preferredLanguage ?? 'en',
              state,
              district,
              village,
            },
            token,
          )
            .then(async () => {
              await refreshSession();
              router.replace('/plot');
            })
            .catch((error) => {
              setMessage(
                error instanceof ApiError
                  ? error.message
                  : 'Could not save the farmer profile right now.',
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
