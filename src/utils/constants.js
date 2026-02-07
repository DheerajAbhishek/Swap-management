// Utility Constants for Internal Supply System

// Categories structure for items (from existing costing module)
export const CATEGORIES = {
  "Dairy": ["Paneer", "Milk", "Curd_Yogurt", "Butter", "Cheese", "Tofu", "Ghee"],
  "Poultry": ["Eggs", "Chicken"],
  "Vegetables": ["Capsicum", "Tomato", "Coriander", "Lettuce", "Mushroom", "Garlic", "Ginger", "Onion", "Potato", "Broccoli", "Chilli", "Carrot", "Beans", "Cucumber", "Pumpkin", "Beetroot", "Okra", "Leafy Vegs", "Others"],
  "Fruits": ["Banana", "Papaya", "Watermelon", "Pineapple", "Pomegranate", "Mango", "Apple", "Kiwi", "Melon", "Guava", "Lemon"],
  "Dry Store": ["Rice", "Flour", "Pulses", "Millets", "Oats", "Spices", "Seasoning", "Dry Fruits", "Nuts_Seeds", "Sauces_Dressings", "Jams_Spreads", "Pastes", "Essentials", "Soya", "Beverages", "Bakery", "Seafood", "Oils", "Frozen"],
  "Packaging": ["Containers", "Cutlery", "Bags", "Tapes_Foils", "Paper_Wrapping"],
  "Housekeeping": ["Cleaners", "Tools", "Waste_Disposal", "Personal_Protection", "Paper_Products"],
  "Misc": ["Delivery", "Service", "Other"]
};

// Default unit of measurement options
export const DEFAULT_UOM_OPTIONS = ["kg", "liter", "pcs", "gm", "ml", "dozen", "box", "packet"];

// Order statuses
export const ORDER_STATUS = {
  PLACED: 'PLACED',
  ACCEPTED: 'ACCEPTED',
  DISPATCHED: 'DISPATCHED',
  RECEIVED: 'RECEIVED',
  DISCREPANCY: 'DISCREPANCY'
};

// Valid status transitions
export const VALID_TRANSITIONS = {
  'PLACED': ['ACCEPTED'],
  'ACCEPTED': ['DISPATCHED'],
  'DISPATCHED': ['RECEIVED', 'DISCREPANCY'],
  'RECEIVED': [],
  'DISCREPANCY': ['RESOLVED']
};

// User roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  KITCHEN: 'KITCHEN',
  FRANCHISE: 'FRANCHISE',
  AUDITOR: 'AUDITOR',
  FRANCHISE_STAFF: 'FRANCHISE_STAFF',
  KITCHEN_STAFF: 'KITCHEN_STAFF'
};

// Attendance status
export const ATTENDANCE_STATUS = {
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT'
};

// Score deduction values
export const SCORE_DEDUCTIONS = {
  LATE_CHECKIN: 5,      // After 10 AM
  MISSED_CHECKIN: 10,   // No check-in for the day
  NO_CHECKOUT: 10,      // No check-out marked
  EARLY_CHECKOUT: 5     // Less than 9 hours shift
};

// Audit status
export const AUDIT_STATUS = {
  SUBMITTED: 'SUBMITTED',
  REVIEWED: 'REVIEWED',
  FLAGGED: 'FLAGGED'
};

// Audit status colors
export const AUDIT_STATUS_COLORS = {
  SUBMITTED: { bg: '#fef3c7', color: '#92400e' },
  REVIEWED: { bg: '#d1fae5', color: '#065f46' },
  FLAGGED: { bg: '#fee2e2', color: '#991b1b' }
};

// Status colors for badges
export const STATUS_COLORS = {
  PLACED: { bg: '#fef3c7', color: '#92400e' },
  ACCEPTED: { bg: '#dbeafe', color: '#1e40af' },
  DISPATCHED: { bg: '#e0e7ff', color: '#3730a3' },
  RECEIVED: { bg: '#d1fae5', color: '#065f46' },
  DISCREPANCY: { bg: '#fee2e2', color: '#991b1b' },
  RESOLVED: { bg: '#d1fae5', color: '#065f46' }
};

// Check if status transition is valid
export function canTransition(currentStatus, newStatus) {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus);
}

// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Format date
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Format date with time
export function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Generate order number
export function generateOrderNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${dateStr}-${randomStr}`;
}
