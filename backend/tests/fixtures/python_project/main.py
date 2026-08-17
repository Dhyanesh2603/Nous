"""Main application entry point."""
from auth.service import AuthService
from pipeline.processor import DataProcessor
from models.user import User

def bootstrap_app():
    """Initializes authentication and pipeline services."""
    auth_service = AuthService()
    user = User(username="alice", email="alice@example.com")
    token = auth_service.login("alice", "secret123")
    
    processor = DataProcessor()
    result = processor.process_batch(user, [10, 20, 30])
    return result

if __name__ == "__main__":
    bootstrap_app()
