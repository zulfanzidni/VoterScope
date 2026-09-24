/**
 * VoterScope Demo — Unit Tests: Dashboard Demographics & Statistics
 *
 * Tests for age cohort categorization, demographic breakdown calculations,
 * and data quality scoring.
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { describe, it, expect } from "vitest";
import {
  getAgeGroupBracket,
  calculateDemographics,
  summarizeDashboardDemographics,
} from "@/lib/analytics";

describe("getAgeGroupBracket", () => {
  const referenceDate = new Date("2026-01-01");

  it("categorizes birth dates under 17 as UNDER_AGE", () => {
    // 15 years old in 2026
    expect(getAgeGroupBracket("2011-05-10", referenceDate)).toBe("UNDER_AGE");
  });

  it("categorizes 17-24 as '17-24' (Gen Z)", () => {
    // 18 years old in 2026
    expect(getAgeGroupBracket("2008-01-01", referenceDate)).toBe("17-24");
    // 24 years old in 2026
    expect(getAgeGroupBracket("2002-01-01", referenceDate)).toBe("17-24");
  });

  it("categorizes 25-39 as '25-39' (Milenial)", () => {
    // 30 years old in 2026
    expect(getAgeGroupBracket("1996-06-15", referenceDate)).toBe("25-39");
    // 39 years old in 2026
    expect(getAgeGroupBracket("1987-01-01", referenceDate)).toBe("25-39");
  });

  it("categorizes 40-55 as '40-55' (Gen X)", () => {
    // 45 years old in 2026
    expect(getAgeGroupBracket("1981-03-20", referenceDate)).toBe("40-55");
    // 55 years old in 2026
    expect(getAgeGroupBracket("1971-01-01", referenceDate)).toBe("40-55");
  });

  it("categorizes 56 and above as '56+' (Lansia)", () => {
    // 66 years old in 2026
    expect(getAgeGroupBracket("1960-12-05", referenceDate)).toBe("56+");
    // 80 years old in 2026
    expect(getAgeGroupBracket("1946-01-01", referenceDate)).toBe("56+");
  });
});

describe("calculateDemographics", () => {
  it("handles empty array without division by zero errors", () => {
    const result = calculateDemographics([]);
    expect(result.total).toBe(0);
    expect(result.gender.male).toBe(0);
    expect(result.gender.female).toBe(0);
    expect(result.gender.malePercent).toBe(0);
    expect(result.gender.femalePercent).toBe(0);
    expect(result.dataQuality.completenessScore).toBe(100);
    expect(result.dataQuality.activeRate).toBe(0);
  });

  it("correctly calculates gender ratios and demographic cohorts", () => {
    const sampleVoters = [
      {
        dateOfBirth: "2005-01-01", // ~21 yo -> 17-24
        gender: "LAKI_LAKI",
        status: "ACTIVE",
        address: "Jl. A",
        placeOfBirth: "Kota A",
      },
      {
        dateOfBirth: "2000-01-01", // ~26 yo -> 25-39
        gender: "PEREMPUAN",
        status: "ACTIVE",
        address: "Jl. B",
        placeOfBirth: "Kota B",
      },
      {
        dateOfBirth: "1995-01-01", // ~31 yo -> 25-39
        gender: "PEREMPUAN",
        status: "NEEDS_REVIEW",
        address: "Jl. C",
        placeOfBirth: "Kota C",
      },
      {
        dateOfBirth: "1980-01-01", // ~46 yo -> 40-55
        gender: "LAKI_LAKI",
        status: "ACTIVE",
        address: "Jl. D",
        placeOfBirth: "Kota D",
      },
    ];

    const result = calculateDemographics(sampleVoters);

    expect(result.total).toBe(4);
    expect(result.gender.male).toBe(2);
    expect(result.gender.female).toBe(2);
    expect(result.gender.malePercent).toBe(50);
    expect(result.gender.femalePercent).toBe(50);

    // Data quality
    expect(result.dataQuality.completenessScore).toBe(100);
    expect(result.dataQuality.activeRate).toBe(75); // 3 of 4
    expect(result.dataQuality.needsReviewRate).toBe(25); // 1 of 4

    // Age groups
    const genZ = result.ageGroups.find((ag) => ag.group === "17-24");
    expect(genZ?.count).toBe(1);

    const millennial = result.ageGroups.find((ag) => ag.group === "25-39");
    expect(millennial?.count).toBe(2);

    const genX = result.ageGroups.find((ag) => ag.group === "40-55");
    expect(genX?.count).toBe(1);
  });
});

describe("summarizeDashboardDemographics", () => {
  // Same voter set as the per-record test above, expressed as the SQL
  // aggregate rows the dashboard page produces: gender buckets (with counts)
  // and distinct-birth-date buckets (with counts).
  const genderRows = [
    { gender: "LAKI_LAKI", count: 2 },
    { gender: "PEREMPUAN", count: 2 },
  ];
  const dobRows = [
    { dateOfBirth: "2005-01-01", count: 1 }, // ~21 yo -> 17-24
    { dateOfBirth: "2000-01-01", count: 1 }, // ~26 yo -> 25-39
    { dateOfBirth: "1995-01-01", count: 1 }, // ~31 yo -> 25-39
    { dateOfBirth: "1980-01-01", count: 1 }, // ~46 yo -> 40-55
  ];

  it("matches calculateDemographics exactly on the same voter set", () => {
    const legacy = calculateDemographics([
      { dateOfBirth: "2005-01-01", gender: "LAKI_LAKI", status: "ACTIVE", address: "Jl. A", placeOfBirth: "Kota A" },
      { dateOfBirth: "2000-01-01", gender: "PEREMPUAN", status: "ACTIVE", address: "Jl. B", placeOfBirth: "Kota B" },
      { dateOfBirth: "1995-01-01", gender: "PEREMPUAN", status: "NEEDS_REVIEW", address: "Jl. C", placeOfBirth: "Kota C" },
      { dateOfBirth: "1980-01-01", gender: "LAKI_LAKI", status: "ACTIVE", address: "Jl. D", placeOfBirth: "Kota D" },
    ]);

    const summary = summarizeDashboardDemographics({
      total: 4,
      activeCount: 3,
      needsReviewCount: 1,
      completeCount: 4,
      genderRows,
      dobRows,
    });

    expect(summary).toEqual(legacy);
  });

  it("returns the same empty-set shape as calculateDemographics", () => {
    expect(
      summarizeDashboardDemographics({
        total: 0,
        activeCount: 0,
        needsReviewCount: 0,
        completeCount: 0,
        genderRows: [],
        dobRows: [],
      })
    ).toEqual(calculateDemographics([]));
  });

  it("aggregates weighted distinct-birth-date buckets correctly", () => {
    // Two voters sharing one birth date must count twice.
    const summary = summarizeDashboardDemographics({
      total: 3,
      activeCount: 3,
      needsReviewCount: 0,
      completeCount: 3,
      genderRows: [
        { gender: "LAKI_LAKI", count: 1 },
        { gender: "PEREMPUAN", count: 2 },
      ],
      dobRows: [{ dateOfBirth: "2005-06-15", count: 3 }],
    });

    const genZ = summary.ageGroups.find((ag) => ag.group === "17-24");
    expect(genZ?.count).toBe(3);
    expect(genZ?.percent).toBe(100);
    expect(summary.total).toBe(3);
  });
});
