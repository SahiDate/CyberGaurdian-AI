import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Scene3D from './components/three/Scene3D';

// User Portal
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/Dashboard';
import ThreatIntel from './components/user/ThreatIntel';
import FileAnalyzer from './components/user/FileAnalyzer';
import SSLScanner from './components/user/SSLScanner';
import WhoisLookup from './components/user/WhoisLookup';
import URLScanner from './components/user/URLScanner';
import PortScanner from './components/user/PortScanner';
import SOCAnalysis from './components/user/SOCAnalysis';

// Admin Portal
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminThreats from './components/admin/AdminThreats';
import AdminFileAnalysis from './components/admin/AdminFileAnalysis';
import AdminSSLScanner from './components/admin/AdminSSLScanner';
import AdminWhois from './components/admin/AdminWhois';
import AdminURLScanner from './components/admin/AdminURLScanner';
import AdminPortScanner from './components/admin/AdminPortScanner';
import AdminSOCAnalysis from './components/admin/AdminSOCAnalysis';
import AdminIncidents from './components/admin/AdminIncidents';
import AdminScans from './components/admin/AdminScans';
import AdminReports from './components/admin/AdminReports';
import AdminAIAgent from './components/admin/AdminAIAgent';
import AdminAnalytics from './components/admin/AdminAnalytics';
import AdminSystemHealth from './components/admin/AdminSystemHealth';
import AdminAuditLogs from './components/admin/AdminAuditLogs';
import AdminSettings from './components/admin/AdminSettings';
import AdminApiHealth from './components/admin/AdminApiHealth';

// Shared
import NotFound404 from './components/shared/NotFound404';
import Unauthorized403 from './components/shared/Unauthorized403';

// ─── Guards ───────────────────────────────────────────────────────────────────

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  // Prevent admins from accidentally accessing user portal
  if (['ADMIN', 'SOC_ANALYST', 'SUPER_ADMIN'].includes(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

const AdminProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!['ADMIN', 'SOC_ANALYST', 'SUPER_ADMIN'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          {/* Persistent continuous 3D canvas background across all page transitions */}
          <Scene3D />
          <Routes>
            {/* ── Public User Routes ─────────────────────────── */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* ── Protected User Portal ──────────────────────── */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/threat-intel" element={
              <ProtectedRoute><ThreatIntel /></ProtectedRoute>
            } />
            <Route path="/file-analyzer" element={
              <ProtectedRoute><FileAnalyzer /></ProtectedRoute>
            } />
            <Route path="/ssl-scanner" element={
              <ProtectedRoute><SSLScanner /></ProtectedRoute>
            } />
            <Route path="/whois" element={
              <ProtectedRoute><WhoisLookup /></ProtectedRoute>
            } />
            <Route path="/url-scanner" element={
              <ProtectedRoute><URLScanner /></ProtectedRoute>
            } />
            <Route path="/port-scanner" element={
              <ProtectedRoute><PortScanner /></ProtectedRoute>
            } />
            <Route path="/soc-analysis" element={
              <ProtectedRoute><SOCAnalysis /></ProtectedRoute>
            } />

            {/* ── Admin Portal Public ────────────────────────── */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* ── Admin Portal Protected ─────────────────────── */}
            <Route path="/admin/dashboard" element={
              <AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>
            } />
            <Route path="/admin/threats" element={
              <AdminProtectedRoute><AdminThreats /></AdminProtectedRoute>
            } />
            <Route path="/admin/file-analysis" element={
              <AdminProtectedRoute><AdminFileAnalysis /></AdminProtectedRoute>
            } />
            <Route path="/admin/ssl-scanner" element={
              <AdminProtectedRoute><AdminSSLScanner /></AdminProtectedRoute>
            } />
            <Route path="/admin/whois" element={
              <AdminProtectedRoute><AdminWhois /></AdminProtectedRoute>
            } />
            <Route path="/admin/url-scanner" element={
              <AdminProtectedRoute><AdminURLScanner /></AdminProtectedRoute>
            } />
            <Route path="/admin/port-scanner" element={
              <AdminProtectedRoute><AdminPortScanner /></AdminProtectedRoute>
            } />
            <Route path="/admin/soc-analysis" element={
              <AdminProtectedRoute><AdminSOCAnalysis /></AdminProtectedRoute>
            } />
            <Route path="/admin/incidents" element={
              <AdminProtectedRoute><AdminIncidents /></AdminProtectedRoute>
            } />
            <Route path="/admin/scans" element={
              <AdminProtectedRoute><AdminScans /></AdminProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <AdminProtectedRoute><AdminReports /></AdminProtectedRoute>
            } />
            <Route path="/admin/ai-agent" element={
              <AdminProtectedRoute><AdminAIAgent /></AdminProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>
            } />
            <Route path="/admin/system-health" element={
              <AdminProtectedRoute><AdminSystemHealth /></AdminProtectedRoute>
            } />
            <Route path="/admin/audit-logs" element={
              <AdminProtectedRoute><AdminAuditLogs /></AdminProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>
            } />
            <Route path="/admin/api-health" element={
              <AdminProtectedRoute><AdminApiHealth /></AdminProtectedRoute>
            } />

            {/* ── Shared / Utility ───────────────────────────── */}
            <Route path="/unauthorized" element={<Unauthorized403 />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<NotFound404 />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
