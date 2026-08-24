# RestaurantFlow 🍽️ — Smart Restaurant Ordering & Management Platform

**RestaurantFlow** is an enterprise-grade, high-performance modular monolith restaurant management and ordering platform built with **React**, **TypeScript**, **Node.js/Express**, **Pure PostgreSQL (pg driver)**, **Socket.IO**, and **Tailwind CSS**.

---

## 🌟 Key Features

1. **Pure PostgreSQL Architecture (Zero Prisma)**:
   - Built exclusively with `pg.Pool` connection pooling and parameterized SQL queries.
   - Raw SQL migrations tracking with transactional consistency.
   - `SELECT ... FOR UPDATE` row-level locking to **guarantee zero race conditions and eliminate negative inventory**.

2. **Authoritative Daily Sequential Token Generation**:
   - Backend generates unique daily sequence tokens formatted as `RF-YYYYMMDD-001`, `RF-YYYYMMDD-002`, resetting automatically each midnight per restaurant.

3. **Contactless Single-Use QR Verification**:
   - High-resolution encrypted QR codes generated for verified paid orders.
   - Real-time manager QR camera scanner & manual token verification enforcing single-use redemption and immediate 1-click delivery.

4. **Live Smart Kitchen Queue**:
   - Urgency-prioritized dispatch queue with dynamic countdown badges: `READY`, `READY IN 5 MIN`, `READY IN 12 MIN`, and `OVERDUE`.
   - **"Can Deliver Soon"** fast-track view for orders ready or approaching target preparation time.

5. **Flexible Payment Abstraction**:
   - Multi-provider architecture with instant mock simulations for UPI and Cards.
   - Dedicated **Cash on Delivery (COD)** lifecycle with `UNPAID` status tracking and manual manager cash-collection workflows.

6. **Real-time Synchronization (Socket.IO)**:
   - Instant kitchen order broadcasting and live status timelines (`CONFIRMED` ➔ `PREPARING` ➔ `READY` ➔ `DELIVERED`).
   - Live manager restaurant status toggle (`OPEN` / `CLOSED`) that immediately updates customer storefronts without page reloads.

7. **Visual Analytics & Reporting (Recharts)**:
   - Daily Revenue Trends, Hourly Rush-Hour distribution, Top-Selling Dishes, and Payment Method distribution.

8. **Interactive OpenAPI / Swagger Documentation**:
   - Fully interactive API docs available at `http://localhost:5000/api/docs`.

---

## 🏗️ System Architecture

```text
React (Vite + TypeScript + Tailwind CSS)
    ↓
REST API (Express.js) & Real-time WebSockets (Socket.IO)
    ↓
Controllers  →  Zod Validators & Rate Limiters
    ↓
Services     →  State Machine, Token Generator, Payment Abstraction
    ↓
Repositories →  Parameterized SQL + FOR UPDATE Concurrency Locks
    ↓
PostgreSQL 17 Database (Source of Truth)  +  Redis / In-Memory Cache Fallback
```

---

## 📁 Project Structure

```text
restaurantflow/
├── backend/
│   ├── src/
│   │   ├── config/            # PostgreSQL pg.Pool, Redis, Env, Swagger OpenAPI
│   │   ├── controllers/       # Auth, Restaurant, Food, Menu, Order, Payment, QR, Analytics
│   │   ├── middleware/        # JWT Auth, Role RBAC, Zod Validate, Error Handler, Rate Limit
│   │   ├── repositories/      # Pure SQL Repositories with FOR UPDATE locks
│   │   ├── routes/            # REST API endpoints
│   │   ├── services/          # Business logic, Token service, Mock payment provider, QR
│   │   ├── types/             # Domain TypeScript interfaces
│   │   ├── utils/             # Logger, Token Generator, Error classes
│   │   ├── websocket/         # Socket.IO rooms and real-time event broadcasting
│   │   ├── app.ts             # Express application factory
│   │   └── server.ts          # Server entrypoint and graceful shutdown
│   ├── tests/                 # Jest test suites (Auth, Concurrency, Tokens, QR, State Machine)
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios client with JWT auto-refresh interceptors
│   │   ├── components/        # Navbar, Sidebar, StatusBadge, FoodCard, QRModal, QRScannerModal
│   │   ├── layouts/           # CustomerLayout, ManagerLayout
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── CustomerLogin.tsx / ManagerLogin.tsx
│   │   │   ├── RegisterCustomer.tsx / RegisterManager.tsx
│   │   │   ├── customer/      # Dashboard, Menu, Cart, Orders, Order Details, Profile
│   │   │   └── manager/       # Dashboard, Smart Queue, Orders, Menu, Inventory, QR Scanner, Analytics
│   │   ├── store/             # Zustand Auth & Cart stores
│   │   ├── types/             # Frontend models
│   │   └── index.css          # Design system, glassmorphism & semantic badges
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── database/
│   ├── migrations/            # 001_users.sql to 012_audit_logs.sql
│   ├── seeds/                 # Realistic seed data for Spice Garden
│   └── migration-runner.ts    # Transactional SQL migration engine
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚡ Quick Start Guide (Windows 11 / PowerShell / VS Code)

### 1. Prerequisites
- **Node.js** v18+ (Node.js 20+ recommended)
- **PostgreSQL** 16+ or 17 (or Docker)
- **PowerShell** / Visual Studio Code terminal

---

### 2. Environment Setup

Create `.env` inside `restaurantflow/backend/`:
```powershell
cd restaurantflow
Copy-Item .env.example backend\.env
```

Ensure your PostgreSQL credentials in `backend\.env` are correct:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/restaurantflow
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=development-access-secret-32-chars-minimum-key!
JWT_REFRESH_SECRET=development-refresh-secret-32-chars-minimum-key!
FRONTEND_URL=http://localhost:5173
PAYMENT_PROVIDER=mock
```

---

### 3. Install Dependencies & Run Database Migrations

Open a PowerShell terminal in `restaurantflow/backend`:

```powershell
cd backend
npm install

# Run pure SQL migrations (001 - 012)
npm run migrate

# Seed realistic demo data (Spice Garden, Manager, Customer, Menu items & Inventory)
npm run seed
```

---

### 4. Start the Application

#### Terminal 1 — Backend Server (Port 5000):
```powershell
cd restaurantflow/backend
npm run dev
```
*Backend runs at `http://localhost:5000`*
*Swagger API Docs at `http://localhost:5000/api/docs`*

#### Terminal 2 — Frontend App (Port 5173):
```powershell
cd restaurantflow/frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`*

---

## 🔐 Demo Login Credentials

| Role | Email | Password | Access Details |
| :--- | :--- | :--- | :--- |
| **Restaurant Manager** | `manager@example.com` | `Password123!` | Full control over Spice Garden, Menu, Inventory, QR Scanner & Smart Queue |
| **Customer** | `customer@example.com` | `Password123!` | Place orders, schedule pickup slots, view active tokens and QR passes |

*(You can also use the **1-Click Quick Demo Login buttons** on the Landing Page!)*

---

## 🧪 Automated Testing Suite

To execute unit and concurrency tests:

```powershell
cd restaurantflow/backend
npm test
```

### Verified Test Cases:
1. **Authentication & Authorization**: Registration, Duplicate Email/Phone rejection, Token verification.
2. **Inventory Concurrency & Race Conditions**: Tests `SELECT ... FOR UPDATE` ensuring 2 simultaneous orders on stock=1 yield exactly 1 success, 1 out-of-stock, and **never negative inventory**.
3. **Order State Machine**: Enforces strict transitions (`CONFIRMED` ➔ `PREPARING` ➔ `READY` ➔ `DELIVERED`) and blocks invalid jumps.
4. **Daily Sequential Token**: Validates `RF-YYYYMMDD-XXX` format and sequence continuity.
5. **QR Code Verification**: Single-use cryptographic enforcement, wrong restaurant prevention, and replay rejection.

---

## 🐳 Docker Deployment (Optional)

To start PostgreSQL, Redis, Backend, and Frontend containers simultaneously:

```powershell
cd restaurantflow
docker compose up -d --build
```

Access:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- Swagger Docs: `http://localhost:5000/api/docs`

---

## 📜 Zero Prisma Verification

This codebase contains **ZERO** Prisma dependencies, configs, or imports:
```powershell
# Verify no prisma dependencies exist
Get-ChildItem -Recurse -Filter "*prisma*"
```
All database queries utilize **`pg.Pool`** with parameterized SQL and row-level locks.
