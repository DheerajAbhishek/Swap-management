# SWAP Management System - Testing Documentation

> **Version**: 1.0  
> **Last Updated**: February 3, 2026  
> **Document Purpose**: Comprehensive testing guide for QA team

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Credentials](#2-user-roles--credentials)
3. [Login & Authentication](#3-login--authentication)
4. [Admin Module](#4-admin-module)
5. [Kitchen Module](#5-kitchen-module)
6. [Franchise Module](#6-franchise-module)
7. [Auditor Module](#7-auditor-module)
8. [Order Lifecycle](#8-order-lifecycle)
9. [Notifications System](#9-notifications-system)
10. [API Endpoints Reference](#10-api-endpoints-reference)
11. [Error Scenarios](#11-error-scenarios)
12. [Test Data Requirements](#12-test-data-requirements)

---

## 1. System Overview

### 1.1 Purpose
The SWAP (Supply & Wastage Administration Platform) Management System is a role-based internal supply chain application that enables:
- Franchises to raise Purchase Orders (PO) to the Kitchen
- Kitchen to process and dispatch orders
- Admin to manage all aspects of the supply chain
- Auditors to conduct quality audits of franchises

### 1.2 Technology Stack
| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite |
| Backend | AWS Lambda (Node.js) |
| Database | AWS DynamoDB |
| Authentication | JWT Token-based |
| Hosting | AWS API Gateway |

### 1.3 Browser Compatibility
Test on:
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (latest)
- Safari (latest)

---

## 2. User Roles & Credentials

### 2.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                        ADMIN                            │
│    (Full access to all modules and data)                │
├─────────────────────────────────────────────────────────┤
│     KITCHEN          │    AUDITOR                       │
│  (Order processing)  │  (Quality audits)                │
├──────────────────────┴──────────────────────────────────┤
│                      FRANCHISE                          │
│           (Order creation, daily entries)               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Role Permissions Matrix

| Feature | Admin | Kitchen | Franchise | Auditor |
|---------|:-----:|:-------:|:---------:|:-------:|
| View Dashboard | Yes | Yes | Yes | Yes |
| Manage Items | Yes | No | No | No |
| Manage Vendors | Yes | No | No | No |
| Manage Franchises | Yes | No | No | No |
| Manage Auditors | Yes | No | No | No |
| View All Orders | Yes | Yes | No | No |
| View Own Orders | N/A | N/A | Yes | No |
| Create Orders | No | No | Yes | No |
| Accept Orders | No | Yes | No | No |
| Dispatch Orders | No | Yes | No | No |
| Receive Orders | No | No | Yes | No |
| Report Discrepancy | No | No | Yes | No |
| Resolve Discrepancy | Yes | No | No | No |
| View Discrepancies | Yes | Yes | No | No |
| Submit Complaints | No | No | Yes | No |
| View All Complaints | Yes | Yes | No | No |
| Daily Entry | No | No | Yes | No |
| View Daily Reports | Yes | No | Yes | No |
| Conduct Audit | No | No | No | Yes |
| View All Audits | Yes | No | No | No |
| View Own Audits | No | No | No | Yes |

### 2.3 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@swap.com | admin123 |
| Kitchen | kitchen@swap.com | kitchen123 |
| Franchise | franchise1@swap.com | franchise123 |
| Auditor | auditor@example.com | test123 |

---

## 3. Login & Authentication

### 3.1 Login Page
**URL**: `/login`

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| AUTH-001 | Valid Admin Login | 1. Go to /login<br>2. Enter valid admin email<br>3. Enter valid password<br>4. Click Login | Redirect to `/admin` dashboard |
| AUTH-002 | Valid Kitchen Login | 1. Go to /login<br>2. Enter valid kitchen email<br>3. Enter valid password<br>4. Click Login | Redirect to `/kitchen` dashboard |
| AUTH-003 | Valid Franchise Login | 1. Go to /login<br>2. Enter valid franchise email<br>3. Enter valid password<br>4. Click Login | Redirect to `/franchise` dashboard |
| AUTH-004 | Valid Auditor Login | 1. Go to /login<br>2. Enter valid auditor email<br>3. Enter valid password<br>4. Click Login | Redirect to `/auditor` dashboard |
| AUTH-005 | Invalid Email | 1. Enter non-existent email<br>2. Enter any password<br>3. Click Login | Error: "Invalid credentials" |
| AUTH-006 | Invalid Password | 1. Enter valid email<br>2. Enter wrong password<br>3. Click Login | Error: "Invalid credentials" |
| AUTH-007 | Empty Fields | 1. Leave email empty<br>2. Leave password empty<br>3. Click Login | Validation error shown |
| AUTH-008 | Session Persistence | 1. Login successfully<br>2. Close browser<br>3. Open app again | User should remain logged in |
| AUTH-009 | Logout | 1. Login successfully<br>2. Click Logout button | Redirect to /login, session cleared |
| AUTH-010 | Unauthorized Access | 1. Login as Franchise<br>2. Try to access /admin | Redirect to /franchise |

### 3.2 Authentication Flow
```
User enters credentials
        │
        ▼
    POST /auth/login
        │
        ▼
   ┌────────────┐
   │  Valid?    │
   └────────────┘
     │       │
    Yes      No
     │       │
     ▼       ▼
  Return    Return
  JWT +     401
  User      Error
   │
   ▼
Store in localStorage:
- supply_token
- supply_user
   │
   ▼
Redirect based on role
```

---

## 4. Admin Module

### 4.1 Admin Dashboard
**URL**: `/admin`

#### Features to Test
- Total orders count
- Pending orders count
- Total items count
- Open discrepancies count
- Recent orders list (last 5)
- Date range filter for received items report
- Franchise filter dropdown

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| ADM-001 | Dashboard Load | 1. Login as Admin<br>2. View dashboard | All stats cards load with correct counts |
| ADM-002 | Recent Orders | View recent orders section | Shows last 5 orders with status badges |
| ADM-003 | Date Filter | 1. Select start date<br>2. Select end date<br>3. Apply | Received items filtered by date range |
| ADM-004 | Franchise Filter | Select specific franchise | Data filters to selected franchise |

---

### 4.2 Items Management
**URL**: `/admin/items`

#### Features to Test
- View all items in paginated/scrollable list
- Add new item
- Edit existing item
- Delete item
- Search/filter items
- Set standard price

#### Item Categories
```
Dairy: Paneer, Milk, Curd_Yogurt, Butter, Cheese, Tofu, Ghee
Poultry: Eggs, Chicken
Vegetables: Capsicum, Tomato, Coriander, Lettuce, Mushroom, Garlic, Ginger, 
            Onion, Potato, Broccoli, Chilli, Carrot, Beans, Cucumber, 
            Pumpkin, Beetroot, Okra, Leafy Vegs, Others
Fruits: Banana, Papaya, Watermelon, Pineapple, Pomegranate, Mango, Apple, 
        Kiwi, Melon, Guava, Lemon
Dry Store: Rice, Flour, Pulses, Millets, Oats, Spices, Seasoning, Dry Fruits, 
           Nuts_Seeds, Sauces_Dressings, Jams_Spreads, Pastes, Essentials, 
           Soya, Beverages, Bakery, Seafood, Oils, Frozen
Packaging: Containers, Cutlery, Bags, Tapes_Foils, Paper_Wrapping
Housekeeping: Cleaners, Tools, Waste_Disposal, Personal_Protection, Paper_Products
Misc: Delivery, Service, Other
```

#### Units of Measurement (UOM)
- kg, liter, pcs, gm, ml, dozen, box, packet

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| ITM-001 | View Items List | Navigate to Items page | All items displayed with name, category, price, UOM |
| ITM-002 | Add Item - Valid | 1. Click "Add Item"<br>2. Fill name: "Test Item"<br>3. Select category: "Dairy"<br>4. Select subcategory: "Milk"<br>5. Enter price: 50<br>6. Select UOM: "liter"<br>7. Save | Item added, appears in list |
| ITM-003 | Add Item - Duplicate | Try to add item with existing name | Error: Item already exists (or allow if different category) |
| ITM-004 | Add Item - Empty Name | Leave name empty, try to save | Validation error |
| ITM-005 | Add Item - Invalid Price | Enter negative price | Validation error |
| ITM-006 | Edit Item | 1. Click edit on existing item<br>2. Change price to 75<br>3. Save | Price updated in list |
| ITM-007 | Delete Item | 1. Click delete<br>2. Confirm deletion | Item removed from list |
| ITM-008 | Search Items | Type "milk" in search box | Only items containing "milk" shown |
| ITM-009 | Filter by Category | Select "Vegetables" filter | Only vegetable items shown |

---

### 4.3 Vendor Management
**URL**: `/admin/vendors`

#### Features to Test
- View all vendors (kitchens)
- Add new vendor
- Edit vendor details
- Delete vendor
- Reset vendor password

#### Vendor Fields
- Name (required)
- Email (required, unique)
- Password (required for create)
- Phone
- Address
- Status (Active/Inactive)

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| VND-001 | View Vendors | Navigate to Vendors page | All vendors listed |
| VND-002 | Add Vendor | 1. Click "Add Vendor"<br>2. Fill all fields<br>3. Save | Vendor created, appears in list |
| VND-003 | Add - Duplicate Email | Try to add vendor with existing email | Error: Email already exists |
| VND-004 | Edit Vendor | 1. Click edit<br>2. Change phone<br>3. Save | Vendor updated |
| VND-005 | Delete Vendor | 1. Click delete<br>2. Confirm | Vendor removed |
| VND-006 | Reset Password | 1. Click reset password<br>2. Enter new password<br>3. Confirm | Password updated, vendor can login with new password |

---

### 4.4 Franchise Management
**URL**: `/admin/franchises`

#### Features to Test
- View all franchises
- Add new franchise
- Edit franchise details
- Delete franchise
- Assign franchise to vendor (cluster)
- Reset franchise password

#### Franchise Fields
- Name (required)
- Email (required, unique)
- Password (required for create)
- Phone
- Address
- Vendor/Cluster (optional)
- Status (Active/Inactive)

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| FRN-001 | View Franchises | Navigate to Franchises page | All franchises listed |
| FRN-002 | Add Franchise | 1. Click "Add Franchise"<br>2. Fill all fields<br>3. Assign to vendor<br>4. Save | Franchise created |
| FRN-003 | Edit Franchise | 1. Click edit<br>2. Change address<br>3. Save | Franchise updated |
| FRN-004 | Delete Franchise | 1. Click delete<br>2. Confirm | Franchise removed |
| FRN-005 | Reset Password | Reset password for franchise | Franchise can login with new password |
| FRN-006 | Filter by Vendor | Select vendor from dropdown | Only franchises under that vendor shown |

---

### 4.5 Auditor Management
**URL**: `/admin/auditors`

#### Features to Test
- View all auditors
- Add new auditor
- Edit auditor details
- Delete auditor

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| AUD-001 | View Auditors | Navigate to Auditors page | All auditors listed |
| AUD-002 | Add Auditor | Fill details and save | Auditor created, can login |
| AUD-003 | Edit Auditor | Update details | Auditor updated |
| AUD-004 | Delete Auditor | Delete auditor | Auditor removed |

---

### 4.6 View All Orders
**URL**: `/admin/orders`

#### Features to Test
- View all orders from all franchises
- Filter by status
- Filter by date range
- Filter by franchise
- View order details
- Export functionality (if available)

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| ORD-001 | View All Orders | Navigate to Orders page | All orders displayed |
| ORD-002 | Filter by Status | Select "PLACED" | Only PLACED orders shown |
| ORD-003 | Filter by Date | Set date range | Orders within range shown |
| ORD-004 | View Order Details | Click on order row | Order details modal/page opens |

---

### 4.7 Discrepancies Management
**URL**: `/admin/discrepancies`

#### Features to Test
- View all discrepancies
- Filter resolved/unresolved
- View discrepancy details
- Resolve discrepancy with notes

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| DSC-001 | View Discrepancies | Navigate to Discrepancies | All discrepancies listed |
| DSC-002 | Filter Unresolved | Toggle to show unresolved only | Only unresolved shown |
| DSC-003 | Resolve Discrepancy | 1. Click on discrepancy<br>2. Add resolution notes<br>3. Mark resolved | Status changes to RESOLVED |
| DSC-004 | View Details | Click discrepancy | Shows order info, items, quantity mismatch |

---

### 4.8 View Complaints
**URL**: `/admin/complaints`

#### Features to Test
- View all complaints from all franchises
- Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- Update complaint status
- Add response to complaint

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| CMP-001 | View Complaints | Navigate to Complaints | All complaints listed |
| CMP-002 | Filter by Status | Select "OPEN" | Only open complaints shown |
| CMP-003 | Update Status | Change status to IN_PROGRESS | Status updated |
| CMP-004 | Add Response | Add admin response text | Response saved and visible |

---

### 4.9 Daily Reports
**URL**: `/admin/daily-reports`

#### Features to Test
- View daily reports from all franchises
- Filter by date range
- Filter by franchise
- View report details (closing, wastage, sales)

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| RPT-001 | View Reports | Navigate to Daily Reports | Reports listed |
| RPT-002 | Filter by Date | Select date range | Reports within range shown |
| RPT-003 | Filter by Franchise | Select franchise | Only that franchise's reports |
| RPT-004 | View Details | Click report | Shows closing items, wastage, sales |

---

### 4.10 View Audits
**URL**: `/admin/audits`

#### Features to Test
- View all submitted audits
- Filter by franchise
- Filter by date
- Filter by auditor
- View audit details
- Update audit status (SUBMITTED, REVIEWED, FLAGGED)
- Add admin notes

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| VAU-001 | View Audits | Navigate to View Audits | All audits listed |
| VAU-002 | Filter by Franchise | Select franchise | Audits for that franchise |
| VAU-003 | View Audit Details | Click on audit | Full audit details displayed |
| VAU-004 | Mark as Reviewed | Change status to REVIEWED | Status updated |
| VAU-005 | Flag Audit | Change status to FLAGGED | Audit highlighted |

---

## 5. Kitchen Module

### 5.1 Kitchen Dashboard
**URL**: `/kitchen`

#### Features to Test
- View pending orders count
- View today's dispatched count
- Recent orders list
- Quick actions

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| KIT-001 | Dashboard Load | Login as Kitchen | Dashboard shows stats |
| KIT-002 | Pending Count | Check pending orders | Matches PLACED + ACCEPTED orders |

---

### 5.2 Incoming Orders
**URL**: `/kitchen/orders`

#### Features to Test
- View all incoming orders
- Filter by status
- Accept orders (PLACED → ACCEPTED)
- Dispatch orders (ACCEPTED → DISPATCHED)
- View order details

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| KIO-001 | View Orders | Navigate to Incoming Orders | Orders from all franchises shown |
| KIO-002 | Accept Order | 1. Find PLACED order<br>2. Click Accept | Status changes to ACCEPTED |
| KIO-003 | Dispatch Order | 1. Find ACCEPTED order<br>2. Click Dispatch | Status changes to DISPATCHED |
| KIO-004 | Filter by Status | Select PLACED | Only PLACED orders shown |
| KIO-005 | View Details | Click on order | Order items and quantities shown |

---

### 5.3 View Discrepancies
**URL**: `/kitchen/discrepancies`

#### Features to Test
- View discrepancies raised by franchises
- View discrepancy details (can't resolve, read-only)

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| KID-001 | View Discrepancies | Navigate to page | All discrepancies visible |
| KID-002 | View Details | Click discrepancy | Shows full details |
| KID-003 | No Resolve Option | Check actions | No resolve button (admin only) |

---

### 5.4 View Complaints
**URL**: `/kitchen/complaints`

#### Features to Test
- View complaints related to kitchen/orders
- Read-only view

---

## 6. Franchise Module

### 6.1 Franchise Dashboard
**URL**: `/franchise`

#### Features to Test
- Order summary stats
- Recent orders
- Quick action buttons
- Pending daily entry reminder

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| FRD-001 | Dashboard Load | Login as Franchise | Dashboard with stats shown |
| FRD-002 | Quick Actions | Check action buttons | Create Order, Daily Entry visible |

---

### 6.2 Create Order
**URL**: `/franchise/create-order`

#### Features to Test
- Select items from catalog
- Auto-filled pricing (from admin-set prices, NOT editable)
- Set quantity
- Add multiple items
- Remove items
- Calculate total
- Submit order
- Add notes

#### Order Form Fields
- Item selection (searchable dropdown)
- Quantity (numeric, > 0)
- Unit price (auto-filled, read-only)
- Line total (calculated)
- Order notes (optional)

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| FCO-001 | Add Single Item | 1. Search item "Milk"<br>2. Select<br>3. Enter qty: 10 | Item added, total calculated |
| FCO-002 | Price Auto-fill | Add any item | Price auto-filled from master, not editable |
| FCO-003 | Add Multiple Items | Add 3 different items | All items in order, grand total correct |
| FCO-004 | Remove Item | Click remove on item | Item removed, total updated |
| FCO-005 | Zero Quantity | Enter quantity: 0 | Validation error |
| FCO-006 | Negative Quantity | Enter quantity: -5 | Validation error |
| FCO-007 | Submit Order | Fill items and submit | Order created, status PLACED |
| FCO-008 | Empty Order | Try to submit with no items | Error: Add at least one item |
| FCO-009 | Add Notes | Add order notes | Notes saved with order |
| FCO-010 | Search Item | Type partial item name | Filtered dropdown results |

---

### 6.3 Order History
**URL**: `/franchise/orders`

#### Features to Test
- View all orders placed by this franchise
- Filter by status
- Filter by date range
- View order details
- Track order status

#### Order Status Colors
| Status | Color |
|--------|-------|
| PLACED | Yellow/Amber |
| ACCEPTED | Blue |
| DISPATCHED | Indigo |
| RECEIVED | Green |
| DISCREPANCY | Red |

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| FOH-001 | View History | Navigate to Order History | All franchise orders shown |
| FOH-002 | Filter PLACED | Select PLACED status | Only PLACED orders |
| FOH-003 | Date Filter | Set date range | Orders in range shown |
| FOH-004 | Order Details | Click on order | Full order details displayed |
| FOH-005 | Status Tracking | Check recent order | Shows current status with badge |

---

### 6.4 Confirm Receipt
**URL**: `/franchise/confirm-receipt/:orderId`

#### Features to Test
- View dispatched order items
- Enter received quantity for each item
- Confirm full receipt (all quantities match)
- Report discrepancy (quantity mismatch)

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| FCR-001 | View Order | Navigate to confirm receipt | Order items with ordered qty shown |
| FCR-002 | Full Receipt | 1. Enter matching qty for all items<br>2. Confirm | Status → RECEIVED |
| FCR-003 | Partial Receipt | 1. Enter less qty for one item<br>2. Confirm | Discrepancy created, status → DISCREPANCY |
| FCR-004 | Zero Received | Enter 0 for an item | Discrepancy created for that item |
| FCR-005 | Excess Received | Enter more than ordered | Should allow (or show warning) |

---

### 6.5 Daily Entry
**URL**: `/franchise/daily-entry`

#### Features to Test
- Select date (today or past dates)
- Enter closing inventory
- Enter wastage items
- Enter daily sales
- View bill total (auto-calculated from received orders)
- Save/update daily report

#### Daily Entry Sections

**1. Closing Inventory**
- Select item from list
- Enter closing quantity
- Auto-calculate closing value

**2. Wastage**
- Select item
- Enter wastage quantity
- Enter wastage reason
- Auto-calculate wastage value

**3. Sales**
- Enter total sales amount

**4. Summary**
- Bill Total (from received orders)
- Closing Total
- Wastage Total
- Sales Amount

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| FDE-001 | Select Today | Date defaults to today | Today's date selected |
| FDE-002 | Select Past Date | Change date to yesterday | Form loads for that date |
| FDE-003 | Future Date | Try to select future date | Should be disabled/blocked |
| FDE-004 | Add Closing Item | 1. Select item<br>2. Enter qty<br>3. Add | Item added to closing list |
| FDE-005 | Closing Total | Add multiple closing items | Total calculated correctly |
| FDE-006 | Add Wastage | 1. Select item<br>2. Enter qty<br>3. Enter reason<br>4. Add | Wastage recorded |
| FDE-007 | Enter Sales | Enter sales amount: 25000 | Sales recorded |
| FDE-008 | Save Report - New | Fill all sections, save | Report created successfully |
| FDE-009 | Update Report | Edit existing report, save | Report updated |
| FDE-010 | Load Existing | Select date with existing report | Previous data loaded |
| FDE-011 | Bill Total | Check bill total field | Shows sum of received orders for date |

---

### 6.6 Complaints
**URL**: `/franchise/complaints`

#### Features to Test
- View own complaints
- Create new complaint
- Track complaint status
- View admin response

#### Complaint Categories
- QUALITY - Quality issues with items
- GENERAL - General complaints
- DELIVERY - Delivery related issues
- SERVICE - Service complaints
- OTHER - Miscellaneous

#### Priority Levels
- LOW (Gray)
- MEDIUM (Yellow)
- HIGH (Red)
- URGENT (Dark Red)

#### Complaint Status
- OPEN → IN_PROGRESS → RESOLVED → CLOSED

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| FCP-001 | View Complaints | Navigate to Complaints | Own complaints listed |
| FCP-002 | Create Complaint | 1. Click New Complaint<br>2. Select category: QUALITY<br>3. Enter subject<br>4. Enter description<br>5. Set priority: HIGH<br>6. Submit | Complaint created, status OPEN |
| FCP-003 | Required Fields | Submit without subject | Validation error |
| FCP-004 | Track Status | View complaint | Current status shown |
| FCP-005 | View Response | Check resolved complaint | Admin response visible |
| FCP-006 | Link to Vendor | Select vendor in complaint | Vendor association saved |
| FCP-007 | Link to Order | Enter order ID | Order linked to complaint |

---

## 7. Auditor Module

### 7.1 Auditor Dashboard
**URL**: `/auditor`

#### Features to Test
- Total audits conducted
- Pending audits (if applicable)
- Recent audit summary
- Quick action to conduct audit

---

### 7.2 Conduct Audit
**URL**: `/auditor/conduct-audit`

#### Features to Test
This is a comprehensive multi-section audit form with 11 sections:

#### Section 1: Basic Info
- Select franchise (dropdown)
- Audit date (auto-filled, editable)
- Audit time (auto-filled, editable)

#### Section 2: Temperature Compliance
| Field | Type | Range |
|-------|------|-------|
| Fridge Temperature | Number | Typically 1-4°C |
| Freezer Temperature | Number | Typically -18 to -22°C |
| Hot Holding Temperature | Number | > 63°C |
| Cold Display Temperature | Number | < 5°C |
| Notes | Text | Free text |

#### Section 3: Cleanliness (1-10 Scale)
- Kitchen Area
- Dining Area
- Restrooms
- Storage Area
- Exterior
- Notes

#### Section 4: Food Storage
| Checkbox | Description |
|----------|-------------|
| Proper Labeling | All items properly labeled with dates |
| FIFO Followed | First In First Out method used |
| Proper Separation | Raw and cooked items separated |
| No Expired Items | No expired items found |
| Notes | Additional observations |

#### Section 5: Hygiene Practices
| Checkbox | Description |
|----------|-------------|
| Handwashing Compliance | Staff washing hands properly |
| Gloves Usage | Gloves worn when handling food |
| Hairnets Usage | Hair properly covered |
| No Jewelry | No jewelry worn during food handling |

#### Section 6: Equipment Condition (1-10 Scale)
- Cooking Equipment
- Refrigeration
- Ventilation
- Fire Safety
- Notes

#### Section 7: Staff Compliance
| Checkbox | Description |
|----------|-------------|
| Uniforms Clean | Staff in clean uniforms |
| Food Handlers Certificate | Valid certificates on file |
| Training Records | Training documentation available |

#### Section 8: Pest Control
| Checkbox | Description |
|----------|-------------|
| No Pest Evidence | No signs of pests |
| Pest Control Records | Up-to-date pest control records |
| Proper Waste Disposal | Waste managed correctly |

#### Section 9: Safety Compliance
| Checkbox | Description |
|----------|-------------|
| Fire Extinguisher | Present and valid |
| First Aid Kit | Present and stocked |
| Emergency Exits | Clearly marked and accessible |
| Safety Signage | Required signs displayed |

#### Section 10: Images
- Upload photos from audit
- Multiple images supported

#### Section 11: Summary
- Overall Notes
- Recommendations
- Critical Issues (flagging)

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| CAU-001 | Select Franchise | Open form, select franchise | Franchise name populated |
| CAU-002 | Temperature Entry | Enter all temperature values | Values saved, score calculated |
| CAU-003 | Cleanliness Scoring | Rate all areas 1-10 | Overall score calculated |
| CAU-004 | Checkbox Sections | Check/uncheck items | Selections saved |
| CAU-005 | Add Images | Upload 3 images | Images attached to audit |
| CAU-006 | Critical Issues | Mark critical issues | Issues flagged for review |
| CAU-007 | Submit Audit | Complete all sections, submit | Audit submitted successfully |
| CAU-008 | Required Fields | Submit without franchise | Validation error |
| CAU-009 | Navigation | Navigate between sections | Data persists across sections |
| CAU-010 | Section Progress | Complete sections | Progress indicator updates |

---

### 7.3 Audit History
**URL**: `/auditor/history`

#### Features to Test
- View all audits conducted by this auditor
- Filter by date
- Filter by franchise
- View audit details
- See admin review status

#### Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| AUH-001 | View History | Navigate to Audit History | All own audits listed |
| AUH-002 | Filter by Date | Select date range | Audits in range shown |
| AUH-003 | View Details | Click on audit | Full audit details displayed |
| AUH-004 | Check Status | View audit status | Shows SUBMITTED/REVIEWED/FLAGGED |

---

## 8. Order Lifecycle

### 8.1 Complete Order Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           ORDER LIFECYCLE                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  FRANCHISE                    KITCHEN                      FRANCHISE       │
│  ─────────                    ───────                      ─────────       │
│                                                                            │
│  ┌─────────┐                                                               │
│  │ CREATE  │ ──────────────────────────────────────────────────────►       │
│  │  ORDER  │                                                               │
│  └─────────┘                                                               │
│       │                                                                    │
│       ▼                                                                    │
│  ┌─────────┐                                                               │
│  │ PLACED  │ Status saved, notification sent to Kitchen                    │
│  └─────────┘                                                               │
│       │                                                                    │
│       │                  ┌──────────┐                                      │
│       └─────────────────►│  ACCEPT  │                                      │
│                          │  ORDER   │                                      │
│                          └──────────┘                                      │
│                               │                                            │
│                               ▼                                            │
│                          ┌──────────┐                                      │
│                          │ ACCEPTED │ Notification sent to Franchise       │
│                          └──────────┘                                      │
│                               │                                            │
│                               ▼                                            │
│                          ┌──────────┐                                      │
│                          │ DISPATCH │                                      │
│                          │  ORDER   │                                      │
│                          └──────────┘                                      │
│                               │                                            │
│                               ▼                                            │
│                          ┌────────────┐                                    │
│                          │ DISPATCHED │ Notification sent to Franchise     │
│                          └────────────┘                                    │
│                               │                                            │
│       ┌───────────────────────┘                                            │
│       ▼                                                                    │
│  ┌─────────┐                                                               │
│  │ CONFIRM │                                                               │
│  │ RECEIPT │                                                               │
│  └─────────┘                                                               │
│       │                                                                    │
│       ├───────────────────────┐                                            │
│       │                       │                                            │
│       ▼                       ▼                                            │
│  ┌──────────┐           ┌─────────────┐                                    │
│  │ RECEIVED │           │ DISCREPANCY │                                    │
│  │  (Match) │           │ (Mismatch)  │                                    │
│  └──────────┘           └─────────────┘                                    │
│                               │                                            │
│                               ▼                                            │
│                     Admin resolves discrepancy                             │
│                               │                                            │
│                               ▼                                            │
│                          ┌──────────┐                                      │
│                          │ RESOLVED │                                      │
│                          └──────────┘                                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 End-to-End Test Scenario

| Step | Actor | Action | Expected Result |
|------|-------|--------|-----------------|
| 1 | Franchise | Login | Dashboard shown |
| 2 | Franchise | Create order with 3 items | Order created, status PLACED |
| 3 | Kitchen | Login | See new order notification |
| 4 | Kitchen | Accept order | Status → ACCEPTED |
| 5 | Franchise | Check order | Status shows ACCEPTED |
| 6 | Kitchen | Dispatch order | Status → DISPATCHED |
| 7 | Franchise | Confirm receipt (all match) | Status → RECEIVED |
| 8 | Admin | View in All Orders | Order visible with RECEIVED status |

### 8.3 Discrepancy Flow Test

| Step | Actor | Action | Expected Result |
|------|-------|--------|-----------------|
| 1-6 | - | Same as above until DISPATCHED | - |
| 7 | Franchise | Confirm receipt with qty mismatch | Discrepancy created |
| 8 | Admin | View discrepancy | Shows details of mismatch |
| 9 | Admin | Resolve with notes | Discrepancy marked RESOLVED |

---

## 9. Notifications System

### 9.1 Notification Types

| Event | Recipients | Message |
|-------|------------|---------|
| Order Placed | Kitchen | "New order #{orderId} from {franchise}" |
| Order Accepted | Franchise | "Your order #{orderId} has been accepted" |
| Order Dispatched | Franchise | "Your order #{orderId} has been dispatched" |
| Discrepancy Reported | Admin, Kitchen | "Discrepancy reported for order #{orderId}" |
| Discrepancy Resolved | Franchise | "Discrepancy for order #{orderId} resolved" |
| Complaint Submitted | Admin | "New complaint from {franchise}" |
| Complaint Updated | Franchise | "Your complaint has been updated" |
| Audit Submitted | Admin | "New audit submitted for {franchise}" |

### 9.2 Notification Bell Features
- Shows unread count badge
- Click to expand notification list
- Mark individual as read
- Mark all as read
- Delete notification

### 9.3 Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| NOT-001 | Receive Notification | Franchise creates order | Kitchen sees notification |
| NOT-002 | Unread Count | Check bell icon | Shows correct unread count |
| NOT-003 | Mark as Read | Click notification | Unread count decreases |
| NOT-004 | Mark All Read | Click "Mark all read" | All notifications marked read |
| NOT-005 | Delete | Delete a notification | Notification removed |

---

## 10. API Endpoints Reference

### 10.1 Authentication
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login user | All |
| GET | `/auth/me` | Get current user | All |

### 10.2 Items
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/items` | Get all items | All |
| POST | `/items` | Create item | Admin |
| PUT | `/items/:id` | Update item | Admin |
| DELETE | `/items/:id` | Delete item | Admin |

### 10.3 Orders
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/orders` | Get orders (filtered by role) | All |
| GET | `/orders/:id` | Get single order | All |
| POST | `/orders` | Create order | Franchise |
| PUT | `/orders/:id/accept` | Accept order | Kitchen |
| PUT | `/orders/:id/dispatch` | Dispatch order | Kitchen |
| PUT | `/orders/:id/receive` | Receive order | Franchise |
| GET | `/orders/received-items` | Get received items report | Admin |

### 10.4 Discrepancies
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/discrepancies` | Get all discrepancies | Admin, Kitchen |
| POST | `/discrepancies` | Report discrepancy | Franchise |
| PUT | `/discrepancies/:id/resolve` | Resolve discrepancy | Admin |

### 10.5 Complaints
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/complaints` | Get complaints | All |
| POST | `/complaints` | Create complaint | Franchise |
| PUT | `/complaints/:id` | Update complaint | Admin |
| DELETE | `/complaints/:id` | Delete complaint | Admin |

### 10.6 Daily Reports
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/daily-reports` | Get daily report | Franchise, Admin |
| GET | `/daily-reports/range` | Get reports in range | Admin |
| POST | `/daily-reports` | Save daily report | Franchise |
| PUT | `/daily-reports` | Update daily report | Franchise |

### 10.7 Vendors
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/vendors` | Get all vendors | Admin |
| POST | `/vendors` | Create vendor | Admin |
| PUT | `/vendors/:id` | Update vendor | Admin |
| DELETE | `/vendors/:id` | Delete vendor | Admin |
| PUT | `/vendors/:id/reset-password` | Reset password | Admin |

### 10.8 Franchises
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/franchises` | Get all franchises | Admin |
| POST | `/franchises` | Create franchise | Admin |
| PUT | `/franchises/:id` | Update franchise | Admin |
| DELETE | `/franchises/:id` | Delete franchise | Admin |
| PUT | `/franchises/:id/reset-password` | Reset password | Admin |

### 10.9 Audits & Auditors
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/audits` | Get all audits | Admin, Auditor |
| GET | `/audits/:id` | Get single audit | Admin, Auditor |
| POST | `/audits` | Submit audit | Auditor |
| PUT | `/audits/:id` | Update audit | Admin |
| DELETE | `/audits/:id` | Delete audit | Admin |
| GET | `/auditors` | Get all auditors | Admin |
| POST | `/auditors` | Create auditor | Admin |
| PUT | `/auditors/:id` | Update auditor | Admin |
| DELETE | `/auditors/:id` | Delete auditor | Admin |

### 10.10 Notifications
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/notifications` | Get notifications | All |
| PUT | `/notifications/:id/read` | Mark as read | All |
| PUT | `/notifications/read-all` | Mark all read | All |
| DELETE | `/notifications/:id` | Delete notification | All |

---

## 11. Error Scenarios

### 11.1 Common Error Codes

| Code | Meaning | Test Scenario |
|------|---------|---------------|
| 400 | Bad Request | Send invalid data format |
| 401 | Unauthorized | Access without token / expired token |
| 403 | Forbidden | Access resource without permission |
| 404 | Not Found | Access non-existent resource |
| 500 | Server Error | Backend failure |

### 11.2 Error Test Cases

| TC ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| ERR-001 | Expired Token | 1. Login<br>2. Wait for token expiry<br>3. Make API call | Redirect to login |
| ERR-002 | Invalid Token | Manually modify token | 401 error, redirect to login |
| ERR-003 | Access Denied | Franchise tries /admin | Redirect to /franchise |
| ERR-004 | Resource Not Found | Access /orders/invalid-id | 404 error message |
| ERR-005 | Invalid Data | Submit form with invalid data | Validation error shown |
| ERR-006 | Network Error | Disable internet, make call | Network error message |
| ERR-007 | Duplicate Entry | Create item with existing name | Error: Already exists |

---

## 12. Test Data Requirements

### 12.1 Users to Create

| Role | Count | Purpose |
|------|-------|---------|
| Admin | 1 | Full system testing |
| Kitchen | 2 | Order processing tests |
| Franchise | 3-5 | Order creation, multiple franchise tests |
| Auditor | 2 | Audit functionality tests |

### 12.2 Items to Create

| Category | Count | Purpose |
|----------|-------|---------|
| Dairy | 5-10 | Various dairy items |
| Vegetables | 10-15 | Various vegetables |
| Fruits | 5-10 | Various fruits |
| Dry Store | 10-15 | Pantry items |
| Packaging | 5 | Packaging materials |
| Housekeeping | 5 | Cleaning items |

### 12.3 Orders to Create

| Status | Count | Purpose |
|--------|-------|---------|
| PLACED | 3 | Accept flow testing |
| ACCEPTED | 3 | Dispatch flow testing |
| DISPATCHED | 3 | Receipt testing |
| RECEIVED | 5 | Historical data |
| DISCREPANCY | 2 | Discrepancy resolution testing |

### 12.4 Other Test Data

| Entity | Count | Purpose |
|--------|-------|---------|
| Vendors | 2-3 | Vendor management testing |
| Complaints | 5-10 | Various statuses |
| Daily Reports | 7-10 | Different dates |
| Audits | 3-5 | Various franchises |
| Discrepancies | 3-5 | Resolved and unresolved |

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Submit form (where applicable) |
| Escape | Close modal |
| Tab | Navigate between fields |

---

## Appendix B: Mobile Responsiveness

Test the following on mobile devices/responsive mode:
- [ ] Login page renders correctly
- [ ] Navigation menu collapses/hamburger menu
- [ ] Forms are usable on small screens
- [ ] Tables scroll horizontally
- [ ] Buttons are tap-friendly (min 44x44px)
- [ ] Text is readable without zooming

---

## Appendix C: Checklist for Smoke Testing

### Login
- [ ] Admin can login
- [ ] Kitchen can login
- [ ] Franchise can login
- [ ] Auditor can login

### Core Flows
- [ ] Create order (Franchise)
- [ ] Accept order (Kitchen)
- [ ] Dispatch order (Kitchen)
- [ ] Confirm receipt (Franchise)
- [ ] Report discrepancy (Franchise)
- [ ] Resolve discrepancy (Admin)

### Admin Features
- [ ] Add item
- [ ] Add vendor
- [ ] Add franchise
- [ ] View all orders
- [ ] View discrepancies

### Franchise Features
- [ ] Daily entry submission
- [ ] Complaint submission
- [ ] Order history view

### Auditor Features
- [ ] Conduct audit (all sections)
- [ ] View audit history

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 3, 2026 | Dev Team | Initial version |

---

**End of Document**
