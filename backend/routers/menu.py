from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from typing import Optional
from database import db
from auth_utils import get_current_user

router = APIRouter()

def serialize(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.get("/")
async def get_menu(search: Optional[str] = None, user=Depends(get_current_user)):
    query = {"available": True}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    items = await db.db.menu_items.find(query).sort("name", 1).to_list(None)
    return [serialize(i) for i in items]

@router.get("/all")
async def get_all_menu(user=Depends(get_current_user)):
    items = await db.db.menu_items.find().sort("name", 1).to_list(None)
    return [serialize(i) for i in items]

class MenuItemCreate(BaseModel):
    name: str
    price: float
    category: str
    available: bool = True

@router.post("/")
async def create_menu_item(req: MenuItemCreate, user=Depends(get_current_user)):
    result = await db.db.menu_items.insert_one(req.dict())
    item = await db.db.menu_items.find_one({"_id": result.inserted_id})
    return serialize(item)

@router.put("/{item_id}")
async def update_menu_item(item_id: str, req: dict, user=Depends(get_current_user)):
    req.pop("id", None)
    await db.db.menu_items.update_one({"_id": ObjectId(item_id)}, {"$set": req})
    item = await db.db.menu_items.find_one({"_id": ObjectId(item_id)})
    return serialize(item)

@router.delete("/{item_id}")
async def delete_menu_item(item_id: str, user=Depends(get_current_user)):
    await db.db.menu_items.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Deleted"}
