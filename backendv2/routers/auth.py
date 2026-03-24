from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from database import db
from auth_utils import create_token, hash_password, verify_password

router = APIRouter()

PASSWORD_MAX_LENGTH = 128  # Soft cap enforced at API boundary


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    role: str = "staff"

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(v) > PASSWORD_MAX_LENGTH:
            raise ValueError(
                f"Password must not exceed {PASSWORD_MAX_LENGTH} characters."
            )
        return v


@router.post("/login")
async def login(req: LoginRequest):
    user = await db.db.users.find_one({"username": req.username})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({
        "sub": str(user["_id"]),
        "username": user["username"],
        "role": user["role"],
        "name": user.get("name", ""),
    })
    return {
        "token": token,
        "role": user["role"],
        "name": user.get("name", ""),
        "username": user["username"],
    }


@router.post("/register")
async def register(req: RegisterRequest):
    existing = await db.db.users.find_one({"username": req.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    await db.db.users.insert_one({
        "username": req.username,
        "password": hash_password(req.password),
        "name": req.name,
        "role": req.role,
    })
    return {"message": "User created"}
