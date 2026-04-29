import type { ReactNode } from 'react';

import { SectionHeaderRow } from '@/components/section-header-row';

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return <SectionHeaderRow eyebrow={eyebrow} title={title} action={action} />;
}
