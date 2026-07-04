# High Alert Medication Analyzer

A hospital safety tool: staff upload a Drug Distribution List PDF, and the app cross-checks every patient's medications against a Google Sheets high-alert drug registry, showing only the matches.

## Run & Operate

- `pnpm --filter @workspace/medication-analyzer run dev` — run the analyzer web app
- `pnpm --filter @workspace/api-server run dev` — run the shared API server (port 5000, unused by this app)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- `artifacts/medication-analyzer` is a **plain HTML/CSS/JS** app (no React) served by Vite, split into `index.html`, `src/style.css`, `src/app.js`, `src/parser.js` per user requirement.
- PDF parsing: PDF.js (loaded via CDN in `index.html`)
- Excel export: SheetJS/`xlsx` (loaded via CDN in `index.html`)
- High-alert drug registry: external Google Apps Script Web App (Google Sheets backend), called directly via `fetch` from the browser — no backend/API server involvement.

## Where things live

- `artifacts/medication-analyzer/index.html` — page shell, CDN script tags for PDF.js and SheetJS
- `artifacts/medication-analyzer/src/style.css` — all styling
- `artifacts/medication-analyzer/src/parser.js` — PDF.js text extraction + column/label detection for Patient/File Number/Ward/Brand/Generic
- `artifacts/medication-analyzer/src/app.js` — upload handling, Google Sheets fetch/compare, dashboard, search, Excel export

## Architecture decisions

- Built as a static client-only app — the Google Sheets Apps Script URL is called directly from the browser, so there's no need for the shared `api-server`/database/OpenAPI stack for this app.
- PDF parsing uses a two-pass strategy: try to detect a header row and bucket subsequent rows into columns by X position; fall back to a `label: value` text scan if no table structure is detected.
- Drug name matching is normalized (lowercased, parenthetical/punctuation stripped) and does substring matching in both directions to tolerate brand/generic naming variance between the PDF and the registry sheet.

## Product

- Upload a Hospital Drug Distribution List PDF (drag-drop or browse)
- Extracts Patient Name, File Number, Ward, Brand Drug Name, Generic Drug Name
- Compares Brand/Generic against the connected Google Sheets high-alert registry
- Shows only matched high-alert drugs in a table (Patient, File Number, Ward, Brand, Generic, Category)
- Dashboard cards: Patients, High Alert Drugs, Records Parsed
- Search/filter the results table
- Export the matched results to Excel (.xlsx)

## User preferences

- User explicitly requested a plain HTML/CSS/JS build (no React/framework), split exactly into `index.html`, `style.css`, `app.js`, `parser.js`.

## Gotchas

- If the Google Sheets Apps Script response shape changes, update `normalizeRegistryRow()` in `src/app.js` — it looks for common header name variants (brand/generic/category) case-insensitively.
- PDF column detection depends on a recognizable header row; if a hospital's PDF layout has no clear header labels, the label-scan fallback is used instead, which requires `Label: Value` formatted lines.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
