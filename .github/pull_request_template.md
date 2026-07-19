## Problem

Describe the user-visible problem this pull request solves. Link the issue when one exists.

## Change

Explain the smallest set of changes made and why this approach was chosen.

## Verification

List the exact commands and scenarios used to verify the behavior.

- [ ] Focused tests pass
- [ ] `npm run lint` passes
- [ ] `npm run build` passes when application behavior or dependencies changed
- [ ] Web-interface changes were checked at desktop and mobile widths

## Safety and data review

- [ ] No API credentials, `.env.local` values, customer backlink data, private audit reports, or unrelated generated files are included
- [ ] New network destinations and redirects remain subject to SSRF and resource controls
- [ ] Every proposed disavow entry still requires explicit human approval
- [ ] DataForSEO or LLM cost changes are documented
- [ ] Storage, migration, and report-schema effects are documented
- [ ] Tests use synthetic or reserved-domain fixtures

## Compatibility

Describe any changes to installation, environment variables, Docker, Node.js requirements, report formats, or existing audit data. Write “None” when there are no compatibility effects.

## Screenshots or sample output

Include redacted screenshots or synthetic output when they help reviewers verify a visible change. Do not attach customer data or private URLs.
