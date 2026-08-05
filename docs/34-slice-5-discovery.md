# Slice 5 Discovery

> Analysis artifact. No migrations or application code land here.
> **Status:** Planning **Done**. Decisions D-055–D-067 **Accepted** 2026-08-05
> (`docs/10-decisions.md`). Schema contract locked in `docs/36`.
> Slice 5 product implementation has **not** started. Next unit after PR 5.1
> merges: **PR 5.2** (schema/RLS/RPCs/pgTAP).

**Outcome to enable:** Only verified employers may publish public vacancies;
employers can manage publication lifecycle; candidates can match and apply to
eligible published employer vacancies as well as seed Demo vacancies
(`docs/13-implementation-plan.md`).

**Related:**

- Build plan — `docs/35-slice-5-build-plan.md`
- Schema + publication proposal — `docs/36-slice-5-schema-and-publication-proposal.md`
- Decisions — D-055–D-067 in `docs/10-decisions.md` (**Accepted** 2026-08-05)
- Slice 4 closure — `docs/33-slice-4-closure.md` (Done)
- Prior Accepted boundaries — D-034, D-046–D-054

---

## Verified baseline (do not re-litigate)

| Fact | Evidence |
|------|----------|
| Slice 0–4 Done | `docs/14`; `docs/27`; `docs/33` |
| `employer_profiles` exists; dual capability; no exclusive role | D-047; migration `20260803200000` |
| `verification_state` CHECK + trigger force `'unverified'` only | Same migration; Slice 5 expands |
| Employer drafts: `source=employer`, `publication_state=draft` only | `vacancies_employer_draft_only_chk`; D-050 |
| No publish RPC; readiness does not publish | `employer_vacancy_draft_readiness` |
| Candidate visibility is seed + published + time window only | `visible_seed_vacancy_ids`; D-033 |
| Applications: candidate SELECT own; submit RPC; status `submitted` only | Slice 3; D-042 |
| Exact private residential address not stored | D-051 / D-061 |
| Preview has **no** Preview-scoped Supabase configuration after Slice 4 teardown | `docs/33`; D-067 |
| Applicant review = Slice 6; admin moderation/audit UI = Slice 7 | `docs/13`; D-055 |

---

## Accepted resolution summary

Owner acceptance (2026-08-05) locked the discovery recommendations as D-055–D-067.
Authoritative text lives in `docs/10-decisions.md`. Schema contract for PR 5.2
lives in `docs/36`.

| Topic | Accepted outcome |
|-------|------------------|
| Boundary | Verification gate + publish/lifecycle + public/candidate integration; no applicants/admin product |
| Authority | DB allow-list operators; employer request only; no self-verify; no service-role browser path |
| States | `unverified\|pending\|verified\|rejected\|revoked` with explicit transitions |
| Evidence | Profile + attestation; no Storage/uploads |
| Lifecycle | Six states; explicit RPCs; filled/withdrawn terminal; expired renews via draft |
| Readiness | Transactional in publish RPC; default 30d / max 90d expiry |
| Routes | `/jobs`, `/jobs/[id]`; share effective-public helper with candidate paths |
| Location | Berlin + `public_locality` + workplace type semantics only |
| Matching | Loader expansion; algorithm unchanged unless new decision |
| Expiry | Effective rule `expires_at > now()`; lazy materialization optional |
| Verification loss | Atomic revoke + pause published owned vacancies |
| Audit | Source-row evidence; PR 5.2 may add narrow pause/resume event table |
| Hosted proof | New isolation required; no Production auth by acceptance alone |

### Distinctions preserved

| Concern | Treatment |
|---------|-----------|
| Employer onboarding completion | Independent |
| Verification state | Separate; gates publish |
| Account suspension | Slice 7 |
| Vacancy lifecycle | Separate `publication_state` |
| Vacancy moderation | Slice 7 |

---

## Historical discovery notes

Earlier Proposed options, tensions, and owner-review questions that led to
acceptance are retained conceptually in git history of the planning PR (#47).
Do not treat superseded Proposed wording as current policy — use Accepted
D-055–D-067 and `docs/36`.

---

## Scope exclusions (Accepted)

Applicant list/detail; application status changes; interviews; messaging;
scheduling; reports; moderation dashboard; suspension UI; full admin UI;
GDPR export/deletion; saved jobs; CV upload; exact private address; opaque
ranking; Slice 6/7/8 implementation.

---

## Exit of planning / decision lock

- [x] `docs/34`–`docs/36` exist
- [x] D-055–D-067 Accepted in `docs/10`
- [x] Schema contract unambiguous for PR 5.2
- [ ] PR 5.1 merged
- [ ] PR 5.2 authorized only after PR 5.1 merges
