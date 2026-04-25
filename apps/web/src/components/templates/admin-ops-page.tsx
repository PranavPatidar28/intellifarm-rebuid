import type { ReactNode } from "react";

import { WorkspacePage } from "./workspace-page";

export function AdminOpsPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <WorkspacePage
      title={title}
      description={description}
      eyebrow="Admin operations"
      actions={actions}
      mode="admin"
      className="surface-card-strong"
    >
      <div className="grid gap-5">{children}</div>
    </WorkspacePage>
  );
}
