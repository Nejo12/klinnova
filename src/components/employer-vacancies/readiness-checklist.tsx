import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  readinessHeadline,
  type ReadinessChecklistItem,
} from "@/lib/employer/vacancies/readiness";
import {
  VACANCY_PRIVATE_NOTICE,
  VACANCY_VERIFICATION_INFO,
} from "@/lib/employer/vacancies/messages";

type ReadinessChecklistProps = {
  ready: boolean;
  checklist: ReadinessChecklistItem[];
  available?: boolean;
};

export function ReadinessChecklist({
  ready,
  checklist,
  available = true,
}: ReadinessChecklistProps) {
  // Missing items are what the employer needs to act on next, so surface
  // them first — this only reorders the rendered `<li>`s (a stable sort on
  // a copy of `checklist`); it never changes the checklist item set, the
  // `complete` flags, or `readinessHeadline`.
  const orderedChecklist = [...checklist].sort((a, b) => {
    if (a.complete === b.complete) {
      return 0;
    }
    return a.complete ? 1 : -1;
  });

  return (
    <section className={styles.section} aria-labelledby="readiness-heading">
      <h2 id="readiness-heading" className={styles.sectionHeading}>
        Publication readiness
      </h2>
      <p className={styles.note}>{VACANCY_PRIVATE_NOTICE}</p>
      <p className={styles.note}>{VACANCY_VERIFICATION_INFO}</p>
      {!available ? (
        <p className={styles.support} role="status">
          Readiness could not be loaded for this draft.
        </p>
      ) : (
        <>
          <p
            className={styles.readyBadge}
            data-ready={ready ? "true" : "false"}
            role="status"
          >
            {readinessHeadline(ready)}
          </p>
          <ul className={styles.checklist}>
            {orderedChecklist.map((item) => (
              <li
                key={item.id}
                className={styles.checklistItem}
                data-complete={item.complete ? "true" : "false"}
              >
                <span className={styles.checklistMarker}>
                  {item.complete ? "Complete" : "Missing"}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
