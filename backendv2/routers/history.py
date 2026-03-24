from fastapi import APIRouter, Depends
from typing import Optional
from bson import ObjectId
from database import db
from auth_utils import get_current_user

router = APIRouter()

def serialize(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if "table_id" in doc:
        doc["table_id"] = str(doc["table_id"])
    return doc

@router.get("/")
async def get_history(search: Optional[str] = None, user=Depends(get_current_user)):
    query = {"status": "closed"}
    orders = await db.db.orders.find(query).sort("closed_at", -1).to_list(200)
    result = []
    for o in orders:
        o = serialize(o)
        table = await db.db.tables.find_one({"_id": ObjectId(o["table_id"])}) if o.get("table_id") else None
        o["table_name"] = table["name"] if table else "Unknown"
        o["table_number"] = table["number"] if table else 0
        if search:
            s = search.lower()
            if s not in o["table_name"].lower() and s not in o["id"].lower():
                continue
        result.append(o)
    return result
