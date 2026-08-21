import styles from "./legal-page.module.scss";

type DraftNoticeProps = {
  documentName: string;
};

/**
 * Shared founder-verification notice reused across legal pages — one wording
 * variant, not one per page. Remains until Unit H H4 founder approval removes
 * or replaces it.
 */
export function DraftNotice({ documentName }: DraftNoticeProps) {
  return (
    <div className={styles.draftNotice} role="note">
      <p className={styles.draftNoticeTitle}>
        Draft — founder verification required
      </p>
      <p className={styles.draftNoticeBody}>
        This {documentName} is proposed Unit H wording for founder audit. It is
        not legal advice, has not been finally approved, and must not be treated
        as complete compliance until the founder verifies and closes Unit H.
      </p>
    </div>
  );
}
