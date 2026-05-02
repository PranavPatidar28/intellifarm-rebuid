"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudSun, ShieldCheck, Sprout, Tractor, Wheat } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { phoneSchema } from "@intellifarm/contracts";

import { ApiError, apiPost } from "@/lib/api";
import { useSession } from "@/lib/session";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const loginSchema = z.object({
  phone: phoneSchema,
  otp: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length === 6, {
      message: "Enter the 6-digit OTP.",
    }),
});

type LoginForm = z.infer<typeof loginSchema>;

const accessAccounts = [
  {
    title: "Farmer workspace",
    phone: "9876543210",
    description: "Daily field operations, crop planning, and current farm tasks.",
  },
  {
    title: "Admin workspace",
    phone: "9999999998",
    description: "Support workflows, escalation review, and workspace oversight.",
  },
] as const;

const loginSteps = [
  {
    step: "01",
    title: "Enter phone",
    description: "Use your account number or one of the available workspace numbers.",
  },
  {
    step: "02",
    title: "Request code",
    description: "Generate the current six-digit verification code for this session.",
  },
  {
    step: "03",
    title: "Continue",
    description: "We route you into the matching workspace after verification.",
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshSession } = useSession();
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "9876543210",
      otp: "",
    },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const requestOtp = form.handleSubmit(async ({ phone }) => {
    setBusy(true);
    setMessage(null);

    try {
      const response = await apiPost<{ devOtp?: string }>("/auth/otp/request", {
        phone,
      });
      setOtpRequested(true);
      setDevOtp(response.devOtp ?? null);
      setMessage(
        response.devOtp
          ? "Verification code ready. Enter the code below to continue."
          : "Verification code sent. Enter the 6-digit OTP to continue.",
      );
    } catch (error) {
      setMessage(
        getAuthErrorMessage(
          error,
          "Could not request an OTP right now. Try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  });

  const verifyOtp = form.handleSubmit(async ({ phone, otp }) => {
    if (!otp?.trim()) {
      form.setError("otp", { message: "Enter the 6-digit OTP." });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await apiPost<{ needsOnboarding: boolean }>(
        "/auth/otp/verify",
        { phone, otp },
      );
      await refreshSession();
      router.push(
        response.needsOnboarding ? "/onboarding/profile" : "/dashboard",
      );
    } catch (error) {
      setMessage(
        getAuthErrorMessage(
          error,
          "OTP verification failed. Check the code and try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="page-shell">
      <div className="app-frame page-transition max-w-6xl">
        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="surface-card-strong order-1 p-6 md:p-7 xl:order-2">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="eyebrow">Secure sign in</p>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight">
                  Access your Intellifarm workspace
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 muted">
                  Use a phone-based sign-in flow that keeps field sessions quick
                  and routes farmer and admin accounts into the right workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">OTP login</Badge>
                <Badge tone={otpRequested ? "success" : "info"}>
                  {otpRequested ? "Code ready" : "Request a code"}
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {loginSteps.map((item) => (
                <div
                  key={item.step}
                  className="surface-card-muted rounded-[var(--radius-card)] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                    {item.step}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 muted">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => event.preventDefault()}
            >
              <Field
                label="Phone number"
                htmlFor="phone"
                hint="Use your phone number or one of the available workspace numbers."
                error={form.formState.errors.phone?.message}
              >
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  {...form.register("phone")}
                />
              </Field>

              {otpRequested ? (
                <Field
                  label="OTP"
                  htmlFor="otp"
                  hint={
                    devOtp
                      ? "Enter the 6-digit code shown in the access panel."
                      : "Enter the 6-digit code sent to this phone."
                  }
                  error={form.formState.errors.otp?.message}
                >
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    {...form.register("otp")}
                  />
                </Field>
              ) : null}

              <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--primary)_14%,transparent)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(229,242,233,0.7))] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
                      Workspace access
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                      Available sign-in accounts
                    </p>
                    <p className="mt-1 max-w-xl text-sm leading-6 muted">
                      Keep reviews moving with the access numbers below. After
                      you request a code, the current verification code appears
                      here for quick sign-in.
                    </p>
                  </div>
                  <Badge tone={otpRequested ? "success" : "brand"}>
                    {otpRequested ? "Verification ready" : "Local access"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {accessAccounts.map((account) => (
                    <div
                      key={account.phone}
                      className="rounded-[0.95rem] border border-[var(--border)] bg-white/80 p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                        {account.title}
                      </p>
                      <p className="number-data mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {account.phone}
                      </p>
                      <p className="mt-2 text-sm leading-6 muted">
                        {account.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[0.95rem] border border-[var(--border)] bg-white/85 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                        Current verification code
                      </p>
                      <p className="mt-2 text-sm leading-6 muted">
                        Request an OTP, then use the six-digit code below to
                        continue into the workspace.
                      </p>
                    </div>
                    <div
                      className={`number-data rounded-[0.85rem] px-4 py-3 text-base font-semibold ${
                        devOtp
                          ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                          : "bg-[var(--surface-muted)] text-[var(--foreground-soft)]"
                      }`}
                    >
                      {devOtp ?? "------"}
                    </div>
                  </div>
                </div>
              </div>

              {message ? (
                <p
                  className="rounded-[var(--radius-card)] bg-[var(--brand-soft)] px-4 py-3 text-sm font-medium text-[var(--brand)]"
                  aria-live="polite"
                >
                  {message}
                </p>
              ) : null}

              <div className="grid gap-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={otpRequested ? verifyOtp : requestOtp}
                  disabled={busy}
                  block
                >
                  {busy
                    ? "Please wait..."
                    : otpRequested
                      ? "Verify OTP and continue"
                      : "Request OTP"}
                </Button>
                {otpRequested ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setOtpRequested(false);
                      setDevOtp(null);
                      form.setValue("otp", "");
                    }}
                    block
                  >
                    Use a different phone
                  </Button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="hero-panel order-2 flex flex-col justify-between p-6 text-white md:p-7 xl:order-1">
            <div>
              <p className="eyebrow !text-white/72">Intellifarm</p>
              <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight md:text-5xl">
                Decide what matters today before you step into the field.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/82 md:text-base">
                Weather, weekly work, disease triage, grounded support, markets,
                and schemes in one calm farmer workspace.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="info" className="!bg-white/12 !text-white">
                  Mobile-first
                </Badge>
                <Badge tone="success" className="!bg-white/12 !text-white">
                  Trusted context
                </Badge>
                <Badge tone="accent" className="!bg-white/12 !text-white">
                  Farmer + admin
                </Badge>
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <FeatureCard
                icon={Tractor}
                title="Today view"
                description="Know the current field stage, urgent work, and the next safe action."
              />
              <FeatureCard
                icon={CloudSun}
                title="Weather with source clarity"
                description="Keep live or saved location context visible before acting."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Safe support"
                description="See confidence, escalation, and source cues across support tools."
              />
              <FeatureCard
                icon={Wheat}
                title="Plan the next season"
                description="Compare crops, schemes, and market context without a cluttered flow."
              />
            </div>

            <div className="mt-8 border-t border-white/12 pt-5 text-sm text-white/78">
              Admin access is available via phone{" "}
              <span className="number-data font-semibold text-white">9999999998</span>.
              <Link href="/support" className="ml-2 font-medium text-white">
                See how the support workspace is organized
              </Link>
              <Sprout className="ml-2 inline h-4 w-4" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return fallback;
  }

  return "Cannot reach the auth service. Make sure the API is running and allowed for this web origin.";
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CloudSun;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-white/12 bg-white/10 p-4">
      <Icon className="h-5 w-5" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/76">{description}</p>
    </div>
  );
}
