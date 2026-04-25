import type { ReactNode } from "react";

import { WorkspacePage } from "./templates/workspace-page";

type AppShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  mode?: "default" | "focus";
};

export function AppShell({
  title,
  description,
  eyebrow = "Crop Season Copilot",
  actions,
  children,
  mode = "default",
}: AppShellProps) {
  return (
    <WorkspacePage
      title={title}
      description={description}
      eyebrow={eyebrow}
      actions={actions}
      mode={mode === "focus" ? "focus" : "default"}
    >
      {children}
    </WorkspacePage>
  );
}
