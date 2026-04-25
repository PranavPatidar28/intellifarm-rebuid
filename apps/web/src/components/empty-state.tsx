import type { ReactNode } from "react";

import { UiEmptyState } from "./ui/empty-state";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return <UiEmptyState title={title} description={description} action={action} />;
}
