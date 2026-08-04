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
          <p className={styles.readyBadge} role="status">
            {readinessHeadline(ready)}
          </p>
          <ul className={styles.checklist}>
            {checklist.map((item) => (
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
