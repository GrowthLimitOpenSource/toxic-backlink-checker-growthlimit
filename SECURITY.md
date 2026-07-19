# Security policy

## Report privately

Do not open a public issue for credential exposure, SSRF, arbitrary file access, authentication bypass, dependency compromise, or another exploitable defect. Use GitHub private vulnerability reporting on the official repository. Include the affected version, reproduction steps, impact, and a safe proof of concept. Do not include real API credentials or customer backlink data.

## Supported versions

The latest tagged release receives security fixes. Older releases may not receive backports.

## Secret handling

- Keep DataForSEO and LLM credentials in `.env.local` or a container secret.
- Never commit, log, return, screenshot, export, or send secrets to an LLM.
- Rotate credentials immediately if they appear in a commit, issue, screenshot, terminal recording, or chat.
- Bind the application to localhost unless an authenticated reverse proxy protects it. The application does not include multi-user authentication.

## Network and data model

The server contacts DataForSEO, an optional configured OpenAI-compatible endpoint, and public representative linking pages. The inspector rejects non-HTTP protocols, URL credentials, loopback, private, link-local, and metadata addresses; resolves DNS before each request; and rechecks redirect destinations. Resource caps limit concurrency, time, response bytes, page inspections, backlinks, and LLM groups.

Audit JSON remains under `data/audits`. Raw fetched HTML is not persisted. Delete an audit through the API or delete its local JSON file while the application is stopped. Back up audit data only to an access-controlled destination.

## Deployment warning

This is designed for one trusted local operator. Do not expose port 3000 to the public internet. A shared or hosted deployment requires authentication, authorization, CSRF protection, per-user encrypted secret storage, job isolation, rate limiting, audit logs, and tenant-separated data storage.
