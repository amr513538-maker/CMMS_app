import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import Modal from "./Modal";

export default function Navbar() {
  const { user, token, logout, isAdmin, isTech, isUser } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // States for collapsible groups
  const [openGroups, setOpenGroups] = useState({
    settings: true,
    monitoring: true,
    myRequests: true,
    tasks: true
  });

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res = await api("/api/notifications/unread-count");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    logout();
    setShowLogout(false);
    navigate("/login");
  };

  if (!token) return null;

  const SidebarLink = ({ to, icon, children }) => {
    const isActive = pathname.startsWith(to);
    return (
      <Link className={`sidebar__link ${isActive ? 'active' : ''}`} to={to}>
        <span className="sidebar__link-icon">{icon}</span>
        {children}
      </Link>
    );
  };

  const badgeStyle = {
    background: "var(--danger)",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "10px",
    marginLeft: "auto",
    fontWeight: "bold"
  };

  const groupHeaderStyle = {
    cursor: "pointer",
    userSelect: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    transition: "background 0.2s"
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="brand">
            <div className="brand__logo">CM</div>
            <div className="brand__text">
              <div className="brand__title">CMMS Hub</div>
              <div className="brand__subtitle">University System</div>
            </div>
          </div>
        </div>

        <div className="sidebar__body">
          {/* Admin Main Group */}
          {isAdmin() && (
            <div className="sidebar__group">
              <SidebarLink to="/dashboard" icon="🏠">Dashboard</SidebarLink>
              <SidebarLink to="/notifications" icon="🔔">
                Notifications
                {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
              </SidebarLink>
            </div>
          )}

          {/* IT Support (Technician) Flat Structure */}
          {isTech() && !isAdmin() && (
            <div className="sidebar__group">
              <SidebarLink to="/dashboard" icon="🏠">Dashboard</SidebarLink>
              <SidebarLink to="/requests" icon="📋">Maintenance Requests</SidebarLink>
              <SidebarLink to="/schedule" icon="📅">Maintenance Schedule</SidebarLink>
              <SidebarLink to="/notifications" icon="🔔">
                Notifications
                {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
              </SidebarLink>
              <SidebarLink to="/profile" icon="👤">Profile</SidebarLink>

            </div>
          )}

          {/* User (Requester) Simplified Flat Structure */}
          {isUser() && (
            <div className="sidebar__group">
              <SidebarLink to="/dashboard" icon="🏠">Dashboard</SidebarLink>
              <SidebarLink to="/notifications" icon="🔔">
                Notifications
                {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
              </SidebarLink>
              <SidebarLink to="/profile" icon="👤">Profile</SidebarLink>
              <SidebarLink to="/request/new" icon="➕">New Request</SidebarLink>
              <SidebarLink to="/track" icon="🔍">Track Request</SidebarLink>            </div>
          )}

          {/* Settings Group (Admin Only) */}
          {isAdmin() && (
            <div className="sidebar__group">
              <div 
                className="sidebar__group-title" 
                onClick={() => toggleGroup('settings')}
                style={{ ...groupHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>⚙️ Settings</span>
                <span style={{ fontSize: '10px' }}>{openGroups.settings ? '▼' : '▶'}</span>
              </div>
              
              {openGroups.settings && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px', animation: 'fadeIn 0.2s ease-out' }}>
                  <SidebarLink to="/settings/users" icon="👥">Users</SidebarLink>
                  <SidebarLink to="/settings/labs" icon="🏫">Labs</SidebarLink>

                </div>
              )}
            </div>
          )}

          {/* Monitoring Group (Admin Only) */}
          {isAdmin() && (
            <div className="sidebar__group">
              <div 
                className="sidebar__group-title" 
                onClick={() => toggleGroup('monitoring')}
                style={{ ...groupHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>📊 Monitoring & Reports</span>
                <span style={{ fontSize: '10px' }}>{openGroups.monitoring ? '▼' : '▶'}</span>
              </div>
              
              {openGroups.monitoring && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px', animation: 'fadeIn 0.2s ease-out' }}>
                  <SidebarLink to="/reports" icon="📊">Reports</SidebarLink>
                  <SidebarLink to="/schedule" icon="📅">Schedule</SidebarLink>
                </div>
              )}
            </div>
          )}

          {/* Global Logout Group (Available to All) */}
          <div className="sidebar__group" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
             <button 
              className="sidebar__link" 
              onClick={() => setShowLogout(true)}
              style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'var(--danger)' }}
            >
              <span className="sidebar__link-icon">🚪</span> Logout
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sidebar__group-title:hover {
          background: var(--bg-hover);
          color: var(--text-heading);
        }
      `}</style>

      {showLogout && (
        <Modal
          title="Are you sure you want to sign out?"
          description="You will need to log back in to access the system."
          onCancel={() => setShowLogout(false)}
          onConfirm={handleLogout}
          confirmText="Yes, Sign out"
        />
      )}
    </>
  );
}
