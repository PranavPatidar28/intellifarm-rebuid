"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Mic, Upload, Waves } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { RiskCallout } from "@/components/ui/risk-callout";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";

type DiseaseUploadPanelProps = {
  seasons: Array<{
    id: string;
    cropName: string;
    farmPlot: {
      name: string;
    };
  }>;
};

export function DiseaseUploadPanel({ seasons }: DiseaseUploadPanelProps) {
  const router = useRouter();
  const [cropSeasonId, setCropSeasonId] = useState(seasons[0]?.id ?? "");
  const [userNote, setUserNote] = useState("");
  const [captureMode, setCaptureMode] = useState<
    "STANDARD" | "CAMERA_DUAL_ANGLE"
  >("CAMERA_DUAL_ANGLE");
  const [symptomImage, setSymptomImage] = useState<File | null>(null);
  const [contextImage, setContextImage] = useState<File | null>(null);
  const [voiceNote, setVoiceNote] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const speechRecognition = useSpeechRecognition();

  useEffect(() => {
    if (speechRecognition.transcript) {
      setUserNote((current) =>
        [current.trim(), speechRecognition.transcript]
          .filter(Boolean)
          .join(" "),
      );
      speechRecognition.setTranscript("");
    }
  }, [speechRecognition, speechRecognition.transcript]);

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === cropSeasonId),
    [cropSeasonId, seasons],
  );

  const submit = async () => {
    if (!cropSeasonId || !symptomImage) {
      setMessage("Select a crop season and add the crop images first.");
      return;
    }

    if (captureMode === "CAMERA_DUAL_ANGLE" && !contextImage) {
      setMessage(
        "Dual-angle mode needs two photos: one close symptom shot and one wider plant view.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("cropSeasonId", cropSeasonId);
    formData.append("captureMode", captureMode);
    if (userNote) formData.append("userNote", userNote);
    formData.append("images", symptomImage);
    if (contextImage) formData.append("images", contextImage);
    if (voiceNote) formData.append("voiceNote", voiceNote);

    setIsSubmitting(true);
    setMessage(null);

    try {
      await apiPost("/disease-reports", formData);
      setMessage(
        "Report submitted. Review the new result below in your disease history.",
      );
      setSymptomImage(null);
      setContextImage(null);
      setVoiceNote(null);
      router.refresh();
    } catch {
      setMessage("We could not submit the report right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_320px]">
        <div className="space-y-4">
          <div className="surface-card-strong rounded-[var(--radius-panel)] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Crop season"
                htmlFor="crop-season"
                hint="Pick the season affected by this disease or pest issue."
              >
                <Select
                  id="crop-season"
                  value={cropSeasonId}
                  onChange={(event) => setCropSeasonId(event.target.value)}
                >
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.cropName} - {season.farmPlot.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Capture mode"
                htmlFor="capture-mode"
                hint="Dual-angle is best when confidence matters."
              >
                <Select
                  id="capture-mode"
                  value={captureMode}
                  onChange={(event) =>
                    setCaptureMode(
                      event.target.value as "STANDARD" | "CAMERA_DUAL_ANGLE",
                    )
                  }
                >
                  <option value="CAMERA_DUAL_ANGLE">Camera dual angle</option>
                  <option value="STANDARD">Standard upload</option>
                </Select>
              </Field>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ImageSlot
                title="Close symptom photo"
                description="Focus tightly on the leaf, stem, boll, or patch where the issue is visible."
                file={symptomImage}
                onChange={setSymptomImage}
              />
              <ImageSlot
                title={
                  captureMode === "CAMERA_DUAL_ANGLE"
                    ? "Whole plant or field-context photo"
                    : "Optional second photo"
                }
                description={
                  captureMode === "CAMERA_DUAL_ANGLE"
                    ? "Show the full plant or a wider area so the system can compare field context."
                    : "Add another angle if it helps explain what changed."
                }
                file={contextImage}
                onChange={setContextImage}
                required={captureMode === "CAMERA_DUAL_ANGLE"}
              />
            </div>
          </div>

          <div className="surface-card-strong rounded-[var(--radius-panel)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  Describe what you are seeing
                </p>
                <p className="mt-1 text-sm leading-6 muted">
                  Mention symptom color, spread, recent rain, irrigation, or
                  anything that changed before the issue appeared.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                leadingIcon={<Mic className="h-4 w-4" />}
                onClick={() =>
                  speechRecognition.isListening
                    ? speechRecognition.stopListening()
                    : speechRecognition.startListening()
                }
              >
                {speechRecognition.isListening ? "Stop voice typing" : "Voice typing"}
              </Button>
            </div>

            <div className="mt-4">
              <Field
                label="Observation notes"
                htmlFor="observation-notes"
                hint="Good notes help the model avoid low-confidence guesses."
              >
                <Textarea
                  id="observation-notes"
                  value={userNote}
                  onChange={(event) => setUserNote(event.target.value)}
                  rows={5}
                  placeholder="Example: yellow spots on lower leaves after two rainy days"
                />
              </Field>
            </div>

            {speechRecognition.error ? (
              <p className="mt-3 text-sm font-medium text-[var(--danger)]">
                {speechRecognition.error}
              </p>
            ) : null}
          </div>

          <div className="surface-card-strong rounded-[var(--radius-panel)] p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--info-soft)] text-[var(--info)]">
                <Waves className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-[var(--foreground)]">
                  Optional voice note file
                </p>
                <p className="mt-1 text-sm leading-6 muted">
                  Upload a recorded audio note if the farmer already has one on
                  the device.
                </p>
                <input
                  type="file"
                  accept="audio/*"
                  className="field-control mt-4"
                  onChange={(event) => setVoiceNote(event.target.files?.[0] ?? null)}
                />
                <p className="mt-3 text-sm muted">
                  {voiceNote ? voiceNote.name : "No audio file selected yet."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <RiskCallout title="Safe triage first" tone="warning">
            The disease flow is designed to avoid blind chemical advice. Low-confidence
            results should be treated as a review signal and escalated before action.
          </RiskCallout>

          {selectedSeason ? (
            <div className="surface-card rounded-[var(--radius-card)] p-4">
              <p className="eyebrow">Reporting for</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                {selectedSeason.cropName}
              </p>
              <p className="mt-2 text-sm muted">{selectedSeason.farmPlot.name}</p>
            </div>
          ) : null}

          <div className="surface-card rounded-[var(--radius-card)] p-4">
            <p className="eyebrow">Best capture checklist</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 muted">
              <li>Use daylight when possible.</li>
              <li>Keep the symptom sharp and unobstructed.</li>
              <li>Include a wider crop view for context.</li>
              <li>Describe recent weather or spraying if relevant.</li>
            </ul>
          </div>
        </div>
      </div>

      {message ? (
        <p className="text-sm font-medium text-[var(--brand)]">{message}</p>
      ) : null}

      <div className="sticky-footer">
        <div className="surface-card-strong rounded-[var(--radius-panel)] p-4">
          <Button
            type="button"
            variant="primary"
            size="lg"
            block
            disabled={isSubmitting}
            leadingIcon={<Upload className="h-4 w-4" />}
            onClick={submit}
          >
            {isSubmitting ? "Submitting disease report..." : "Submit disease report"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImageSlot({
  title,
  description,
  file,
  onChange,
  required = true,
}: {
  title: string;
  description: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <div className="surface-card rounded-[var(--radius-card)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <Camera className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-2 text-sm leading-6 muted">{description}</p>
        </div>
      </div>
      <input
        type="file"
        accept="image/*"
        className="field-control mt-4"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <p className="mt-3 text-sm muted">
        {file
          ? file.name
          : required
            ? "This image is required."
            : "You can skip this image in standard mode."}
      </p>
    </div>
  );
}
