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
async def get_tables(user=Depends(get_current_user)):
    tables = await db.db.tables.find().sort("number", 1).to_list(None)
    return [serialize(t) for t in tables]

class TableCreate(BaseModel):
    number: int
    name: str
    capacity: int = 4

@router.post("/")
async def create_table(req: TableCreate, user=Depends(get_current_user)):
    existing = await db.db.tables.find_one({"number": req.number})
    if existing:
        raise HTTPException(400, "Table number exists")
    result = await db.db.tables.insert_one({
        "number": req.number, "name": req.name,
        "capacity": req.capacity, "status": "available"
    })
    table = await db.db.tables.find_one({"_id": result.inserted_id})
    return serialize(table)

@router.put("/{table_id}")
async def update_table(table_id: str, req: dict, user=Depends(get_current_user)):
    req.pop("id", None)
    await db.db.tables.update_one({"_id": ObjectId(table_id)}, {"$set": req})
    table = await db.db.tables.find_one({"_id": ObjectId(table_id)})
    return serialize(table)

@router.delete("/{table_id}")
async def delete_table(table_id: str, user=Depends(get_current_user)):
    await db.db.tables.delete_one({"_id": ObjectId(table_id)})
    return {"message": "Deleted"}
