import { FilterChipRow } from '@/components/filter-chip-row';

export function SegmentedChipRow<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return <FilterChipRow value={value} options={options} onChange={onChange} />;
}
