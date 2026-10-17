# Practice 4 — Password Policy Checker (Agent Guide)

A small Python project to check passwords. Keep changes minimal and focused.

## Project Layout
- Implementation: `practices/practice_04/password_checker/`
- Tests: `practices/practice_04/tests/`

## Tech & Constraints
- Use only the Python standard library unless explicitly instructed otherwise.
- Preserve existing behavior unless the current task explicitly changes it.
- Make small, focused changes.
- When behavior changes, add or update unit tests accordingly.
- Verify changes locally with:

  ```bash
  python3 -m unittest discover -s practices/practice_04 -p 'test*.py'
  ```

## Do Not Modify
- Course files:
  - `practices/practice_04/README.md`
  - `practices/practice_04/presentation.pdf`
  - `practices/practice_04/presentation.pptx`
- Any files outside `practices/practice_04/`.
- Do not commit changes unless explicitly asked.

## Implemented Features
- Feature A (Policy validation): check_policy(password: str) returns violation keys among: min_length, uppercase, digit, special.
- Feature B (Suggestions): suggest_improvements(password: str) maps violations to human-readable messages.

## Notes
- The project includes a custom MCP server (practice4-password), a check-after-edit verification hook, and a TDD skill. These are part of the configured environment and should be used as-is; do not alter them unless a task explicitly requires it.
