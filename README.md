# 🍽️ TableOrder — Restaurant Order Management System

A full-stack real-time restaurant order management system built with **React**, **FastAPI**, and **MongoDB Atlas**.

---

## Architecture

```
┌─────────────────────┐    WebSocket + REST     ┌──────────────────────┐
│   React Frontend    │◄────────────────────────►│  FastAPI Backend     │
│                     │                          │                      │
│  /login             │                          │  /api/auth           │
│  /staff    (mobile) │                          │  /api/tables         │
│  /reception (desk)  │                          │  /api/menu           │
│  /admin             │                          │  /api/orders         │
│  /history           │                          │  /api/admin          │
└─────────────────────┘                          │  /api/history        │
                                                 │  /ws (WebSocket)     │
                                                 └──────────┬───────────┘
                                                            │
                                                 ┌──────────▼───────────┐
                                                 │   MongoDB Atlas      │
                                                 │                      │
                                                 │  users               │
                                                 │  tables              │
                                                 │  menu_items          │
                                                 │  orders              │
                                                 │  settings            │
                                                 └──────────────────────┘
```

---

## Quick Start

### 1. MongoDB Atlas Setup
1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user with read/write permissions
3. Whitelist your IP (or `0.0.0.0/0` for development)
4. Copy your connection string

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set:
#   MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/restaurant_db
#   SECRET_KEY=your-secret-key-here
```

Set environment variables and start:
```bash
export MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/restaurant_db"
export SECRET_KEY="your-secret-key"

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: **http://localhost:8000/docs**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
#   REACT_APP_API_URL=http://localhost:8000

# Start development server
npm start
```

App runs at: **http://localhost:3000**

---

## Docker Deployment

```bash
# Set your MongoDB URL
export MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/restaurant_db"
export SECRET_KEY="your-secret-key"

# Build and run
docker-compose up --build
```

Frontend → http://localhost:3000  
Backend API → http://localhost:8000

---

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin (all access) |

**First login as admin → go to /admin → create staff & reception accounts.**

---

## User Roles & Access

| Role | Access |
|------|--------|
| **admin** | Admin panel, Reception Dashboard, History |
| **reception** | Reception Dashboard, History |
| **staff** | Staff (mobile) view, History |

---

## Features

### 📱 Staff Mobile View (`/staff`)
- View all tables with color-coded status
- Tap table → view current order
- Search menu by typing (e.g. "butt" → Butter Chicken)
- Add items with quantity selector
- Manual item entry for unlisted items
- One-tap "Send to Kitchen" with cart summary

### 🖥️ Reception Dashboard (`/reception`)
- Dark-themed dashboard for desktop
- Live stats: available/running tables, new orders
- Real-time WebSocket updates — new items glow red
- Acknowledge new orders per table
- Print kitchen ticket (opens print dialog)
- Generate final bill with tax breakdown
- One-click table close

### ⚙️ Admin Panel (`/admin`)
- **Tables**: Add/edit/delete tables with number, name, capacity
- **Menu**: Full CRUD for menu items with category & availability toggle
- **Users**: Create/delete staff and reception accounts
- **Settings**: Restaurant name, tax toggle, tax rate & name (GST/VAT/etc.)

### 📋 Order History (`/history`)
- All closed orders with full item breakdown
- Subtotal, tax, and total amounts
- Search by table name or order ID
- Accessible from both staff and reception views

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → returns JWT token |
| POST | `/api/auth/register` | Create new user |

### Tables
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tables/` | List all tables |
| POST | `/api/tables/` | Create table |
| PUT | `/api/tables/{id}` | Update table |
| DELETE | `/api/tables/{id}` | Delete table |

### Menu
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu/?search=` | Search available items |
| GET | `/api/menu/all` | All items (admin) |
| POST | `/api/menu/` | Create item |
| PUT | `/api/menu/{id}` | Update item |
| DELETE | `/api/menu/{id}` | Delete item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/?status=running` | Get all orders |
| GET | `/api/orders/table/{id}` | Get table's current order |
| POST | `/api/orders/table/{id}/start` | Start order on table |
| POST | `/api/orders/table/{id}/items` | Add items to order |
| POST | `/api/orders/table/{id}/acknowledge` | Acknowledge new items |
| POST | `/api/orders/table/{id}/close` | Close order & generate bill |
| DELETE | `/api/orders/table/{id}/item/{idx}` | Remove item from order |

### WebSocket Events
Connect to `ws://localhost:8000/ws`

| Event Type | Triggered When |
|------------|---------------|
| `order_started` | New order begins on a table |
| `items_added` | Staff adds items |
| `item_removed` | Item removed from order |
| `order_closed` | Table bill settled |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| DELETE | `/api/admin/users/{id}` | Delete user |
| GET | `/api/admin/settings` | Get settings |
| PUT | `/api/admin/settings` | Update settings |

---

## Project Structure

```
restaurant-app/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # MongoDB connection & seeding
│   ├── auth_utils.py        # JWT auth helpers
│   ├── websocket_manager.py # WebSocket broadcast manager
│   ├── requirements.txt
│   ├── Dockerfile
│   └── routers/
│       ├── auth.py
│       ├── tables.py
│       ├── menu.py
│       ├── orders.py
│       ├── admin.py
│       └── history.py
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js           # Routes & auth guards
│   │   ├── index.js
│   │   ├── index.css        # Tailwind + custom styles
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── WebSocketContext.js
│   │   ├── utils/
│   │   │   └── api.js       # Axios instance
│   │   └── pages/
│   │       ├── Login.js
│   │       ├── StaffView.js
│   │       ├── ReceptionDashboard.js
│   │       ├── AdminPanel.js
│   │       └── HistoryPage.js
│   ├── package.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Tailwind CSS, Axios |
| Real-time | Native WebSocket (auto-reconnect) |
| Backend | FastAPI, Uvicorn, Motor (async MongoDB) |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Database | MongoDB Atlas (cloud) |
| Container | Docker + docker-compose + Nginx |
| UI Icons | Lucide React |
| Notifications | react-hot-toast |

---

## Production Tips

1. **Change `SECRET_KEY`** to a long random string in production
2. **Restrict MongoDB Atlas IP whitelist** to your server IP
3. Set `REACT_APP_API_URL` to your production backend domain
4. Enable HTTPS — use a reverse proxy (Nginx/Caddy) with SSL
5. Use environment-specific `.env` files — never commit secrets

---

## Seeded Data on First Run

- **1 admin user**: `admin` / `admin123`
- **8 tables**: Table 1–8 (capacity 4)
- **10 menu items**: Butter Chicken, Paneer Tikka, Biryani, Dal Makhani, Naan, Lassi, Gulab Jamun, Tandoori Chicken, Masala Chai, Veg Biryani
- **Default settings**: Tax disabled, restaurant name "My Restaurant"
"# claude-restaurant" 
