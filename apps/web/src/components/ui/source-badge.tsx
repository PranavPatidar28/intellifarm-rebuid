import { Badge } from "./badge";

export function SourceBadge({ label }: { label: string }) {
  return <Badge tone="info">{label}</Badge>;
}
