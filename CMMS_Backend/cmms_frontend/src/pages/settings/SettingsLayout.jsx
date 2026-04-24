import React from "react";
import { Outlet } from "react-router-dom";
import PageCard from "../../components/PageCard";

export default function SettingsLayout() {
  return (
    <div className="container" style={{ animation: 'fadeUp 0.6s ease-out' }}>
      <PageCard title="إعدادات النظام الإدارية (Admin Settings) ⚙️">
        <div style={{ animation: 'fadeUp 0.4s 0.2s ease-out both' }}>
          <Outlet />
        </div>
      </PageCard>
    </div>
  );
}
