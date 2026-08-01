import styles from "./employer-shell.module.scss";

export function EmployerShell() {
  return (
    <section
      id="employer-admin-experience"
      className={styles.section}
      aria-labelledby="employer-shell-heading"
    >
      <div className={styles.layout}>
        <aside className={styles.aside} aria-label="Employer and admin preview">
          <p className={styles.eyebrow}>Employer and admin</p>
          <h2 id="employer-shell-heading" className={styles.heading}>
            Clear vacancies. Careful review.
          </h2>
          <p className={styles.lead}>
            Desktop-first workspace preview with a usable layout on smaller
            screens. Verification and vacancy tools are not available yet.
          </p>
        </aside>

        <div className={styles.content}>
          <article className={styles.panel}>
            <h3 className={styles.panelHeading}>Workspace preview</h3>
            <dl className={styles.meta}>
              <div className={styles.metaRow}>
                <dt>Focus</dt>
                <dd>Verified Berlin vacancies</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Layout</dt>
                <dd>Desktop structure from the large breakpoint</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Narrow screens</dt>
                <dd>Single-column fallback, no hidden essentials</dd>
              </div>
            </dl>
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelHeading}>What this shell is not</h3>
            <ul className={styles.list}>
              <li>Not an employer dashboard</li>
              <li>Not vacancy creation or moderation</li>
              <li>Not applicant review</li>
            </ul>
            <a className={styles.link} href="#candidate-experience">
              Back to candidate preview
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
