import type { ReactNode } from "react";

import { WorkspacePage } from "./workspace-page";

export function DashboardPageTemplate({
  title,
  description,
  actions,
  hero,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  hero?: ReactNode;
  children: ReactNode;
}) {
  return (
    <WorkspacePage
      title={title}
      description={description}
      eyebrow="Today"
      actions={actions}
    >
      {hero && <section className="grid gap-4 mb-4">{hero}</section>}
      {children}
    </WorkspacePage>
  );
}
