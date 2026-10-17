import unittest

import practices.practice_04.password_checker as password_module


class TestPasswordSuggestions(unittest.TestCase):
    def setUp(self):
        # Map expected suggestion strings to policy keys for clarity in tests
        self.expected = {
            "min_length": "Use at least 12 characters.",
            "uppercase": "Include at least one uppercase letter.",
            "digit": "Include at least one digit.",
            "special": "Include at least one special character.",
        }

    def test_all_suggestions_for_simple_short_lowercase(self):
        # "short" violates: min_length, uppercase, digit, special -> all suggestions
        suggestions = password_module.suggest_improvements("short")
        self.assertCountEqual(
            suggestions,
            [
                self.expected["min_length"],
                self.expected["uppercase"],
                self.expected["digit"],
                self.expected["special"],
            ],
        )

    def test_only_min_length_suggestion(self):
        # 11 chars, has uppercase, digit, special -> only min_length suggestion
        suggestions = password_module.suggest_improvements("Abcdefghi9!")
        self.assertEqual(suggestions, [self.expected["min_length"]])

    def test_no_suggestions_when_valid(self):
        # 12+ chars, includes uppercase, digit, special -> no suggestions
        suggestions = password_module.suggest_improvements("Abcdefghij9!")
        self.assertEqual(suggestions, [])

    def test_non_string_input_raises(self):
        with self.assertRaises(TypeError) as ctx:
            password_module.suggest_improvements(123)  # type: ignore[arg-type]
        self.assertIn("password must be a string", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
