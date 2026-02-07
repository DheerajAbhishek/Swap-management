import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminManageItems from './pages/admin/ManageItems'
import AdminAllOrders from './pages/admin/AllOrders'
import AdminDiscrepancies from './pages/admin/Discrepancies'
import AdminVendorManagement from './pages/admin/VendorManagement'
import AdminFranchiseManagement from './pages/admin/FranchiseManagement'
import AdminDailyReports from './pages/admin/DailyReports'
import AdminViewComplaints from './pages/admin/ViewComplaints'
import AdminAuditorManagement from './pages/admin/AuditorManagement'
import AdminViewAudits from './pages/admin/ViewAudits'
import AdminStaffManagement from './pages/admin/StaffManagement'
import AdminAttendanceView from './pages/admin/AttendanceView'
import KitchenDashboard from './pages/kitchen/Dashboard'
import KitchenIncomingOrders from './pages/kitchen/IncomingOrders'
import KitchenViewDiscrepancies from './pages/kitchen/ViewDiscrepancies'
import KitchenViewComplaints from './pages/kitchen/ViewComplaints'
import KitchenStaffManagement from './pages/kitchen/StaffManagement'
import FranchiseDashboard from './pages/franchise/Dashboard'
import FranchiseCreateOrder from './pages/franchise/CreateOrder'
import FranchiseOrderHistory from './pages/franchise/OrderHistory'
import FranchiseConfirmReceipt from './pages/franchise/ConfirmReceipt'
import FranchiseDailyEntry from './pages/franchise/DailyEntry'
import FranchiseComplaints from './pages/franchise/Complaints'
import FranchiseStaffManagement from './pages/franchise/StaffManagement'
import FranchiseStaffAttendance from './pages/franchise/StaffAttendance'
import AuditorDashboard from './pages/auditor/Dashboard'
import AuditorConductAudit from './pages/auditor/ConductAudit'
import AuditorHistory from './pages/auditor/AuditHistory'
// Franchise Staff pages
import FranchiseStaffDashboard from './pages/franchise-staff/Dashboard'
import FranchiseStaffAttendancePage from './pages/franchise-staff/Attendance'
import FranchiseStaffCreateOrder from './pages/franchise-staff/CreateOrder'
import FranchiseStaffOrderHistory from './pages/franchise-staff/OrderHistory'
// Kitchen Staff pages
import KitchenStaffDashboard from './pages/kitchen-staff/Dashboard'
import KitchenStaffIncomingOrders from './pages/kitchen-staff/IncomingOrders'
import Layout from './components/Layout'

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user?.role) {
      case 'ADMIN':
        return <Navigate to="/admin" replace />
      case 'KITCHEN':
        return <Navigate to="/kitchen" replace />
      case 'FRANCHISE':
        return <Navigate to="/franchise" replace />
      case 'AUDITOR':
        return <Navigate to="/auditor" replace />
      case 'FRANCHISE_STAFF':
        return <Navigate to="/franchise-staff" replace />
      case 'KITCHEN_STAFF':
        return <Navigate to="/kitchen-staff" replace />
      default:
        return <Navigate to="/login" replace />
    }
  }

  return children
}

// Redirect based on role after login
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  switch (user?.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />
    case 'KITCHEN':
      return <Navigate to="/kitchen" replace />
    case 'FRANCHISE':
      return <Navigate to="/franchise" replace />
    case 'AUDITOR':
      return <Navigate to="/auditor" replace />
    case 'FRANCHISE_STAFF':
      return <Navigate to="/franchise-staff" replace />
    case 'KITCHEN_STAFF':
      return <Navigate to="/kitchen-staff" replace />
    default:
      return <Navigate to="/login" replace />
  }
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Role-based redirect */}
      <Route path="/" element={<RoleBasedRedirect />} />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="items" element={<AdminManageItems />} />
        <Route path="orders" element={<AdminAllOrders />} />
        <Route path="vendors" element={<AdminVendorManagement />} />
        <Route path="franchises" element={<AdminFranchiseManagement />} />
        <Route path="auditors" element={<AdminAuditorManagement />} />
        <Route path="audits" element={<AdminViewAudits />} />
        <Route path="daily-reports" element={<AdminDailyReports />} />
        <Route path="discrepancies" element={<AdminDiscrepancies />} />
        <Route path="complaints" element={<AdminViewComplaints />} />
        <Route path="staff" element={<AdminStaffManagement />} />
        <Route path="attendance" element={<AdminAttendanceView />} />
      </Route>

      {/* Kitchen Routes */}
      <Route path="/kitchen" element={
        <ProtectedRoute allowedRoles={['KITCHEN']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<KitchenDashboard />} />
        <Route path="orders" element={<KitchenIncomingOrders />} />
        <Route path="discrepancies" element={<KitchenViewDiscrepancies />} />
        <Route path="complaints" element={<KitchenViewComplaints />} />
        <Route path="staff" element={<KitchenStaffManagement />} />
      </Route>

      {/* Franchise Routes */}
      <Route path="/franchise" element={
        <ProtectedRoute allowedRoles={['FRANCHISE']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<FranchiseDashboard />} />
        <Route path="create-order" element={<FranchiseCreateOrder />} />
        <Route path="daily-entry" element={<FranchiseDailyEntry />} />
        <Route path="daily-reports" element={<AdminDailyReports />} />
        <Route path="orders" element={<FranchiseOrderHistory />} />
        <Route path="complaints" element={<FranchiseComplaints />} />
        <Route path="confirm-receipt/:orderId" element={<FranchiseConfirmReceipt />} />
        <Route path="staff" element={<FranchiseStaffManagement />} />
        <Route path="staff-attendance" element={<FranchiseStaffAttendance />} />
      </Route>

      {/* Auditor Routes */}
      <Route path="/auditor" element={
        <ProtectedRoute allowedRoles={['AUDITOR']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<AuditorDashboard />} />
        <Route path="conduct-audit" element={<AuditorConductAudit />} />
        <Route path="history" element={<AuditorHistory />} />
      </Route>

      {/* Franchise Staff Routes */}
      <Route path="/franchise-staff" element={
        <ProtectedRoute allowedRoles={['FRANCHISE_STAFF']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<FranchiseStaffDashboard />} />
        <Route path="attendance" element={<FranchiseStaffAttendancePage />} />
        <Route path="create-order" element={<FranchiseStaffCreateOrder />} />
        <Route path="orders" element={<FranchiseStaffOrderHistory />} />
      </Route>

      {/* Kitchen Staff Routes */}
      <Route path="/kitchen-staff" element={
        <ProtectedRoute allowedRoles={['KITCHEN_STAFF']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<KitchenStaffDashboard />} />
        <Route path="orders" element={<KitchenStaffIncomingOrders />} />
      </Route>

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
