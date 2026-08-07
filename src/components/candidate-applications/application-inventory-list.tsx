import { ApplicationInventoryCard } from "@/components/candidate-applications/application-inventory-card";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";

type ApplicationInventoryListProps = {
  applications: ApplicationInventoryRow[];
};

/** Renders rows in the database's own `submitted_at desc, id asc` order — never re-sorted. */
export function ApplicationInventoryList({
  applications,
}: ApplicationInventoryListProps) {
  return (
    <ul className={styles.list}>
      {applications.map((application) => (
        <li key={application.id}>
          <ApplicationInventoryCard application={application} />
        </li>
      ))}
    </ul>
  );
}
