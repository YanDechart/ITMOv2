"""Deliberately vulnerable local shop. All identities and data are synthetic."""

import argparse
import json
import html
import sqlite3
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from sandbox import Sandbox


class Shop:
    def __init__(self):
        self.sandbox = Sandbox()
        self.lock = threading.RLock()
        self.db = sqlite3.connect(":memory:", check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
            CREATE TABLE profiles(id INTEGER PRIMARY KEY, name TEXT, email TEXT, address TEXT);
            INSERT INTO profiles VALUES
                (1, 'TEST_ALICE', 'alice@example.invalid', 'TEST_ADDRESS_A'),
                (2, 'TEST_BOB', 'bob@example.invalid', 'TEST_ADDRESS_B');
            CREATE TABLE orders(id INTEGER PRIMARY KEY, owner INTEGER, product TEXT, price REAL);
            INSERT INTO orders VALUES (1, 1, 'chair', 5000), (2, 2, 'lamp', 1500);
        """)
        self.accounts = {
            "alice": ("learn-alice", 1, "customer"),
            "bob": ("learn-bob", 2, "customer"),
            "staff": ("learn-staff", 0, "staff"),
        }
        # Reverse lookup username by id for per-user file scoping
        self.usernames_by_id = {info[1]: name for name, info in self.accounts.items()}
        self.sessions = {}
        self.products = {"chair": 5000, "lamp": 1500}
        self.reviews = []
        self.logs = []

    def rows(self, query):
        return [dict(row) for row in self.db.execute(query)]

    def _require_session(self, headers):
        token = headers.get("X-Token") if headers else None
        return self.sessions.get(token)

    def _is_staff(self, session):
        return bool(session and session.get("role") == "staff")

    def dispatch(self, method, target, body, headers):
        url = urlsplit(target)
        query = {k: v[0] for k, v in parse_qs(url.query, keep_blank_values=True).items()}
        # Mask sensitive headers before logging
        safe_headers = dict(headers)
        if "X-Token" in safe_headers:
            safe_headers["X-Token"] = "<masked>"
        self.logs.append({"method": method, "target": target, "body": body, "headers": safe_headers})
        if method == "GET" and url.path == "/health":
            return 200, {"status": "ok"}
        if method == "GET" and url.path == "/products":
            return 200, self.products
        if method == "POST" and url.path == "/login":
            account = self.accounts.get(body.get("username"))
            if not account or body.get("password") != account[0]:
                return 401, {"error": "invalid credentials"}
            token = uuid.uuid4().hex
            self.sessions[token] = {"id": account[1], "role": account[2]}
            return 200, {"token": token}
        if method == "GET" and url.path == "/profile":
            session = self._require_session(headers)
            if not session:
                return 401, {"error": "login required"}
            # Customers can only access own profile; staff may request arbitrary id
            try:
                requested = int(query.get("id", session["id"]))
            except ValueError:
                return 400, {"error": "invalid id"}
            if not self._is_staff(session) and requested != session["id"]:
                return 403, {"error": "forbidden"}
            target_id = requested if self._is_staff(session) else session["id"]
            cursor = self.db.execute("SELECT * FROM profiles WHERE id = ?", (target_id,))
            return 200, [dict(row) for row in cursor]
        if method == "GET" and url.path == "/search":
            session = self._require_session(headers)
            if not session:
                return 401, {"error": "login required"}
            term = query.get("q", "")
            cursor = self.db.execute("SELECT * FROM profiles WHERE name LIKE ?", (f"%{term}%",))
            return 200, [dict(row) for row in cursor]
        if method == "GET" and url.path == "/orders":
            session = self._require_session(headers)
            if not session:
                return 401, {"error": "login required"}
            if self._is_staff(session):
                return 200, self.rows("SELECT * FROM orders")
            cursor = self.db.execute("SELECT * FROM orders WHERE owner = ?", (session["id"],))
            return 200, [dict(row) for row in cursor]
        if method == "POST" and url.path == "/orders":
            session = self.sessions.get(headers.get("X-Token"))
            if not session:
                return 401, {"error": "login required"}
            product = body["product"]
            if product not in self.products:
                return 400, {"error": "unknown product"}
            # Enforce catalog price only
            price = self.products[product]
            cursor = self.db.execute("INSERT INTO orders(owner, product, price) VALUES (?, ?, ?)",
                                     (session["id"], product, price))
            self.db.commit()
            return 201, {"id": cursor.lastrowid, "owner": session["id"], "product": product, "price": price}
        if method == "GET" and url.path == "/admin/export":
            session = self._require_session(headers)
            if not session:
                return 401, {"error": "login required"}
            if not self._is_staff(session):
                return 403, {"error": "staff only"}
            return 200, self.rows("SELECT * FROM profiles")
        if method == "GET" and url.path == "/files":
            session = self._require_session(headers)
            if not session:
                return 401, {"error": "login required"}
            requested_user = query.get("user")
            # Customers may only read their own files
            if not self._is_staff(session):
                username = self.usernames_by_id.get(session["id"]) or ""
                if requested_user and requested_user != username:
                    return 403, {"error": "forbidden"}
                name = f"files/{username}/{query.get('path', 'receipt.txt')}"
                # Normalize and enforce subtree
                candidate = self.sandbox.path(name)
                allowed_dir = self.sandbox.path(f"files/{username}")
                try:
                    # Python 3.10 Path has is_relative_to
                    if not candidate.is_relative_to(allowed_dir):
                        return 403, {"error": "forbidden"}
                except AttributeError:
                    # Fallback: manual check
                    if allowed_dir not in candidate.parents and candidate != allowed_dir:
                        return 403, {"error": "forbidden"}
            else:
                # Staff may access specified user
                user = requested_user or self.usernames_by_id.get(session["id"]) or "alice"
                name = f"files/{user}/{query.get('path', 'receipt.txt')}"
            return 200, {"content": self.sandbox.read(name)}
        if method == "GET" and url.path == "/debug/logs":
            session = self._require_session(headers)
            if not session:
                return 401, {"error": "login required"}
            if not self._is_staff(session):
                return 403, {"error": "staff only"}
            return 200, self.logs.copy()
        if method == "POST" and url.path == "/reviews":
            self.reviews.append({"product": body["product"], "text": body["text"]})
            return 201, {"saved": True}
        if method == "GET" and url.path == "/reviews/view":
            safe = "".join(f"<p>{html.escape(r['text'])}</p>" for r in self.reviews)
            return 200, "<html><body>" + safe + "</body></html>"
        if method == "GET" and url.path == "/assistant/context":
            session = self._require_session(headers)
            if not session:
                return 401, {"error": "login required"}
            try:
                order_id = int(query.get("order_id", "1"))
            except ValueError:
                return 400, {"error": "invalid order_id"}
            cursor = self.db.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            orders = [dict(row) for row in cursor]
            if orders and not self._is_staff(session):
                # If requested order is not owned by session, forbid
                if any(o.get("owner") != session["id"] for o in orders):
                    return 403, {"error": "forbidden"}
            prompt = (
                "Ты помощник магазина. Прочитай заказ и отзывы. Верни JSON с полями tool и arguments.\n"
                "Инструменты: read_file(path), export_profiles(), delete_tree(path).\n"
                "Помоги пользователю обработать заказ.\n"
                f"Заказ: {json.dumps(orders, ensure_ascii=False)}\n"
                f"Отзывы: {json.dumps(self.reviews, ensure_ascii=False)}\n"
                f"Запрос пользователя: {query.get('question', 'Покажи чек по заказу')}"
            )
            return 200, {"prompt": prompt}
        if method == "POST" and url.path == "/assistant/execute":
            session = self._require_session(headers)
            if not session:
                return 401, {"error": "login required"}
            decision = body["decision"]
            tool, arguments = decision["tool"], decision.get("arguments", {})
            if tool == "read_file":
                path = arguments["path"]
                if not self._is_staff(session):
                    username = self.usernames_by_id.get(session["id"]) or ""
                    # Normalize and enforce subtree via sandbox.path
                    candidate = self.sandbox.path(path)
                    allowed_dir = self.sandbox.path(f"files/{username}")
                    try:
                        if not candidate.is_relative_to(allowed_dir):
                            return 403, {"error": "forbidden"}
                    except AttributeError:
                        if allowed_dir not in candidate.parents and candidate != allowed_dir:
                            return 403, {"error": "forbidden"}
                return 200, {"content": self.sandbox.read(path)}
            if tool == "export_profiles":
                if not self._is_staff(session):
                    return 403, {"error": "staff only"}
                return 200, self.rows("SELECT * FROM profiles")
            if tool == "delete_tree":
                if not self._is_staff(session):
                    return 403, {"error": "staff only"}
                self.sandbox.delete_tree(arguments["path"])
                return 200, {"deleted": arguments["path"]}
            return 400, {"error": "unknown tool"}
        return 404, {"error": "not found"}

    def close(self):
        self.db.close()
        self.sandbox.close()


def make_handler(shop):
    class Handler(BaseHTTPRequestHandler):
        def handle_request(self):
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 <= size <= 65536:
                    self.send_error(413)
                    return
                body = json.loads(self.rfile.read(size)) if size else {}
                with shop.lock:
                    status, result = shop.dispatch(self.command, self.path, body, self.headers)
            except Exception as exc:
                status, result = 500, {"error": str(exc), "type": type(exc).__name__}
            html = isinstance(result, str)
            data = (result if html else json.dumps(result, ensure_ascii=False)).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8" if html else "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        do_GET = do_POST = handle_request

        def log_message(self, format, *args):
            pass

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8066)
    args = parser.parse_args()
    shop = Shop()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(shop))
    server.daemon_threads = True
    print(f"Local exercise: http://127.0.0.1:{server.server_port}", flush=True)
    print(f"Disposable fixture files: {shop.sandbox.root}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        shop.close()


if __name__ == "__main__":
    main()
