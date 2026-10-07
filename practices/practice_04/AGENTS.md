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

## Future Work (Do Not Implement Now)
- Feature A: Add password-policy validation with all of the following:
  - Minimum 12 characters
  - At least one uppercase letter
  - At least one digit
  - At least one special character
  - Report which requirements are violated
- Feature B: Add human-readable improvement suggestions based on the violations reported by Feature A.

## Out of Scope (Do Not Create Now)
- Skills, MCP configuration, hooks, runners, worktrees, reflection.md
