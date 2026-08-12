import styles from "./brand-mark.module.scss";

type BrandMarkProps = {
  as?: "p" | "span";
};

export function BrandMark({ as = "p" }: BrandMarkProps) {
  const Tag = as;

  return <Tag className={styles.mark}>Klinnova</Tag>;
}
