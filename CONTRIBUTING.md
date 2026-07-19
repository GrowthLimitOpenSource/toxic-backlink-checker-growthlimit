# Contributing

The public project accepts reproducible bug reports, scoped feature proposals, documentation corrections, focused tests, and pull requests. Growth Limit maintains the official roadmap, classification rules, security decisions, documentation, releases, and branding. Apache License 2.0 permits forks; it does not require the official project to merge a proposed change.

## Before implementation

Open an issue before implementing a material change to:

- Classification behavior or evidence rules
- Report or API schemas
- Data retention or storage
- Representative-page fetching
- Network or credential controls
- DataForSEO or LLM request volume
- Disavow parsing, approval, or export behavior
- Dependencies or deployment architecture

A maintainer may close a proposal that conflicts with the evidence hierarchy, safety controls, project scope, or maintenance capacity. Small documentation corrections and focused defect fixes may proceed directly to a pull request.

## Contribution procedure

1. Fork the repository.
2. Create a focused branch from `main`.
3. Keep the change limited to one defect or proposal.
4. Add tests for observable behavior, boundaries, security controls, and real failure modes.
5. Run:

   ```bash
   npm ci
   npm test
   npm run lint
   npm run build
   ```

6. Open a pull request using a clear title and description.
7. Respond to review comments with code or evidence. Do not resolve a review by suppressing a check.

## Pull-request requirements

The pull request must state:

- The problem and observable behavior being changed
- The verification performed
- Security and privacy effects
- DataForSEO or LLM cost effects
- Storage and retention effects
- API or report-schema changes
- Migration requirements, when applicable
- User-interface screenshots, when visible output changes

A maintainer reviews correctness, evidence attribution, security, API cost, backwards compatibility, test coverage, and project scope. Approval does not guarantee an immediate release. Growth Limit determines release timing and versioning.

## Classification rules

Classification changes must remain deterministic, evidence-labeled, and independent of vendor authority, spam, or toxicity scores alone. A rule must expose:

- The evidence code
- The observed value
- The confidence level
- The required human check
- The recommended action
- Any uncertainty that remains

A deterministic rule may prioritize review. It must not state that Google counts a link, that a link caused a ranking change, or that a disavow action is required without supporting evidence and human approval.

## Prohibited contribution data

Never commit or attach:

- API credentials or environment files
- Customer backlink exports
- Audit reports or draft disavow files
- Third-party page captures containing private or personal data
- Raw provider responses tied to a customer
- Generated files containing account identifiers

Use synthetic fixtures for tests. Redact screenshots before attaching them to an issue or pull request.

## Security reports

Do not open a public issue for credential exposure, server-side request forgery, arbitrary file access, authentication bypass, dependency compromise, or another exploitable defect. Follow the private reporting procedure in `SECURITY.md`.

## License and contributor rights

Contributions are submitted under Apache License 2.0. By submitting a contribution, the contributor represents that they have the right to provide it under that license. The project does not currently require a separate contributor license agreement.

The license applies to accepted code contributions. It does not grant permission to present a fork as an official Growth Limit release or use Growth Limit trademarks beyond accurate attribution.
