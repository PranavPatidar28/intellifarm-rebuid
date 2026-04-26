"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileImage,
  History,
  ImagePlus,
  Leaf,
  Loader2,
  Mic,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { AuthGate } from "@/components/auth-gate";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";

type CropSeasonOption = {
  id: string;
  cropName: string;
  farmPlot: {
    name: string;
  };
};

type MeResponse = {
  farms: Array<{
    name: string;
    cropSeasons: Array<{
      id: string;
      cropName: string;
    }>;
  }>;
};

type DiseaseReport = {
  id: string;
  cropSeasonId: string;
  image1Url?: string | null;
  image2Url?: string | null;
  userNote?: string | null;
  predictedIssue: string | null;
  confidenceScore: number;
  recommendation: string;
  escalationRequired: boolean;
  status: string;
  provider: string;
  providerRef?: string | null;
  captureMode: "STANDARD" | "CAMERA_DUAL_ANGLE";
  analysisSource: "MOCK_PROVIDER" | "LIVE_PROVIDER";
  createdAt: string;
  cropSeason?: {
    id?: string;
    cropName?: string;
  } | null;
};

type ReportsResponse = {
  reports: DiseaseReport[];
};

type CreateReportResponse = {
  report: DiseaseReport;
};

type FieldErrors = {
  cropSeasonId?: string;
  cropImage?: string;
  diseasedImage?: string;
};

export default function DiseaseHelpPage() {
  return (
    <AuthGate>
      <DiseaseDiagnosisWorkspace />
    </AuthGate>
  );
}

function DiseaseDiagnosisWorkspace() {
  const [cropSeasonId, setCropSeasonId] = useState("");
  const [cropImage, setCropImage] = useState<File | null>(null);
  const [diseasedImage, setDiseasedImage] = useState<File | null>(null);
  const [userNote, setUserNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitState, setSubmitState] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestReport, setLatestReport] = useState<DiseaseReport | null>(null);
  const speechRecognition = useSpeechRecognition();

  const {
    data: meData,
    error: meError,
    isLoading: isLoadingMe,
  } = useSWR("/me", () => apiGet<MeResponse>("/me"));
  const {
    data: reportsData,
    error: reportsError,
    isLoading: isLoadingReports,
    mutate: mutateReports,
  } = useSWR("/disease-reports", () =>
    apiGet<ReportsResponse>("/disease-reports"),
  );

  const seasons = useMemo(
    () =>
      meData?.farms.flatMap((farm) =>
        farm.cropSeasons.map((season) => ({
          ...season,
          farmPlot: {
            name: farm.name,
          },
        })),
      ) ?? [],
    [meData],
  );

  const seasonLookup = useMemo(
    () => new Map(seasons.map((season) => [season.id, season])),
    [seasons],
  );

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === cropSeasonId) ?? null,
    [cropSeasonId, seasons],
  );

  const reports = useMemo(() => {
    const currentReports = reportsData?.reports ?? [];

    if (!latestReport) {
      return currentReports;
    }

    return [
      latestReport,
      ...currentReports.filter((report) => report.id !== latestReport.id),
    ];
  }, [latestReport, reportsData?.reports]);

  const featuredReport = latestReport ?? reports[0] ?? null;

  useEffect(() => {
    if (!cropSeasonId && seasons[0]) {
      setCropSeasonId(seasons[0].id);
    }
  }, [cropSeasonId, seasons]);

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

  const submit = async () => {
    const nextErrors: FieldErrors = {};

    if (!selectedSeason) {
      nextErrors.cropSeasonId = "Choose the crop season affected by this issue.";
    }

    if (!cropImage) {
      nextErrors.cropImage = "Add one normal-distance crop photo.";
    }

    if (!diseasedImage) {
      nextErrors.diseasedImage = "Add one close-up symptom photo.";
    }

    setFieldErrors(nextErrors);
    setSubmitState(null);

    if (Object.keys(nextErrors).length > 0 || !selectedSeason || !cropImage || !diseasedImage) {
      return;
    }

    const formData = new FormData();
    formData.append("cropSeasonId", selectedSeason.id);
    formData.append("captureMode", "CAMERA_DUAL_ANGLE");
    formData.append("cropImage", cropImage);
    formData.append("diseasedImage", diseasedImage);

    if (userNote.trim()) {
      formData.append("userNote", userNote.trim());
    }

    setIsSubmitting(true);

    try {
      const response = await apiPost<CreateReportResponse>(
        "/disease-reports",
        formData,
      );
      const enrichedReport = {
        ...response.report,
        cropSeason: response.report.cropSeason ?? {
          id: selectedSeason.id,
          cropName: selectedSeason.cropName,
        },
      };

      setLatestReport(enrichedReport);
      setCropImage(null);
      setDiseasedImage(null);
      setUserNote("");
      setSubmitState({
        tone: "success",
        message: "Diagnosis created. Review the result before taking action.",
      });

      void mutateReports(
        (current) => ({
          reports: [
            enrichedReport,
            ...(current?.reports ?? []).filter(
              (report) => report.id !== enrichedReport.id,
            ),
          ],
        }),
        { revalidate: true },
      );
    } catch {
      setSubmitState({
        tone: "error",
        message: "We could not submit these photos. Check the images and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f4ed] text-[#17231a]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader />

        {isLoadingMe ? (
          <LoadingWorkspace />
        ) : meError ? (
          <MessagePanel
            tone="error"
            title="Farm details could not load"
            message="Refresh the page or sign in again before creating a diagnosis."
          />
        ) : seasons.length === 0 ? (
          <NoSeasonsPanel />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              <div className="rounded-lg border border-[#d9d0c1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-2">
                  <div className="max-w-2xl">
                    <h2 className="text-xl font-semibold tracking-tight">
                      Diagnosis details
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#5f6f63]">
                      Choose the affected crop, then upload one normal-distance
                      photo and one close-up symptom photo.
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="crop-season"
                  className="mt-6 block text-sm font-semibold text-[#17231a]"
                >
                  Crop season
                </label>
                <select
                  id="crop-season"
                  value={cropSeasonId}
                  onChange={(event) => {
                    setCropSeasonId(event.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      cropSeasonId: undefined,
                    }));
                  }}
                  className="mt-2 h-12 w-full rounded-lg border border-[#cfc5b4] bg-white px-4 text-sm font-medium text-[#17231a] outline-none transition focus:border-[#1f6b45] focus:ring-4 focus:ring-[#1f6b45]/15"
                >
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.cropName} - {season.farmPlot.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.cropSeasonId ? (
                  <p className="mt-2 text-sm font-medium text-[#a23a31]">
                    {fieldErrors.cropSeasonId}
                  </p>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-[#6f7a70]">
                  Use daylight, keep photos sharp, and confirm serious cases
                  locally before spraying.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PhotoUploadCard
                  icon={<Leaf className="h-5 w-5" />}
                  label="Photo 1"
                  title="Normal-distance crop photo"
                  description="Take this from normal distance so the plant and surrounding leaves are visible."
                  guidance="Stand back enough to show the whole plant or row context. Use daylight and avoid blur."
                  file={cropImage}
                  onChange={(file) => {
                    setCropImage(file);
                    setFieldErrors((current) => ({
                      ...current,
                      cropImage: undefined,
                    }));
                  }}
                  error={fieldErrors.cropImage}
                />
                <PhotoUploadCard
                  icon={<Camera className="h-5 w-5" />}
                  label="Photo 2"
                  title="Close-up symptom photo"
                  description="Take this close enough that spots, curling, powder, holes, or discoloration are clear."
                  guidance="Fill the frame with the affected leaf or plant part. Keep your hand steady before capture."
                  file={diseasedImage}
                  onChange={(file) => {
                    setDiseasedImage(file);
                    setFieldErrors((current) => ({
                      ...current,
                      diseasedImage: undefined,
                    }));
                  }}
                  error={fieldErrors.diseasedImage}
                />
              </div>

              <section className="rounded-lg border border-[#d9d0c1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <h2 className="text-xl font-semibold">Field notes</h2>
                    <p className="mt-2 text-sm leading-6 text-[#5f6f63]">
                      Optional details can improve triage, especially recent rain,
                      spraying, irrigation, or fast symptom spread.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      speechRecognition.isListening
                        ? speechRecognition.stopListening()
                        : speechRecognition.startListening()
                    }
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition",
                      speechRecognition.isListening
                        ? "border-[#1f6b45] bg-[#1f6b45] text-white"
                        : "border-[#cfc5b4] bg-white text-[#17231a] hover:bg-[#f4efe6]",
                    )}
                  >
                    <Mic className="h-4 w-4" />
                    {speechRecognition.isListening ? "Stop voice typing" : "Voice typing"}
                  </button>
                </div>

                <textarea
                  value={userNote}
                  onChange={(event) => setUserNote(event.target.value)}
                  rows={5}
                  maxLength={500}
                  placeholder="Example: yellow spots started on lower leaves after two rainy days. No spray was used this week."
                  className="mt-5 min-h-36 w-full resize-y rounded-lg border border-[#cfc5b4] bg-white px-4 py-3 text-sm leading-6 text-[#17231a] outline-none transition placeholder:text-[#9b8f7c] focus:border-[#1f6b45] focus:ring-4 focus:ring-[#1f6b45]/15"
                />
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[#6f7a70]">
                  <span>{userNote.length}/500 characters</span>
                  <span>Optional, but useful for safer triage.</span>
                </div>
                {speechRecognition.error ? (
                  <p className="mt-3 text-sm font-medium text-[#a23a31]">
                    {speechRecognition.error}
                  </p>
                ) : null}
              </section>

              {submitState ? (
                <MessagePanel
                  tone={submitState.tone}
                  title={submitState.tone === "success" ? "Submitted" : "Upload failed"}
                  message={submitState.message}
                />
              ) : null}

              <div className="sticky bottom-0 z-10 -mx-4 border-t border-[#d9d0c1] bg-[#f8f4ed]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
                <button
                  type="button"
                  onClick={submit}
                  disabled={isSubmitting}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1f6b45] px-5 text-base font-semibold text-white shadow-sm transition hover:bg-[#185638] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {isSubmitting ? "Creating diagnosis..." : "Submit for diagnosis"}
                </button>
              </div>
            </section>

            <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
              <ResultPanel
                report={featuredReport}
                seasonLookup={seasonLookup}
                isLoading={isLoadingReports}
              />
            </aside>
          </div>
        )}

        <HistorySection
          reports={reports}
          seasonLookup={seasonLookup}
          isLoading={isLoadingReports}
          error={reportsError}
        />
      </div>
    </main>
  );
}

function PageHeader() {
  return (
    <header className="rounded-lg border border-[#d9d0c1] bg-white p-5 shadow-sm sm:p-7">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f6b45] hover:text-[#174c32]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div className="mt-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6a2f]">
          Crop disease detection
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17231a] sm:text-4xl">
          Upload two crop photos for diagnosis
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f6f63]">
          Add a normal-distance crop photo and a close-up symptom photo. The
          latest diagnosis appears beside the form as soon as it is ready.
        </p>
      </div>
    </header>
  );
}

function PhotoUploadCard({
  icon,
  label,
  title,
  description,
  guidance,
  file,
  onChange,
  error,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  guidance: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useObjectUrl(file);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  return (
    <section
      className={cn(
        "rounded-lg border bg-white p-5 shadow-sm transition sm:p-6",
        error ? "border-[#c85b4f]" : "border-[#d9d0c1]",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e7f1e8] text-[#1f6b45]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a2f]">
            {label}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#17231a]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#5f6f63]">{description}</p>
        </div>
      </div>

      <div className="mt-5 aspect-[4/3] overflow-hidden rounded-lg border border-dashed border-[#cfc5b4] bg-[#fbf8f0]">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`${title} preview`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-5 text-center">
            <ImagePlus className="h-10 w-10 text-[#8b9a8f]" />
            <p className="mt-3 text-sm font-semibold text-[#17231a]">
              Add an image
            </p>
            <p className="mt-2 max-w-xs text-xs leading-5 text-[#6f7a70]">
              JPG, PNG, or a camera photo from your device.
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-[#5f6f63]">{guidance}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#cfc5b4] bg-white px-4 text-sm font-semibold text-[#17231a] transition hover:bg-[#f4efe6]"
        >
          <RefreshCw className="h-4 w-4" />
          {file ? "Replace photo" : "Choose photo"}
        </button>
        {file ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#f0c8c3] bg-[#fff5f3] px-4 text-sm font-semibold text-[#a23a31] transition hover:bg-[#ffe7e3]"
          >
            <X className="h-4 w-4" />
            Remove
          </button>
        ) : null}
      </div>

      <p className="mt-3 truncate text-sm text-[#6f7a70]">
        {file ? file.name : "No photo selected yet."}
      </p>
      {error ? <p className="mt-2 text-sm font-medium text-[#a23a31]">{error}</p> : null}
    </section>
  );
}

function ResultPanel({
  report,
  seasonLookup,
  isLoading,
}: {
  report: DiseaseReport | null;
  seasonLookup: Map<string, CropSeasonOption>;
  isLoading: boolean;
}) {
  if (isLoading && !report) {
    return (
      <section className="rounded-lg border border-[#d9d0c1] bg-white p-5 shadow-sm">
        <div className="h-5 w-36 animate-pulse rounded bg-[#eee5d8]" />
        <div className="mt-4 h-8 w-56 animate-pulse rounded bg-[#eee5d8]" />
        <div className="mt-5 h-28 animate-pulse rounded-lg bg-[#f4efe6]" />
      </section>
    );
  }

  if (!report) {
    return (
      <section className="rounded-lg border border-[#d9d0c1] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7f1e8] text-[#1f6b45]">
            <FileImage className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a2f]">
              Latest diagnosis
            </p>
            <h2 className="text-lg font-semibold">Waiting for photos</h2>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#5f6f63]">
          Your newest result will appear here with the issue name,
          recommendation, confidence, and the images used for analysis.
        </p>
      </section>
    );
  }

  const season = getReportSeason(report, seasonLookup);
  const confidence = getConfidence(report.confidenceScore);
  const isEscalated = report.escalationRequired || report.status === "ESCALATED";

  return (
    <section
      className={cn(
        "rounded-lg border bg-white p-5 shadow-sm",
        isEscalated ? "border-[#f0c8c3]" : "border-[#bfd9c4]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a2f]">
            Latest diagnosis
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17231a]">
            {report.predictedIssue || "Unclear issue"}
          </h2>
          <p className="mt-2 text-sm text-[#5f6f63]">
            {season.cropName} {season.farmPlotName ? `- ${season.farmPlotName}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
            isEscalated
              ? "bg-[#fff0ed] text-[#a23a31]"
              : "bg-[#e7f1e8] text-[#1f6b45]",
          )}
        >
          {isEscalated ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {report.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ReportImage label="Normal distance" src={report.image2Url} />
        <ReportImage label="Close-up" src={report.image1Url} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ResultStat label="Confidence" value={`${confidence.percent}%`} hint={confidence.label} />
        <ResultStat label="Source" value={formatProvider(report.provider)} hint={report.analysisSource.replace(/_/g, " ")} />
        <ResultStat label="Created" value={formatDate(report.createdAt)} hint={shortenRef(report.providerRef)} />
      </div>

      <div
        className={cn(
          "mt-5 rounded-lg border p-4",
          isEscalated
            ? "border-[#f0c8c3] bg-[#fff8f6]"
            : "border-[#bfd9c4] bg-[#f4fbf5]",
        )}
      >
        <p className="text-sm font-semibold text-[#17231a]">Recommendation</p>
        <div className="mt-2 space-y-2 text-sm leading-6 text-[#4f5f54]">
          <FormattedRecommendation text={report.recommendation} />
        </div>
      </div>

      {report.userNote ? (
        <p className="mt-4 text-sm leading-6 text-[#5f6f63]">
          <span className="font-semibold text-[#17231a]">Farmer note:</span>{" "}
          {report.userNote}
        </p>
      ) : null}
    </section>
  );
}

function ResultStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#eee5d8] bg-[#fbf8f0] p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#6f7a70]">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-[#17231a]">{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-[#6f7a70]">{hint}</p> : null}
    </div>
  );
}

function HistorySection({
  reports,
  seasonLookup,
  isLoading,
  error,
}: {
  reports: DiseaseReport[];
  seasonLookup: Map<string, CropSeasonOption>;
  isLoading: boolean;
  error: unknown;
}) {
  const visibleReports = reports.slice(0, 4);

  return (
    <details className="rounded-lg border border-[#d9d0c1] bg-white p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbf8f0] text-[#1f6b45]">
            <History className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold text-[#17231a]">
              Recent reports
            </span>
            <span className="block truncate text-sm text-[#5f6f63]">
              {reports.length
                ? `${reports.length} saved diagnosis${reports.length === 1 ? "" : "es"}`
                : "No saved reports yet"}
            </span>
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-[#d9d0c1] px-3 py-1 text-xs font-semibold text-[#5f6f63]">
          Open
        </span>
      </summary>

      <div className="mt-4 border-t border-[#eee5d8] pt-4">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-lg border border-[#d9d0c1] bg-[#fbf8f0]"
              />
            ))}
          </div>
        ) : error ? (
          <MessagePanel
            tone="error"
            title="Report history could not load"
            message="Your new diagnosis can still be submitted. Try refreshing to view older reports."
          />
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#cfc5b4] bg-[#fbf8f0] p-5 text-sm leading-6 text-[#5f6f63]">
            Submit two photos and a short note to create the first crop health
            record for this season.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {visibleReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  season={getReportSeason(report, seasonLookup)}
                />
              ))}
            </div>
            {reports.length > visibleReports.length ? (
              <p className="mt-3 text-sm text-[#6f7a70]">
                Showing the latest {visibleReports.length} reports.
              </p>
            ) : null}
          </>
        )}
      </div>
    </details>
  );
}

function ReportCard({
  report,
  season,
}: {
  report: DiseaseReport;
  season: {
    cropName: string;
    farmPlotName: string;
  };
}) {
  const confidence = getConfidence(report.confidenceScore);
  const isEscalated = report.escalationRequired || report.status === "ESCALATED";

  return (
    <article className="rounded-lg border border-[#d9d0c1] bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4">
        <ReportImage label="Photo" src={report.image1Url ?? report.image2Url} compact />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                isEscalated
                  ? "bg-[#fff0ed] text-[#a23a31]"
                  : "bg-[#e7f1e8] text-[#1f6b45]",
              )}
            >
              {report.status.replace(/_/g, " ")}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#fbf8f0] px-2.5 py-1 text-xs font-semibold text-[#5f6f63]">
              {confidence.label}
            </span>
          </div>
          <h3 className="mt-3 truncate text-lg font-semibold text-[#17231a]">
            {report.predictedIssue || "Unclear issue"}
          </h3>
          <p className="mt-1 text-sm text-[#5f6f63]">
            {season.cropName}
            {season.farmPlotName ? ` - ${season.farmPlotName}` : ""}
          </p>
          <p className="mt-1 text-sm text-[#6f7a70]">
            {formatDate(report.createdAt)} - {confidence.percent}% confidence
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#4f5f54]">
            {stripRecommendationMarkup(report.recommendation)}
          </p>
        </div>
      </div>
    </article>
  );
}

function FormattedRecommendation({ text }: { text: string }) {
  const paragraphs = text
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      {(paragraphs.length ? paragraphs : [text]).map((paragraph, paragraphIndex) => (
        <p key={`${paragraph}-${paragraphIndex}`}>
          {renderRecommendationInline(paragraph)}
        </p>
      ))}
    </>
  );
}

function renderRecommendationInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-[#17231a]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function stripRecommendationMarkup(text: string) {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

function ReportImage({
  label,
  src,
  compact = false,
}: {
  label: string;
  src?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-[#eee5d8] bg-[#fbf8f0]",
        compact ? "aspect-[4/3]" : "aspect-[5/4]",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <FileImage className="h-6 w-6 text-[#9b8f7c]" />
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[0.68rem] font-semibold text-[#17231a] shadow-sm">
        {label}
      </span>
    </div>
  );
}

function MessagePanel({
  tone,
  title,
  message,
}: {
  tone: "success" | "error";
  title: string;
  message: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        tone === "success"
          ? "border-[#bfd9c4] bg-[#f4fbf5]"
          : "border-[#f0c8c3] bg-[#fff8f6]",
      )}
    >
      <div className="flex gap-3">
        {tone === "success" ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1f6b45]" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#a23a31]" />
        )}
        <div>
          <p className="font-semibold text-[#17231a]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#4f5f54]">{message}</p>
        </div>
      </div>
    </div>
  );
}

function NoSeasonsPanel() {
  return (
    <section className="rounded-lg border border-[#d9d0c1] bg-white p-8 text-center shadow-sm">
      <Leaf className="mx-auto h-12 w-12 text-[#1f6b45]" />
      <h2 className="mt-5 text-2xl font-semibold text-[#17231a]">
        Add a crop season before diagnosis
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#5f6f63]">
        Disease reports need to be linked to the crop and field they belong to.
        Create a crop season first, then return here to upload photos.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/onboarding/season"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1f6b45] px-5 text-sm font-semibold text-white hover:bg-[#185638]"
        >
          Create crop season
        </Link>
        <Link
          href="/farms"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[#cfc5b4] bg-white px-5 text-sm font-semibold text-[#17231a] hover:bg-[#f4efe6]"
        >
          View farms
        </Link>
      </div>
    </section>
  );
}

function LoadingWorkspace() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-5">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-44 animate-pulse rounded-lg border border-[#d9d0c1] bg-white"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-[#d9d0c1] bg-white" />
    </div>
  );
}

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!url) return undefined;

    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}

function getReportSeason(
  report: DiseaseReport,
  seasonLookup: Map<string, CropSeasonOption>,
) {
  const season = seasonLookup.get(report.cropSeasonId);

  return {
    cropName: report.cropSeason?.cropName ?? season?.cropName ?? "Crop",
    farmPlotName: season?.farmPlot.name ?? "",
  };
}

function getConfidence(score: number) {
  const percent = Math.round(Math.max(0, Math.min(score, 1)) * 100);
  const label =
    score >= 0.8
      ? "High confidence"
      : score >= 0.55
        ? "Medium confidence"
        : "Low confidence";

  return { percent, label };
}

function formatProvider(provider: string) {
  return provider
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortenRef(value?: string | null) {
  if (!value) {
    return "No provider ref";
  }

  return value.length > 12 ? `Ref ${value.slice(0, 12)}...` : `Ref ${value}`;
}
