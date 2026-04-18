import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import PageCard from "../../components/PageCard";

export default function SettingsLayout() {
  const { pathname } = useLocation();

  const tabs = [
    { name: "المستخدمين (Users)", path: "/settings/users" },
    { name: "المعامل (Labs)", path: "/settings/labs" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageCard title="إعدادات النظام (Admin Settings)">
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "20px" }}>
          {tabs.map(tab => {
            const isActive = pathname.startsWith(tab.path);
            return (
              <Link 
                key={tab.path} 
                to={tab.path}
                style={{
                  padding: "12px 24px",
                  fontWeight: "bold",
                  borderBottom: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                  color: isActive ? "var(--primary)" : "var(--text-muted)",
                  textDecoration: "none",
                  transition: "all 0.2s"
                }}
              >
                {tab.name}
              </Link>
            )
          })}
        </div>
        
        <div>
          <Outlet />
        </div>
      </PageCard>
    </div>
  );
}
