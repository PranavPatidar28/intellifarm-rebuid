"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";

import { AuthGate } from "@/components/auth-gate";
import { ProgressStepper } from "@/components/progress-stepper";
import { SectionCard } from "@/components/section-card";
import { WizardPage } from "@/components/templates/wizard-page";
import { buttonStyles, Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RiskCallout } from "@/components/ui/risk-callout";
import { apiGet, apiPost } from "@/lib/api";
import { irrigationTypeLabel, soilTypeLabel } from "@/lib/crop-prediction";

const seasonSchema = z.object({
  farmPlotId: z.string().min(1, "Select a plot."),
  cropDefinitionId: z.string().min(1, "Select a crop."),
  cropName: z.string().min(1),
  sowingDate: z.string().min(1, "Enter a sowing date."),
  status: z.string(),
});

type FarmPlotsResponse = {
  farmPlots: Array<{
    id: string;
    name: string;
    state: string;
    district: string;
    village: string;
    irrigationType: string;
    soilType?: string | null;
  }>;
};

type CropDefinitionsResponse = {
  cropDefinitions: Array<{
    id: string;
    nameEn: string;
    nameHi: string;
  }>;
};

type SeasonForm = z.infer<typeof seasonSchema>;

export default function SeasonOnboardingPage() {
  return (
    <AuthGate>
      <SeasonOnboardingContent />
    </AuthGate>
  );
}

function SeasonOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const farmPlotIdFromUrl = searchParams.get("farmPlotId");
  const cropNameFromUrl = searchParams.get("cropName");
  const { data: farmsData } = useSWR("/farm-plots", () =>
    apiGet<FarmPlotsResponse>("/farm-plots"),
  );
  const { data: cropsData } = useSWR("/crop-definitions", () =>
    apiGet<CropDefinitionsResponse>("/crop-definitions"),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<SeasonForm>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      farmPlotId: "",
      cropDefinitionId: "",
      cropName: "",
      sowingDate: new Date().toISOString().slice(0, 10),
      status: "ACTIVE",
    },
  });

  const farms = farmsData?.farmPlots ?? [];
  const crops = cropsData?.cropDefinitions ?? [];
  const selectedFarmId = form.watch("farmPlotId");
  const selectedCropId = form.watch("cropDefinitionId");
  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) ?? null,
    [farms, selectedFarmId],
  );
  const selectedCrop = useMemo(
    () => crops.find((crop) => crop.id === selectedCropId) ?? null,
    [crops, selectedCropId],
  );

  useEffect(() => {
    if (farmPlotIdFromUrl) {
      form.setValue("farmPlotId", farmPlotIdFromUrl);
    } else if (farms[0] && !form.getValues("farmPlotId")) {
      form.setValue("farmPlotId", farms[0].id);
    }
  }, [farmPlotIdFromUrl, farms, form]);

  useEffect(() => {
    if (!crops.length) return;

    if (cropNameFromUrl) {
      const matchedCrop = crops.find(
        (crop) => crop.nameEn.toLowerCase() === cropNameFromUrl.toLowerCase(),
      );

      if (matchedCrop) {
        form.setValue("cropDefinitionId", matchedCrop.id);
        form.setValue("cropName", matchedCrop.nameEn);
        return;
      }
    }

    if (!form.getValues("cropDefinitionId")) {
      form.setValue("cropDefinitionId", crops[0].id);
      form.setValue("cropName", crops[0].nameEn);
    }
  }, [cropNameFromUrl, crops, form]);

  const predictionHref = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedFarmId) params.set("farmPlotId", selectedFarmId);
    params.set(
      "returnTo",
      selectedFarmId
        ? `/onboarding/season?farmPlotId=${selectedFarmId}`
        : "/onboarding/season",
    );
    return `/crop-prediction?${params.toString()}`;
  }, [selectedFarmId]);

  const saveSeason = form.handleSubmit(async (values) => {
    setSaving(true);
    setMessage(null);

    try {
      await apiPost(`/farm-plots/${values.farmPlotId}/crop-seasons`, values);
      router.push("/dashboard");
    } catch {
      setMessage("Could not create the crop season.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <WizardPage
      title="Create the crop season"
      description="Set the crop and sowing window, then let the app generate the first stage, tasks, and support context."
      stepper={
        <ProgressStepper
          steps={["Farmer profile", "Farm or plot", "Crop season"]}
          currentStep={3}
        />
      }
      sidebar={
        <>
          <SectionCard title="Plot preview" eyebrow="Current context" variant="glass">
            {selectedFarm ? (
              <div className="space-y-3">
                <Badge tone="info">
                  {selectedFarm.village}, {selectedFarm.district}
                </Badge>
                <Badge tone="accent">
                  {irrigationTypeLabel(selectedFarm.irrigationType)}
                </Badge>
                <Badge tone="success">
                  Soil {soilTypeLabel(selectedFarm.soilType)}
                </Badge>
              </div>
            ) : (
              <p className="text-sm muted">Select a plot to preview its setup.</p>
            )}
          </SectionCard>
          <RiskCallout title="Need help deciding the crop?" tone="info">
            Open the planning flow to compare crop fit before locking the
            season.
          </RiskCallout>
        </>
      }
    >
      <SectionCard title="Season setup" eyebrow="Step 3 of 3">
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Farm plot"
              htmlFor="farmPlotId"
              error={form.formState.errors.farmPlotId?.message}
            >
              <Select id="farmPlotId" {...form.register("farmPlotId")}>
                <option value="">Select a plot</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Crop"
              htmlFor="cropDefinitionId"
              error={form.formState.errors.cropDefinitionId?.message}
            >
              <Select
                id="cropDefinitionId"
                {...form.register("cropDefinitionId", {
                  onChange: (event) => {
                    const crop = crops.find((item) => item.id === event.target.value);
                    form.setValue("cropName", crop?.nameEn ?? "");
                  },
                })}
              >
                {crops.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.nameEn}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Sowing date"
              htmlFor="sowingDate"
              error={form.formState.errors.sowingDate?.message}
            >
              <Input id="sowingDate" type="date" {...form.register("sowingDate")} />
            </Field>

            <Field label="Season status" htmlFor="status">
              <Select id="status" {...form.register("status")}>
                <option value="ACTIVE">Active</option>
                <option value="PLANNED">Planned</option>
              </Select>
            </Field>
          </div>

          <div className="surface-card-muted rounded-[var(--radius-panel)] p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="eyebrow">Planning assist</p>
                <p className="mt-2 text-sm leading-6 muted">
                  Compare crop fit for this plot before finalizing the season.
                </p>
              </div>
              <Link href={predictionHref} className={buttonStyles({ variant: "secondary", size: "md" })}>
                <Sparkles className="h-4 w-4" />
                Open crop planning
              </Link>
            </div>
          </div>

          {selectedCrop ? (
            <RiskCallout title={`Starting with ${selectedCrop.nameEn}`} tone="success">
              The app will generate the initial crop stage, weekly tasks, and
              support context right after creation.
            </RiskCallout>
          ) : null}

          {message ? (
            <p className="text-sm font-medium text-[var(--danger)]" aria-live="polite">
              {message}
            </p>
          ) : null}

          <div className="sticky-footer pt-2">
            <Button onClick={saveSeason} disabled={saving} size="lg">
              {saving ? "Creating season..." : "Create season and open dashboard"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </WizardPage>
  );
}
