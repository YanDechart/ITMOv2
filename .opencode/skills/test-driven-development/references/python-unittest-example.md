# Python unittest TDD example (generic)

This is a minimal, generic example showing a failing test, the smallest change to make it pass, and the passing test. It is not related to the Password Policy Checker features.

## 1) Write a failing test first (RED)
```python
# file: example_test.py
import unittest

from example import add

class TestAdd(unittest.TestCase):
    def test_adds_two_numbers(self):
        self.assertEqual(add(2, 3), 5)

if __name__ == "__main__":
    unittest.main()
```
Run it:
```
python3 -m unittest example_test.py
```
Expected: ImportError or AttributeError (function not implemented yet), or assertion failure.

## 2) Implement the minimal code (GREEN)
```python
# file: example.py

def add(a, b):
    return a + b
```
Run tests again:
```
python3 -m unittest example_test.py
```
Expected: tests pass.

## 3) Verify (VERIFY)
- If applicable, run broader suites (in our project: `python3 -m unittest discover -s practices/practice_04 -p 'test*.py'`).
- Review diffs for unintended changes.
- Keep changes minimal and focused.
