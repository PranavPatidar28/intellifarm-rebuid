export const soilTypeOptions = [
  {
    value: "ALLUVIAL",
    label: "Alluvial",
    detail: "Common in river plains and broad cereal belts.",
  },
  {
    value: "BLACK_REGUR",
    label: "Black (Regur)",
    detail: "Dark cotton soil with stronger moisture holding.",
  },
  {
    value: "RED",
    label: "Red",
    detail: "Lighter, common across many dryland farming areas.",
  },
  {
    value: "LATERITE",
    label: "Laterite",
    detail: "Weathered soil with lower fertility and higher acidity risk.",
  },
  {
    value: "SANDY",
    label: "Sandy",
    detail: "Fast draining and lighter in nutrient holding.",
  },
  {
    value: "CLAY_HEAVY",
    label: "Clay-heavy",
    detail: "Sticky, heavier soil with better water holding.",
  },
  {
    value: "LOAMY_MIXED",
    label: "Loamy / Mixed",
    detail: "Balanced mixed texture when the field is neither sandy nor heavy clay.",
  },
  {
    value: "NOT_SURE",
    label: "Not sure",
    detail: "Use a broad fallback if the farmer cannot identify the soil type.",
  },
] as const;

export const seasonOptions = [
  { value: "KHARIF", label: "Kharif", month: 6 },
  { value: "RABI", label: "Rabi", month: 11 },
  { value: "ZAID", label: "Zaid", month: 3 },
  { value: "CUSTOM", label: "Custom", month: new Date().getMonth() + 1 },
] as const;

export const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

export function soilTypeLabel(value?: string | null) {
  return (
    soilTypeOptions.find((option) => option.value === value)?.label ?? "Not set"
  );
}

export function seasonLabel(value: string) {
  return seasonOptions.find((option) => option.value === value)?.label ?? value;
}

export function predictionConfidenceLabel(value: "HIGH" | "MEDIUM" | "LOW") {
  const labels = {
    HIGH: "High confidence",
    MEDIUM: "Medium confidence",
    LOW: "Low confidence",
  } as const;

  return labels[value];
}

export function predictionConfidenceTone(value: "HIGH" | "MEDIUM" | "LOW") {
  const tones = {
    HIGH: "green",
    MEDIUM: "orange",
    LOW: "red",
  } as const;

  return tones[value];
}

export function irrigationTypeLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
