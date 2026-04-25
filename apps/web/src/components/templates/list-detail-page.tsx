import type { ReactNode } from "react";

import { WorkspacePage } from "./workspace-page";

export function ListDetailPage({
  title,
  description,
  eyebrow,
  actions,
  list,
  detail,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  list: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <WorkspacePage
      title={title}
      description={description}
      eyebrow={eyebrow}
      actions={actions}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.7fr)]">
        <section className="space-y-5">{list}</section>
        {detail ? <aside className="space-y-5">{detail}</aside> : null}
      </div>
    </WorkspacePage>
  );
}
