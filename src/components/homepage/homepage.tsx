import { CandidateJourney } from "@/components/homepage/candidate-journey";
import { EmployerBand } from "@/components/homepage/employer-band";
import { FinalCta } from "@/components/homepage/final-cta";
import { OpenJobsPreview } from "@/components/homepage/open-jobs-preview";
import { PublicHero } from "@/components/homepage/public-hero";
import { ValuePillars } from "@/components/homepage/value-pillars";
import { PublicFooter } from "@/components/public-shared/public-footer";
import { ShellHeader } from "@/components/shell-header";
import type { LoadPublicVacanciesResult } from "@/lib/public-jobs/load-public-vacancies";

import styles from "./homepage.module.scss";

type HomepageProps = {
  jobsResult: LoadPublicVacanciesResult;
  viewer?: {
    destination: string;
    workspace: "candidate" | "employer" | null;
  };
};

export function Homepage({ jobsResult, viewer }: HomepageProps) {
  return (
    <>
      <ShellHeader authenticated={viewer} />
      <main className={styles.main}>
        <PublicHero authenticatedDestination={viewer?.destination} />
        <ValuePillars />
        <CandidateJourney />
        <OpenJobsPreview result={jobsResult} />
        <EmployerBand authenticatedDestination={viewer?.destination} />
        <FinalCta authenticatedDestination={viewer?.destination} />
      </main>
      <footer className={styles.footer}>
        <PublicFooter />
      </footer>
    </>
  );
}
