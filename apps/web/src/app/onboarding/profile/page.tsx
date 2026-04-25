"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { ProgressStepper } from "@/components/progress-stepper";
import { SectionCard } from "@/components/section-card";
import { WizardPage } from "@/components/templates/wizard-page";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RiskCallout } from "@/components/ui/risk-callout";
import { apiPatch } from "@/lib/api";
import { useSession } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter the farmer's full name."),
  preferredLanguage: z.enum(["en", "hi"]),
  state: z.string().trim().min(2, "Enter a state."),
  district: z.string().trim().min(2, "Enter a district."),
  village: z.string().trim().min(2, "Enter a village."),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfileOnboardingPage() {
  return (
    <AuthGate>
      <ProfileOnboardingContent />
    </AuthGate>
  );
}

function ProfileOnboardingContent() {
  const router = useRouter();
  const { user } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      preferredLanguage: "en",
      state: "",
      district: "",
      village: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    form.reset({
      name: user.name || "",
      preferredLanguage: user.preferredLanguage || "en",
      state: user.state || "",
      district: user.district || "",
      village: user.village || "",
    });
  }, [form, user]);

  const saveProfile = form.handleSubmit(async (values) => {
    setSaving(true);
    setMessage(null);

    try {
      await apiPatch("/me", values);
      router.push("/onboarding/farm");
    } catch {
      setMessage("Could not save the profile right now.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <WizardPage
      title="Set up the farmer profile"
      description="Start with the basics that localize weather, markets, schemes, and support."
      stepper={
        <ProgressStepper
          steps={["Farmer profile", "Farm or plot", "Crop season"]}
          currentStep={1}
        />
      }
      sidebar={
        <>
          <SectionCard title="What this unlocks" eyebrow="Step outcome" variant="glass">
            <div className="space-y-3 text-sm leading-6 muted">
              <p>Location-aware support and schemes.</p>
              <p>Cleaner profile handoff into future mobile access.</p>
              <p>Audio language preference for voice workflows.</p>
            </div>
          </SectionCard>
          <RiskCallout title="Language note" tone="info">
            Hindi here sets the preferred language for audio and future language
            support. The interface itself remains primarily English today.
          </RiskCallout>
        </>
      }
    >
      <SectionCard title="Farmer details" eyebrow="Step 1 of 3">
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Full name"
              htmlFor="name"
              error={form.formState.errors.name?.message}
            >
              <Input id="name" {...form.register("name")} />
            </Field>

            <Field
              label="Preferred language"
              htmlFor="preferredLanguage"
              hint="Used for audio and future translation support."
              error={form.formState.errors.preferredLanguage?.message}
            >
              <Select id="preferredLanguage" {...form.register("preferredLanguage")}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </Select>
            </Field>

            <Field
              label="State"
              htmlFor="state"
              error={form.formState.errors.state?.message}
            >
              <Input id="state" {...form.register("state")} />
            </Field>

            <Field
              label="District"
              htmlFor="district"
              error={form.formState.errors.district?.message}
            >
              <Input id="district" {...form.register("district")} />
            </Field>

            <Field
              label="Village"
              htmlFor="village"
              error={form.formState.errors.village?.message}
              className="md:col-span-2"
            >
              <Input id="village" {...form.register("village")} />
            </Field>
          </div>

          {message ? (
            <p className="text-sm font-medium text-[var(--danger)]" aria-live="polite">
              {message}
            </p>
          ) : null}

          <div className="sticky-footer pt-2">
            <Button onClick={saveProfile} disabled={saving} size="lg">
              {saving ? "Saving profile..." : "Save profile and continue"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </WizardPage>
  );
}
