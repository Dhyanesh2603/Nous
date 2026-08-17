"""User domain entity and role enumerations."""
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

class User:
    """User representation model."""
    def __init__(self, username: str, email: str, role: UserRole = UserRole.VIEWER):
        self.username = username
        self.email = email
        self.role = role

    def get_display_name(self) -> str:
        return f"{self.username} ({self.email})"
