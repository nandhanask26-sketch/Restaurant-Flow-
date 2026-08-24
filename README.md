# 🍽️ RestaurantFlow — Smart Cafeteria & Restaurant Management System

A full-stack, real-time restaurant & cafeteria management platform designed with concurrency-locked inventory, live token priority queues, instant QR code verification, role-based dashboards, and mobile PWA support.

---

## 🚀 Quick Setup on Any New Device

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher) or Cloud PostgreSQL (e.g. [Neon.tech](https://neon.tech), [Supabase](https://supabase.com))

---

### 2. Clone the Repository
```bash
git clone https://github.com/nandhanask26-sketch/Restaurant-Flow-.git
cd Restaurant-Flow-
```

---

### 3. Install Dependencies
Install dependencies for both backend and frontend:
```bash
# Install backend dependencies
npm --prefix restaurantflow/backend install

# Install frontend dependencies
npm --prefix restaurantflow/frontend install
```

---

### 4. Database Setup & Migrations
1. Ensure your PostgreSQL server is running.
2. In `restaurantflow/backend`, copy `.env.example` to `.env`:
   ```bash
   cp restaurantflow/backend/.env.example restaurantflow/backend/.env
   ```
   *(Update `DATABASE_URL` if your Postgres credentials differ, e.g. `postgresql://postgres:password@localhost:5432/restaurantflow`)*

3. Run database migrations and seed pre-configured food items & categories:
   ```bash
   npm --prefix restaurantflow/backend run migrate
   npm --prefix restaurantflow/backend run seed
   ```

---

### 5. Start the Application

Open two terminal windows:

#### **Terminal 1: Start Backend API (Port 5000)**
```bash
npm --prefix restaurantflow/backend run dev
```

#### **Terminal 2: Start Frontend App (Port 5173)**
```bash
npm --prefix restaurantflow/frontend run dev
```

Open your browser at:
👉 **`http://localhost:5173`**

---

## 🔑 Demo Login Accounts

| Role | Email / Login | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Manager** | `manager@restaurantflow.com` | `Manager@123` | Open/close restaurant, live inventory editing, delete orders, kitchen queue |
| **Customer** | `customer@restaurantflow.com` | `Customer@123` | Digital ordering, customized meals, live token & QR tracking |

---

## 📱 Mobile App (PWA) Access on Any Phone
1. Connect your phone to the same Wi-Fi network as the host computer.
2. Open your computer's IP in your mobile browser (e.g. `http://<your-computer-ip>:5173`).
3. Tap **"Add to Home Screen"** on Safari (iOS) or **"Install App"** on Chrome (Android) to install the native app experience.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, HTML5-QRCode
- **Backend**: Node.js, Express, Socket.IO (Real-time engine), PostgreSQL (`pg` pool with SSL support), JWT, Zod validation
- **Database**: Pure PostgreSQL with 12 structured migrations and audit logging
