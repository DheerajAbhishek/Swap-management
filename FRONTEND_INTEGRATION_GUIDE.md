# Frontend Integration Guide

## Staff Scoring System - Frontend Components

### Components Created

1. **StaffScoreCard** (`src/components/StaffScoreCard.jsx`)
   - Displays current month score for a staff member
   - Shows breakdown of attendance, hygiene, and discipline scores
   - Color-coded badges and progress bars
   - Auto-refreshes when staffId changes

2. **StaffScoreForm** (`src/components/StaffScoreForm.jsx`)
   - Form to create/update staff scores
   - Input validation (0-10 range)
   - Real-time score calculation
   - Loads existing scores for editing

3. **StaffLeaderboard** (`src/components/StaffLeaderboard.jsx`)
   - Shows top performers for a selected month
   - Month selector with history
   - Rank medals for top 3
   - Score breakdown for each staff member

4. **StaffScoreHistory** (`src/components/StaffScoreHistory.jsx`)
   - Shows historical scores over time
   - Visual trend indicator (improving/declining/stable)
   - Progress bars for each score component
   - Monthly timeline view

5. **StaffPerformanceDashboard** (`src/pages/admin/StaffPerformanceDashboard.jsx`)
   - Complete dashboard page with all components
   - Tabbed interface (Leaderboard, History, Overview)
   - Score update modal
   - Scoring guidelines

---

## How to Integrate into Existing Pages

### Option 1: Add Score Card to Staff Management (Simple)

Add the score display to the existing staff list:

```jsx
// In src/pages/admin/StaffManagement.jsx or franchise/StaffManagement.jsx

// 1. Import the component
import StaffScoreCard from '../../components/StaffScoreCard';

// 2. Inside the staff expanded view (around line 379), add:
{expandedStaff === member.id && (
  <div style={styles.expandedContent}>
    {/* Existing content */}
    
    {/* Add Score Card */}
    <div style={{ marginTop: 20 }}>
      <StaffScoreCard staffId={member.id} />
    </div>
  </div>
)}
```

### Option 2: Add Score Update Button (Interactive)

Add a button to update scores:

```jsx
// In staff management page

import { useState } from 'react';
import StaffScoreForm from '../../components/StaffScoreForm';

// Add state
const [showScoreModal, setShowScoreModal] = useState(false);
const [selectedStaffId, setSelectedStaffId] = useState(null);

// In the staff actions area, add button:
<button
  onClick={() => {
    setSelectedStaffId(member.id);
    setShowScoreModal(true);
  }}
  style={styles.scoreButton}
>
  📊 Update Score
</button>

// Add modal at the end of the component:
{showScoreModal && (
  <div style={styles.modal}>
    <div style={styles.modalContent}>
      <h3>Update Score for {selectedStaffId}</h3>
      <StaffScoreForm
        staffId={selectedStaffId}
        onSuccess={() => {
          setShowScoreModal(false);
          fetchData(); // Refresh staff list
        }}
        onCancel={() => setShowScoreModal(false)}
      />
    </div>
  </div>
)}
```

### Option 3: Create Dedicated Performance Page (Recommended)

The complete dashboard is already created at:
`src/pages/admin/StaffPerformanceDashboard.jsx`

**To use it:**

1. Add route in your router configuration:
```jsx
import StaffPerformanceDashboard from './pages/admin/StaffPerformanceDashboard';

// In your routes:
<Route path="/admin/staff-performance" element={<StaffPerformanceDashboard />} />
```

2. Add navigation link in your sidebar/menu:
```jsx
<a href="/admin/staff-performance">
  📊 Staff Performance
</a>
```

---

## Component Props Reference

### StaffScoreCard
```jsx
<StaffScoreCard 
  staffId="STAFF001"  // Required: Staff ID to display score for
/>
```

### StaffScoreForm
```jsx
<StaffScoreForm
  staffId="STAFF001"        // Optional: Pre-fill staff ID
  onSuccess={() => {}}      // Optional: Callback after successful update
  onCancel={() => {}}       // Optional: Callback when cancelled
/>
```

### StaffLeaderboard
```jsx
<StaffLeaderboard
  monthYear="2026-03"       // Optional: Specific month (defaults to current)
  limit={20}                // Optional: Number of staff to show (default: 10)
  showMonth={true}          // Optional: Show month selector (default: true)
/>
```

### StaffScoreHistory
```jsx
<StaffScoreHistory
  staffId="STAFF001"        // Required: Staff ID to show history for
  limit={12}                // Optional: Number of months to show (default: 6)
/>
```

---

## Example: Quick Integration into Existing Staff Page

```jsx
import { useState } from 'react';
import { staffService } from '../../services/staffService';
import StaffScoreCard from '../../components/StaffScoreCard';
import StaffScoreForm from '../../components/StaffScoreForm';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // ... existing code ...

  return (
    <div>
      {/* Staff List */}
      {staff.map(member => (
        <div key={member.id}>
          <div onClick={() => setExpandedStaff(member.id)}>
            {member.name}
          </div>

          {/* Expanded View */}
          {expandedStaff === member.id && (
            <div>
              {/* Existing staff details */}
              
              {/* Add Score Card */}
              <StaffScoreCard staffId={member.id} />
              
              {/* Add Update Button */}
              <button onClick={() => {
                setSelectedStaff(member);
                setShowScoreForm(true);
              }}>
                Update Performance Score
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Score Form Modal */}
      {showScoreForm && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.content}>
            <h3>Update Score: {selectedStaff?.name}</h3>
            <StaffScoreForm
              staffId={selectedStaff?.id}
              onSuccess={() => {
                setShowScoreForm(false);
                // Optionally refresh data
              }}
              onCancel={() => setShowScoreForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  content: {
    background: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 600
  }
};
```

---

## API Methods Available

The following methods are already added to `src/services/staffService.js`:

```javascript
// Update or create a score
await staffService.updateStaffScore({
  staff_id: 'STAFF001',
  attendance_score: 9.5,
  hygiene_score: 8.0,
  discipline_score: 9.0,
  notes: 'Excellent performance' // Optional
});

// Get current month score
const score = await staffService.getCurrentMonthScore('STAFF001');

// Get specific month score
const score = await staffService.getMonthScore('STAFF001', '2026-03');

// Get score history
const history = await staffService.getStaffScoreHistory('STAFF001', 12);

// Get leaderboard
const leaderboard = await staffService.getLeaderboard('2026-03', 20);
```

---

## Routing Configuration Example

If using React Router, add to your routes:

```jsx
import { Routes, Route } from 'react-router-dom';
import StaffPerformanceDashboard from './pages/admin/StaffPerformanceDashboard';
import StaffManagement from './pages/admin/StaffManagement';

function App() {
  return (
    <Routes>
      <Route path="/admin/staff" element={<StaffManagement />} />
      <Route path="/admin/staff-performance" element={<StaffPerformanceDashboard />} />
      {/* ... other routes */}
    </Routes>
  );
}
```

---

## Next Steps

1. **Choose Integration Method:**
   - Quick: Add StaffScoreCard to existing pages
   - Complete: Use the StaffPerformanceDashboard page
   - Custom: Mix and match components

2. **Add Navigation:**
   - Update sidebar/menu to include performance links
   - Add quick action buttons in staff management

3. **Test with Real Data:**
   - Create some test scores via the form
   - Verify leaderboard displays correctly
   - Check score history timeline

4. **Optional Enhancements:**
   - Add filters to leaderboard (by franchise, role, etc.)
   - Export leaderboard to PDF/Excel
   - Add notifications for low scores
   - Create monthly report generation
