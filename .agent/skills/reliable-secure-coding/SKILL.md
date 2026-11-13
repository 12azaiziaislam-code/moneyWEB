---
name: reliable-secure-coding
description: Use for ANY task that writes, edits, fixes or reviews code. Enforces a strict workflow of planning, small verified steps, real test execution, security review (OWASP) and honest reporting, to produce correct, tested and secure code.
---

# Reliable & Secure Coding

## Core principles
1. Never claim something works unless you actually ran it and saw the output.
2. Never invent APIs, functions, flags or package names. Check the real docs, installed version and source code first.
3. Prefer simple, readable, boring solutions over clever ones.
4. If requirements are unclear, ask before coding.
5. Report honestly what was NOT verified.

## Workflow (follow in order)
1. **Understand**: restate the task, inputs, outputs, constraints, edge cases. Read the existing code and conventions first.
2. **Plan**: list files to change and the approach. Keep changes minimal and scoped.
3. **Implement in small steps**: after each step, run the build/type-check/linter.
4. **Test** (see below).
5. **Security review** (see below).
6. **Self-review**: read your own diff line by line as a strict reviewer. Look for off-by-one errors, null/undefined, race conditions, unhandled promises, resource leaks, wrong types, timezone and encoding issues.
7. **Report**: what changed, what was tested, results, remaining risks.

## Testing rules
- Write or update tests for every behavior you add or fix. For bug fixes, write a failing test first, then fix.
- Cover: normal case, empty/null input, boundaries, invalid input, large input, concurrency where relevant, error paths.
- Run the full test suite, linter, formatter and type checker. Paste the real command output summary.
- For web UI, run end-to-end tests (Playwright or equivalent) on key flows, and check the browser console for errors.
- If tests fail, fix the root cause. Never delete, skip or weaken tests to make them pass.
- If no test framework exists, set one up with my approval.

## Code quality rules
- Use strict typing (TypeScript strict, type hints) where possible.
- Validate every external input at the boundary (user input, API, files, env vars, URL params) with a schema library.
- Handle errors explicitly. No empty catch blocks. Return safe error messages to users and log details server-side.
- No dead code, no commented-out code, no magic numbers, no duplicated logic.
- Pin and verify dependencies. Add only well-maintained packages and justify each.

## Security checklist (OWASP-based, mandatory)
- **Injection**: parameterized queries / ORM only. Never build SQL, shell commands or file paths from raw input. Avoid eval and dynamic code execution.
- **XSS**: escape output by context, avoid dangerouslySetInnerHTML/innerHTML, sanitize any HTML with a vetted library, set a strict Content-Security-Policy.
- **Authentication**: hash passwords with Argon2id or bcrypt, never store plaintext, enforce rate limiting and lockout, secure session/JWT handling with short expiry and rotation.
- **Authorization**: check permissions server-side on every request, on every object (prevent IDOR). Deny by default. Least privilege.
- **CSRF**: use SameSite cookies and CSRF tokens for state-changing requests.
- **Cookies**: HttpOnly, Secure, SameSite set correctly.
- **Secrets**: never hardcode or commit secrets. Use environment variables or a secret manager. Ensure .env is in .gitignore. If a secret was exposed, tell me to rotate it.
- **Transport and headers**: HTTPS only, HSTS, X-Content-Type-Options, frame protections, Referrer-Policy, strict CORS allow-list (never `*` with credentials).
- **File uploads**: validate type by content, limit size, rename files, store outside web root, never execute uploads.
- **SSRF and path traversal**: allow-list outbound URLs, normalize and validate file paths.
- **Rate limiting** on login, signup, password reset, and expensive endpoints.
- **Logging**: never log passwords, tokens, or personal data.
- **Dependencies**: run the package audit (npm audit / pip-audit or equivalent) and fix high/critical issues.
- **Data**: encrypt sensitive data at rest where appropriate, minimize data collection.

## Definition of done
All must be true:
- [ ] Builds without errors or warnings
- [ ] Linter, formatter and type check pass
- [ ] All tests pass, new tests added, outputs shown
- [ ] Security checklist reviewed, findings fixed or listed
- [ ] Dependency audit run
- [ ] No secrets, debug code or leftover TODOs
- [ ] Final report written honestly, including what could not be verified
---
