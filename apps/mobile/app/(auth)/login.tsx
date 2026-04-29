import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { CircleHelp, SmartphoneCharging } from 'lucide-react-native';

import { Button } from '@/components/button';
import { InsetCard } from '@/components/inset-card';
import { PageShell } from '@/components/page-shell';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { apiPost, ApiError } from '@/lib/api';
import type { OtpRequestResponse, OtpVerifyResponse } from '@/lib/api-types';
import { resolveRouteForStep } from '@/lib/routing';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export default function LoginRoute() {
  const router = useRouter();
  const { isAuthenticated, onboardingStep, signIn } = useSession();
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(resolveRouteForStep(onboardingStep));
    }
  }, [isAuthenticated, onboardingStep, router]);

  const requestOtp = async (targetPhone: string) => {
    setBusy(true);
    setMessage(null);

    try {
      const response = await apiPost<OtpRequestResponse>('/auth/otp/request', {
        phone: targetPhone,
      });
      setOtpRequested(true);
      setDevOtp(response.devOtp ?? null);
      setMessage('OTP created. Enter the six-digit code to continue.');
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : 'Could not request OTP. Check that the API is running.',
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyOtpFor = async (targetPhone: string, targetOtp: string) => {
    setBusy(true);
    setMessage(null);

    try {
      const response = await apiPost<OtpVerifyResponse>('/auth/otp/verify', {
        phone: targetPhone,
        otp: targetOtp,
      });
      const nextStep = await signIn(response);
      router.replace(resolveRouteForStep(nextStep));
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : 'Could not verify OTP right now.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      eyebrow="Secure entry"
      title="Login to IntelliFarm"
      subtitle="Use your mobile number to restore crop plans, reminders, and market context."
      hero={
        <InsetCard tone="feature" padding={16}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.pill,
                backgroundColor: palette.white,
              }}
            >
              <SmartphoneCharging color={palette.leafDark} size={20} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              >
                Fast demo access
              </Text>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                Demo farmer 9876543210. Admin demo 9999999998. OTP 123456 in development mode.
              </Text>
            </View>
          </View>
        </InsetCard>
      }
    >
      <InsetCard tone="neutral" padding={16}>
        <View style={{ gap: spacing.md }}>
          <TextField
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            helper="We use your number to save your crop plan and reminders."
          />
          {otpRequested ? (
            <TextField
              label="OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              helper={devOtp ? `Development OTP: ${devOtp}` : 'Enter the 6-digit OTP.'}
            />
          ) : null}

          {message ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radii.lg,
                backgroundColor: palette.parchmentSoft,
              }}
            >
              <CircleHelp color={palette.leafDark} size={16} style={{ marginTop: 2 }} />
              <Text
                style={{
                  flex: 1,
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {message}
              </Text>
            </View>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <Button
              label={otpRequested ? 'Verify and continue' : 'Send OTP'}
              loading={busy}
              onPress={() => {
                if (otpRequested) {
                  void verifyOtpFor(phone, otp);
                  return;
                }

                void requestOtp(phone);
              }}
            />
            <Button
              label="Use demo account"
              variant="soft"
              onPress={() => {
                setPhone('9876543210');
                setOtp('123456');
                setOtpRequested(true);
                setDevOtp('123456');
                void verifyOtpFor('9876543210', '123456');
              }}
            />
            {otpRequested ? (
              <Pressable
                onPress={() => {
                  setOtpRequested(false);
                  setOtp('');
                  setMessage(null);
                }}
              >
                <Text
                  style={{
                    color: palette.leaf,
                    fontFamily: typography.bodyStrong,
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  Use a different number
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </InsetCard>

      <InsetCard tone="soft" padding={16}>
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 14,
            }}
          >
            Why sign in?
          </Text>
          {[
            'Keep your farm profile and crop plan together.',
            'See weekly alerts and mandi updates for the active crop.',
            'Return later without setting everything up again.',
          ].map((item) => (
            <Text
              key={item}
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              - {item}
            </Text>
          ))}
        </View>
      </InsetCard>
    </PageShell>
  );
}
