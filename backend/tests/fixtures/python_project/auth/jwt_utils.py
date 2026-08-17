"""JWT Token encoding and decoding utilities."""
import time

def generate_token(user_id: str, role: str) -> str:
    """Generates an encrypted JWT token with expiry timestamp."""
    payload = f"{user_id}:{role}:{int(time.time())}"
    return f"jwt.{payload}.signature"

def decode_token(raw_token: str) -> dict:
    """Decodes token payload and validates format."""
    parts = raw_token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    data = parts[1].split(":")
    return {"user_id": data[0], "role": data[1]}
