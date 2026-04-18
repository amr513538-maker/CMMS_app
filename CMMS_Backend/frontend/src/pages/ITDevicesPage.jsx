import React, { useEffect, useState } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function ITDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    setLoading(true);
    try { const res = await api("/api/devices/all"); setDevices(await res.json()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api(`/api/devices/${id}/status`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      fetchDevices();
    } catch { alert("فشل تحديث الحالة"); }
  };

  if (loading) return <PageCard title="الأجهزة 🖥️"><div className="muted"><span className="spinner"></span> جاري التحميل...</div></PageCard>;

  return (
    <PageCard title="الأجهزة 🖥️">
      <div className="tableWrap">
        <table className="table">
          <thead><tr><th>ID</th><th>الاسم</th><th>النوع</th><th>المعمل</th><th>الحالة</th><th>تحديث الحالة</th></tr></thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td><strong>{d.name}</strong></td>
                <td className="muted">{d.type || "-"}</td>
                <td>{d.lab_name || "-"}</td>
                <td><span className={`pill ${d.status === 'Active' ? 'text-success' : d.status === 'Maintenance' ? 'text-warning' : 'text-danger'}`}>{d.status}</span></td>
                <td>
                  <select
                    value={d.status}
                    onChange={e => handleStatusChange(d.id, e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "13px" }}
                  >
                    <option value="Active">نشط (Active)</option>
                    <option value="Inactive">معطل (Inactive)</option>
                    <option value="Maintenance">في الصيانة (Maintenance)</option>
                    <option value="Retired">مكهن (Retired)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}
