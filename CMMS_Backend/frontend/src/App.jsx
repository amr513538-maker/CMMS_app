import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NewRequestPage from './pages/NewRequestPage'
import RequestsPage from './pages/RequestsPage'
import TrackingPage from './pages/TrackingPage'
import TrackInputPage from './pages/TrackInputPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import ReportsPage from './pages/ReportsPage'
import SchedulePage from './pages/SchedulePage'

// Admin Settings
import SettingsLayout from './pages/settings/SettingsLayout'
import UsersPage from './pages/UsersPage'
import LabsPage from './pages/settings/LabsPage'
import RolesPage from './pages/settings/RolesPage'

import NotFoundPage from './pages/NotFoundPage'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <AuthProvider>
      <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Navbar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="main-content">
          <header className="topbar">
            <div className="topbar__inner" style={{ maxWidth: '100%', margin: 0 }}>
              <div className="brand">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text)', 
                    fontSize: '24px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    padding: '4px'
                  }}
                  title="Toggle Menu"
                >
                  {isSidebarOpen ? '✕' : '☰'}
                </button>
                <div className="brand__logo">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <div className="brand__text">
                  <div className="brand__title">CMMS</div>
                  <div className="brand__subtitle">University Maintenance</div>
                </div>
              </div>
            </div>
          </header>
          
          <main className="container">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/track" element={<TrackInputPage />} />
              <Route path="/track/:code" element={<TrackingPage />} />
              
              {/* Protected Routes — All Roles */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              
              {/* Requester + All */}
              <Route path="/request/new" element={<ProtectedRoute><NewRequestPage /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
              
              {/* Admin Only */}
              <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
              
              {/* Admin + IT Support */}
              <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
              
              {/* Admin Settings Nested Routes */}
              <Route path="/settings" element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}>
                 <Route path="users" element={<UsersPage />} />
                 <Route path="labs" element={<LabsPage />} />
                 <Route index element={<Navigate to="users" replace />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>

          <footer className="footer">
            <p>&copy; 2026 CMMS University. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </AuthProvider>
  )
}

export default App
