import styles from "./value-pillars.module.scss";

type Pillar = {
  heading: string;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    heading: "Jobs that fit your situation",
    body: "Category, language, hours and availability — matched to your profile.",
  },
  {
    heading: "Know before you apply",
    body: "Requirements stated on the vacancy, not hidden in the text.",
  },
  {
    heading: "Your status stays visible",
    body: "In the app, and by email.",
  },
  {
    heading: "Verified before publishing",
    body: "Every employer is checked first.",
  },
];

export function ValuePillars() {
  return (
    <section className={styles.section} aria-labelledby="value-pillars-heading">
      <h2 className={styles.heading} id="value-pillars-heading">
        Made for how Berlin works
      </h2>
      <ul className={styles.grid}>
        {PILLARS.map((pillar) => (
          <li key={pillar.heading} className={styles.card}>
            <h3 className={styles.cardHeading}>{pillar.heading}</h3>
            <p className={styles.cardBody}>{pillar.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
