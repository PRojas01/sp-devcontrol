# Security Policy

SP-DevControl handles project governance for AI-assisted development, including policy enforcement, file monitoring, and compliance reporting. Security is a core design requirement.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.0.x   | ✅ Active development |
| < 2.0   | ❌ Not supported |

## Reporting a Vulnerability

We take security issues seriously. Please report vulnerabilities via private channel only:

1. **Email**: security@solucionespro.com
2. **GitHub**: Use the private vulnerability reporting feature at:
   https://github.com/SolucionesPro/sp-devcontrol/security/advisories/new

Do not report security issues via public GitHub issues or discussions.

### What to include

- Description of the vulnerability
- Steps to reproduce (concept code, not exploit)
- Impact assessment
- Suggested fix (optional)

### Response timeline

- **48 hours**: Acknowledgment of receipt
- **7 days**: Initial assessment and severity classification
- **30 days**: Fix released for critical/high severity issues

## Security Features

### Authentication
- Token-based auth for API (`/api/*`) and MCP endpoints
- Tokens stored in `~/.devcontrol/api-token` (chmod 600, outside project root)
- No hardcoded credentials

### Path Traversal Prevention
- All file paths resolved and normalized against project root
- Path traversal attacks (`../../`) detected and blocked
- Protected paths enforced at policy engine level

### Command Policy
- Exact-match command evaluation (no substring bypass)
- 3-tier decision: ALLOW / REVIEW / BLOCK
- Session-level approvals can override but are revocable

### Data Protection
- No telemetry, no external calls, no data leaving the machine
- Storage files in `.devcontrol/` with `.gitignore` exclusion
- Atomic writes prevent corruption

## Security-Sensitive Modules

- `policy.ts` — Command and path risk evaluation
- `api.ts` — Token authentication middleware
- `daemon.ts` — Token generation and validation
- `token_guard.ts` — Token budget estimation
- `validator.ts` — Control validation execution

## Disclosure Policy

We follow coordinated disclosure: 90-day window between fix release and full public disclosure.
