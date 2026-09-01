interface Step {
  title: string;
  copy: string;
}

interface StepRailProps {
  steps: Step[];
}

export function StepRail({ steps }: StepRailProps) {
  return (
    <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
      {/* Connecting rail — the steps are a sequence, so draw the sequence. */}
      <span
        aria-hidden
        className="absolute left-5 top-6 hidden h-[calc(100%-3rem)] w-px bg-gradient-to-b from-primary/50 via-primary/25 to-transparent sm:block md:left-0 md:top-5 md:h-px md:w-full md:bg-gradient-to-r"
      />

      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 sm:gap-5 md:flex-col">
          <span className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-background font-display text-base text-primary">
            {index + 1}
          </span>
          <div className="space-y-1.5 md:pr-6">
            <h3 className="font-display text-lg text-foreground sm:text-xl">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {step.copy}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
