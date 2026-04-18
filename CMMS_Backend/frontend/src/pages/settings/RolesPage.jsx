import React, { useState, useEffect } from "react";
import { api } from "../../api/client";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api("/api/roles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoles(data);
    } catch (err) {
      setError("فشل جلب الصلاحيات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الصلاحية؟ قد تؤثر على مستخدمين مسجلين.")) return;
    try {
      const res = await api(`/api/roles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      fetchRoles();
    } catch (err) {
      alert("خطأ أثناء الحذف: " + err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);
    
    try {
      if (editingRole) {
        await api(`/api/roles/${editingRole.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api(`/api/roles`, { method: "POST", body: JSON.stringify(payload) });
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      alert("Error saving role");
    }
  };

  if (loading) return <div className="muted"><span className="spinner"></span> جاري التحميل...</div>;

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn--primary" onClick={() => { setEditingRole(null); setShowModal(true); }} style={{ marginBottom: "16px" }}>
        + دور جديد (New Role)
      </button>

      <div className="tableWrap">
        <table className="table">
          <thead><tr><th>ID</th><th>الاسم (Name)</th><th>الوصف (Description)</th><th>إجراءات</th></tr></thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td><strong>{r.name}</strong></td>
                <td className="muted">{r.description || "-"}</td>
                <td>
                  <button className="btn" style={{ padding: "4px 8px", marginRight: "8px" }} onClick={() => { setEditingRole(r); setShowModal(true); }}>تعديل</button>
                  <button className="btn btn--danger" style={{ padding: "4px 8px" }} onClick={() => handleDelete(r.id)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <h3>{editingRole ? "تعديل الدور" : "دور جديد"}</h3>
            <form className="form" onSubmit={handleSave}>
              <label>الاسم (مثل admin, technician)</label>
              <input type="text" name="name" defaultValue={editingRole?.name || ""} required />
              <label>الوصف</label>
              <input type="text" name="description" defaultValue={editingRole?.description || ""} />
              
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
