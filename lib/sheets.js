// Reads data straight out of a Google Sheet — no API key, no service account.
// Requires the sheet to be shared as "Anyone with the link: Viewer".
//
// Set SHEET_ID in your environment (see .env.example) to the long ID
// in your sheet's URL: https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit

const SHEET_ID = process.env.SHEET_ID;

async function fetchSheetTab(tabName) {
  if (!SHEET_ID) {
    throw new Error(
      "SHEET_ID is not set. Copy .env.example to .env.local and fill it in."
    );
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    tabName
  )}`;

  const res = await fetch(url, { next: { revalidate: 300 } }); // re-check every 5 min

  if (!res.ok) {
    throw new Error(
      `Could not read the "${tabName}" tab (status ${res.status}). ` +
        `Check the tab name matches exactly and the sheet is shared as "Anyone with the link".`
    );
  }

  const csv = await res.text();
  return parseCsv(csv);
}

// Minimal CSV parser that handles quoted fields (Google's CSV export quotes
// anything containing a comma). Good enough for sheet data — no need for a
// dependency here.
function parseCsv(csv) {
  const lines = csv.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function getAthletes() {
  return fetchSheetTab("Athletes");
}

export function getCompetitions() {
  return fetchSheetTab("Competitions");
}

export function getResults() {
  return fetchSheetTab("Results");
}
