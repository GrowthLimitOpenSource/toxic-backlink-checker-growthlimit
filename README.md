# Toxic Backlink Checker by GrowthLimit.com

A local-first backlink audit application. It can retrieve rows from DataForSEO, import and reconcile CSV exports from Google Search Console, Ahrefs, Semrush, Majestic, Moz, or generic sources, preserve source attribution, inspect representative public pages, and compare each audit with the prior run for the same domain. Decisions and approvals retain an audit trail. The application preserves an existing disavow file and exports HTML, CSV, XLSX, JSON, and a human-reviewed Google-format draft.

The methodology comes from Growth Limit's [evidence-based toxic backlink guide](https://www.growthlimit.com/blog/identifying-toxic-backlinks). The full illustrated setup guide is at [growthlimit.com/tools/toxic-backlink-checker](https://www.growthlimit.com/tools/toxic-backlink-checker).

## Important limits

- No backlink index is complete. Use DataForSEO, imported Search Console or vendor exports, or both; absence from one source is not proof that a link disappeared.
- Vendor authority, spam, and toxicity metrics are investigation signals. They do not prove Google counts a link or that a link caused a ranking change.
- The checker does not determine whether a link violates Google policy.
- The checker never uploads a disavow file. A new upload in Search Console replaces the prior file, so preserve and review it.
- DataForSEO is optional when valid CSV backlink rows are imported. DataForSEO and optional LLM requests use your accounts and may cost money.

## What it produces

- Optional DataForSEO summary and paginated backlink retrieval
- CSV import for Google Search Console, Ahrefs, Semrush, Majestic, Moz, and generic source/target URL columns
- Cross-source normalization, deduplication, and preserved source attribution
- Referring-domain groups with anchor, target, follow, new/lost, and sitewide-pattern evidence
- SSRF-protected representative-page inspection
- `KEEP`, `REVIEW`, `REMOVE_URL`, `DISAVOW_URL`, and `DISAVOW_DOMAIN` review states
- Existing-disavow parsing, deduplication, self-domain protection, and merge
- Saved audit history with new, missing, evidence-changed, decision-changed, approval-changed, and draft-disavow comparisons
- Per-domain decision and approval history
- Interactive local review with explicit approval for every disavow entry
- HTML, CSV, XLSX, JSON, and draft-disavow downloads
- CLI workflow and browser workflow
- Optional OpenAI-compatible LLM evidence summaries after deterministic grouping
- Versioned reports containing the application version and rule-set version

## Fastest setup: Docker Desktop

### 1. Install prerequisites

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for macOS, Windows, or Linux. Open Docker Desktop and wait until it says the engine is running.

### 2. Download the repository

```bash
git clone https://github.com/GrowthLimitOpenSource/toxic-backlink-checker-growthlimit.git
cd toxic-backlink-checker-growthlimit
cp .env.example .env.local
```

The commands above clone the official public repository. Confirm that the repository owner is `GrowthLimitOpenSource` before entering credentials or running the application.

### 3. Configure DataForSEO only if using live API retrieval

You can run CSV-only audits without DataForSEO. For live retrieval, create or sign in to a DataForSEO account through [this Growth Limit referral link](https://dataforseo.com/?aff=238016), open the API access area, and copy the API login and password. These may differ from the password used to sign into the website.

Growth Limit may receive 25% of the first payment made by a customer who registers through the referral link and purchases an eligible DataForSEO product. Growth Limit uses this revenue to pay for API testing and maintenance. The commission is not a promised customer discount. Check DataForSEO's current checkout and affiliate terms before paying.

For live retrieval, open `.env.local` in a plain-text editor:

```dotenv
DATAFORSEO_LOGIN=your_api_login
DATAFORSEO_PASSWORD=your_api_password
```

Do not paste credentials into source files, issues, screenshots, chat, or commits. `.env.local` is ignored by Git.

### 4. Start the checker

```bash
docker compose up --build
```

Open <http://localhost:3000>. To stop it, press `Ctrl+C`. Audit JSON, comparisons, and decision history persist under `./data/audits`.

## Node.js setup

Install the current Node.js 22 LTS release and Git. Then:

```bash
git clone https://github.com/GrowthLimitOpenSource/toxic-backlink-checker-growthlimit.git
cd toxic-backlink-checker-growthlimit
npm ci
cp .env.example .env.local
npm run build
npm start
```

Open <http://localhost:3000>. For a development server with reload, use `npm run dev`.

## Run the first audit

1. Enter a root domain such as `example.com`, without a path.
2. Leave **Include subdomains** enabled for a complete root-domain review.
3. Start with 1,000 rows and 20 page inspections to validate credentials and output cheaply.
4. Paste the complete current disavow file. This allows the checker to preserve comments and entries and avoid accidental replacement.
5. Leave LLM review disabled for the first run. The deterministic audit is complete without it.
6. Optionally import CSV exports from Search Console, Ahrefs, Semrush, Majestic, Moz, or another tool with source and target URL columns. You can disable DataForSEO when an import contains valid backlink rows.
7. Run the audit. Duplicate source/target/anchor rows merge, while every reporting source remains attached to the evidence.
8. Review the comparison with the preceding audit for the same domain: new and missing domains, changed evidence or decisions, approval changes, and added or removed draft entries.
9. Open every `REVIEW` group. Check acquisition history, the representative page, legitimate publisher context, and Search Console's Manual Actions report.
10. Choose a decision. `REMOVE_URL` records outreach or qualification work but does not enter the disavow draft.
11. For `DISAVOW_URL` or `DISAVOW_DOMAIN`, click **Approve for draft**. The application records the decision history and never bulk-approves domain entries.
12. Download and archive JSON, CSV, HTML, XLSX, and the draft text file. Review the draft line by line before considering a manual Search Console upload.

## Decision meanings

| State | Meaning | Draft behavior |
|---|---|---|
| `KEEP` | No evidence justifies action, or the link is legitimate | Excluded |
| `REVIEW` | Evidence is incomplete, conflicting, or requires human context | Excluded |
| `REMOVE_URL` | A real publisher can remove or properly qualify a specific placement | Excluded; use for outreach tracking |
| `DISAVOW_URL` | Strong evidence applies only to specific linking URLs | Included only after approval |
| `DISAVOW_DOMAIN` | Repeated evidence supports domain-wide scope and legitimate content is not at risk | Included only after approval |

## CLI

```bash
npm run audit -- --domain example.com --max-backlinks 25000 --inspect-pages 100
```

Optional flags:

```bash
npm run audit -- --domain example.com \
  --existing-disavow ./data/current-disavow.txt \
  --output ./reports/example.com \
  --llm
```

The CLI writes `audit.json`, `audit.xlsx`, and `draft-disavow.txt`.

## Optional LLM setup

Deterministic grouping and classification run first. The LLM receives grouped evidence for review candidates, not every raw backlink. It may improve summaries and human-check questions; it cannot establish manipulation, choose final disavow scope, or approve an entry.

For OpenAI-compatible APIs:

```dotenv
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your_key
LLM_MODEL=gpt-5-mini
MAX_LLM_GROUPS=200
```

Enable **Optional LLM evidence summaries** in the browser or add `--llm` to the CLI. Review provider data-retention terms before sending page context.

### Install with an LLM or coding agent

A coding agent can inspect the repository, select Docker or Node.js, run the required checks, and start the application. The operator must enter credentials locally. Do not paste API credentials into an LLM conversation.

Paste this instruction into ChatGPT, Claude, Codex, Cursor, or another coding agent:

```text
Install the Toxic Backlink Checker by GrowthLimit.com locally from:
https://github.com/GrowthLimitOpenSource/toxic-backlink-checker-growthlimit

1. Read README.md, SECURITY.md, .env.example, package.json, Dockerfile, and compose.yaml before running commands.
2. Check whether Docker Desktop and Node.js 22 LTS are installed. Prefer Docker when available. Ask before installing system software.
3. Clone the official repository and create .env.local from .env.example.
4. Confirm .env.local is ignored by Git.
5. Ask me to enter DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD directly in .env.local. Never request or display credentials in chat, logs, screenshots, commits, or reports.
6. If I request LLM summaries, ask me to enter LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, and LLM_PROVIDER locally. Otherwise leave LLM processing disabled.
7. Run npm ci, npm test, npm run lint, and npm run build.
8. Start the application only on localhost. Do not expose it to the public internet.
9. Confirm the local URL and the result of every required check.
10. Do not run a paid API audit until I approve the row and page limits. Start with at most 1,000 backlink rows and 20 page inspections.
11. Report the DataForSEO-reported cost, retrieved rows, inspected pages, warnings, and output paths.
12. Never upload a disavow file. Generate a local draft and require me to review it.
```

## Costs and limits

The application displays DataForSEO's task-reported cost in each audit. At the documented July 2026 Backlinks API pricing of $0.024 per request plus $0.000036 per returned row, a full 1,000-row request is approximately $0.06. Prices can change; verify [DataForSEO pricing](https://dataforseo.com/pricing) before running a large audit.

Defaults cap runs at 25,000 rows, 500 inspected pages, five concurrent fetches, ten seconds per fetch, and 2 MB per response. Adjust the values in `.env.local` only after measuring a smaller run.

## Security and privacy

Credentials are read server-side and never returned by the API. Audit files are written locally with owner-only file permissions when supported. Representative-page requests reject private, loopback, link-local, metadata, credential-bearing, and non-HTTP(S) destinations; DNS is checked after every redirect. Raw page HTML is held in memory only and is not saved. See [SECURITY.md](SECURITY.md).

## Updating

```bash
git pull --ff-only
npm ci
npm run test
npm run build
```

For Docker, run `docker compose up --build` after pulling.

## Open-source license

This project uses Apache License 2.0. It permits private and commercial use, modification, hosting, and redistribution. Distributions must preserve the license and required notices. The license includes an express patent grant and does not grant rights to Growth Limit trademarks. See [OPEN_SOURCE.md](OPEN_SOURCE.md) for the operating implications.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Security problems belong in private reports described by [SECURITY.md](SECURITY.md), not public issues.
