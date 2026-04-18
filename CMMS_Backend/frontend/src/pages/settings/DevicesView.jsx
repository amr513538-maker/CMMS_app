import React, { useState, useEffect } from "react";
import { api } from "../../api/client";

export default function DevicesView({ labId }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/devices/${labId}`);
      if (!res.ok) throw new Error("Failed to load");
      setDevices(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {if (labId) fetchDevices()}, [labId]);

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    payload.labId = labId; // inject
    try {
      if (editingDevice) {
        await api(`/api/devices/${editingDevice.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api(`/api/devices`, { method: "POST", body: JSON.stringify(payload) });
      }
      setShowModal(false);
      fetchDevices();
    } catch(err) {
      alert("Error saving device");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("حذف الجهاز نهائياً. متأكد؟")) return;
    try {
      await api(`/api/devices/${id}`, { method: "DELETE" });
      fetchDevices();
    } catch(err) {
      alert("Error deleting device");
    }
  };

  if (loading) return <div className="muted"><span className="spinner"></span> جاري التحميل...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0 }}>الأجهزة المسجلة ({devices.length})</h3>
        <button className="btn btn--primary" onClick={() => { setEditingDevice(null); setShowModal(true); }}>
          + إضافة جهاز
        </button>
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>الاسم (Name)</th>
              <th>النوع (Type)</th>
              <th>الحالة (Status)</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr><td colSpan="5" className="muted" style={{ textAlign: "center" }}>لا يوجد أجهزة في هذا المعمل</td></tr>
            ) : (
              devices.map(dev => (
                <tr key={dev.id}>
                  <td>{dev.id}</td>
                  <td><strong>{dev.name}</strong></td>
                  <td className="muted">{dev.type || "-"}</td>
                  <td>
                    <span className={`pill ${dev.status === 'Active' ? 'text-success' : 'text-danger'}`}>
                      {dev.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn" style={{ padding: "4px 8px", marginRight: "8px" }} onClick={() => { setEditingDevice(dev); setShowModal(true); }}>تعديل</button>
                    <button className="btn btn--danger" style={{ padding: "4px 8px" }} onClick={() => handleDelete(dev.id)}>حذف</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <h3>{editingDevice ? "تعديل جهاز" : "إضافة جهاز جديد"}</h3>
            <form className="form" onSubmit={handleSave}>
              <label>اسم الجهاز *</label>
              <input type="text" name="name" defaultValue={editingDevice?.name || ""} required />
              
              <label>النوع (Type)</label>
              <input type="text" name="type" defaultValue={editingDevice?.type || ""} />
              
              <label>الحالة (Status)</label>
              <select name="status" defaultValue={editingDevice?.status || "Active"}>
                <option value="Active">نشط (Active)</option>
                <option value="Inactive">غير نشط (Inactive)</option>
                <option value="Maintenance">في الصيانة (Maintenance)</option>
                <option value="Retired">مكهن (Retired)</option>
              </select>
              
              <div className="modal-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ background: "var(--bg-input)" }}>إلغاء</button>
                <button type="submit" className="btn btn--primary">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
