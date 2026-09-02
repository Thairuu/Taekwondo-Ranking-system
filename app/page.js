import { getAthletes, getCompetitions, getResults } from "../lib/sheets";
import {
  buildRankings,
  genderLabel,
  weightSortKey,
  avatarColor,
  initials,
  beltClass,
  countDistinctCompetitions,
  countRankedAthletes,
} from "../lib/rankings";

export const revalidate = 300; // re-pull the sheet every 5 minutes

// Delete the old `handleFilterClick` function completely since it won't work on the server!

const GENDER_ORDER = ["M", "F"];
const DIVISION_ORDER = ["Cadet", "Junior", "Senior", "Youth (Under 12)", "Unclassified"];

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function outcomeText(placement) {
  const p = parseInt(placement, 10);
  if (p === 1) return "Gold";
  if (p === 2) return "Silver";
  if (p === 3) return "Bronze";
  if (p) return `${ordinal(p)} place`;
  return "No result";
}

// UPDATE: Appends #rankings-menu to the end of every URL string
function buildHref({ gender, division, weight }) {
  const usp = new URLSearchParams();
  if (gender) usp.set("gender", gender);
  if (division) usp.set("division", division);
  if (weight) usp.set("weight", weight);
  const qs = usp.toString();
  return qs ? `/?${qs}#rankings-menu` : "/#rankings-menu";
}

export default async function HomePage({ searchParams }) {
  let tree = null;
  let error = null;
  let totalCompetitions = 0;
  let totalAthletes = 0;

  try {
    const [athletes, competitions, results] = await Promise.all([
      getAthletes(),
      getCompetitions(),
      getResults(),
    ]);
    tree = buildRankings(athletes, competitions, results);
    totalCompetitions = countDistinctCompetitions(results);
    totalAthletes = countRankedAthletes(results);
  } catch (e) {
    error = e.message;
  }

  const availableGenders = tree
    ? GENDER_ORDER.filter((g) => tree[g] && Object.keys(tree[g]).length > 0)
    : [];
  const activeGender =
    (searchParams?.gender && availableGenders.includes(searchParams.gender)
      ? searchParams.gender
      : availableGenders[0]) || null;

  const availableDivisions = activeGender
    ? DIVISION_ORDER.filter(
        (d) => tree[activeGender][d] && Object.keys(tree[activeGender][d]).length > 0
      )
    : [];
  const activeDivision =
    (searchParams?.division && availableDivisions.includes(searchParams.division)
      ? searchParams.division
      : availableDivisions[0]) || null;

  const availableWeights =
    activeGender && activeDivision
      ? Object.keys(tree[activeGender][activeDivision]).sort(
          (a, b) => weightSortKey(a) - weightSortKey(b)
        )
      : [];
  const activeWeight =
    (searchParams?.weight && availableWeights.includes(searchParams.weight)
      ? searchParams.weight
      : availableWeights[0]) || null;

  const entries =
    activeGender && activeDivision && activeWeight
      ? tree[activeGender][activeDivision][activeWeight]
      : [];

  const generatedAt = new Date().toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  });

  const divisionShownLabel =
    activeGender && activeDivision && activeWeight
      ? `${genderLabel(activeGender)} · ${activeDivision} · ${activeWeight}`.toUpperCase()
      : "—";

  return (
    <div className="page">
      <div className="hero">
        <div className="eyebrow">
          <span className="dot" />
          Kiambu TKD &middot; Kyorugi rankings
        </div>
        <h1>Kiambu county athlete rankings</h1>
        <p className="hero-sub">
          Points earned from sanctioned opens and trials involving Kiambu
          athletes. Affiliated with the Kenya Taekwondo Federation.
        </p>
        <div className="season-strip">
          <div>
            <div className="num">{new Date().getFullYear()}</div>
            <div className="lbl">Season</div>
          </div>
          <div>
            <div className="num">{String(totalCompetitions).padStart(2, "0")}</div>
            <div className="lbl">Events counted</div>
          </div>
          <div>
            <div className="num">{totalAthletes}</div>
            <div className="lbl">Ranked athletes</div>
          </div>
          <div>
            <div className="num">{divisionShownLabel}</div>
            <div className="lbl">Division shown</div>
          </div>
        </div>
      </div>

      {/* UPDATE: Added id="rankings-menu" here to catch the browser focus anchor */}
      <div id="rankings-menu" className="filters">
        {availableGenders.length > 0 && (
          <div className="filter-row">
            <span className="flabel">Gender</span>
            <div className="tabs">
              {availableGenders.map((g) => (
                <a
                  key={g}
                  href={buildHref({ gender: g })}
                  className={g === activeGender ? "active" : ""}
                  // UPDATE: Removed onClick handler
                >
                  {genderLabel(g)}
                </a>
              ))}
            </div>
          </div>
        )}

        {availableDivisions.length > 0 && (
          <div className="filter-row">
            <span className="flabel">Division</span>
            <div className="tabs">
              {availableDivisions.map((d) => (
                <a
                  key={d}
                  href={buildHref({ gender: activeGender, division: d })}
                  className={d === activeDivision ? "active" : ""}
                  // UPDATE: Removed onClick handler
                >
                  {d}
                </a>
              ))}
            </div>
          </div>
        )}

        {availableWeights.length > 0 && (
          <div className="filter-row">
            <span className="flabel">Weight</span>
            <div className="tabs">
              {availableWeights.map((w) => (
                <a
                  key={w}
                  href={buildHref({ gender: activeGender, division: activeDivision, weight: w })}
                  className={w === activeWeight ? "active" : ""}
                  // UPDATE: Removed onClick handler
                >
                  {w.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="updated">Last checked {generatedAt} EAT</div>
      </div>

      {error && <div className="error">Couldn&apos;t load rankings: {error}</div>}

      {!error && entries.length === 0 && (
        <div className="empty">
          {tree && availableGenders.length > 0
            ? "No results yet in this division and weight class."
            : "No results yet. Add rows to the Results tab in your Google Sheet and they'll show up here within a few minutes."}
        </div>
      )}

      {entries.length > 0 && (
        <div className="list">
          <div className="row head">
            <div>Rank</div>
            <div></div>
            <div>Athlete</div>
            <div>Weight / Belt</div>
            <div>Points</div>
            <div>Last result</div>
          </div>

          {entries.map((entry, i) => {
            const a = entry.athlete;
            const rankClass = i === 0 ? " r1" : i === 1 ? " r2" : i === 2 ? " r3" : "";
            const lr = entry.lastResult;
            return (
              <div className={`row${rankClass}`} key={a.id}>
                <div className="rank">{String(i + 1).padStart(2, "0")}</div>
                <div className="avatar" style={{ background: avatarColor(a.name) }}>
                  {initials(a.name)}
                </div>
                <div className="athlete">
                  <div className="name">{a.name}</div>
                  <div className="dojang">{a.club}</div>
                </div>
                <div className="meta">
                  <div className="weight">{(a.weight_class || "").toUpperCase()}</div>
                  <div className={`belt ${beltClass(a.belt)}`}>
                    <span className="chip" />
                    {a.belt || "Unranked"}
                  </div>
                </div>
                <div className="points">
                  {entry.points.toLocaleString()}
                  <span className="u">pts</span>
                </div>
                <div className="outcome">
                  {lr ? (
                    <>
                      <div className={`medal ${lr.medal}`}>
                        {lr.medal === "na" ? "-" : lr.medal[0].toUpperCase()}
                      </div>
                      <div className="event">
                        <b>{lr.competition.name}</b>
                        {outcomeText(lr.placement)}, kyorugi {a.weight_class}
                      </div>
                    </>
                  ) : (
                    <div className="event">No results logged</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="foot">
        <span>Kiambu TKD &middot; Community ranking board</span>
        <div className="legend">
          <span>
            <i style={{ background: "var(--gold-deep)" }} />
            Gold finish
          </span>
          <span>
            <i style={{ background: "var(--silver)" }} />
            Silver finish
          </span>
          <span>
            <i style={{ background: "var(--bronze)" }} />
            Bronze finish
          </span>
        </div>
      </div>
    </div>
  );
}

