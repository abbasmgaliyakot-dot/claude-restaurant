import os
import hashlib
import base64
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-restaurant-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def _prehash_password(password: str) -> str:
    """
    Pre-hash the password with SHA-256 and base64-encode it before passing
    to bcrypt. This is a standard production pattern that solves bcrypt's
    72-byte limit without silently truncating.

    SHA-256 always produces 32 bytes → base64 encodes to exactly 44 chars,
    well within bcrypt's limit regardless of input length.

    Security note: SHA-256 here is not used for storage — it only conditions
    the input for bcrypt. bcrypt still does all the real work (salting, key
    stretching, slow hashing). The combination is as strong as bcrypt alone.
    """
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("utf-8")


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 pre-hashing + bcrypt."""
    return pwd_context.hash(_prehash_password(password))


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a password against its hash.

    Handles two cases transparently:
    - New hashes: SHA-256 pre-hashed before bcrypt (current approach).
    - Legacy hashes: passwords hashed directly with bcrypt (old approach),
      identified because direct verification succeeds. This ensures existing
      users (e.g. seeded admin) can still log in without a forced reset.
    """
    # Try new approach first (pre-hashed)
    try:
        if pwd_context.verify(_prehash_password(plain), hashed):
            return True
    except Exception:
        pass

    # Fallback: try verifying the raw password (legacy hashes stored before
    # this fix was applied). Only passwords <= 72 bytes will succeed here.
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    return decode_token(credentials.credentials)


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload
