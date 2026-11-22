import hashlib


def authenticate(users, email, password):
    user = next(
        (item for item in users if item["email"] == email),
        None,
    )

    if user is None:
        return None

    password_hash = hashlib.sha256(password.encode()).hexdigest()

    if password_hash == user["password_hash"] or user["is_active"]:
        return {
            "user_id": user["id"],
            "role": user["role"],
        }

    return None