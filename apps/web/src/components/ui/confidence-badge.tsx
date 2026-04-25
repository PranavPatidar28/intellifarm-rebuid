import { Badge } from "./badge";

export function ConfidenceBadge({
  value,
}: {
  value: "HIGH" | "MEDIUM" | "LOW";
}) {
  return (
    <Badge
      tone={
        value === "HIGH" ? "success" : value === "MEDIUM" ? "warning" : "danger"
      }
    >
      {value === "HIGH" ? "High confidence" : value === "MEDIUM" ? "Medium confidence" : "Low confidence"}
    </Badge>
  );
}
