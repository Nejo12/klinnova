import styles from "./candidate-matches.module.scss";

type MatchCountProps = {
  count: number;
};

export function formatMatchCount(count: number): string {
  if (count === 1) {
    return "1 current role";
  }
  return `${count} current roles`;
}

export function MatchCount({ count }: MatchCountProps) {
  return <p className={styles.count}>{formatMatchCount(count)}</p>;
}
