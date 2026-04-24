import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NewRequestPage from './pages/NewRequestPage'
import RequestsPage from './pages/RequestsPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import ReportsPage from './pages/ReportsPage'
import TrackInputPage from './pages/TrackInputPage'
import TrackingPage from './pages/TrackingPage'

// Admin Settings
import SettingsLayout from './pages/settings/SettingsLayout'
import UsersPage from './pages/UsersPage'
import LabsPage from './pages/settings/LabsPage'
import DepartmentsPage from './pages/DepartmentsPage'

import NotFoundPage from './pages/NotFoundPage'

function AppContent() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <Navbar />
      
      <main className="flex-1 w-full mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/request/new" element={<ProtectedRoute><NewRequestPage /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/track" element={<ProtectedRoute><TrackInputPage /></ProtectedRoute>} />
          <Route path="/track/:code" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
          
          <Route path="/settings" element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}>
             <Route path="users" element={<UsersPage />} />
             <Route path="labs" element={<LabsPage />} />
             <Route path="departments" element={<DepartmentsPage />} />
             <Route index element={<Navigate to="users" replace />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <p dir="ltr">&copy; 2026 CMMS Enterprise • Integrated Maintenance Management</p>

        </div>
      </footer>
    </div>
  )
}

function App() {
  console.log("Rendering CMMS App...");
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
