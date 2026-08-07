import styles from "./legal-page.module.scss";

type DraftNoticeProps = {
  documentName: string;
};

/**
 * Shared draft/legal-review-required warning (D-075) reused verbatim across
 * every legal placeholder page — one wording variant, not one per page.
 */
export function DraftNotice({ documentName }: DraftNoticeProps) {
  return (
    <div className={styles.draftNotice} role="note">
      <p className={styles.draftNoticeTitle}>Draft — legal review required</p>
      <p className={styles.draftNoticeBody}>
        This {documentName} is a structural placeholder written for pilot
        planning. It is not legal advice, has not been reviewed by counsel or a
        data-protection professional, and must not be treated as final or relied
        on before any public launch.
      </p>
    </div>
  );
}
