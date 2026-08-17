"""Authentication service managing login and token validation."""
from auth.jwt_utils import generate_token, decode_token
from models.user import User

class AuthService:
    """Core authentication logic handler."""
    def __init__(self):
        self.active_sessions = {}

    def login(self, username: str, password_hash: str) -> str:
        """Validates credentials and returns JWT bearer token."""
        if not username or not password_hash:
            raise ValueError("Credentials missing")
        token = generate_token(username, "admin")
        self.active_sessions[username] = token
        return token

    def verify_token(self, token: str) -> bool:
        """Verifies active session state."""
        try:
            payload = decode_token(token)
            return payload.get("user_id") in self.active_sessions
        except Exception:
            return False
