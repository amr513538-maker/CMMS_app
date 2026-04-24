import React, { useState, useEffect } from "react";
import { api } from "../../api/client";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api(`/api/roles/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      fetchRoles();
      setDeleteTarget(null);
    } catch (err) {
      alert("خطأ أثناء الحذف: " + err.message);
    } finally {
      setDeleting(false);
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

  if (loading) return <div className="muted" style={{textAlign:'center', padding:'40px'}}><span className="spinner"></span> جاري التحميل...</div>;

  return (
    <div style={{ animation: 'fadeUp 0.6s ease-out' }}>
      {error && <div className="error text-danger" style={{marginBottom:'16px'}}>{error}</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontWeight: '800', color: 'var(--text-heading)' }}>أدوار النظام والصلاحيات</h3>
        <button className="btn btn--primary" onClick={() => { setEditingRole(null); setShowModal(true); }}>
          + إضافة دور جديد
        </button>
      </div>

      <div className="tableWrap" style={{ boxShadow: 'var(--glass-shadow)' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>اسم الدور (Role Name)</th>
              <th>الوصف (Permissions Summary)</th>
              <th style={{ textAlign: 'center' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}>
                <td className="muted" style={{ fontSize: '12px' }}>#{r.id}</td>
                <td>
                  <strong style={{ color: 'var(--primary)', fontWeight: '800' }}>{r.name}</strong>
                </td>
                <td className="muted" style={{ fontSize: '13px' }}>{r.description || "بدون وصف"}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button className="btn" style={{ padding: "6px 14px", fontSize: '12px', background: 'rgba(255,255,255,0.05)' }} onClick={() => { setEditingRole(r); setShowModal(true); }}>تعديل</button>
                    <button className="btn btn--danger" style={{ padding: "6px 14px", fontSize: '12px' }} onClick={() => setDeleteTarget(r)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay active">
          <div className="modal" style={{ maxWidth: '500px', border: '1px solid var(--primary)', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)' }}>{editingRole ? "تحديث بيانات الدور" : "إضافة دور جديد"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <form className="form" onSubmit={handleSave}>
              <label>اسم الدور (Role Key)</label>
              <input type="text" name="name" defaultValue={editingRole?.name || ""} required placeholder="مثال: admin, technician, supervisor" />
              
              <label>وصف الصلاحية</label>
              <input type="text" name="description" defaultValue={editingRole?.description || ""} placeholder="وصف بسيط للمهام المتاحة لهذا الدور" />
              
              <div className="modal-actions" style={{ marginTop: "32px", display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>حفظ التغييرات</button>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, background: "rgba(255,255,255,0.05)" }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay active">
          <div className="modal" style={{ maxWidth: '400px', border: '1px solid var(--danger)', padding: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--danger)', fontWeight: 'black' }}>تأكيد الحذف</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              هل أنت متأكد من حذف الصلاحية "{deleteTarget.name}"؟ 
              قد يؤثر ذلك على المستخدمين المسجلين بهذه الصلاحية.
            </p>
            <div className="modal-actions" style={{ marginTop: "32px", display: 'flex', gap: '12px' }}>
              <button onClick={confirmDelete} className="btn btn--danger" style={{ flex: 1 }}>{deleting ? "جاري الحذف..." : "حذف نهائياً"}</button>
              <button onClick={() => setDeleteTarget(null)} className="btn" style={{ flex: 1, background: "rgba(255,255,255,0.05)" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
