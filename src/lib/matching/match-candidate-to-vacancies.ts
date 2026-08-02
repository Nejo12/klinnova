import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";
import { compareStrings } from "@/lib/matching/rules";
import type {
  CandidateMatch,
  CandidateMatchingInput,
  VacancyMatchingInput,
} from "@/lib/matching/types";

/**
 * Pure multi-vacancy matcher.
 * Does not mutate `vacancies`. Orders by publishedAt DESC, title ASC, id ASC.
 */
export function matchCandidateToVacancies(
  candidate: CandidateMatchingInput,
  vacancies: readonly VacancyMatchingInput[],
): CandidateMatch[] {
  const matches: CandidateMatch[] = [];
  for (const vacancy of vacancies) {
    const match = matchCandidateToVacancy(candidate, vacancy);
    if (match !== null) {
      matches.push(match);
    }
  }
  return sortMatches(matches);
}

/** published_at DESC, title ASC, id ASC — locale-independent string compare. */
export function sortMatches(
  matches: readonly CandidateMatch[],
): CandidateMatch[] {
  return [...matches].sort((left, right) => {
    const publishedCompare = compareStrings(
      right.vacancy.publishedAt,
      left.vacancy.publishedAt,
    );
    if (publishedCompare !== 0) {
      return publishedCompare;
    }
    const titleCompare = compareStrings(
      left.vacancy.title,
      right.vacancy.title,
    );
    if (titleCompare !== 0) {
      return titleCompare;
    }
    return compareStrings(left.vacancy.id, right.vacancy.id);
  });
}
