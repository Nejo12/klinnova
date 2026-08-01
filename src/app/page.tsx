import { CandidateShell } from "@/components/candidate-shell";
import { EmployerShell } from "@/components/employer-shell";
import { ShellHeader } from "@/components/shell-header";

import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <>
      <ShellHeader />
      <main className={styles.main}>
        <CandidateShell />
        <EmployerShell />
      </main>
      <footer className={styles.footer}>
        <p className={styles.footerCopy}>
          Slice 0 shell preview. Product flows arrive in later slices.
        </p>
      </footer>
    </>
  );
}
