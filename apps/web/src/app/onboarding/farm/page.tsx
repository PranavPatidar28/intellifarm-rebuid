"use client";

import { useEffect, useState } from "react";
import { LocateFixed, MapPinned } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AuthGate } from "@/components/auth-gate";
import { ProgressStepper } from "@/components/progress-stepper";
import { SectionCard } from "@/components/section-card";
import { WizardPage } from "@/components/templates/wizard-page";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RiskCallout } from "@/components/ui/risk-callout";
import { apiPost } from "@/lib/api";
import { useCurrentLocation } from "@/lib/use-current-location";

const farmSchema = z.object({
  name: z.string().trim().min(2, "Name the plot."),
  state: z.string().trim().min(2, "Enter a state."),
  district: z.string().trim().min(2, "Enter a district."),
  village: z.string().trim().min(2, "Enter a village."),
  area: z.string().trim().min(1, "Enter the area."),
  irrigationType: z.string(),
  latitude: z.string().trim().optional(),
  longitude: z.string().trim().optional(),
});

type FarmForm = z.infer<typeof farmSchema>;

export default function FarmOnboardingPage() {
  return (
    <AuthGate>
      <FarmOnboardingContent />
    </AuthGate>
  );
}

function FarmOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cropNameFromUrl = searchParams.get("cropName");
  const { location, message: gpsMessage, refreshLocation } = useCurrentLocation();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<FarmForm>({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      name: "North Field",
      state: "Punjab",
      district: "Ludhiana",
      village: "Baddowal",
      area: "2.5",
      irrigationType: "FLOOD",
      latitude: "",
      longitude: "",
    },
  });

  useEffect(() => {
    if (!location) return;
    form.setValue("latitude", form.getValues("latitude") || location.latitude.toFixed(6));
    form.setValue("longitude", form.getValues("longitude") || location.longitude.toFixed(6));
  }, [form, location]);

  const saveFarm = form.handleSubmit(async (values) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await apiPost<{ farmPlot: { id: string } }>("/farm-plots", {
        ...values,
        area: Number(values.area),
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
      });

      router.push(
        cropNameFromUrl
          ? `/onboarding/season?farmPlotId=${response.farmPlot.id}&cropName=${encodeURIComponent(cropNameFromUrl)}`
          : `/onboarding/season?farmPlotId=${response.farmPlot.id}`,
      );
    } catch {
      setMessage("Could not save the farm plot.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <WizardPage
      title="Add the first farm or plot"
      description="Capture just enough detail to localize weather, market context, and weekly guidance."
      stepper={
        <ProgressStepper
          steps={["Farmer profile", "Farm or plot", "Crop season"]}
          currentStep={2}
        />
      }
      sidebar={
        <>
          <SectionCard title="Why coordinates matter" eyebrow="Location quality" variant="glass">
            <div className="space-y-3 text-sm leading-6 muted">
              <p>More accurate weather context.</p>
              <p>Better nearby mandi and warehouse ranking.</p>
              <p>Safer disease and planning support tied to the field.</p>
            </div>
          </SectionCard>
          <RiskCallout title="GPS is optional" tone="info">
            Ask for live location only when it helps. If coordinates are not
            available now, the app can still work from the saved place names.
          </RiskCallout>
        </>
      }
    >
      <SectionCard title="Plot setup" eyebrow="Step 2 of 3">
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Farm or plot name"
              htmlFor="name"
              error={form.formState.errors.name?.message}
            >
              <Input id="name" {...form.register("name")} />
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
            >
              <Input id="village" {...form.register("village")} />
            </Field>
            <Field
              label="Approx. area (acres)"
              htmlFor="area"
              error={form.formState.errors.area?.message}
            >
              <Input id="area" {...form.register("area")} />
            </Field>
            <Field label="Irrigation type" htmlFor="irrigationType">
              <Select id="irrigationType" {...form.register("irrigationType")}>
                <option value="RAIN_FED">Rain fed</option>
                <option value="DRIP">Drip</option>
                <option value="SPRINKLER">Sprinkler</option>
                <option value="FLOOD">Flood</option>
                <option value="MANUAL">Manual</option>
              </Select>
            </Field>
          </div>

          <div className="surface-card-muted rounded-[var(--radius-panel)] p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="grid flex-1 gap-4 md:grid-cols-2">
                <Field label="Latitude" htmlFor="latitude">
                  <Input id="latitude" {...form.register("latitude")} />
                </Field>
                <Field label="Longitude" htmlFor="longitude">
                  <Input id="longitude" {...form.register("longitude")} />
                </Field>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={refreshLocation}
                leadingIcon={<LocateFixed className="h-4 w-4" />}
              >
                Use current GPS
              </Button>
            </div>
            <div className="mt-4 flex items-start gap-3 text-sm muted">
              <MapPinned className="mt-0.5 h-4 w-4 text-[var(--info)]" />
              <p>
                {gpsMessage ??
                  "Coordinates improve weather confidence but are optional during setup."}
              </p>
            </div>
          </div>

          {message ? (
            <p className="text-sm font-medium text-[var(--danger)]" aria-live="polite">
              {message}
            </p>
          ) : null}

          <div className="sticky-footer pt-2">
            <Button onClick={saveFarm} disabled={saving} size="lg">
              {saving ? "Saving plot..." : "Save plot and continue"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </WizardPage>
  );
}
