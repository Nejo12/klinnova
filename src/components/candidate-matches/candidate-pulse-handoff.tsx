"use client";

import { useEffect, useState } from "react";

import type { CandidatePulseProfileItem } from "@/lib/pulse/candidate-profile";

import styles from "./candidate-pulse-handoff.module.scss";

type PulsePhase = "ready" | "matching";

type CandidatePulseHandoffProps = {
  profileItems: readonly CandidatePulseProfileItem[];
};

function stripPulseMarkerFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("pulse")) {
    return;
  }

  url.searchParams.delete("pulse");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function CandidatePulseHandoff({
  profileItems,
}: CandidatePulseHandoffProps) {
  const [phase, setPhase] = useState<PulsePhase>("ready");

  useEffect(() => {
    stripPulseMarkerFromUrl();

    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      setPhase("matching");
      return;
    }

    const timer = window.setTimeout(() => setPhase("matching"), 650);
    return () => window.clearTimeout(timer);
  }, []);

  const advance = () => setPhase("matching");

  return (
    <section
      className={styles.root}
      data-phase={phase}
      aria-label="Klinnova Pulse journey"
      onPointerDown={advance}
      onKeyDown={advance}
    >
      <ol className={styles.rail} aria-label="Journey stages">
        <li
          className={`${styles.stage} ${
            phase === "ready" ? styles.stageCurrent : styles.stageComplete
          }`}
          aria-current={phase === "ready" ? "step" : undefined}
        >
          Understanding
        </li>
        <li
          className={`${styles.stage} ${
            phase === "matching" ? styles.stageCurrent : ""
          }`}
          aria-current={phase === "matching" ? "step" : undefined}
        >
          Connecting
        </li>
        <li className={styles.stage}>Progressing</li>
      </ol>

      <div className={styles.ready} aria-hidden={phase === "matching"}>
        <p className={styles.eyebrow}>Profile ready</p>
        <h2 className={styles.readyTitle}>Ready for matching</h2>
        <p className={styles.readyBody}>
          Your saved essentials are complete. Klinnova can now use them to
          identify current opportunities that fit.
        </p>
      </div>

      <div className={styles.matching}>
        <p className={styles.matchingTitle}>Matching on your profile</p>
        <ul className={styles.profileItems}>
          {profileItems.map((item) => (
            <li className={styles.profileItem} key={item.key}>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.itemValue}>{item.value}</span>
            </li>
          ))}
        </ul>
        <p className={styles.guidance}>
          These matches use the profile you just confirmed.
        </p>
      </div>
    </section>
  );
}
