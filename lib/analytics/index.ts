/**
 * VoterScope Demo — Analytics & Demographic Utilities
 *
 * Scoped calculation functions for demographic segmentation,
 * age cohort distribution, and data quality metrics.
 *
 * ALL DEMOGRAPHIC DATA IS DERIVED FROM SYNTHETIC DEMO DATA.
 */

export type AgeGroupBracket = "17-24" | "25-39" | "40-55" | "56+" | "UNDER_AGE";

export const AGE_GROUP_LABELS: Record<AgeGroupBracket, string> = {
  "17-24": "17 - 24 th (Pemula / Gen Z)",
  "25-39": "25 - 39 th (Milenial)",
  "40-55": "40 - 55 th (Gen X)",
  "56+": "56+ th (Lansia)",
  UNDER_AGE: "< 17 th (Di Bawah Umur)",
};

/**
 * Categorizes a date of birth into standard demographic voter age cohorts.
 */
export function getAgeGroupBracket(dateOfBirth: Date | string, referenceDate: Date = new Date()): AgeGroupBracket {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const m = referenceDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 17) return "UNDER_AGE";
  if (age <= 24) return "17-24";
  if (age <= 39) return "25-39";
  if (age <= 55) return "40-55";
  return "56+";
}

export type DemographicSummary = {
  total: number;
  gender: {
    male: number;
    female: number;
    malePercent: number;
    femalePercent: number;
  };
  ageGroups: Array<{
    group: AgeGroupBracket;
    label: string;
    count: number;
    percent: number;
  }>;
  dataQuality: {
    completenessScore: number;
    activeRate: number;
    needsReviewRate: number;
  };
};

/**
 * Calculates complete demographic breakdowns and quality indicators
 * for a list of voters within scope.
 */
export function calculateDemographics(
  voters: Array<{
    dateOfBirth: Date | string;
    gender: string;
    status: string;
    address?: string | null;
    placeOfBirth?: string | null;
  }>
): DemographicSummary {
  const total = voters.length;
  if (total === 0) {
    return {
      total: 0,
      gender: { male: 0, female: 0, malePercent: 0, femalePercent: 0 },
      ageGroups: [
        { group: "17-24", label: AGE_GROUP_LABELS["17-24"], count: 0, percent: 0 },
        { group: "25-39", label: AGE_GROUP_LABELS["25-39"], count: 0, percent: 0 },
        { group: "40-55", label: AGE_GROUP_LABELS["40-55"], count: 0, percent: 0 },
        { group: "56+", label: AGE_GROUP_LABELS["56+"], count: 0, percent: 0 },
      ],
      dataQuality: { completenessScore: 100, activeRate: 0, needsReviewRate: 0 },
    };
  }

  let maleCount = 0;
  let femaleCount = 0;
  let activeCount = 0;
  let needsReviewCount = 0;
  let completeRecords = 0;

  const ageCounts: Record<AgeGroupBracket, number> = {
    "17-24": 0,
    "25-39": 0,
    "40-55": 0,
    "56+": 0,
    UNDER_AGE: 0,
  };

  for (const voter of voters) {
    if (voter.gender === "LAKI_LAKI") maleCount++;
    if (voter.gender === "PEREMPUAN") femaleCount++;

    if (voter.status === "ACTIVE") activeCount++;
    if (voter.status === "NEEDS_REVIEW") needsReviewCount++;

    // Data completeness: check required demographic attributes
    if (voter.address && voter.placeOfBirth && voter.dateOfBirth) {
      completeRecords++;
    }

    const bracket = getAgeGroupBracket(voter.dateOfBirth);
    ageCounts[bracket]++;
  }

  const malePercent = Math.round((maleCount / total) * 100);
  const femalePercent = 100 - malePercent;

  const ageGroups: DemographicSummary["ageGroups"] = [
    {
      group: "17-24",
      label: "17 - 24 th (Gen Z)",
      count: ageCounts["17-24"],
      percent: Math.round((ageCounts["17-24"] / total) * 100),
    },
    {
      group: "25-39",
      label: "25 - 39 th (Milenial)",
      count: ageCounts["25-39"],
      percent: Math.round((ageCounts["25-39"] / total) * 100),
    },
    {
      group: "40-55",
      label: "40 - 55 th (Gen X)",
      count: ageCounts["40-55"],
      percent: Math.round((ageCounts["40-55"] / total) * 100),
    },
    {
      group: "56+",
      label: "56+ th (Lansia)",
      count: ageCounts["56+"],
      percent: Math.round((ageCounts["56+"] / total) * 100),
    },
  ];

  if (ageCounts["UNDER_AGE"] > 0) {
    ageGroups.push({
      group: "UNDER_AGE",
      label: "< 17 th (Perlu Tinjauan)",
      count: ageCounts["UNDER_AGE"],
      percent: Math.round((ageCounts["UNDER_AGE"] / total) * 100),
    });
  }

  return {
    total,
    gender: {
      male: maleCount,
      female: femaleCount,
      malePercent,
      femalePercent,
    },
    ageGroups,
    dataQuality: {
      completenessScore: Math.round((completeRecords / total) * 100),
      activeRate: Math.round((activeCount / total) * 100),
      needsReviewRate: Math.round((needsReviewCount / total) * 100),
    },
  };
}

/**
 * Builds the same {@link DemographicSummary} shape as
 * {@link calculateDemographics}, but from pre-aggregated SQL rows instead of
 * per-voter records.
 *
 * The dashboard page feeds this with `groupBy` results (gender buckets,
 * distinct-birth-date buckets, completeness count), so page cost is O(1) in
 * voter rows: a handful of tiny aggregate result sets instead of one
 * unpaginated `findMany` plus JS walks. Labels, percentages and the empty-set
 * shape match `calculateDemographics` exactly so charts render identically.
 */
export type GenderCountRow = { gender: string; count: number };
export type DobCountRow = { dateOfBirth: Date | string; count: number };

export function summarizeDashboardDemographics(input: {
  total: number;
  activeCount: number;
  needsReviewCount: number;
  completeCount: number;
  genderRows: GenderCountRow[];
  dobRows: DobCountRow[];
}): DemographicSummary {
  const {
    total,
    activeCount,
    needsReviewCount,
    completeCount,
    genderRows,
    dobRows,
  } = input;

  if (total === 0) {
    return {
      total: 0,
      gender: { male: 0, female: 0, malePercent: 0, femalePercent: 0 },
      ageGroups: [
        { group: "17-24", label: AGE_GROUP_LABELS["17-24"], count: 0, percent: 0 },
        { group: "25-39", label: AGE_GROUP_LABELS["25-39"], count: 0, percent: 0 },
        { group: "40-55", label: AGE_GROUP_LABELS["40-55"], count: 0, percent: 0 },
        { group: "56+", label: AGE_GROUP_LABELS["56+"], count: 0, percent: 0 },
      ],
      dataQuality: { completenessScore: 100, activeRate: 0, needsReviewRate: 0 },
    };
  }

  let maleCount = 0;
  let femaleCount = 0;
  for (const row of genderRows) {
    if (row.gender === "LAKI_LAKI") maleCount += row.count;
    else if (row.gender === "PEREMPUAN") femaleCount += row.count;
  }

  const ageCounts: Record<AgeGroupBracket, number> = {
    "17-24": 0,
    "25-39": 0,
    "40-55": 0,
    "56+": 0,
    UNDER_AGE: 0,
  };
  // One pass over *distinct* birth dates (bounded, tiny payload), not voters.
  for (const row of dobRows) {
    ageCounts[getAgeGroupBracket(row.dateOfBirth)] += row.count;
  }

  const malePercent = Math.round((maleCount / total) * 100);
  const femalePercent = 100 - malePercent;

  const ageGroups: DemographicSummary["ageGroups"] = [
    {
      group: "17-24",
      label: "17 - 24 th (Gen Z)",
      count: ageCounts["17-24"],
      percent: Math.round((ageCounts["17-24"] / total) * 100),
    },
    {
      group: "25-39",
      label: "25 - 39 th (Milenial)",
      count: ageCounts["25-39"],
      percent: Math.round((ageCounts["25-39"] / total) * 100),
    },
    {
      group: "40-55",
      label: "40 - 55 th (Gen X)",
      count: ageCounts["40-55"],
      percent: Math.round((ageCounts["40-55"] / total) * 100),
    },
    {
      group: "56+",
      label: "56+ th (Lansia)",
      count: ageCounts["56+"],
      percent: Math.round((ageCounts["56+"] / total) * 100),
    },
  ];

  if (ageCounts["UNDER_AGE"] > 0) {
    ageGroups.push({
      group: "UNDER_AGE",
      label: "< 17 th (Perlu Tinjauan)",
      count: ageCounts["UNDER_AGE"],
      percent: Math.round((ageCounts["UNDER_AGE"] / total) * 100),
    });
  }

  return {
    total,
    gender: {
      male: maleCount,
      female: femaleCount,
      malePercent,
      femalePercent,
    },
    ageGroups,
    dataQuality: {
      completenessScore: Math.round((completeCount / total) * 100),
      activeRate: Math.round((activeCount / total) * 100),
      needsReviewRate: Math.round((needsReviewCount / total) * 100),
    },
  };
}
