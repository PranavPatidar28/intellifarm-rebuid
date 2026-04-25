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

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshSession } = useSession();
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>("123456");
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
      setMessage("OTP created. Enter the code below to continue.");
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Secure sign in</p>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight">
                  Enter your farm account
                </h1>
              </div>
              <Badge tone="brand">OTP login</Badge>
            </div>

            <p className="mt-4 text-sm leading-6 muted">
              Keep sign-in quick in the field. The same account model will power
              web, future mobile access, and support history.
            </p>

            <form className="mt-6 space-y-5" onSubmit={(event) => event.preventDefault()}>
              <Field
                label="Phone number"
                htmlFor="phone"
                hint="Use the demo number or your seeded account."
                error={form.formState.errors.phone?.message}
              >
                <Input id="phone" placeholder="9876543210" {...form.register("phone")} />
              </Field>

              {otpRequested ? (
                <Field
                  label="OTP"
                  htmlFor="otp"
                  hint="Enter the 6-digit code from the OTP panel."
                  error={form.formState.errors.otp?.message}
                >
                  <Input id="otp" placeholder="123456" {...form.register("otp")} />
                </Field>
              ) : null}

              <div className="surface-card-muted rounded-[var(--radius-card)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Demo access</p>
                    <p className="mt-1 text-sm muted">
                      Phone: <span className="number-data text-[var(--foreground-soft)]">9876543210</span>
                    </p>
                  </div>
                  {devOtp ? (
                    <div className="rounded-[0.85rem] bg-[var(--brand-soft)] px-3 py-2 text-sm font-semibold text-[var(--brand)]">
                      OTP {devOtp}
                    </div>
                  ) : null}
                </div>
              </div>

              {message ? (
                <p className="text-sm font-medium text-[var(--brand)]" aria-live="polite">
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

          <section className="hero-panel order-2 flex flex-col justify-between p-6 md:p-7 xl:order-1">
            <div>
              <p className="eyebrow">Intellifarm</p>
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
                  Launch-ready rebuild
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
              Admin demo available via phone{" "}
              <span className="number-data font-semibold text-white">9999999998</span>.
              <Link href="/support" className="ml-2 font-medium text-white">
                Learn how the workspace is organized
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
