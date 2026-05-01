# Security Policy

## Scope

This policy applies to the Taan Mind application code, configuration templates, documentation, and project automation in this repository.

Security-sensitive areas include:

- Anonymous session handling and HTTP-only cookies.
- Paperless-ngx API proxy routes.
- AI provider calls and streamed chat responses.
- OCR processing, document parsing, and file uploads.
- Background sync and document metadata processing.
- Docker and deployment configuration.

## Version status

| Version | Status |
| ------- | ------ |
| `2.x` | Maintained |
| `< 2.0.0` | Not maintained |

## Reporting a vulnerability

Use the repository's private vulnerability reporting feature when available. If private reporting is not available, open a minimal public issue that states a vulnerability exists, but do not include exploit details, secrets, private documents, or personal data.

A useful report includes:

- Affected version or commit.
- Affected component or route.
- Clear reproduction steps.
- Expected and actual impact.
- Any relevant logs with secrets removed.
- Suggested mitigation, if known.

## Coordinated disclosure

Maintainers aim to:

1. Confirm receipt through the reporting channel.
2. Triage severity and affected versions.
3. Prepare a fix or mitigation.
4. Release the fix.
5. Publish appropriate release notes after users have a reasonable path to update.

Please do not publicly disclose exploit details until a fix or mitigation is available.

## Security expectations for contributors

Contributors must:

- Validate and sanitize untrusted input.
- Treat OCR output, AI output, document content, and remote API responses as untrusted.
- Avoid exposing secrets to the browser, logs, test fixtures, or generated artifacts.
- Use least-privilege credentials for Paperless-ngx, AI providers, and deployment systems.
- Consider prompt injection, tool poisoning, and data exfiltration risks when changing AI or MCP-style tool flows.
- Add tests for authorization, validation, file handling, and failure paths when relevant.

## Out of scope

The following are usually out of scope unless they demonstrate a concrete impact on this repository:

- Social engineering.
- Physical attacks.
- Denial-of-service claims without a reproducible application-level issue.
- Vulnerabilities in third-party services that are not caused by this project.
- Findings that require leaked credentials or privileged access not granted by the application.

## Disclaimer

This project is provided under the MIT License. The maintainers and copyright holders do not assume responsibility for unlawful, unsafe, or improper use of the software.
