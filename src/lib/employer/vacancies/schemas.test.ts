import { describe, expect, it } from "vitest";

import {
  createDraftVacancyFormSchema,
  deleteDraftVacancySchema,
  languageRequirementsSchema,
  parseSalaryFields,
  updateDraftVacancyFormSchema,
  vacancyIdSchema,
} from "@/lib/employer/vacancies/schemas";

describe("vacancy draft schemas", () => {
  it("requires title, category, and locality for create", () => {
    const parsed = createDraftVacancyFormSchema.safeParse({
      title: "  ",
      jobCategory: "cleaning",
      publicLocality: "Mitte",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a minimum create payload", () => {
    const parsed = createDraftVacancyFormSchema.safeParse({
      title: "Morning clean",
      jobCategory: "cleaning",
      publicLocality: "Mitte",
      description: "",
      workplaceType: "",
      workFrequency: "",
      availableFrom: "",
      experienceNotes: "",
      cvRequired: "",
      interviewEnglishOk: "",
      salaryAmountEur: "",
      salaryPeriod: "",
      clearSalary: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("validates vacancy UUID", () => {
    expect(vacancyIdSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(
      vacancyIdSchema.safeParse("22222222-2222-4222-8222-222222222201").success,
    ).toBe(true);
  });

  it("rejects duplicate languages", () => {
    const parsed = languageRequirementsSchema.safeParse([
      { languageCode: "en", minProficiency: "basic" },
      { languageCode: "en", minProficiency: "native" },
    ]);
    expect(parsed.success).toBe(false);
  });

  it("accepts empty language list", () => {
    expect(languageRequirementsSchema.safeParse([]).success).toBe(true);
  });

  it("parses salary clear and coherent salary group", () => {
    expect(
      parseSalaryFields({
        salaryAmountEur: "",
        salaryPeriod: "",
        clearSalary: true,
      }),
    ).toEqual({
      ok: true,
      value: {
        clearSalary: true,
        salaryAmountCents: null,
        salaryPeriod: null,
      },
    });

    expect(
      parseSalaryFields({
        salaryAmountEur: "12.50",
        salaryPeriod: "hourly",
        clearSalary: false,
      }),
    ).toEqual({
      ok: true,
      value: {
        clearSalary: false,
        salaryAmountCents: 1250,
        salaryPeriod: "hourly",
      },
    });
  });

  it("requires a confirmation title for delete", () => {
    const parsed = deleteDraftVacancySchema.safeParse({
      vacancyId: "22222222-2222-4222-8222-222222222201",
      confirmTitle: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts delete input with vacancy ID and confirmation title", () => {
    const parsed = deleteDraftVacancySchema.safeParse({
      vacancyId: "22222222-2222-4222-8222-222222222201",
      confirmTitle: "Morning clean",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts update with UUID and required fields", () => {
    const parsed = updateDraftVacancyFormSchema.safeParse({
      vacancyId: "22222222-2222-4222-8222-222222222201",
      title: "Updated",
      jobCategory: "cleaning",
      publicLocality: "Mitte",
      description: "Details",
      workplaceType: "office",
      workFrequency: "recurring",
      availableFrom: "2026-09-01",
      clearAvailableFrom: false,
      experienceNotes: "",
      cvRequired: true,
      interviewEnglishOk: false,
      salaryAmountEur: "20",
      salaryPeriod: "hourly",
      clearSalary: false,
    });
    expect(parsed.success).toBe(true);
  });
});
