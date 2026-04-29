import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { ProfileStatusCard } from '@/components/profile-status-card';
import { SelectField } from '@/components/select-field';
import { SheetFormCard } from '@/components/sheet-form-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { apiPost, ApiError } from '@/lib/api';
import type {
  CommunityReportReasonType,
  CommunityReportResponse,
} from '@/lib/api-types';
import { communityReportReasonOptions } from '@/lib/community';
import { storageKeys } from '@/lib/constants';
import { storage } from '@/lib/storage';
import { palette, spacing } from '@/theme/tokens';

type StatusMessage = {
  tone: 'success' | 'warning';
  text: string;
} | null;

export default function CommunityReportRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    targetId: string;
    targetType: 'POST' | 'REPLY';
  }>();
  const { token } = useSession();
  const [reason, setReason] = useState<CommunityReportReasonType>('MISLEADING');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);
  const targetId = Array.isArray(params.targetId) ? params.targetId[0] : params.targetId;
  const targetType = Array.isArray(params.targetType) ? params.targetType[0] : params.targetType;

  const submitReport = async () => {
    if (!token || !targetId || !targetType) {
      return;
    }

    setBusy(true);
    setStatusMessage(null);

    try {
      const path =
        targetType === 'REPLY'
          ? `/community/replies/${targetId}/report`
          : `/community/posts/${targetId}/report`;

      await apiPost<CommunityReportResponse>(
        path,
        {
          reason,
          note: note.trim() || undefined,
        },
        token,
      );
      storage.set(storageKeys.communityNotice, 'Report sent for moderator review.');
      router.back();
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError ? error.message : 'Could not send the report right now.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Report content' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 120,
          gap: spacing.md,
          backgroundColor: palette.canvas,
        }}
      >
        <SheetFormCard
          title="Report content"
          subtitle="Choose the closest reason and add a note only if it helps the moderator review it faster."
        >
          <View style={{ gap: spacing.md }}>
            <SelectField
              label="Reason"
              value={reason}
              options={communityReportReasonOptions}
              open={reasonOpen}
              onOpenChange={setReasonOpen}
              onChange={(value) => {
                setReason(value);
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />
            <TextField
              label="Optional note"
              value={note}
              placeholder="What feels unsafe, misleading, or inappropriate here?"
              multiline
              onChangeText={(value) => {
                setNote(value);
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />
            {statusMessage ? (
              <ProfileStatusCard
                message={statusMessage.text}
                tone={statusMessage.tone}
              />
            ) : null}
          </View>
        </SheetFormCard>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={busy ? 'Sending report...' : 'Send report'}
            loading={busy}
            onPress={() => {
              void submitReport();
            }}
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </>
  );
}
