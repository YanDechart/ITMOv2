import unittest

from practices.practice_04.password_checker import check_password


class TestCheckPassword(unittest.TestCase):
    def test_normal_string(self):
        result = check_password("hello")
        self.assertEqual(result, {"length": 5})

    def test_empty_string(self):
        result = check_password("")
        self.assertEqual(result, {"length": 0})

    def test_non_string_input(self):
        with self.assertRaises(TypeError) as ctx:
            check_password(123)  # type: ignore[arg-type]
        self.assertIn("password must be a string", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
