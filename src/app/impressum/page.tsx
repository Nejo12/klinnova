import Link from "next/link";

import { DraftNotice } from "@/components/legal/draft-notice";
import styles from "@/components/legal/legal-page.module.scss";
import { PublicFooter } from "@/components/public-shared/public-footer";

export const metadata = {
  title: "Impressum · Stint",
  description: "Draft Impressum placeholder — legal review required.",
  robots: { index: false, follow: false },
};

export default function ImpressumPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Stint
      </Link>
      <h1 className={styles.heading}>Impressum</h1>

      <DraftNotice documentName="Impressum" />

      <section className={styles.section} aria-labelledby="impressum-details">
        <h2 className={styles.sectionHeading} id="impressum-details">
          Service operator details
        </h2>
        <dl className={styles.fieldList}>
          <dt>Service operator / legal entity</dt>
          <dd>[TO COMPLETE]</dd>

          <dt>Legal form</dt>
          <dd>[TO COMPLETE]</dd>

          <dt>Address</dt>
          <dd>[TO COMPLETE]</dd>

          <dt>Responsible representative</dt>
          <dd>[TO COMPLETE]</dd>

          <dt>Contact email</dt>
          <dd>[TO COMPLETE]</dd>

          <dt>Register / registration number</dt>
          <dd>[IF APPLICABLE]</dd>

          <dt>VAT ID</dt>
          <dd>[IF APPLICABLE]</dd>
        </dl>
      </section>

      <PublicFooter />
    </main>
  );
}
