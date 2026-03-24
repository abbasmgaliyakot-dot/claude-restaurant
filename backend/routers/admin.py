from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from bson import ObjectId
from database import db
from auth_utils import require_admin, hash_password

router = APIRouter()

PASSWORD_MAX_LENGTH = 128


def serialize(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("/users")
async def get_users(user=Depends(require_admin)):
    users = await db.db.users.find({}, {"password": 0}).to_list(None)
    return [serialize(u) for u in users]


class UserCreate(BaseModel):
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


@router.post("/users")
async def create_user(req: UserCreate, user=Depends(require_admin)):
    existing = await db.db.users.find_one({"username": req.username})
    if existing:
        raise HTTPException(400, "Username exists")
    await db.db.users.insert_one({
        "username": req.username,
        "password": hash_password(req.password),
        "name": req.name,
        "role": req.role,
    })
    return {"message": "User created"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_admin)):
    await db.db.users.delete_one({"_id": ObjectId(user_id)})
    return {"message": "Deleted"}


@router.get("/settings")
async def get_settings(user=Depends(require_admin)):
    settings = await db.db.settings.find_one({"key": "global"})
    if settings:
        settings["id"] = str(settings["_id"])
        del settings["_id"]
    return settings


class Settings(BaseModel):
    tax_enabled: bool = False
    tax_rate: float = 10.0
    tax_name: str = "GST"
    restaurant_name: str = "My Restaurant"


@router.put("/settings")
async def update_settings(req: Settings, user=Depends(require_admin)):
    await db.db.settings.update_one({"key": "global"}, {"$set": req.dict()})
    return {"message": "Settings updated"}
