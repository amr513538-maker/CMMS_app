import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";
import Modal from "./Modal";

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchCode, setSearchCode] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.nav-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  useEffect(() => {
    if (token) {
      api("/api/notifications/unread")
        .then(res => res.json())
        .then(data => setUnreadCount(data.count || 0))
        .catch(err => console.error("Failed to fetch notifications"));
    }
  }, [token, pathname]);

  if (!token) return null;

  const role = user?.role || "user";
  const isAdmin = role === "admin";
  const isTech = role === "IT Support";

  const navItems = [
    { label: "لوحة التحكم", path: "/dashboard", visible: true },
    { label: "الإشعارات", path: "/notifications", badge: unreadCount > 0 ? unreadCount : null, visible: true },
    {
      label: "الإعدادات",
      path: "/settings",
      visible: isAdmin,
      dropdown: [
        { label: "المستخدمون", path: "/settings/users" },
        { label: "الأقسام والمسميات", path: "/settings/departments" },
        { label: "المعامل و الاجهزه", path: "/settings/labs" },
      ]
    },
    { label: "التقارير", path: "/reports", visible: isAdmin },
  ];

  const filteredNav = navItems.filter(item => item.visible);

  const getRoleLabel = () => {
    if (isAdmin) return "مدير النظام";
    if (isTech) return "فني";
    return "مقدم طلب";
  };

  return (
    <nav className="sticky top-0 z-[100] w-full bg-[#1e1b4b] text-white shadow-lg shadow-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">

          {/* User Info (Right Side in Arabic) */}
          <div className="flex items-center gap-4">
             <Link to="/profile" className="flex items-center gap-3 group">
               <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-lg border-2 border-white/20 shadow-lg group-hover:scale-105 transition-transform">
                 {user?.full_name?.charAt(0).toUpperCase()}
               </div>
               <div className="flex flex-col text-right">
                 <span className="text-sm font-black leading-none group-hover:text-blue-400 transition-colors">{user?.full_name || "admin"}</span>
                 <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{getRoleLabel()}</span>
               </div>
             </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden lg:flex items-center gap-6">
            {filteredNav.map((item, i) => {
              const isActive = pathname.startsWith(item.path);
              const hasDropdown = item.dropdown && item.dropdown.length > 0;

              return (
                <div key={i} className="relative nav-dropdown-container">
                  {hasDropdown ? (
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isActive || activeDropdown === item.label ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:text-white"}`}
                    >
                      {item.label}
                      <svg className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === item.label ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  ) : (
                    <Link
                      to={item.path}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isActive ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:text-white"}`}
                    >
                      {item.label}
                      {item.badge && (
                        <span className="flex items-center justify-center w-5 h-5 text-[10px] bg-red-500 text-white rounded-full shadow-sm">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}

                  {hasDropdown && activeDropdown === item.label && (
                    <div className="absolute top-full right-0 mt-3 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in text-slate-900 dark:text-slate-200">
                      {item.dropdown.map((sub, j) => (
                        <Link
                          key={j}
                          to={sub.path}
                          className="block px-5 py-3 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all border-r-4 border-transparent hover:border-blue-600"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Search & Logout (Left Side in Arabic) */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-slate-300 hover:text-white transition-all"
              title={isDarkMode ? "الوضع المضيء" : "الوضع المظلم"}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            <form onSubmit={(e) => { e.preventDefault(); if (searchCode.trim()) navigate(`/track/${searchCode.trim()}`); setSearchCode(""); }} className="relative">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="ابحث برقم الطلب..."
                className="w-48 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-bold text-white placeholder-slate-400 focus:w-60 focus:bg-white/20 outline-none transition-all"
              />
              <button type="submit" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            </form>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-xs font-black hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
            >
              خروج
            </button>

            {/* Mobile Btn */}
            <button className="lg:hidden p-2 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isMobileMenuOpen ? "M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#1e1b4b] border-t border-white/10 p-6 space-y-3 animate-fade-down">
          {filteredNav.map((item, i) => (
            <div key={i}>
              <Link
                to={item.path}
                className={`block px-5 py-4 rounded-2xl font-black text-lg ${pathname.startsWith(item.path) ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5"}`}
              >
                {item.label}
              </Link>
            </div>
          ))}
          <button onClick={() => { setShowLogoutModal(true); setIsMobileMenuOpen(false); }} className="w-full mt-4 py-4 bg-red-500/10 text-red-500 font-black rounded-2xl border border-red-500/20">
            تسجيل الخروج
          </button>
        </div>
      )}

      {showLogoutModal && (
        <Modal
          title="تأكيد تسجيل الخروج"
          description="هل أنت متأكد أنك تريد تسجيل الخروج من النظام؟ سيتم إنهاء جلستك الحالية."
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={() => { setShowLogoutModal(false); logout(); }}
          confirmText="نعم، تسجيل الخروج"
          type="danger"
        />
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </nav>
  );
}
