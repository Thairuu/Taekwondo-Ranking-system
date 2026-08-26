import { pointsForResult, medalForPlacement } from "./points";

// WT's own rule: age category is based on the calendar year, not exact
// birthdate — "Contestants at the age of at least 17 years old for Senior
// in the year the pertinent tournament is held (15-17 for Junior, 12-14
// for Cadet)." One simplification from the official rule: WT lets 17-year-
// olds enter either Junior or Senior. Since this board buckets each athlete
// into exactly one division for a single ranking list, 17-year-olds land in
// Junior here. Change the `age <= 17` line below if you'd rather default
// them to Senior instead.
export function getAgeDivision(birthYear, referenceYear = new Date().getFullYear()) {
  const year = parseInt(birthYear, 10);
  if (!year) return "Unclassified";
  const age = referenceYear - year;
  if (age < 12) return "Youth (Under 12)";
  if (age <= 14) return "Cadet";
  if (age <= 17) return "Junior";
  return "Senior";
}

export function normalizeGender(g) {
  const t = (g || "").trim().toUpperCase();
  if (t === "M" || t === "MALE") return "M";
  if (t === "F" || t === "FEMALE") return "F";
  return "Unspecified";
}

const GENDER_LABEL = { M: "Men", F: "Women", Unspecified: "Unspecified" };
export function genderLabel(g) {
  return GENDER_LABEL[normalizeGender(g)];
}

// Sorts "-58kg" style labels numerically, with "+87kg" style labels
// (over-weight classes) sorted after every finite class.
export function weightSortKey(weightClass) {
  const wc = (weightClass || "").trim();
  const isPlus = wc.startsWith("+");
  const num = parseFloat(wc.replace(/[^0-9.]/g, "")) || 0;
  return isPlus ? num + 100000 : num;
}

const AVATAR_PALETTE = [
  "#7A0A1D", // red-deep
  "#0F3A63", // blue-deep
  "#7A5C25", // gold-deep
  "#3E7C3A", // green
  "#1C5D99", // blue
  "#98A0A6", // silver/gray
  "#A9713C", // bronze
];

export function avatarColor(seed) {
  const s = seed || "?";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function initials(name) {
  const parts = (name || "?").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Maps free-text belt values from the sheet to one of the styled chip
// colors. Falls back gracefully for anything unrecognized.
export function beltClass(beltText) {
  const t = (beltText || "").toLowerCase();
  if (t.includes("poom")) return "poom";
  if (t.includes("dan") || t.includes("black")) return "black";
  if (t.includes("red")) return "red";
  if (t.includes("blue")) return "blue";
  if (t.includes("green")) return "green";
  if (t.includes("yellow")) return "yellow";
  if (t.includes("orange")) return "orange";
  if (t.includes("white")) return "white";
  return "white";
}

// Builds the full rankings tree: { [gender]: { [division]: { [weightClass]: [entries] } } }
// Each entry: { athlete, points, resultsCount, lastResult: { competition, placement, medal } }
export function buildRankings(athletes, competitions, results, referenceYear) {
  const athleteById = Object.fromEntries(athletes.map((a) => [a.id, a]));
  const competitionById = Object.fromEntries(competitions.map((c) => [c.id, c]));

  const totals = {}; // athleteId -> accumulator

  for (const result of results) {
    const athlete = athleteById[result.athlete_id];
    const competition = competitionById[result.competition_id];
    if (!athlete || !competition) continue; // skip rows with a bad/missing id

    const points = pointsForResult(result.placement, competition.tier);

    if (!totals[athlete.id]) {
      totals[athlete.id] = { athlete, points: 0, resultsCount: 0, lastResult: null };
    }
    const acc = totals[athlete.id];
    acc.points += points;
    acc.resultsCount += 1;

    const thisDate = new Date(competition.date);
    const currentBestDate = acc.lastResult
      ? new Date(acc.lastResult.competition.date)
      : null;
    if (!currentBestDate || thisDate > currentBestDate) {
      acc.lastResult = {
        competition,
        placement: result.placement,
        medal: medalForPlacement(result.placement),
      };
    }
  }

  const tree = {};
  for (const entry of Object.values(totals)) {
    const gender = normalizeGender(entry.athlete.gender);
    const division = getAgeDivision(entry.athlete.birth_year, referenceYear);
    const wc = entry.athlete.weight_class || "Unclassified";

    tree[gender] ??= {};
    tree[gender][division] ??= {};
    tree[gender][division][wc] ??= [];
    tree[gender][division][wc].push(entry);
  }

  for (const gender in tree) {
    for (const division in tree[gender]) {
      for (const wc in tree[gender][division]) {
        tree[gender][division][wc].sort((a, b) => b.points - a.points);
      }
    }
  }

  return tree;
}

export function countDistinctCompetitions(results) {
  return new Set(results.map((r) => r.competition_id)).size;
}

export function countRankedAthletes(results) {
  return new Set(results.map((r) => r.athlete_id)).size;
}
