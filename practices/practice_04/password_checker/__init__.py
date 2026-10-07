"""
Password Policy Checker (base project).

This base module exposes a single function, check_password(password: str),
which validates the input type and returns a dictionary with the password's
length. Future features (NOT implemented yet) will add policy validation and
human-readable suggestions.
"""

from typing import Dict, List
import string


def check_password(password: str) -> Dict[str, int]:
    """Return basic information about the supplied password.

    Base behavior (intentionally minimal):
    - Accept a string; raise TypeError with a clear message if not a string.
    - Return a dictionary containing only the length of the supplied password.

    Example:
        check_password("hello") -> {"length": 5}
    """
    if not isinstance(password, str):
        raise TypeError(
            f"password must be a string, got {type(password).__name__}"
        )
    return {"length": len(password)}




def check_policy(password: str) -> List[str]:
    """Validate password against Feature A policy and return violations.

    Policy:
    - At least 12 characters ("min_length")
    - At least one uppercase letter ("uppercase")
    - At least one digit ("digit")
    - At least one special character ("special"), using string.punctuation
    """
    if not isinstance(password, str):
        raise TypeError(
            f"password must be a string, got {type(password).__name__}"
        )

    violations: List[str] = []
    if len(password) < 12:
        violations.append("min_length")
    if not any(ch.isupper() for ch in password):
        violations.append("uppercase")
    if not any(ch.isdigit() for ch in password):
        violations.append("digit")
    if not any(ch in string.punctuation for ch in password):
        violations.append("special")

    return violations


def suggest_improvements(password: str) -> List[str]:
    """Return human-readable suggestions based on Feature A policy violations.

    Suggestions correspond to violations returned by check_policy:
    - "min_length" -> "Use at least 12 characters."
    - "uppercase" -> "Include at least one uppercase letter."
    - "digit" -> "Include at least one digit."
    - "special" -> "Include at least one special character."

    If the password satisfies all requirements, return an empty list.
    Preserves TypeError behavior for invalid inputs.
    """
    # Delegate input validation to check_policy to preserve TypeError behavior/message
    violations = check_policy(password)

    suggestion_map = {
        "min_length": "Use at least 12 characters.",
        "uppercase": "Include at least one uppercase letter.",
        "digit": "Include at least one digit.",
        "special": "Include at least one special character.",
    }

    return [suggestion_map[v] for v in violations if v in suggestion_map]
