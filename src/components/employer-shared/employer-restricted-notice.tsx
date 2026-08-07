import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { EMPLOYER_RESTRICTED_NOTICE } from "@/lib/employer/messages";

type EmployerRestrictedNoticeProps = {
  message?: string;
};

/**
 * Neutral, non-accusatory notice shown across employer-facing surfaces
 * while the account is suspended. Never renders the operator-authored
 * suspension reason, operator identity, or moderation history — the
 * accepted D-072 contract does not expose any of that to the employer.
 */
export function EmployerRestrictedNotice({
  message = EMPLOYER_RESTRICTED_NOTICE,
}: EmployerRestrictedNoticeProps) {
  return (
    <p className={styles.warning} role="status">
      {message}
    </p>
  );
}
