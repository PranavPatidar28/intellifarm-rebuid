type ProgressStepperProps = {
  steps: string[];
  currentStep: number;
};

export function ProgressStepper({
  steps,
  currentStep,
}: ProgressStepperProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const active = stepNumber === currentStep;
        const complete = stepNumber < currentStep;

        return (
          <div
            key={step}
            className={`rounded-[var(--radius-card)] border p-4 ${
              active
                ? "border-[rgba(30,90,60,0.2)] bg-[var(--brand-soft)]"
                : complete
                  ? "border-[rgba(200,138,44,0.2)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-white/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                  active
                    ? "bg-[var(--brand)] text-white"
                    : complete
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--muted)]"
                }`}
              >
                {stepNumber}
              </span>
              <div>
                <p className="font-semibold">{step}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] muted">
                  {complete ? "Done" : active ? "Current step" : "Next"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
