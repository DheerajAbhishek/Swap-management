# SWAP Management System - Architecture Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Entry & Exit Flow](#entry--exit-flow)
4. [Backend Systems](#backend-systems)
5. [API Reference](#api-reference)
6. [RESTful API Design](#restful-api-design)
7. [Sample Test Data](#sample-test-data)
8. [Git Repository](#git-repository)

---

## Project Overview

SWAP Management System is an internal supply chain management application designed to manage orders between franchises and kitchens. The system handles inventory, orders, discrepancies, daily reports, audits, staff management, and attendance tracking.

**Tech Stack:**
- **Frontend:** React.js + Vite
- **Backend:** AWS Serverless (Lambda + API Gateway + DynamoDB)
- **Authentication:** JWT-based token authentication
- **Region:** ap-south-1 (Mumbai)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Admin  │  │ Kitchen │  │Franchise│  │ Auditor │            │
│  │Dashboard│  │Dashboard│  │Dashboard│  │Dashboard│            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                          │                                      │
│                    Axios HTTP Client                            │
│                    (Bearer Token Auth)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS API GATEWAY (HTTP API)                   │
│                    CORS Enabled - All Origins                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS LAMBDA FUNCTIONS                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────────┐              │
│  │supply-auth │ │supply-items│ │ supply-orders  │              │
│  └────────────┘ └────────────┘ └────────────────┘              │
│  ┌────────────────┐ ┌──────────────┐ ┌────────────────┐        │
│  │supply-discrepan│ │supply-vendors│ │supply-franchises│        │
│  └────────────────┘ └──────────────┘ └────────────────┘        │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────┐        │
│  │supply-daily-   │ │supply-complaints│ │supply-audits│        │
│  │reports         │ └────────────────┘ └──────────────┘        │
│  └────────────────┘                                             │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │
│  │supply-staff    │ │supply-attendance│ │supply-notifi- │      │
│  └────────────────┘ └────────────────┘ │cations        │      │
│                                         └────────────────┘      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AWS DYNAMODB TABLES                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐           │
│  │supply_users │ │supply_items │ │ supply_orders   │           │
│  └─────────────┘ └─────────────┘ └─────────────────┘           │
│  ┌─────────────────┐ ┌───────────────────┐                     │
│  │supply_order_items│ │supply_discrepancies│                     │
│  └─────────────────┘ └───────────────────┘                     │
│  ┌─────────────────┐ ┌───────────────────┐ ┌───────────────┐   │
│  │supply_franchises│ │supply_vendors     │ │supply_audits  │   │
│  └─────────────────┘ └───────────────────┘ └───────────────┘   │
│  ┌─────────────────┐ ┌───────────────────┐ ┌───────────────┐   │
│  │supply_staff     │ │supply_attendance  │ │supply_notifi- │   │
│  └─────────────────┘ └───────────────────┘ │cations        │   │
│                       ┌───────────────────┐└───────────────┘   │
│                       │supply_daily_reports│                    │
│                       └───────────────────┘                     │
│                       ┌───────────────────┐                     │
│                       │supply_complaints  │                     │
│                       └───────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Entry & Exit Flow

### **User Authentication Flow (Entry Point)**

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│   User       │    │   Login Page    │    │  API Gateway │    │supply-auth   │
│              │    │   /login        │    │              │    │   Lambda     │
└──────┬───────┘    └────────┬────────┘    └──────┬───────┘    └──────┬───────┘
       │                     │                    │                    │
       │  1. Access App      │                    │                    │
       │──────────────────►  │                    │                    │
       │                     │                    │                    │
       │  2. Enter Credentials                    │                    │
       │     (email/password)│                    │                    │
       │──────────────────►  │                    │                    │
       │                     │                    │                    │
       │                     │ 3. POST /auth/login│                    │
       │                     │───────────────────►│                    │
       │                     │                    │                    │
       │                     │                    │ 4. Verify User     │
       │                     │                    │───────────────────►│
       │                     │                    │                    │
       │                     │                    │ 5. Return JWT Token│
       │                     │                    │◄───────────────────│
       │                     │                    │                    │
       │                     │ 6. Token + User    │                    │
       │                     │◄───────────────────│                    │
       │                     │                    │                    │
       │  7. Store token in  │                    │                    │
       │     localStorage    │                    │                    │
       │◄──────────────────  │                    │                    │
       │                     │                    │                    │
       │  8. Redirect to     │                    │                    │
       │     Role Dashboard  │                    │                    │
       │◄──────────────────  │                    │                    │
└──────┴───────┘    └────────┴────────┘    └──────┴───────┘    └──────┴───────┘
```

### **Order Lifecycle Flow (Core Business Flow)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORDER LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │   FRANCHISE  │         │   KITCHEN    │         │   FRANCHISE  │
  │  Create Order│         │   Process    │         │   Receive    │
  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
         │                        │                        │
         ▼                        ▼                        ▼
   ┌───────────┐           ┌───────────┐           ┌───────────┐
   │  PENDING  │ ────────► │ ACCEPTED  │ ────────► │DISPATCHED │
   └───────────┘           └───────────┘           └───────────┘
         │                        │                        │
         │                        │                        │
         │                        │                        ▼
         │                        │                 ┌───────────┐
         │                        │                 │ RECEIVED  │
         │                        │                 └───────────┘
         │                        │                        │
         │                        │                        ▼
         │                        │              ┌────────────────┐
         │                        │              │ If discrepancy │
         │                        │              │    exists?     │
         │                        │              └────────┬───────┘
         │                        │                  YES  │  NO
         │                        │              ┌────────┼───────┐
         │                        │              ▼        │       │
         │                        │        ┌──────────┐   │       │
         │                        │        │DISCREPANCY│   │       │
         │                        │        │ REPORTED │   │       │
         │                        │        └─────┬────┘   │       │
         │                        │              │        │       │
         │                        │              ▼        │       │
         │                        │        ┌──────────┐   │       │
         │                        │        │ RESOLVED │◄──┘       │
         │                        │        └──────────┘           │
         │                        │                               │
         ▼                        ▼                               ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                        ORDER COMPLETE                          │
   └─────────────────────────────────────────────────────────────────┘
```

### **User Role-Based Dashboard Access**

| Role | Entry Point | Dashboard URL |
|------|-------------|---------------|
| ADMIN | `/login` | `/admin` |
| KITCHEN | `/login` | `/kitchen` |
| FRANCHISE | `/login` | `/franchise` |
| AUDITOR | `/login` | `/auditor` |
| FRANCHISE_STAFF | `/login` | `/franchise-staff` |
| KITCHEN_STAFF | `/login` | `/kitchen-staff` |

### **Session Logout (Exit Point)**

```
User Clicks Logout
       │
       ▼
┌────────────────────────┐
│ Clear localStorage:    │
│ - supply_user          │
│ - supply_token         │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Redirect to /login     │
└────────────────────────┘
```

---

## Backend Systems

### **DynamoDB Tables**

| Table Name | Primary Key | Global Secondary Indexes | Description |
|------------|-------------|-------------------------|-------------|
| `supply_users` | `id` (String) | `email-index` | User accounts & authentication |
| `supply_items` | `id` (String) | - | Inventory items catalog |
| `supply_orders` | `id` (String) | `franchise-index`, `status-index` | Order records |
| `supply_order_items` | `id` (String) | `order-index` | Individual items in orders |
| `supply_discrepancies` | `id` (String) | `order-index` | Quantity mismatch reports |
| `supply_franchises` | `id` (String) | `vendor-index` | Franchise locations |
| `supply_vendors` | `id` (String) | - | Kitchen/Vendor details |
| `supply_audits` | `id` (String) | `franchise-index`, `auditor-index` | Audit records |
| `supply_staff` | `id` (String) | `franchise-index`, `kitchen-index` | Staff members |
| `supply_attendance` | `id` (String) | `staff-index`, `date-index` | Attendance records |
| `supply_notifications` | `id` (String) | `user-index` | User notifications |
| `supply_daily_reports` | `id` (String) | `franchise-index`, `date-index` | Daily closing/wastage reports |
| `supply_complaints` | `id` (String) | `franchise-index`, `order-index` | Order complaints |

### **Lambda Functions**

| Function Name | Runtime | Description |
|---------------|---------|-------------|
| `supply-auth` | Node.js 18.x | Authentication (login, token verification) |
| `supply-items` | Node.js 18.x | Item CRUD operations |
| `supply-orders` | Node.js 18.x | Order lifecycle management |
| `supply-discrepancies` | Node.js 18.x | Discrepancy reporting & resolution |
| `supply-vendors` | Node.js 18.x | Vendor/Kitchen management |
| `supply-franchises` | Node.js 18.x | Franchise management |
| `supply-audits` | Node.js 18.x | Audit submission & tracking |
| `supply-staff` | Node.js 18.x | Staff member management |
| `supply-attendance` | Node.js 18.x | Check-in/check-out tracking |
| `supply-notifications` | Node.js 18.x | User notification system |
| `supply-daily-reports` | Node.js 18.x | Daily closing/wastage reports |
| `supply-complaints` | Node.js 18.x | Order complaint management |

---

## API Reference

### **Base URL**
```
https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com
```

### **Authentication Headers**
All authenticated endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

### **Authentication APIs**

| Method | Endpoint | Description | Request Body | Auth Required |
|--------|----------|-------------|--------------|---------------|
| `POST` | `/auth/login` | User login | `{ email, password }` | No |
| `GET` | `/auth/me` | Get current user | - | Yes |

### **Items APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/items` | List all items | - | Yes | All |
| `POST` | `/items` | Create new item | `{ name, category, subcategory, defaultUom, standard_price }` | Yes | Admin |
| `PUT` | `/items/{id}` | Update item | `{ name?, category?, standard_price? }` | Yes | Admin |
| `DELETE` | `/items/{id}` | Delete item | - | Yes | Admin |

### **Orders APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/orders` | List orders (filtered by role) | Query: `status`, `startDate`, `endDate`, `franchiseId` | Yes | All |
| `POST` | `/orders` | Create order | `{ items: [{ item_id, quantity, uom }], notes }` | Yes | Franchise |
| `GET` | `/orders/{id}` | Get order details | - | Yes | All |
| `PUT` | `/orders/{id}/accept` | Accept order | - | Yes | Kitchen |
| `PUT` | `/orders/{id}/dispatch` | Dispatch order | - | Yes | Kitchen |
| `PUT` | `/orders/{id}/receive` | Confirm receipt | `{ receivedItems: [{ orderItemId, receivedQty }] }` | Yes | Franchise |
| `GET` | `/orders/received-items` | Received items report | Query: `startDate`, `endDate`, `franchiseId` | Yes | All |

### **Discrepancies APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/discrepancies` | List discrepancies | Query: `resolved`, `order_id` | Yes | Admin/Kitchen |
| `POST` | `/discrepancies` | Report discrepancy | `{ order_id, item_id, expected_qty, received_qty, reason }` | Yes | Franchise |
| `PUT` | `/discrepancies/{id}/resolve` | Resolve discrepancy | `{ notes }` | Yes | Admin |

### **Vendors APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/vendors` | List vendors | - | Yes | Admin |
| `GET` | `/vendors/{id}` | Get vendor | - | Yes | Admin |
| `POST` | `/vendors` | Create vendor | `{ name, email, password, address, contact }` | Yes | Admin |
| `PUT` | `/vendors/{id}` | Update vendor | `{ name?, address?, contact? }` | Yes | Admin |
| `DELETE` | `/vendors/{id}` | Delete vendor | - | Yes | Admin |
| `PUT` | `/vendors/{id}/reset-password` | Reset password | `{ password }` | Yes | Admin |

### **Franchises APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/franchises` | List franchises | Query: `vendor_id` | Yes | Admin |
| `GET` | `/franchises/{id}` | Get franchise | - | Yes | Admin |
| `POST` | `/franchises` | Create franchise | `{ name, email, password, vendor_id, address, contact }` | Yes | Admin |
| `PUT` | `/franchises/{id}` | Update franchise | `{ name?, address?, contact? }` | Yes | Admin |
| `DELETE` | `/franchises/{id}` | Delete franchise | - | Yes | Admin |
| `PUT` | `/franchises/{id}/reset-password` | Reset password | `{ password }` | Yes | Admin |

### **Staff APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/staff` | List staff | Query: `type`, `parentId`, `franchise_id`, `kitchen_id`, `all` | Yes | Admin/Manager |
| `GET` | `/staff/{id}` | Get staff | - | Yes | Admin/Manager |
| `POST` | `/staff` | Create staff | `{ name, email, password, role, franchise_id/kitchen_id }` | Yes | Admin/Manager |
| `PUT` | `/staff/{id}` | Update staff | `{ name?, contact? }` | Yes | Admin/Manager |
| `DELETE` | `/staff/{id}` | Delete staff | - | Yes | Admin/Manager |
| `PUT` | `/staff/{id}/reset-password` | Reset password | `{ password }` | Yes | Admin/Manager |

### **Attendance APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/attendance` | Get attendance records | Query: `staffId`, `franchiseId`, `date`, `startDate`, `endDate`, `all` | Yes | All |
| `GET` | `/attendance/today` | Today's attendance | - | Yes | Staff |
| `GET` | `/attendance/report` | Attendance report | Query: `type`, `date`, `franchiseId` | Yes | Admin/Manager |
| `POST` | `/attendance/checkin` | Check in | `{ selfie_photo, shoes_photo }` | Yes | Staff |
| `POST` | `/attendance/checkout` | Check out | - | Yes | Staff |

### **Daily Reports APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/daily-reports` | Get daily report | Query: `date`, `franchise_id` | Yes | All |
| `GET` | `/daily-reports/range` | Get reports range | Query: `start_date`, `end_date`, `franchise_id` | Yes | Admin |
| `POST` | `/daily-reports` | Save daily report | `{ date, franchise_id, closing?, wastage?, sales? }` | Yes | Franchise |
| `PUT` | `/daily-reports` | Update report | `{ date, franchise_id, updates }` | Yes | Franchise |

### **Audits APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/audits` | List audits | Query: `franchise_id`, `auditor_id` | Yes | Admin/Auditor |
| `GET` | `/audits/{id}` | Get audit | - | Yes | Admin/Auditor |
| `POST` | `/audits` | Submit audit | `{ franchise_id, checklist, score, notes, photos }` | Yes | Auditor |
| `PUT` | `/audits/{id}` | Update audit | `{ status?, admin_notes? }` | Yes | Admin |
| `DELETE` | `/audits/{id}` | Delete audit | - | Yes | Admin |
| `GET` | `/auditors` | List auditors | - | Yes | Admin |
| `POST` | `/auditors` | Create auditor | `{ name, email, password }` | Yes | Admin |
| `PUT` | `/auditors/{id}` | Update auditor | `{ name?, contact? }` | Yes | Admin |
| `DELETE` | `/auditors/{id}` | Delete auditor | - | Yes | Admin |

### **Complaints APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/complaints` | List complaints | Query: `franchise_id`, `vendor_id`, `status` | Yes | All |
| `GET` | `/complaints/{id}` | Get complaint | - | Yes | All |
| `POST` | `/complaints` | Create complaint | `{ order_id, type, description, photos? }` | Yes | Franchise |
| `PUT` | `/complaints/{id}` | Update complaint | `{ status, response }` | Yes | Admin/Kitchen |
| `DELETE` | `/complaints/{id}` | Delete complaint | - | Yes | Admin |

### **Notifications APIs**

| Method | Endpoint | Description | Request Body | Auth Required | Role |
|--------|----------|-------------|--------------|---------------|------|
| `GET` | `/notifications` | Get notifications | Query: `limit`, `unread` | Yes | All |
| `PUT` | `/notifications/{id}/read` | Mark as read | - | Yes | All |
| `PUT` | `/notifications/read-all` | Mark all read | - | Yes | All |
| `DELETE` | `/notifications/{id}` | Delete notification | - | Yes | All |

---

## RESTful API Design

**Yes, the APIs follow RESTful principles:**

| Principle | Implementation |
|-----------|----------------|
| **Resource-based URLs** | Yes - `/orders`, `/items`, `/users` |
| **HTTP Methods** | Yes - GET (read), POST (create), PUT (update), DELETE (remove) |
| **Stateless** | Yes - Each request contains JWT token for authentication |
| **Standard HTTP Status Codes** | Yes - 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error) |
| **JSON Content Type** | Yes - All requests/responses use `application/json` |
| **CORS Support** | Yes - API Gateway configured for all origins |

### **HTTP Methods Used**

| Method | Purpose | Example |
|--------|---------|---------|
| `GET` | Retrieve resource(s) | `GET /orders` |
| `POST` | Create new resource | `POST /orders` |
| `PUT` | Update existing resource | `PUT /orders/{id}/accept` |
| `DELETE` | Remove resource | `DELETE /items/{id}` |
| `OPTIONS` | CORS preflight | Handled by API Gateway |

---

## Sample Test Data

### **Pre-seeded Test Users**

| Role | Email | Password | Branch/Assignment |
|------|-------|----------|-------------------|
| Admin | `admin@swap.com` | `admin123` | System Admin |
| Kitchen | `kitchen@swap.com` | `kitchen123` | KITCHEN-001 |
| Franchise 1 | `franchise1@swap.com` | `franchise123` | BRANCH-001 |
| Franchise 2 | `franchise2@swap.com` | `franchise123` | BRANCH-002 |

### **Pre-seeded Inventory Items (40 items)**

| Category | Sample Items |
|----------|--------------|
| **Dairy** | Paneer, Milk, Curd, Butter, Cheese, Ghee, Tofu |
| **Poultry** | Eggs, Chicken, Chicken Breast |
| **Vegetables** | Tomato, Onion, Potato, Capsicum, Coriander, Lettuce, Mushroom, Garlic, Ginger, Carrot, Broccoli, Green Chilli, Cucumber, Spinach |
| **Dry Store** | Rice Basmati, Wheat Flour, Olive Oil, Sunflower Oil, Salt, Sugar, Turmeric Powder, Red Chilli Powder, Cumin Powder, Garam Masala, Tomato Sauce, Soy Sauce, Mayonnaise |

### **How to Seed Test Data**

```powershell
cd backend
.\seed-data.ps1
```

### **Sample API Test Requests**

#### 1. Login
```bash
curl -X POST https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@swap.com", "password": "admin123"}'
```

#### 2. Get Items
```bash
curl -X GET https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/items \
  -H "Authorization: Bearer <token>"
```

#### 3. Create Order
```bash
curl -X POST https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"item_id": "item-001", "quantity": 5, "uom": "kg"},
      {"item_id": "item-002", "quantity": 10, "uom": "liter"}
    ],
    "notes": "Urgent delivery needed"
  }'
```

#### 4. Accept Order (Kitchen)
```bash
curl -X PUT https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/orders/{orderId}/accept \
  -H "Authorization: Bearer <token>"
```

---

## Git Repository

### **Repository URL**
```
https://github.com/DheerajAbhishek/Swap-management.git
```

### **Clone Repository**
```bash
git clone https://github.com/DheerajAbhishek/Swap-management.git
```

### **Project Structure**
```
SWAP management/
├── backend/                    # AWS Lambda functions & deployment scripts
│   ├── lambdas/               # Lambda function source code
│   │   ├── auth/              # Authentication
│   │   ├── items/             # Items management
│   │   ├── orders/            # Order lifecycle
│   │   ├── discrepancies/     # Discrepancy handling
│   │   ├── supply-vendors/    # Vendor management
│   │   ├── supply-franchises/ # Franchise management
│   │   ├── supply-staff/      # Staff management
│   │   ├── supply-attendance/ # Attendance tracking
│   │   ├── supply-audits/     # Audit management
│   │   ├── supply-complaints/ # Complaints handling
│   │   ├── supply-daily-reports/ # Daily reports
│   │   └── supply-notifications/ # Notifications
│   ├── deploy-all.ps1         # Full deployment script
│   ├── setup-aws.ps1          # DynamoDB & IAM setup
│   ├── setup-api-gateway.ps1  # API Gateway setup
│   └── seed-data.ps1          # Test data seeding
├── src/                       # React frontend
│   ├── components/            # Reusable UI components
│   ├── context/               # React context (Auth)
│   ├── pages/                 # Page components by role
│   │   ├── admin/             # Admin dashboards
│   │   ├── kitchen/           # Kitchen dashboards
│   │   ├── franchise/         # Franchise dashboards
│   │   ├── auditor/           # Auditor dashboards
│   │   ├── franchise-staff/   # Franchise staff pages
│   │   └── kitchen-staff/     # Kitchen staff pages
│   ├── services/              # API service layers
│   └── utils/                 # Utility functions
├── package.json               # NPM dependencies
├── vite.config.js             # Vite configuration
└── .env                       # Environment variables (API URL)
```

### **Deployment Steps**

```powershell
# 1. Clone repository
git clone https://github.com/DheerajAbhishek/Swap-management.git
cd "SWAP management"

# 2. Install frontend dependencies
npm install

# 3. Deploy AWS Backend
cd backend
.\deploy-all.ps1    # Or run individual scripts

# 4. Start frontend development server
cd ..
npm run dev
```

---

## Quick Reference

| Resource | Type | Location |
|----------|------|----------|
| Git Repo | GitHub | https://github.com/DheerajAbhishek/Swap-management.git |
| AWS Region | ap-south-1 | Mumbai |
| Frontend | React + Vite | `src/` |
| Backend | AWS Lambda | `backend/lambdas/` |
| Database | DynamoDB | AWS Console |
| API | HTTP API Gateway | AWS Console |

---

*Last Updated: February 7, 2026*
