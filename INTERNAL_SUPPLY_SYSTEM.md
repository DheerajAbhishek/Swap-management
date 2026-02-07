# Internal Supply System - Project Specification

## Overview

A role-based internal supply chain system that allows Franchises to raise Purchase Orders (PO) to the Kitchen, with Admin oversight. Built on top of the existing costing module's item management system.

---

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, create/manage items, set fixed prices, view all orders & discrepancies |
| **Kitchen** | Receive orders, accept/acknowledge, dispatch, view discrepancies |
| **Franchise** | Raise POs, view status/history, confirm receipt, report discrepancies |

### Role Details

#### Admin
- Full access to everything
- Can create/manage items
- Sets fixed standard prices for each item
- Can view all orders, acknowledgements, and discrepancy reports

#### Franchise
- Can raise Purchase Orders (PO) to the Kitchen
- Selects item and quantity
- Item price is **auto-filled from admin-defined pricing** and cannot be edited
- Can view order status and order history
- Can confirm received quantity after delivery
- Can report discrepancies if received quantity differs from ordered quantity

#### Kitchen
- Receives notifications when a franchise raises an order
- Can accept or acknowledge orders
- Can mark orders as dispatched
- Can view discrepancies raised by franchises

---

## Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PLACED ──→ ACCEPTED ──→ DISPATCHED ──→ RECEIVED              │
│      │          │             │              │                  │
│      │          │             │              ▼                  │
│      │          │             │         DISCREPANCY             │
│      │          │             │        (if qty mismatch)        │
│      ▼          ▼             ▼                                 │
│  Franchise   Kitchen      Kitchen        Franchise              │
│  raises PO   accepts      marks          confirms               │
│              order        dispatched     receipt                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flow Steps

1. **Franchise** raises PO (item + quantity, price auto-filled from admin pricing)
2. **Kitchen** receives notification
3. **Kitchen** accepts order → Franchise gets acknowledgment
4. **Kitchen** marks order as dispatched
5. **Franchise** confirms received quantity
6. If quantity mismatch → **Discrepancy** raised and sent to Admin & Kitchen

---

## Database Schema

### Tables

```sql
-- Users table
users (
    id              UUID PRIMARY KEY,
    name            VARCHAR(255),
    email           VARCHAR(255) UNIQUE,
    role            ENUM('ADMIN', 'KITCHEN', 'FRANCHISE'),
    branch_id       VARCHAR(100),
    created_at      TIMESTAMP
)

-- Items table (managed by Admin)
items (
    id              UUID PRIMARY KEY,
    name            VARCHAR(255),
    category        VARCHAR(100),
    subcategory     VARCHAR(100),
    default_uom     VARCHAR(50),
    standard_price  DECIMAL(10,2),  -- Fixed price set by Admin
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
)

-- Orders table
orders (
    id              UUID PRIMARY KEY,
    order_number    VARCHAR(50) UNIQUE,
    franchise_id    UUID REFERENCES users(id),
    kitchen_id      UUID REFERENCES users(id),
    status          ENUM('PLACED', 'ACCEPTED', 'DISPATCHED', 'RECEIVED', 'DISCREPANCY'),
    total_amount    DECIMAL(12,2),
    notes           TEXT,
    created_at      TIMESTAMP,
    accepted_at     TIMESTAMP,
    dispatched_at   TIMESTAMP,
    received_at     TIMESTAMP
)

-- Order Items table
order_items (
    id              UUID PRIMARY KEY,
    order_id        UUID REFERENCES orders(id),
    item_id         UUID REFERENCES items(id),
    item_name       VARCHAR(255),
    uom             VARCHAR(50),
    ordered_qty     DECIMAL(10,3),
    unit_price      DECIMAL(10,2),  -- Price at time of order (from standard_price)
    line_total      DECIMAL(12,2),
    received_qty    DECIMAL(10,3),  -- Filled when franchise confirms receipt
    created_at      TIMESTAMP
)

-- Discrepancies table
discrepancies (
    id              UUID PRIMARY KEY,
    order_id        UUID REFERENCES orders(id),
    order_item_id   UUID REFERENCES order_items(id),
    item_name       VARCHAR(255),
    ordered_qty     DECIMAL(10,3),
    received_qty    DECIMAL(10,3),
    difference      DECIMAL(10,3),
    notes           TEXT,
    reported_by     UUID REFERENCES users(id),
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMP,
    created_at      TIMESTAMP
)
```

---

## API Endpoints

### Authentication
```
POST   /auth/login              - Login (returns JWT with role)
GET    /auth/me                 - Get current user info
```

### Items (Admin only for write, all for read)
```
GET    /items                   - List all items with prices
POST   /items                   - Create item (Admin)
PUT    /items/:id               - Update item/price (Admin)
DELETE /items/:id               - Delete item (Admin)
```

### Orders
```
POST   /orders                  - Create PO (Franchise)
GET    /orders                  - List orders (filtered by role)
GET    /orders/:id              - Get order details
PUT    /orders/:id/accept       - Accept order (Kitchen)
PUT    /orders/:id/dispatch     - Mark dispatched (Kitchen)
PUT    /orders/:id/receive      - Confirm receipt (Franchise)
```

### Discrepancies
```
POST   /discrepancies           - Report discrepancy (Franchise)
GET    /discrepancies           - List discrepancies (Admin/Kitchen)
PUT    /discrepancies/:id/resolve - Resolve discrepancy (Admin)
```

---

## Reusable Components from Existing Costing Module

### Components to Reuse

**Base Path:** `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\`

| Component | Full Path | Lines | Use Case in New System |
|-----------|-----------|-------|------------------------|
| **SearchableDropdown** | `src\components\SearchableDropdown.jsx` | 223 | Item selection in PO form |
| **StyledDropdown** | `src\components\StyledDropdown.jsx` | 192 | Branch/Kitchen selection with "Add New" |
| **ManualEntry (Full)** | `src\pages\costing\ManualEntry.jsx` | 1537 | Reference for all patterns below |
| **ClosingInventory** | `src\pages\costing\ClosingInventory.jsx` | 1316 | Secondary reference |
| **invoiceItems.json** | `src\data\invoiceItems.json` | 409 | Initial items database structure |

### Key Code Sections in ManualEntry.jsx

| Feature | Line Range | Description |
|---------|------------|-------------|
| **CATEGORIES constant** | Lines 22-30 | Category → Subcategory mapping |
| **DEFAULT_UOM_OPTIONS** | Line 15 | UOM dropdown options |
| **loadItems()** | Lines 119-145 | Load items from API + localStorage |
| **addNewItemToDB()** | Lines 161-189 | Save new item to DynamoDB |
| **deleteItemFromDB()** | Lines 306-324 | Delete item from DB |
| **updateItemInDB()** | Lines 326-352 | Update item category |
| **Items Table (Desktop)** | Lines 704-830 | Table with SearchableDropdown |
| **Items Table (Mobile)** | Lines 833-940 | Responsive card view |
| **Add New Item Modal** | Lines 1100-1280 | Modal for adding new items |
| **Manage Items Modal** | Lines 1282-1537 | Modal for edit/delete/search items |

### Full File Paths for Copy

```
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\components\SearchableDropdown.jsx
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\components\StyledDropdown.jsx
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\ManualEntry.jsx
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\ClosingInventory.jsx
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\UploadInvoice.jsx
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\CostingDashboard.jsx
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\DailyFoodCosting.jsx
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\index.jsx
c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\data\invoiceItems.json
```

### Categories Structure (from existing module)
```javascript
const CATEGORIES = {
  "Dairy": ["Paneer", "Milk", "Curd_Yogurt", "Butter", "Cheese", "Tofu", "Ghee"],
  "Poultry": ["Eggs", "Chicken"],
  "Vegetables": ["Capsicum", "Tomato", "Coriander", "Lettuce", "Mushroom", "Garlic", "Ginger", "Onion", "Potato", "Broccoli", "Chilli", "Carrot", "Beans", "Cucumber", "Pumpkin", "Beetroot", "Okra", "Leafy Vegs", "Others"],
  "Fruits": ["Banana", "Papaya", "Watermelon", "Pineapple", "Pomegranate", "Mango", "Apple", "Kiwi", "Melon", "Guava", "Lemon"],
  "Dry Store": ["Rice", "Flour", "Pulses", "Millets", "Oats", "Spices", "Seasoning", "Dry Fruits", "Nuts_Seeds", "Sauces_Dressings", "Jams_Spreads", "Pastes", "Essentials", "Soya", "Beverages", "Bakery", "Seafood", "Oils", "Frozen"],
  "Packaging": ["Containers", "Cutlery", "Bags", "Tapes_Foils", "Paper_Wrapping"],
  "Housekeeping": ["Cleaners", "Tools", "Waste_Disposal", "Personal_Protection", "Paper_Products"],
  "Misc": ["Delivery", "Service", "Other"]
};
```

### Default UOM Options
```javascript
const DEFAULT_UOM_OPTIONS = ["kg", "liter", "pcs", "gm", "ml", "dozen", "box", "packet"];
```

---

## Key Differences from Old Costing Module

| Old (Costing Module) | New (Supply System) |
|----------------------|---------------------|
| Anyone enters items | Role-based access control |
| User enters price manually | Price fixed by Admin, auto-filled |
| No order workflow | Full PO lifecycle with status |
| No acknowledgment | Kitchen accepts orders |
| No dispatch tracking | DISPATCHED status |
| No discrepancy handling | Qty mismatch reporting |
| Single user type | Three distinct roles |

---

## UI Pages Needed

### Admin Dashboard
- View all orders across franchises
- Manage items (CRUD with pricing)
- View all discrepancies
- Analytics/Reports

### Franchise Dashboard
- Create new PO
- View order history
- Track order status
- Confirm receipt
- Report discrepancies

### Kitchen Dashboard
- View incoming orders
- Accept/acknowledge orders
- Mark orders as dispatched
- View discrepancies

---

## Notifications

Notifications can be implemented via:
- **REST API polling** (simple)
- **WebSocket** (real-time)
- **n8n integration** (workflow automation)

### Notification Events
1. Order placed → Kitchen notified
2. Order accepted → Franchise notified
3. Order dispatched → Franchise notified
4. Discrepancy raised → Admin & Kitchen notified

---

## Tech Stack

### Frontend
- React (Vite)
- Existing components from costing module
- Flatpickr for date selection
- Axios for API calls

### Backend
- AWS Lambda
- API Gateway
- DynamoDB (or existing database)

### Authentication
- JWT-based auth
- Role stored in token
- API middleware for role validation

---

## Status Flow Validation

```javascript
const VALID_TRANSITIONS = {
  'PLACED': ['ACCEPTED'],
  'ACCEPTED': ['DISPATCHED'],
  'DISPATCHED': ['RECEIVED', 'DISCREPANCY'],
  'RECEIVED': [],
  'DISCREPANCY': ['RESOLVED']
};

function canTransition(currentStatus, newStatus) {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus);
}
```

---

## File Structure (Proposed)

```
src/
├── components/
│   ├── SearchableDropdown.jsx    (reuse)
│   ├── StyledDropdown.jsx        (reuse)
│   └── Supply/
│       ├── OrderTable.jsx
│       ├── OrderForm.jsx
│       ├── ItemSelector.jsx
│       ├── StatusBadge.jsx
│       └── DiscrepancyForm.jsx
├── pages/
│   ├── admin/
│   │   ├── Dashboard.jsx
│   │   ├── ManageItems.jsx
│   │   ├── AllOrders.jsx
│   │   └── Discrepancies.jsx
│   ├── kitchen/
│   │   ├── Dashboard.jsx
│   │   ├── IncomingOrders.jsx
│   │   └── ViewDiscrepancies.jsx
│   └── franchise/
│       ├── Dashboard.jsx
│       ├── CreateOrder.jsx
│       ├── OrderHistory.jsx
│       └── ConfirmReceipt.jsx
├── services/
│   ├── authService.js
│   ├── orderService.js
│   ├── itemService.js
│   └── discrepancyService.js
├── context/
│   └── AuthContext.jsx
└── utils/
    ├── constants.js
    └── roleGuard.js
```

---

## Reference Files in Existing Codebase

### Primary Reference Files

| File | Full Path | Lines | Key Features |
|------|-----------|-------|--------------|
| **ManualEntry.jsx** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\ManualEntry.jsx` | 1537 | Main reference - all patterns |
| **ClosingInventory.jsx** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\ClosingInventory.jsx` | 1316 | Fetch/save data pattern |
| **SearchableDropdown.jsx** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\components\SearchableDropdown.jsx` | 223 | Autocomplete dropdown |
| **StyledDropdown.jsx** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\components\StyledDropdown.jsx` | 192 | Select with "Add New" |
| **invoiceItems.json** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\data\invoiceItems.json` | 409 | Items database |

### Secondary Reference Files

| File | Full Path | Lines | Description |
|------|-----------|-------|-------------|
| **UploadInvoice.jsx** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\UploadInvoice.jsx` | 540 | File upload pattern |
| **CostingDashboard.jsx** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\CostingDashboard.jsx` | 691 | Dashboard with charts |
| **DailyFoodCosting.jsx** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\DailyFoodCosting.jsx` | 1615 | Date pickers, API calls |
| **index.jsx** | `c:\Users\Dheeraj\Desktop\AWS\sales-analyzer-swap\src\pages\costing\index.jsx` | 6 | Exports |

### Environment Variables Used

Located in `.env` file:
```
VITE_DASHBOARD_API     - Main API base URL
VITE_DASHBOARD_USER    - User email
VITE_UPLOAD_API        - Upload endpoint
VITE_ITEMS_API         - Items CRUD API
VITE_CLOSING_INVENTORY_API - Inventory API
```

---

## Next Steps

1. Set up new project structure
2. Create authentication system with roles
3. Build Admin item management (reuse Manage Items modal)
4. Build Franchise PO creation page
5. Build Kitchen order management
6. Implement order status transitions
7. Add discrepancy reporting
8. Set up notifications (API or n8n)
9. Testing and deployment
