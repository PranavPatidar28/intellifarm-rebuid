"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import { AuthGate } from "@/components/auth-gate";
import { SectionCard } from "@/components/section-card";
import { AdminOpsPage } from "@/components/templates/admin-ops-page";
import { formatDate } from "@/lib/format";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type AdminOverview = {
  totals: {
    users: number;
    farms: number;
    seasons: number;
    reports: number;
    schemes: number;
  };
};

type CropDefinition = {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  active: boolean;
  stageRules: Array<{
    id: string;
    stageKey: string;
    labelEn: string;
    startDay: number;
    endDay: number;
    sortOrder: number;
  }>;
  taskTemplates: Array<{
    id: string;
    titleEn: string;
    dueDayOffset: number;
    taskType: string;
  }>;
};

type CropDefinitionsResponse = {
  cropDefinitions: CropDefinition[];
};

type StageRule = {
  id: string;
  cropDefinitionId: string;
  stageKey: string;
  labelEn: string;
  labelHi: string;
  startDay: number;
  endDay: number;
  sortOrder: number;
};

type StageRulesResponse = {
  stageRules: StageRule[];
};

type TaskTemplate = {
  id: string;
  cropDefinitionId: string;
  stageKey: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  dueDayOffset: number;
  taskType:
    | "IRRIGATION"
    | "FERTILIZER"
    | "SCOUTING"
    | "HARVEST_PREP"
    | "GENERAL";
  priority: "LOW" | "MEDIUM" | "HIGH";
  active: boolean;
};

type TaskTemplatesResponse = {
  taskTemplates: TaskTemplate[];
};

type Scheme = {
  id: string;
  title: string;
  titleHi: string | null;
  description: string;
  descriptionHi: string | null;
  category: string;
  applicableState: string;
  officialLink: string;
  language: "en" | "hi";
  active: boolean;
};

type SchemesResponse = {
  schemes: Scheme[];
};

type ReportsResponse = {
  diseaseReports: Array<{
    id: string;
    predictedIssue: string | null;
    status: string;
    escalationRequired: boolean;
    createdAt: string;
    cropSeason: {
      cropName: string;
    };
  }>;
};

type CropDefinitionForm = {
  id: string | null;
  slug: string;
  nameEn: string;
  nameHi: string;
  active: boolean;
};

type StageRuleForm = {
  id: string | null;
  cropDefinitionId: string;
  stageKey: string;
  labelEn: string;
  labelHi: string;
  startDay: number;
  endDay: number;
  sortOrder: number;
};

type TaskTemplateForm = {
  id: string | null;
  cropDefinitionId: string;
  stageKey: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  dueDayOffset: number;
  taskType: TaskTemplate["taskType"];
  priority: TaskTemplate["priority"];
  active: boolean;
};

type SchemeForm = {
  id: string | null;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  category: string;
  applicableState: string;
  officialLink: string;
  language: "en" | "hi";
  active: boolean;
};

const defaultCropForm = (): CropDefinitionForm => ({
  id: null,
  slug: "",
  nameEn: "",
  nameHi: "",
  active: true,
});

const defaultStageRuleForm = (cropDefinitionId = ""): StageRuleForm => ({
  id: null,
  cropDefinitionId,
  stageKey: "",
  labelEn: "",
  labelHi: "",
  startDay: 0,
  endDay: 7,
  sortOrder: 1,
});

const defaultTaskTemplateForm = (cropDefinitionId = ""): TaskTemplateForm => ({
  id: null,
  cropDefinitionId,
  stageKey: "",
  titleEn: "",
  titleHi: "",
  descriptionEn: "",
  descriptionHi: "",
  dueDayOffset: 7,
  taskType: "GENERAL",
  priority: "MEDIUM",
  active: true,
});

const defaultSchemeForm = (): SchemeForm => ({
  id: null,
  title: "",
  titleHi: "",
  description: "",
  descriptionHi: "",
  category: "",
  applicableState: "ALL",
  officialLink: "",
  language: "en",
  active: true,
});

export default function AdminPage() {
  return (
    <AuthGate requiredRole="ADMIN">
      <AdminContent />
    </AuthGate>
  );
}

function AdminContent() {
  const { data: overview, mutate: mutateOverview } = useSWR(
    "/admin/overview",
    () => apiGet<AdminOverview>("/admin/overview"),
  );
  const { data: crops, mutate: mutateCrops } = useSWR(
    "/admin/crop-definitions",
    () => apiGet<CropDefinitionsResponse>("/admin/crop-definitions"),
  );
  const { data: stageRules, mutate: mutateStageRules } = useSWR(
    "/admin/crop-stage-rules",
    () => apiGet<StageRulesResponse>("/admin/crop-stage-rules"),
  );
  const { data: taskTemplates, mutate: mutateTaskTemplates } = useSWR(
    "/admin/task-templates",
    () => apiGet<TaskTemplatesResponse>("/admin/task-templates"),
  );
  const { data: schemes, mutate: mutateSchemes } = useSWR(
    "/admin/schemes",
    () => apiGet<SchemesResponse>("/admin/schemes"),
  );
  const { data: reports } = useSWR("/admin/disease-reports", () =>
    apiGet<ReportsResponse>("/admin/disease-reports"),
  );

  const firstCropId = crops?.cropDefinitions[0]?.id ?? "";
  const cropNameById = useMemo(
    () =>
      new Map(
        crops?.cropDefinitions.map((crop) => [crop.id, crop.nameEn]) ?? [],
      ),
    [crops],
  );

  const [cropForm, setCropForm] = useState<CropDefinitionForm>(defaultCropForm);
  const [cropMessage, setCropMessage] = useState<string | null>(null);
  const [stageRuleForm, setStageRuleForm] = useState<StageRuleForm>(
    defaultStageRuleForm(),
  );
  const [stageRuleMessage, setStageRuleMessage] = useState<string | null>(null);
  const [taskTemplateForm, setTaskTemplateForm] = useState<TaskTemplateForm>(
    defaultTaskTemplateForm(),
  );
  const [taskTemplateMessage, setTaskTemplateMessage] = useState<string | null>(
    null,
  );
  const [schemeForm, setSchemeForm] = useState<SchemeForm>(defaultSchemeForm());
  const [schemeMessage, setSchemeMessage] = useState<string | null>(null);

  const refreshData = async () => {
    await Promise.all([
      mutateOverview(),
      mutateCrops(),
      mutateStageRules(),
      mutateTaskTemplates(),
      mutateSchemes(),
    ]);
  };

  const submitCrop = async () => {
    setCropMessage(null);

    try {
      const payload = {
        slug: cropForm.slug.trim(),
        nameEn: cropForm.nameEn.trim(),
        nameHi: cropForm.nameHi.trim(),
        active: cropForm.active,
      };

      if (cropForm.id) {
        await apiPatch(`/admin/crop-definitions/${cropForm.id}`, payload);
        setCropMessage("Crop definition updated.");
      } else {
        await apiPost("/admin/crop-definitions", payload);
        setCropMessage("Crop definition created.");
      }

      await refreshData();
      setCropForm(defaultCropForm());
    } catch {
      setCropMessage("Could not save the crop definition right now.");
    }
  };

  const submitStageRule = async () => {
    setStageRuleMessage(null);

    try {
      const payload = {
        cropDefinitionId: stageRuleForm.cropDefinitionId || firstCropId,
        stageKey: stageRuleForm.stageKey.trim(),
        labelEn: stageRuleForm.labelEn.trim(),
        labelHi: stageRuleForm.labelHi.trim(),
        startDay: stageRuleForm.startDay,
        endDay: stageRuleForm.endDay,
        sortOrder: stageRuleForm.sortOrder,
      };

      if (stageRuleForm.id) {
        await apiPatch(`/admin/crop-stage-rules/${stageRuleForm.id}`, payload);
        setStageRuleMessage("Stage rule updated.");
      } else {
        await apiPost("/admin/crop-stage-rules", payload);
        setStageRuleMessage("Stage rule created.");
      }

      await refreshData();
      setStageRuleForm(defaultStageRuleForm(firstCropId));
    } catch {
      setStageRuleMessage("Could not save the stage rule right now.");
    }
  };

  const submitTaskTemplate = async () => {
    setTaskTemplateMessage(null);

    try {
      const payload = {
        cropDefinitionId: taskTemplateForm.cropDefinitionId || firstCropId,
        stageKey: taskTemplateForm.stageKey.trim(),
        titleEn: taskTemplateForm.titleEn.trim(),
        titleHi: taskTemplateForm.titleHi.trim(),
        descriptionEn: taskTemplateForm.descriptionEn.trim(),
        descriptionHi: taskTemplateForm.descriptionHi.trim(),
        dueDayOffset: taskTemplateForm.dueDayOffset,
        taskType: taskTemplateForm.taskType,
        priority: taskTemplateForm.priority,
        active: taskTemplateForm.active,
      };

      if (taskTemplateForm.id) {
        await apiPatch(`/admin/task-templates/${taskTemplateForm.id}`, payload);
        setTaskTemplateMessage("Task template updated.");
      } else {
        await apiPost("/admin/task-templates", payload);
        setTaskTemplateMessage("Task template created.");
      }

      await refreshData();
      setTaskTemplateForm(defaultTaskTemplateForm(firstCropId));
    } catch {
      setTaskTemplateMessage("Could not save the task template right now.");
    }
  };

  const submitScheme = async () => {
    setSchemeMessage(null);

    try {
      const payload = {
        title: schemeForm.title.trim(),
        titleHi: schemeForm.titleHi.trim() || undefined,
        description: schemeForm.description.trim(),
        descriptionHi: schemeForm.descriptionHi.trim() || undefined,
        category: schemeForm.category.trim(),
        applicableState: schemeForm.applicableState.trim(),
        officialLink: schemeForm.officialLink.trim(),
        language: schemeForm.language,
        active: schemeForm.active,
      };

      if (schemeForm.id) {
        await apiPatch(`/admin/schemes/${schemeForm.id}`, payload);
        setSchemeMessage("Scheme updated.");
      } else {
        await apiPost("/admin/schemes", payload);
        setSchemeMessage("Scheme created.");
      }

      await refreshData();
      setSchemeForm(defaultSchemeForm());
    } catch {
      setSchemeMessage("Could not save the scheme right now.");
    }
  };

  return (
    <AdminOpsPage
      title="Internal Admin"
      description="Manage crop rules, task templates, schemes, and operational reports without touching the database directly."
    >
      <SectionCard title="Overview" eyebrow="Internal metrics">
        <div className="grid gap-4 md:grid-cols-5">
          {overview
            ? Object.entries(overview.totals as Record<string, number>).map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[var(--line)] bg-white/72 p-4"
                  >
                    <p className="section-heading">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ),
              )
            : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Crop definitions"
        eyebrow="Rules content"
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={() => setCropForm(defaultCropForm())}
          >
            New crop
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <InputField
              label="Slug"
              value={cropForm.slug}
              onChange={(value) => setCropForm({ ...cropForm, slug: value })}
              placeholder="wheat"
            />
            <InputField
              label="Name (English)"
              value={cropForm.nameEn}
              onChange={(value) => setCropForm({ ...cropForm, nameEn: value })}
              placeholder="Wheat"
            />
            <InputField
              label="Name (Hindi)"
              value={cropForm.nameHi}
              onChange={(value) => setCropForm({ ...cropForm, nameHi: value })}
              placeholder="गेहूं"
            />
            <ToggleField
              label="Active"
              checked={cropForm.active}
              onChange={(checked) =>
                setCropForm({ ...cropForm, active: checked })
              }
            />
            <InlineMessage message={cropMessage} />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="primary-button"
                onClick={submitCrop}
              >
                {cropForm.id ? "Save crop" : "Create crop"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCropForm(defaultCropForm())}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {crops?.cropDefinitions.map((crop) => (
              <SelectableCard
                key={crop.id}
                title={crop.nameEn}
                subtitle={`${crop.slug} | ${crop.stageRules.length} stages | ${crop.taskTemplates.length} templates`}
                badge={crop.active ? "ACTIVE" : "INACTIVE"}
                onSelect={() =>
                  setCropForm({
                    id: crop.id,
                    slug: crop.slug,
                    nameEn: crop.nameEn,
                    nameHi: crop.nameHi,
                    active: crop.active,
                  })
                }
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Crop stage rules"
        eyebrow="Deterministic stages"
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={() => setStageRuleForm(defaultStageRuleForm(firstCropId))}
          >
            New rule
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <SelectField
              label="Crop"
              value={stageRuleForm.cropDefinitionId || firstCropId}
              onChange={(value) =>
                setStageRuleForm({ ...stageRuleForm, cropDefinitionId: value })
              }
              options={
                crops?.cropDefinitions.map((crop) => ({
                  value: crop.id,
                  label: crop.nameEn,
                })) ?? []
              }
            />
            <InputField
              label="Stage key"
              value={stageRuleForm.stageKey}
              onChange={(value) =>
                setStageRuleForm({ ...stageRuleForm, stageKey: value })
              }
              placeholder="flowering"
            />
            <InputField
              label="Label (English)"
              value={stageRuleForm.labelEn}
              onChange={(value) =>
                setStageRuleForm({ ...stageRuleForm, labelEn: value })
              }
              placeholder="Flowering"
            />
            <InputField
              label="Label (Hindi)"
              value={stageRuleForm.labelHi}
              onChange={(value) =>
                setStageRuleForm({ ...stageRuleForm, labelHi: value })
              }
              placeholder="फूल बनना"
            />
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField
                label="Start day"
                value={stageRuleForm.startDay}
                onChange={(value) =>
                  setStageRuleForm({ ...stageRuleForm, startDay: value })
                }
              />
              <NumberField
                label="End day"
                value={stageRuleForm.endDay}
                onChange={(value) =>
                  setStageRuleForm({ ...stageRuleForm, endDay: value })
                }
              />
              <NumberField
                label="Sort order"
                value={stageRuleForm.sortOrder}
                onChange={(value) =>
                  setStageRuleForm({ ...stageRuleForm, sortOrder: value })
                }
              />
            </div>
            <InlineMessage message={stageRuleMessage} />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="primary-button"
                onClick={submitStageRule}
              >
                {stageRuleForm.id ? "Save rule" : "Create rule"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setStageRuleForm(defaultStageRuleForm(firstCropId))
                }
              >
                Reset
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {stageRules?.stageRules.map((rule) => (
              <SelectableCard
                key={rule.id}
                title={`${cropNameById.get(rule.cropDefinitionId) ?? "Crop"} | ${rule.labelEn}`}
                subtitle={`Days ${rule.startDay}-${rule.endDay} | sort ${rule.sortOrder}`}
                badge={rule.stageKey}
                onSelect={() => setStageRuleForm({ ...rule })}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Task templates"
        eyebrow="Weekly actions"
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setTaskTemplateForm(defaultTaskTemplateForm(firstCropId))
            }
          >
            New template
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <SelectField
              label="Crop"
              value={taskTemplateForm.cropDefinitionId || firstCropId}
              onChange={(value) =>
                setTaskTemplateForm({
                  ...taskTemplateForm,
                  cropDefinitionId: value,
                })
              }
              options={
                crops?.cropDefinitions.map((crop) => ({
                  value: crop.id,
                  label: crop.nameEn,
                })) ?? []
              }
            />
            <InputField
              label="Stage key"
              value={taskTemplateForm.stageKey}
              onChange={(value) =>
                setTaskTemplateForm({ ...taskTemplateForm, stageKey: value })
              }
              placeholder="flowering"
            />
            <InputField
              label="Title (English)"
              value={taskTemplateForm.titleEn}
              onChange={(value) =>
                setTaskTemplateForm({ ...taskTemplateForm, titleEn: value })
              }
              placeholder="Scout for rust"
            />
            <InputField
              label="Title (Hindi)"
              value={taskTemplateForm.titleHi}
              onChange={(value) =>
                setTaskTemplateForm({ ...taskTemplateForm, titleHi: value })
              }
              placeholder="रोग की जांच करें"
            />
            <TextAreaField
              label="Description (English)"
              value={taskTemplateForm.descriptionEn}
              onChange={(value) =>
                setTaskTemplateForm({
                  ...taskTemplateForm,
                  descriptionEn: value,
                })
              }
            />
            <TextAreaField
              label="Description (Hindi)"
              value={taskTemplateForm.descriptionHi}
              onChange={(value) =>
                setTaskTemplateForm({
                  ...taskTemplateForm,
                  descriptionHi: value,
                })
              }
            />
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField
                label="Due day offset"
                value={taskTemplateForm.dueDayOffset}
                onChange={(value) =>
                  setTaskTemplateForm({
                    ...taskTemplateForm,
                    dueDayOffset: value,
                  })
                }
              />
              <SelectField
                label="Task type"
                value={taskTemplateForm.taskType}
                onChange={(value) =>
                  setTaskTemplateForm({
                    ...taskTemplateForm,
                    taskType: value as TaskTemplate["taskType"],
                  })
                }
                options={[
                  { value: "GENERAL", label: "General" },
                  { value: "IRRIGATION", label: "Irrigation" },
                  { value: "FERTILIZER", label: "Fertilizer" },
                  { value: "SCOUTING", label: "Scouting" },
                  { value: "HARVEST_PREP", label: "Harvest prep" },
                ]}
              />
              <SelectField
                label="Priority"
                value={taskTemplateForm.priority}
                onChange={(value) =>
                  setTaskTemplateForm({
                    ...taskTemplateForm,
                    priority: value as TaskTemplate["priority"],
                  })
                }
                options={[
                  { value: "LOW", label: "Low" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HIGH", label: "High" },
                ]}
              />
            </div>
            <ToggleField
              label="Active"
              checked={taskTemplateForm.active}
              onChange={(checked) =>
                setTaskTemplateForm({ ...taskTemplateForm, active: checked })
              }
            />
            <InlineMessage message={taskTemplateMessage} />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="primary-button"
                onClick={submitTaskTemplate}
              >
                {taskTemplateForm.id ? "Save template" : "Create template"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setTaskTemplateForm(defaultTaskTemplateForm(firstCropId))
                }
              >
                Reset
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {taskTemplates?.taskTemplates.map((template) => (
              <SelectableCard
                key={template.id}
                title={`${cropNameById.get(template.cropDefinitionId) ?? "Crop"} | ${template.titleEn}`}
                subtitle={`${template.stageKey} | day ${template.dueDayOffset} | ${template.priority}`}
                badge={template.taskType}
                onSelect={() => setTaskTemplateForm({ ...template })}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Schemes"
        eyebrow="Support content"
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSchemeForm(defaultSchemeForm())}
          >
            New scheme
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <InputField
              label="Title"
              value={schemeForm.title}
              onChange={(value) =>
                setSchemeForm({ ...schemeForm, title: value })
              }
              placeholder="PM-KISAN"
            />
            <InputField
              label="Title (Hindi)"
              value={schemeForm.titleHi}
              onChange={(value) =>
                setSchemeForm({ ...schemeForm, titleHi: value })
              }
              placeholder="पीएम-किसान"
            />
            <TextAreaField
              label="Description"
              value={schemeForm.description}
              onChange={(value) =>
                setSchemeForm({ ...schemeForm, description: value })
              }
            />
            <TextAreaField
              label="Description (Hindi)"
              value={schemeForm.descriptionHi}
              onChange={(value) =>
                setSchemeForm({ ...schemeForm, descriptionHi: value })
              }
            />
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Category"
                value={schemeForm.category}
                onChange={(value) =>
                  setSchemeForm({ ...schemeForm, category: value })
                }
                placeholder="Income Support"
              />
              <InputField
                label="Applicable state"
                value={schemeForm.applicableState}
                onChange={(value) =>
                  setSchemeForm({ ...schemeForm, applicableState: value })
                }
                placeholder="ALL"
              />
            </div>
            <InputField
              label="Official link"
              value={schemeForm.officialLink}
              onChange={(value) =>
                setSchemeForm({ ...schemeForm, officialLink: value })
              }
              placeholder="https://example.gov.in/"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Primary language"
                value={schemeForm.language}
                onChange={(value) =>
                  setSchemeForm({
                    ...schemeForm,
                    language: value as SchemeForm["language"],
                  })
                }
                options={[
                  { value: "en", label: "English" },
                  { value: "hi", label: "Hindi" },
                ]}
              />
              <ToggleField
                label="Active"
                checked={schemeForm.active}
                onChange={(checked) =>
                  setSchemeForm({ ...schemeForm, active: checked })
                }
              />
            </div>
            <InlineMessage message={schemeMessage} />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="primary-button"
                onClick={submitScheme}
              >
                {schemeForm.id ? "Save scheme" : "Create scheme"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSchemeForm(defaultSchemeForm())}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {schemes?.schemes.map((scheme) => (
              <SelectableCard
                key={scheme.id}
                title={scheme.title}
                subtitle={`${scheme.applicableState} | ${scheme.category}`}
                badge={scheme.language.toUpperCase()}
                onSelect={() =>
                  setSchemeForm({
                    id: scheme.id,
                    title: scheme.title,
                    titleHi: scheme.titleHi ?? "",
                    description: scheme.description,
                    descriptionHi: scheme.descriptionHi ?? "",
                    category: scheme.category,
                    applicableState: scheme.applicableState,
                    officialLink: scheme.officialLink,
                    language: scheme.language,
                    active: scheme.active,
                  })
                }
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent disease reports" eyebrow="Operational review">
        <div className="space-y-3">
          {reports?.diseaseReports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-[var(--line)] bg-white/72 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">
                  {report.predictedIssue ?? "Unclear issue"}
                </p>
                <span
                  className={`status-pill ${report.escalationRequired ? "red" : "green"}`}
                >
                  {report.status}
                </span>
              </div>
              <p className="mt-2 text-sm muted">
                {report.cropSeason.cropName} | {formatDate(report.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </AdminOpsPage>
  );
}

function InlineMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm font-medium text-[var(--brand)]">{message}</p>;
}

function SelectableCard({
  title,
  subtitle,
  badge,
  onSelect,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-2xl border border-[var(--line)] bg-white/72 p-4 text-left transition hover:border-[var(--brand)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">{title}</p>
        {badge ? <span className="status-pill green">{badge}</span> : null}
      </div>
      <p className="mt-2 text-sm muted">{subtitle}</p>
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "url";
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input
        value={value}
        type="number"
        onChange={(event) => onChange(Number(event.target.value))}
        className="field-input"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white/72 px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
