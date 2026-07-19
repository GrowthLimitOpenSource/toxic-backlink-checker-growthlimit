# Apache License 2.0 Operating Notes

The Toxic Backlink Checker by GrowthLimit.com is distributed under Apache License 2.0. The complete legal terms are in `LICENSE`. This file describes the intended operating model and does not replace the license.

## Permissions

Apache License 2.0 permits:

- Private use
- Commercial use
- Modification
- Redistribution in source or compiled form
- Inclusion in another product
- Operation as a hosted service

Growth Limit does not receive a royalty solely because another party uses, modifies, distributes, or hosts the Apache-licensed code.

## Distribution requirements

A party that distributes the software or a derivative work must:

1. Include a copy of Apache License 2.0.
2. Identify modified files with prominent change notices.
3. Preserve applicable copyright, patent, trademark, and attribution notices from the source.
4. Include the attribution notices from `NOTICE` when the distributed work includes a notice file.

A distributor may apply different terms to its own modifications or to a larger combined work when those terms do not contradict Apache License 2.0 for the covered code.

## Patent terms

Contributors grant a patent license for patent claims necessarily infringed by their contributions. The patent license can terminate for a party that initiates specified patent litigation concerning the work. The complete conditions are in section 3 of `LICENSE`.

## Trademarks

The license covers software copyright and specified patent rights. It does not grant permission to use Growth Limit names, logos, service marks, domain names, or branding except as required to describe the software's origin and reproduce required notices.

A fork may state that it is derived from the Growth Limit project. A fork may not represent itself as the official Growth Limit release without separate permission.

## Warranty and liability

The software is provided without warranties or conditions. Users and distributors are responsible for determining whether the software is appropriate for an audit, deployment, or disavow workflow. The limitations of liability are defined in sections 7 and 8 of `LICENSE`.

## Project governance

Dennis Shirshikov and Growth Limit maintain the official repository, release tags, roadmap, rule-set versions, documentation, and branding. External changes are accepted through the contribution process in `CONTRIBUTING.md`.

Contributions are submitted under Apache License 2.0 unless the contributor explicitly states otherwise before submission. The project does not currently require a separate contributor license agreement.

## Commercial services

Apache License 2.0 does not prevent Growth Limit or another party from charging for:

- Managed backlink audits
- Human evidence review
- Installation and support
- Hosted operation
- Custom integrations
- Training
- Consulting

Charges apply to the service, infrastructure, support, or additional work. They do not change the permissions granted for the Apache-licensed code.

## Release controls

Before publication of a release:

1. Confirm that dependencies permit redistribution.
2. Include `LICENSE`, `NOTICE`, `README.md`, `SECURITY.md`, and `CONTRIBUTING.md`.
3. Exclude credentials, local audit data, generated reports, and account screenshots.
4. Run the focused test suite, linter, production build, and bounded API verification.
5. Record the application version and rule-set version.
6. Create an annotated semantic-version tag.
7. Publish security reporting instructions.
8. Preserve published tags and issue a new patch release for corrections.
