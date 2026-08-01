/**
 * Minimal brand wordmark for the application shell.
 * Visual tokens land in PR 0.2; this only proves absolute imports and SCSS Modules.
 */
import styles from "./brand-mark.module.scss";

export function BrandMark() {
  return <p className={styles.mark}>Stint</p>;
}
