from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from typing import List, Optional
from datetime import datetime
from database import db
from auth_utils import get_current_user
from websocket_manager import manager

router = APIRouter()

def serialize(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if "table_id" in doc:
        doc["table_id"] = str(doc["table_id"])
    return doc

class OrderItem(BaseModel):
    name: str
    price: float
    quantity: int
    is_manual: bool = False
    menu_item_id: Optional[str] = None

class AddItemsRequest(BaseModel):
    items: List[OrderItem]

@router.get("/")
async def get_all_orders(status: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    orders = await db.db.orders.find(query).sort("created_at", -1).to_list(None)
    result = []
    for o in orders:
        o = serialize(o)
        table = await db.db.tables.find_one({"_id": ObjectId(o["table_id"])}) if o.get("table_id") else None
        o["table_name"] = table["name"] if table else "Unknown"
        o["table_number"] = table["number"] if table else 0
        result.append(o)
    return result

@router.get("/table/{table_id}")
async def get_table_order(table_id: str, user=Depends(get_current_user)):
    order = await db.db.orders.find_one({"table_id": ObjectId(table_id), "status": "running"})
    if not order:
        return None
    return serialize(order)

@router.post("/table/{table_id}/start")
async def start_order(table_id: str, user=Depends(get_current_user)):
    existing = await db.db.orders.find_one({"table_id": ObjectId(table_id), "status": "running"})
    if existing:
        return serialize(existing)
    result = await db.db.orders.insert_one({
        "table_id": ObjectId(table_id),
        "items": [],
        "status": "running",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "staff_name": user.get("name", ""),
    })
    await db.db.tables.update_one({"_id": ObjectId(table_id)}, {"$set": {"status": "running"}})
    order = await db.db.orders.find_one({"_id": result.inserted_id})
    serialized = serialize(order)
    await manager.broadcast({"type": "order_started", "order": serialized, "table_id": table_id})
    return serialized

@router.post("/table/{table_id}/items")
async def add_items(table_id: str, req: AddItemsRequest, user=Depends(get_current_user)):
    order = await db.db.orders.find_one({"table_id": ObjectId(table_id), "status": "running"})
    if not order:
        raise HTTPException(404, "No running order for this table")
    
    now = datetime.utcnow().isoformat()
    new_items = [
        {**item.dict(), "added_at": now, "is_new": True, "staff_name": user.get("name", "")}
        for item in req.items
    ]
    
    await db.db.orders.update_one(
        {"_id": order["_id"]},
        {"$push": {"items": {"$each": new_items}}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    updated = await db.db.orders.find_one({"_id": order["_id"]})
    serialized = serialize(updated)
    table = await db.db.tables.find_one({"_id": ObjectId(table_id)})
    serialized["table_name"] = table["name"] if table else ""
    serialized["table_number"] = table["number"] if table else 0
    
    await manager.broadcast({
        "type": "items_added",
        "order": serialized,
        "table_id": table_id,
        "new_items": [i.dict() for i in req.items]
    })
    return serialized

@router.post("/table/{table_id}/acknowledge")
async def acknowledge_items(table_id: str, user=Depends(get_current_user)):
    order = await db.db.orders.find_one({"table_id": ObjectId(table_id), "status": "running"})
    if not order:
        raise HTTPException(404, "No running order")
    items = order.get("items", [])
    for item in items:
        item["is_new"] = False
    await db.db.orders.update_one({"_id": order["_id"]}, {"$set": {"items": items}})
    return {"message": "Acknowledged"}

@router.post("/table/{table_id}/close")
async def close_order(table_id: str, user=Depends(get_current_user)):
    order = await db.db.orders.find_one({"table_id": ObjectId(table_id), "status": "running"})
    if not order:
        raise HTTPException(404, "No running order")
    
    settings = await db.db.settings.find_one({"key": "global"})
    tax_enabled = settings.get("tax_enabled", False) if settings else False
    tax_rate = settings.get("tax_rate", 10.0) if settings else 10.0
    tax_name = settings.get("tax_name", "GST") if settings else "GST"
    
    subtotal = sum(i["price"] * i["quantity"] for i in order.get("items", []))
    tax_amount = (subtotal * tax_rate / 100) if tax_enabled else 0
    total = subtotal + tax_amount
    
    await db.db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {
            "status": "closed",
            "closed_at": datetime.utcnow(),
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "tax_rate": tax_rate if tax_enabled else 0,
            "tax_name": tax_name,
            "total": total,
            "closed_by": user.get("name", "")
        }}
    )
    await db.db.tables.update_one({"_id": ObjectId(table_id)}, {"$set": {"status": "available"}})
    
    updated = await db.db.orders.find_one({"_id": order["_id"]})
    serialized = serialize(updated)
    await manager.broadcast({"type": "order_closed", "order": serialized, "table_id": table_id})
    return serialized

@router.delete("/table/{table_id}/item/{item_index}")
async def remove_item(table_id: str, item_index: int, user=Depends(get_current_user)):
    order = await db.db.orders.find_one({"table_id": ObjectId(table_id), "status": "running"})
    if not order:
        raise HTTPException(404, "No running order")
    items = order.get("items", [])
    if item_index < 0 or item_index >= len(items):
        raise HTTPException(400, "Invalid item index")
    items.pop(item_index)
    await db.db.orders.update_one({"_id": order["_id"]}, {"$set": {"items": items}})
    updated = await db.db.orders.find_one({"_id": order["_id"]})
    serialized = serialize(updated)
    await manager.broadcast({"type": "item_removed", "order": serialized, "table_id": table_id})
    return serialized
