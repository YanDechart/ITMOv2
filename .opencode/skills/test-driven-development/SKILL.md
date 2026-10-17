# Test-Driven Development (TDD) — Practice 4

A concise workflow to make safe, incremental changes using Python's standard library and unittest.

## RED
- Understand the requested behavior and acceptance criteria.
- Add or update a unittest test BEFORE changing the implementation (tests live in `practices/practice_04/tests/`).
- Run the relevant test.
- Confirm that it fails for the expected reason.
- Do not proceed to implementation until the expected failure is observed.

## GREEN
- Make the smallest implementation change needed to satisfy the failing test (implementation lives in `practices/practice_04/password_checker/`).
- Use only the Python standard library unless explicitly instructed otherwise.
- Run the relevant tests again.
- Confirm that they pass.

## VERIFY
- Run the complete project test suite:

  `python3 -m unittest discover -s practices/practice_04 -p 'test*.py'`

- Review the diff for unintended changes.
- Preserve existing behavior unless the current task explicitly changes it.
- Do not modify course files:
  - `practices/practice_04/README.md`
  - `practices/practice_04/presentation.pdf`
  - `practices/practice_04/presentation.pptx`
- Do not modify files outside `practices/practice_04/` (unless a task explicitly authorizes an exception).
- Do not commit unless explicitly asked.
