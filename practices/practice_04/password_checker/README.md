Password Policy Checker (Base Project)

What this base project does today
- Provides a tiny Python package with a single function: `check_password(password: str)`.
- Behavior is intentionally minimal:
  - If `password` is not a string, it raises `TypeError` with a clear message.
  - If it is a string, it returns a dictionary containing only the length of the supplied password, e.g. `{"length": 5}` for "hello".

Planned features (NOT implemented yet)
- Feature A (not now): Add password-policy validation (e.g., minimum length, uppercase, digit, special-character requirements).
- Feature B (not now): Add human-readable suggestions for fixing policy violations.

Notes
- Standard library only; no external dependencies.
- No CLI, API server, database, authentication, or other frameworks/config.
- This README is specific to the Password Policy Checker and does not replace the Practice 4 top-level README.
