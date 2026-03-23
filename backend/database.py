from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING
import os
from datetime import datetime
from passlib.context import CryptContext

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://abbasmgaliyakot_db_user:vxjDMx1uUHYJz21b@cluster0.dx3cboz.mongodb.net/ClaudeRes?retryWrites=true&w=majority&tls=true")
DB_NAME = os.getenv("DB_NAME", "ClaudeRes")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Database:
    def __init__(self):
        self.client = None
        self.db = None

    async def connect(self):
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        await self.create_indexes()

    async def create_indexes(self):
        await self.db.users.create_index([("username", ASCENDING)], unique=True)
        await self.db.tables.create_index([("number", ASCENDING)], unique=True)
        await self.db.menu_items.create_index([("name", ASCENDING)])
        await self.db.orders.create_index([("table_id", ASCENDING), ("status", ASCENDING)])

    async def seed_defaults(self):
        await self.connect()
        # Seed admin user
        existing = await self.db.users.find_one({"username": "admin"})
        if not existing:
            await self.db.users.insert_one({
                "username": "admin",
                "password": pwd_context.hash("admin123"),
                "role": "admin",
                "name": "Admin",
                "created_at": datetime.utcnow()
            })
        # Seed default settings
        settings = await self.db.settings.find_one({"key": "global"})
        if not settings:
            await self.db.settings.insert_one({
                "key": "global",
                "tax_enabled": False,
                "tax_rate": 10.0,
                "tax_name": "GST",
                "restaurant_name": "My Restaurant"
            })
        # Seed sample tables
        count = await self.db.tables.count_documents({})
        if count == 0:
            tables = [
                {"number": i, "name": f"Table {i}", "capacity": 4, "status": "available"}
                for i in range(1, 9)
            ]
            await self.db.tables.insert_many(tables)
        # Seed sample menu
        menu_count = await self.db.menu_items.count_documents({})
        if menu_count == 0:
            items = [
                {"name": "Butter Chicken", "price": 280, "category": "Main Course", "available": True},
                {"name": "Paneer Tikka", "price": 220, "category": "Starters", "available": True},
                {"name": "Biryani", "price": 250, "category": "Main Course", "available": True},
                {"name": "Dal Makhani", "price": 180, "category": "Main Course", "available": True},
                {"name": "Naan", "price": 40, "category": "Breads", "available": True},
                {"name": "Lassi", "price": 80, "category": "Beverages", "available": True},
                {"name": "Gulab Jamun", "price": 90, "category": "Desserts", "available": True},
                {"name": "Tandoori Chicken", "price": 320, "category": "Starters", "available": True},
                {"name": "Masala Chai", "price": 40, "category": "Beverages", "available": True},
                {"name": "Veg Biryani", "price": 200, "category": "Main Course", "available": True},
            ]
            await self.db.menu_items.insert_many(items)

db = Database()
