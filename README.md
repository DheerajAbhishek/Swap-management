# SWAP Management System

> **Supply & Wastage Administration Platform** - Internal Supply Chain Management System

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/DheerajAbhishek/Swap-management)

---

## 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Entry & Exit Flow](#2-entry--exit-flow)
3. [Backend Systems](#3-backend-systems)
4. [API Reference](#4-api-reference)
5. [Test Data & Credentials](#5-test-data--credentials)
6. [Setup & Deployment](#6-setup--deployment)

---

## 1. System Overview

### Purpose
SWAP Management System is a role-based internal supply chain application that enables:
- **Franchises** to raise Purchase Orders (PO) to the Kitchen
- **Kitchen** to process and dispatch orders
- **Admin** to manage all aspects of the supply chain
- **Auditors** to conduct quality audits of franchises

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 + Vite |
| **Backend** | AWS Lambda (Node.js 18) |
| **Database** | AWS DynamoDB |
| **Authentication** | JWT Token-based |
| **API Gateway** | AWS HTTP API |
| **Region** | ap-south-1 (Mumbai) |

---

## 2. Entry & Exit Flow

### 2.1 Entry Point
- **Login Page** (`/login`) - User authentication via email/password
- JWT token stored in `localStorage` (`supply_token`, `supply_user`)

### 2.2 Role-Based Routing

```
┌─────────────────────────────────────────────────────────────────────┐
│                           LOGIN                                      │
│                        POST /auth/login                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Role Detection      │
                    └───────────┬───────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┬─────────────┐
        ▼           ▼           ▼           ▼           ▼             ▼
    ┌───────┐  ┌─────────┐  ┌──────────┐  ┌───────┐  ┌──────────┐  ┌──────────┐
    │ ADMIN │  │ KITCHEN │  │FRANCHISE │  │AUDITOR│  │FRANCHISE │  │ KITCHEN  │
    │/admin │  │/kitchen │  │/franchise│  │/auditor│ │  _STAFF  │  │  _STAFF  │
    └───────┘  └─────────┘  └──────────┘  └───────┘  └──────────┘  └──────────┘
```

### 2.3 Exit Points (Dashboards by Role)

| Role | Dashboard URL | Key Features |
|------|--------------|--------------|
| **ADMIN** | `/admin` | Full system access, manage all entities |
| **KITCHEN** | `/kitchen` | Process orders, view discrepancies |
| **FRANCHISE** | `/franchise` | Create orders, daily entries, complaints |
| **AUDITOR** | `/auditor` | Conduct audits, view history |
| **FRANCHISE_STAFF** | `/franchise-staff` | Limited franchise operations |
| **KITCHEN_STAFF** | `/kitchen-staff` | Limited kitchen operations |

### 2.4 Order Lifecycle Flow

```
┌──────────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐
│  PLACED  │────▶│ ACCEPTED │────▶│ DISPATCHED │────▶│ RECEIVED │
└──────────┘     └──────────┘     └────────────┘     └──────────┘
     │                │                  │                 │
 Franchise         Kitchen           Kitchen          Franchise
  creates          accepts           dispatches        confirms
```

---

## 3. Backend Systems

### 3.1 AWS Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  API Gateway │───▶│    Lambda    │───▶│    DynamoDB      │  │
│  │  (HTTP API)  │    │  Functions   │    │    Tables        │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 DynamoDB Tables

| Table Name | Primary Key | GSI | Purpose |
|------------|-------------|-----|---------|
| `supply_users` | id | email-index | User authentication & profiles |
| `supply_items` | id | - | Inventory items catalog |
| `supply_orders` | id | franchise-index, status-index | Purchase orders |
| `supply_order_items` | id | order-index | Order line items |
| `supply_discrepancies` | id | order-index | Quantity/quality mismatches |
| `supply_complaints` | id | - | Franchise complaints |
| `supply_daily_reports` | id | - | Daily franchise reports |
| `supply_franchises` | id | - | Franchise management |
| `supply_vendors` | id | - | Kitchen/vendor management |
| `supply_staff` | id | - | Staff management |
| `supply_attendance` | id | - | Staff attendance tracking |
| `supply_audits` | id | - | Quality audits |
| `supply_notifications` | id | user-index | Real-time notifications |

### 3.3 Lambda Functions

| Function | File | Description |
|----------|------|-------------|
| `supply-auth` | `backend/lambdas/auth/index.js` | Login authentication |
| `supply-items` | `backend/lambdas/items/index.js` | Items CRUD |
| `supply-orders` | `backend/lambdas/orders/index.js` | Order management |
| `supply-discrepancies` | `backend/lambdas/discrepancies/index.js` | Discrepancy reporting |
| `supply-complaints` | `backend/lambdas/supply-complaints/index.js` | Complaint management |
| `supply-daily-reports` | `backend/lambdas/supply-daily-reports/index.js` | Daily reports |
| `supply-franchises` | `backend/lambdas/supply-franchises/index.js` | Franchise CRUD |
| `supply-vendors` | `backend/lambdas/supply-vendors/index.js` | Vendor/kitchen CRUD |
| `supply-staff` | `backend/lambdas/supply-staff/index.js` | Staff management |
| `supply-attendance` | `backend/lambdas/supply-attendance/index.js` | Attendance tracking |
| `supply-audits` | `backend/lambdas/supply-audits/index.js` | Audit management |
| `supply-notifications` | `backend/lambdas/supply-notifications/index.js` | Notifications |

---

## 4. API Reference

### ✅ Yes, All APIs are RESTful!

Base URL: `https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com`

### 4.1 Authentication

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/login` | `POST` | User login | No |
| `/auth/me` | `GET` | Get current user | Yes |

**Request Example:**
```json
POST /auth/login
{
  "email": "admin@swap.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-admin-001",
    "email": "admin@swap.com",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

### 4.2 Items API

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/items` | `GET` | List all items | All roles |
| `/items` | `POST` | Create item | Admin |
| `/items/{id}` | `PUT` | Update item | Admin |
| `/items/{id}` | `DELETE` | Delete item | Admin |

### 4.3 Orders API

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/orders` | `GET` | List orders (role-filtered) | All |
| `/orders` | `POST` | Create order | Franchise |
| `/orders/{id}` | `GET` | Get single order | All |
| `/orders/{id}/accept` | `PUT` | Accept order | Kitchen |
| `/orders/{id}/dispatch` | `PUT` | Dispatch order | Kitchen |
| `/orders/{id}/receive` | `PUT` | Confirm receipt | Franchise |
| `/orders/received-items` | `GET` | Received items report | Admin/Franchise |

**Create Order Example:**
```json
POST /orders
{
  "items": [
    { "item_id": "item-001", "name": "Paneer", "qty": 5, "uom": "kg" },
    { "item_id": "item-002", "name": "Milk", "qty": 10, "uom": "liter" }
  ],
  "notes": "Urgent delivery required"
}
```

### 4.4 Discrepancies API

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/discrepancies` | `GET` | List discrepancies | All |
| `/discrepancies` | `POST` | Report discrepancy | Franchise |
| `/discrepancies/{id}/resolve` | `PUT` | Resolve discrepancy | Admin |

### 4.5 Complaints API

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/complaints` | `GET` | List complaints | All (filtered) |
| `/complaints` | `POST` | Create complaint | Franchise/Kitchen |
| `/complaints/{id}` | `GET` | Get single complaint | All |
| `/complaints/{id}` | `PUT` | Update complaint | Admin/Kitchen |
| `/complaints/{id}` | `DELETE` | Delete complaint | Admin |

### 4.6 Other APIs

| Resource | Endpoints | Methods |
|----------|-----------|---------|
| Franchises | `/franchises`, `/franchises/{id}` | GET, POST, PUT, DELETE |
| Vendors | `/vendors`, `/vendors/{id}` | GET, POST, PUT, DELETE |
| Staff | `/staff`, `/staff/{id}` | GET, POST, PUT, DELETE |
| Attendance | `/attendance` | GET, POST |
| Daily Reports | `/daily-reports` | GET, POST |
| Audits | `/audits`, `/audits/{id}` | GET, POST, PUT |
| Notifications | `/notifications` | GET, PUT |

### 4.7 Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `startDate` | ISO date | Start of date range |
| `endDate` | ISO date | End of date range |
| `franchiseId` | string | Filter by franchise |
| `vendorId` | string | Filter by vendor |

### 4.8 Authentication Header

All authenticated requests require:
```
Authorization: Bearer <token>
```

---

## 5. Test Data & Credentials

### 5.1 Test Users

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@swap.com | admin123 |
| **Kitchen** | kitchen@swap.com | kitchen123 |
| **Franchise 1** | franchise1@swap.com | franchise123 |
| **Franchise 2** | franchise2@swap.com | franchise123 |
| **Auditor** | auditor@example.com | test123 |

### 5.2 Sample Items (100+ pre-seeded)

**Categories:**
- **Dairy:** Paneer, Milk, Curd, Butter, Cheese, Ghee, Tofu
- **Vegetables:** Tomato, Onion, Potato, Capsicum, Cabbage, Carrot, etc.
- **Fruits:** Banana, Papaya, Watermelon, Pineapple, Mango, Apple, etc.
- **Dry Store:** Rice, Flour, Pulses, Spices, Sauces, Oils, etc.
- **Packaging:** Containers, Cutlery, Bags, Tapes, etc.
- **Housekeeping:** Cleaners, Tools, Waste Disposal, etc.

### 5.3 Units of Measurement
`kg`, `liter`, `pcs`, `gm`, `ml`, `dozen`, `box`, `packet`

---

## 6. Setup & Deployment

### 6.1 Prerequisites
- Node.js 18.x or higher
- AWS CLI configured
- PowerShell (Windows)

### 6.2 Frontend Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### 6.3 Environment Variables

Create `.env` file:
```env
VITE_API_URL=https://your-api-gateway-url.execute-api.ap-south-1.amazonaws.com
```

### 6.4 Backend Deployment (Local PS1 scripts)

```powershell
cd backend

# Option 1: Deploy everything
.\deploy-all.ps1

# Option 2: Step by step
.\setup-aws.ps1          # Create DynamoDB tables & IAM
.\deploy-lambdas.ps1     # Deploy Lambda functions
.\setup-api-gateway.ps1  # Setup API Gateway
.\seed-data.ps1          # Seed test data
```

---

## 📁 Project Structure

```
SWAP-management/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Role-based page components
│   │   ├── admin/
│   │   ├── kitchen/
│   │   ├── franchise/
│   │   ├── auditor/
│   │   ├── franchise-staff/
│   │   └── kitchen-staff/
│   ├── services/         # API service modules
│   ├── context/          # React context (Auth)
│   ├── utils/            # Utility functions
│   └── styles/           # Global CSS
├── backend/
│   ├── lambdas/          # Lambda function code
│   └── *.ps1             # Deployment scripts (local only)
├── package.json
└── vite.config.js
```

---

## 🔗 Links

- **GitHub Repository:** https://github.com/DheerajAbhishek/Swap-management
- **API Endpoint:** https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com

---

## 📄 License

Internal Use Only - SWAP Management System

---

*Last Updated: February 7, 2026*
