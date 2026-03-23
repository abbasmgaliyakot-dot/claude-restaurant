# auth_utils.py
import hashlib
from passlib.context import CryptContext
import jwt
import os
from datetime import datetime, timedelta

# -----------------------
# Password hashing setup
# -----------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Hashes any length password safely for bcrypt.
    """
    # Pre-hash with SHA-256 to reduce password to fixed length
    sha256_pw = hashlib.sha256(password.encode()).digest()
    return pwd_context.hash(sha256_pw)

								 
				 
def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies password against hash, supports any length password.
    """
    sha256_pw = hashlib.sha256(password.encode()).digest()
    return pwd_context.verify(sha256_pw, hashed)

# -----------------------
# JWT token creation
# -----------------------
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")  # replace with env var in prod
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60  # 1 hour
																											

def create_token(data: dict, expires_delta: int = JWT_EXPIRE_MINUTES) -> str:
    """
    Create JWT token with optional expiration.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
						 
						
	  
    return token
