import styles from "./candidate-matches.module.scss";

type MatchCountProps = {
  count: number;
};

export function formatMatchCount(count: number): string {
  if (count === 1) {
    return "1 matching job";
  }
  return `${count} matching jobs`;
}

export function MatchCount({ count }: MatchCountProps) {
  return <p className={styles.count}>{formatMatchCount(count)}</p>;
}
