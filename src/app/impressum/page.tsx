import Link from "next/link";

import styles from "@/components/legal/legal-page.module.scss";
import { PublicFooter } from "@/components/public-shared/public-footer";

export const metadata = {
  title: "Impressum · Klinnova",
  description: "Provider identification for Klinnova under § 5 DDG.",
  robots: { index: false, follow: false },
};

export default function ImpressumPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>Impressum</h1>

      <section className={styles.section} aria-labelledby="impressum-ddg">
        <h2 className={styles.sectionHeading} id="impressum-ddg">
          Information according to § 5 DDG
        </h2>
        <p className={styles.body}>
          Provider identification for the Klinnova digital service under § 5 of
          the Digitale-Dienste-Gesetz (DDG).
        </p>
        <dl className={styles.fieldList}>
          <dt>Service operator / legal person</dt>
          <dd>Olaniyi Gabriel Aborisade, trading as Klinnova</dd>

          <dt>Legal form</dt>
          <dd>
            Sole trader / nicht eingetragenes Einzelunternehmen (Nebenerwerb)
          </dd>

          <dt>Service address</dt>
          <dd>Wattstrasse 57, 12459 Berlin, Germany</dd>

          <dt>Responsible representative</dt>
          <dd>Olaniyi Gabriel Aborisade</dd>

          <dt>Contact email</dt>
          <dd>
            <a className={styles.backLink} href="mailto:support@klinnova.com">
              support@klinnova.com
            </a>
          </dd>

          <dt>Phone</dt>
          <dd>
            <a className={styles.backLink} href="tel:+4915569006852">
              0155 69006852
            </a>
          </dd>

          <dt>Commercial register</dt>
          <dd>Not applicable — not entered in the commercial register</dd>

          <dt>VAT ID (USt-IdNr)</dt>
          <dd>Not issued</dd>

          <dt>Trade authority (informational)</dt>
          <dd>
            Bezirksamt Treptow-Köpenick von Berlin / Ordnungsamt.
            Gewerbeanmeldung submitted 2026-08-14; receipt of the Gewerbeanzeige
            certified on 2026-08-26 under § 15 Abs. 1 GewO. Registered
            commencement date: 2026-09-01.
          </dd>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="impressum-de">
        <h2 className={styles.sectionHeading} id="impressum-de">
          Angaben gemäß § 5 DDG
        </h2>
        <dl className={styles.fieldList}>
          <dt>Diensteanbieter</dt>
          <dd>Olaniyi Gabriel Aborisade</dd>

          <dt>Geschäftsbezeichnung</dt>
          <dd>Klinnova</dd>

          <dt>Rechtsform</dt>
          <dd>Nicht eingetragenes Einzelunternehmen (Nebenerwerb)</dd>

          <dt>Anschrift</dt>
          <dd>Wattstraße 57, 12459 Berlin</dd>

          <dt>E-Mail</dt>
          <dd>
            <a className={styles.backLink} href="mailto:support@klinnova.com">
              support@klinnova.com
            </a>
          </dd>

          <dt>Telefon</dt>
          <dd>
            <a className={styles.backLink} href="tel:+4915569006852">
              0155 69006852
            </a>
          </dd>

          <dt>Handelsregister</dt>
          <dd>Nicht eingetragen / entfällt</dd>

          <dt>Umsatzsteuer-ID</dt>
          <dd>Derzeit nicht erteilt</dd>
        </dl>
      </section>

      <PublicFooter />
    </main>
  );
}
