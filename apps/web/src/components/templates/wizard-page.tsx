import type { ReactNode } from "react";

import { WorkspacePage } from "./workspace-page";

export function WizardPage({
  title,
  description,
  stepper,
  children,
  sidebar,
}: {
  title: string;
  description: string;
  stepper: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  return (
    <WorkspacePage
      mode="focus"
      title={title}
      description={description}
      eyebrow="Guided setup"
      className="surface-card-strong"
    >
      <div className="grid gap-4">{stepper}</div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">{children}</div>
        {sidebar ? <aside className="space-y-4">{sidebar}</aside> : null}
      </div>
    </WorkspacePage>
  );
}
