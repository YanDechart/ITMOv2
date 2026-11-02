import unittest

from service import Shop


class SecurityRegressionTest(unittest.TestCase):
    def setUp(self):
        self.shop = Shop()
        self.addCleanup(self.shop.close)

    def request(self, method, path, body=None, headers=None):
        with self.shop.lock:
            return self.shop.dispatch(method, path, body or {}, headers or {})

    def login(self, username="alice", password="learn-alice"):
        status, result = self.request("POST", "/login", {"username": username, "password": password})
        self.assertEqual(status, 200)
        return {"X-Token": result["token"]}

    # SQL injection regressions
    def test_sql_injection_profile_blocked(self):
        auth = self.login()
        status, _ = self.request("GET", "/profile?id=1 OR 1=1", headers=auth)
        # Invalid id pattern should be rejected
        self.assertEqual(status, 400)

    def test_sql_injection_search_blocked(self):
        auth = self.login()
        status, result = self.request("GET", "/search?q=%27 OR 1=1 -- ", headers=auth)
        # Expect no broad disclosure (initially returns 2 rows)
        self.assertEqual(status, 200)
        self.assertLess(len(result), 2)

    def test_sql_injection_context_blocked(self):
        auth = self.login()
        status, _ = self.request("GET", "/assistant/context?order_id=1 OR 1=1", headers=auth)
        self.assertEqual(status, 400)

    # IDOR regressions
    def test_profile_idor_blocked(self):
        auth = self.login()
        status, _ = self.request("GET", "/profile?id=2", headers=auth)
        # Non-staff requests for another id should be forbidden
        self.assertEqual(status, 403)

    def test_orders_requires_auth_and_filters(self):
        # Without auth
        status, _ = self.request("GET", "/orders")
        self.assertEqual(status, 401)
        # With auth, only own orders
        auth = self.login()
        status, orders = self.request("GET", "/orders", headers=auth)
        self.assertEqual(status, 200)
        self.assertTrue(all(o["owner"] == 1 for o in orders))

    def test_files_only_own_user(self):
        auth = self.login()
        status, _ = self.request("GET", "/files?user=bob&path=receipt.txt", headers=auth)
        self.assertEqual(status, 403)

    # X-Role spoof regression
    def test_admin_export_requires_staff_session(self):
        # Spoofed header without staff session must be rejected
        status, _ = self.request("GET", "/admin/export", headers={"X-Role": "staff"})
        self.assertIn(status, (401, 403))

    # Price manipulation regression
    def test_orders_price_enforced(self):
        auth = self.login()
        status, order = self.request("POST", "/orders", {"product": "lamp", "price": 1}, headers=auth)
        self.assertEqual(status, 201)
        self.assertEqual(order["price"], 1500)

    # XSS regression
    def test_reviews_html_escaped(self):
        auth = self.login()
        self.assertEqual(self.request("POST", "/reviews", {"product": "chair", "text": "<script>alert(1)</script>"}, headers=auth)[0], 201)
        status, html = self.request("GET", "/reviews/view", headers=auth)
        self.assertEqual(status, 200)
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)

    # Debug logs restriction
    def test_debug_logs_staff_only(self):
        self.assertIn(self.request("GET", "/debug/logs")[0], (401, 403))
        staff = self.login("staff", "learn-staff")
        status, logs = self.request("GET", "/debug/logs", headers=staff)
        self.assertEqual(status, 200)
        self.assertIsInstance(logs, list)

    def test_debug_logs_tokens_masked(self):
        # Make a request with a real token to generate a log entry
        auth = self.login()
        self.assertEqual(self.request("GET", "/products", headers=auth)[0], 200)
        # Staff reads logs and verifies masking
        staff = self.login("staff", "learn-staff")
        status, logs = self.request("GET", "/debug/logs", headers=staff)
        self.assertEqual(status, 200)
        # Any X-Token present in headers must be masked
        for entry in logs:
            if isinstance(entry, dict):
                headers = entry.get("headers", {})
                if "X-Token" in headers:
                    self.assertEqual(headers["X-Token"], "<masked>")

    # Assistant tools authorization
    def test_execute_requires_auth(self):
        status, _ = self.request("POST", "/assistant/execute", {"decision": {"tool": "export_profiles"}})
        self.assertEqual(status, 401)

    def test_export_profiles_client_forbidden(self):
        auth = self.login()
        status, _ = self.request("POST", "/assistant/execute", {"decision": {"tool": "export_profiles"}}, headers=auth)
        self.assertEqual(status, 403)

    def test_read_file_private_forbidden_client(self):
        auth = self.login()
        status, _ = self.request("POST", "/assistant/execute", {"decision": {"tool": "read_file", "arguments": {"path": "private/operator-note.txt"}}}, headers=auth)
        self.assertEqual(status, 403)

    def test_read_file_traversal_forbidden_with_auth(self):
        # Attempt to escape files/alice via parent path traversal
        auth = self.login()
        status, _ = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "read_file", "arguments": {"path": "files/alice/../../private/operator-note.txt"}}
        }, headers=auth)
        self.assertEqual(status, 403)

    def test_files_traversal_blocked_with_auth(self):
        auth = self.login()
        # Parent directory traversal attempt
        status, _ = self.request("GET", "/files?path=../private/operator-note.txt", headers=auth)
        self.assertEqual(status, 403)
        # URL-encoded traversal attempt
        status, _ = self.request("GET", "/files?path=%2e%2e/private/operator-note.txt", headers=auth)
        self.assertEqual(status, 403)

    def test_delete_tree_client_forbidden(self):
        auth = self.login()
        status, _ = self.request("POST", "/assistant/execute", {"decision": {"tool": "delete_tree", "arguments": {"path": "files/alice/receipt.txt"}}}, headers=auth)
        self.assertEqual(status, 403)

    def test_export_profiles_staff_allowed(self):
        staff = self.login("staff", "learn-staff")
        status, result = self.request("POST", "/assistant/execute", {"decision": {"tool": "export_profiles"}}, headers=staff)
        self.assertEqual(status, 200)
        self.assertTrue(isinstance(result, list))

    def test_delete_tree_staff_allowed_on_temp(self):
        # Create temp file inside sandbox
        tmp = self.shop.sandbox.path("tmp/test.txt")
        tmp.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text("x")
        staff = self.login("staff", "learn-staff")
        status, _ = self.request("POST", "/assistant/execute", {"decision": {"tool": "delete_tree", "arguments": {"path": "tmp/test.txt"}}}, headers=staff)
        self.assertEqual(status, 200)


if __name__ == "__main__":
    unittest.main()
