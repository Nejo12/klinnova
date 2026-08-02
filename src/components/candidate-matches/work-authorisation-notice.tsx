import styles from "./candidate-matches.module.scss";

export const WORK_AUTHORISATION_NOTICE =
  "Matches are shown using the work-authorisation declaration you provided during onboarding. Stint has not verified documents.";

export function WorkAuthorisationNotice() {
  return <p className={styles.notice}>{WORK_AUTHORISATION_NOTICE}</p>;
}
