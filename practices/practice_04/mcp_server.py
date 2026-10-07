#!/usr/bin/env python3
"""
Minimal local MCP server for Practice 4.

Exposes a single tool, `check_password_policy`, that reuses the existing
password checker implementation to return both policy violations (Feature A)
and improvement suggestions (Feature B).

Constraints:
- Python standard library only
- No duplication of policy rules — delegate to password_checker
"""

from __future__ import annotations

import json
import sys
import traceback
from typing import Any, Dict
import os


# Ensure project root on sys.path so 'practices' is importable when run as a script
_HERE = os.path.dirname(__file__)
_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

# Import existing implementation (do not duplicate logic)
from practices.practice_04.password_checker import (
    check_policy,
    suggest_improvements,
)


# --- JSON-RPC 2.0 helpers over stdio (legacy MCP initialize, tools/list, tools/call) ---

def _write_message(obj: Dict[str, Any]) -> None:
    data = json.dumps(obj, separators=(",", ":"))
    sys.stdout.write(data + "\n")
    sys.stdout.flush()


def _error(id_: Any, code: int, message: str, data: Any | None = None) -> None:
    err: Dict[str, Any] = {"jsonrpc": "2.0", "id": id_, "error": {"code": code, "message": message}}
    if data is not None:
        err["error"]["data"] = data
    _write_message(err)


def _result(id_: Any, result: Any) -> None:
    _write_message({"jsonrpc": "2.0", "id": id_, "result": result})


SERVER_NAME = "practice_04_password_tools"
SERVER_VERSION = "0.1.0"


def handle_initialize(id_: Any) -> None:
    # Return legacy MCP initialize result with required fields for OpenCode
    _result(
        id_,
        {
            "protocolVersion": "2025-11-25",
            "serverInfo": {
                "name": SERVER_NAME,
                "version": SERVER_VERSION,
            },
            "capabilities": {
                "tools": {},
            },
        },
    )


def handle_tools_list(id_: Any) -> None:
    tool = {
        "name": "check_password_policy",
        "description": "Validate a password against the policy and return violations and improvement suggestions.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "password": {"type": ["string"]},
            },
            "required": ["password"],
            "additionalProperties": False,
        },
    }
    _result(id_, {"tools": [tool]})


def handle_tools_call(id_: Any, params: Dict[str, Any]) -> None:
    name = params.get("name")
    arguments = params.get("arguments") or {}

    if name != "check_password_policy":
        _error(id_, -32601, f"Tool not found: {name}")
        return

    # Validate argument shape
    if not isinstance(arguments, dict) or "password" not in arguments:
        _error(id_, -32602, "Invalid params: expected object with 'password'")
        return

    password = arguments.get("password")
    try:
        # Reuse existing Feature A + Feature B implementation
        violations = check_policy(password)  # type: ignore[arg-type]
        suggestions = suggest_improvements(password)  # type: ignore[arg-type]
        # MCP result content shape: return JSON content
        payload = {
            "violations": violations,
            "suggestions": suggestions,
        }
        _result(
            id_,
            {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(payload, separators=(",", ":")),
                    }
                ]
            },
        )
    except TypeError as te:
        # Map invalid input to JSON-RPC error with clear message
        _error(id_, -32602, str(te))
    except Exception:
        _error(id_, -32000, "Internal error", {"trace": traceback.format_exc()})


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:
            # Not a JSON-RPC request; ignore
            continue

        method = req.get("method")
        id_ = req.get("id")
        params = req.get("params") or {}

        if method == "initialize":
            handle_initialize(id_)
        elif method == "tools/list":
            handle_tools_list(id_)
        elif method == "tools/call":
            handle_tools_call(id_, params)
        elif method == "ping":
            _result(id_, {"ok": True})
        else:
            _error(id_, -32601, f"Method not found: {method}")


if __name__ == "__main__":
    main()
