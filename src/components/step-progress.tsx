import styles from "./step-progress.module.scss";

type StepState = "current" | "upcoming";

type Step = {
  label: string;
  state: StepState;
};

const steps: readonly Step[] = [
  { label: "Tell us what you can do", state: "current" },
  { label: "See suitable work", state: "upcoming" },
  { label: "Apply", state: "upcoming" },
];

function stateLabel(state: StepState): string {
  if (state === "current") {
    return "Current";
  }

  return "Upcoming";
}

export function StepProgress() {
  return (
    <nav className={styles.root} aria-label="Example candidate progress">
      <ol className={styles.list}>
        {steps.map((step) => {
          const isCurrent = step.state === "current";

          return (
            <li
              key={step.label}
              className={styles.item}
              data-state={step.state}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className={styles.marker} aria-hidden="true" />
              <span className={styles.copy}>
                <span className={styles.state}>{stateLabel(step.state)}</span>
                <span className={styles.label}>{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
