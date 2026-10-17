import unittest

from practices.practice_04.password_checker import check_policy


class TestPasswordPolicy(unittest.TestCase):
    def test_all_violations_for_simple_short_lowercase(self):
        # "short" violates: min_length, uppercase, digit, special
        violations = check_policy("short")
        self.assertCountEqual(
            violations, ["min_length", "uppercase", "digit", "special"]
        )

    def test_only_min_length_violates(self):
        # 11 chars, has uppercase, digit, special -> only min_length fails
        violations = check_policy("Abcdefghi9!")
        self.assertEqual(violations, ["min_length"])

    def test_passes_all_requirements(self):
        # 12+ chars, includes uppercase, digit, special -> no violations
        violations = check_policy("Abcdefghij9!")
        self.assertEqual(violations, [])

    def test_missing_uppercase(self):
        violations = check_policy("abcdefghijkl9!")  # 13 chars, no uppercase
        self.assertEqual(violations, ["uppercase"])

    def test_missing_digit(self):
        violations = check_policy("Abcdefghijk!")  # 12 chars, no digit
        self.assertEqual(violations, ["digit"])

    def test_missing_special(self):
        violations = check_policy("Abcdefghijk9")  # 12 chars, no special
        self.assertEqual(violations, ["special"])

    def test_non_string_input_raises(self):
        with self.assertRaises(TypeError) as ctx:
            check_policy(123)  # type: ignore[arg-type]
        self.assertIn("password must be a string", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
