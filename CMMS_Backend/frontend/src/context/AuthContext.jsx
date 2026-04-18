import React, { createContext, useState, useEffect, useContext } from "react";
import { api, setAuthToken, getAuthToken } from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("cmms_user") || "null"));
  const [token, setToken] = useState(() => getAuthToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await api("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            loginFn(token, data);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    checkAuth();

    const handleUnauthorized = () => logout();
    window.addEventListener("auth_unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth_unauthorized", handleUnauthorized);
  }, []);

  const loginFn = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setAuthToken(newToken);
    if (newUser) localStorage.setItem("cmms_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem("cmms_user");
  };

  const can = (permission) => {
    if (!user || !user.role) return false;
    const role = user.role;
    
    switch (permission) {
      case "admin": return role === "admin";
      case "it_support": return role === "IT Support";
      case "user": return role === "user";
      case "viewRequests": return ["admin", "planner", "IT Support"].includes(role);
      case "manageRequests": return ["admin", "IT Support", "planner"].includes(role);
      case "viewSchedule": return ["admin", "IT Support", "planner"].includes(role);
      case "viewDevices": return ["admin", "IT Support"].includes(role);
      case "viewReports": return role === "admin";
      case "viewAuditLog": return role === "admin";
      case "viewSettings": return role === "admin";
      case "editProfile": return role === "admin";
      default: return false;
    }
  };

  const isAdmin = () => user?.role === "admin";
  const isTech = () => user?.role === "IT Support";
  const isUser = () => user?.role === "user" || !user?.role;

  return (
    <AuthContext.Provider value={{ user, token, loading, login: loginFn, logout, can, isAdmin, isTech, isUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
