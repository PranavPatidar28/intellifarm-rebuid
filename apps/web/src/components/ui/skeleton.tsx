import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[0.85rem] bg-[linear-gradient(90deg,rgba(24,35,27,0.05),rgba(24,35,27,0.09),rgba(24,35,27,0.05))]",
        className,
      )}
    />
  );
}
