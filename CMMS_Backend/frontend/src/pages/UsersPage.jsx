import React, { useState, useEffect } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";
import Modal from "../components/Modal";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Checkbox state
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null means "New"
  
  // Submit loading state
  const [saving, setSaving] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data);
    } catch (err) {
      setError("فشل في جلب المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handlers
  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(users.map(u => u.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} مستخدم؟`)) return;

    try {
      const res = await api("/api/users/delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedIds([]);
      fetchUsers();
    } catch (err) {
      alert("خطأ أثناء الحذف: " + err.message);
    }
  };

  const openNewForm = () => {
    setEditingUser(null);
    setShowModal("form");
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setShowModal("form");
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);
    
    // Basic Custom validations handled via required attributes and minLength, 
    // but just to be sure we can check it.
    
    try {
      if (editingUser) {
        // Edit mode
        const res = await api(`/api/users/${editingUser.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        // New mode
        const res = await api(`/api/users`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert("تعذر حفظ البيانات: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && users.length === 0) {
    return <PageCard title="إدارة المستخدمين"><div className="muted"><span className="spinner"></span> جاري التحميل...</div></PageCard>;
  }

  return (
    <PageCard title="إدارة المستخدمين">
      {error && <div className="error">{error}</div>}
      
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          {selectedIds.length > 0 && (
            <button className="btn btn--danger" onClick={handleDeleteSelected}>
              حذف المحدد ({selectedIds.length})
            </button>
          )}
        </div>
        <button className="btn btn--primary" onClick={openNewForm}>
          + إضافة مستخدم جديد
        </button>
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}><input type="checkbox" onChange={toggleSelectAll} checked={users.length > 0 && selectedIds.length === users.length} /></th>
              <th>الاسم</th>
              <th>الإيميل</th>
              <th>الصلاحية</th>
              <th>القسم / الوظيفة</th>
              <th>تاريخ الإضافة</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: "center" }} className="muted">لا يوجد مستخدمين</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} style={{ cursor: "pointer" }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                  </td>
                  <td onClick={() => openEditForm(u)}><strong>{u.full_name}</strong></td>
                  <td onClick={() => openEditForm(u)}>{u.email}</td>
                  <td onClick={() => openEditForm(u)}><span className="pill pill--soft">{u.role}</span></td>
                  <td onClick={() => openEditForm(u)} className="muted">{u.department || "-"} / {u.job_title || "-"}</td>
                  <td onClick={() => openEditForm(u)} className="muted">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal === "form" && (
        <div className="modal-overlay active">
          <div className="modal" style={{ maxWidth: "500px" }}>
            <h3 style={{ marginTop: 0 }}>{editingUser ? "تعديل مستخدم" : "مستخدم جديد"}</h3>
            <form className="form" onSubmit={handleSubmitForm} style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
              
              <label>الاسم الكامل * (8-16 حرف، حروف فقط، غير مكرر)</label>
              <input type="text" name="full_name" defaultValue={editingUser?.full_name || ""} minLength="8" maxLength="16" required pattern="^[\u0621-\u064Aa-zA-Z\s]+$" title="يجب أن يكون الاسم بين 8 و 16 حرفاً ويحتوي على حروف فقط بدون أرقام أو رموز" />
              
              <label>البريد الإلكتروني * (صيغة Gmail)</label>
              <input type="email" name="email" defaultValue={editingUser?.email || ""} required pattern="^[a-zA-Z0-9]{5,}@gmail\.com$" title="يجب أن ينتهي بـ @gmail.com ويحتوي 5 حروف أو أرقام قبلها كحد أدنى بدون رموز" />
              
              <label>كلمة المرور {editingUser ? "(اتركه فارغاً لعدم التغيير)" : "*"}</label>
              <input 
                type="password" 
                name="password" 
                minLength="8" 
                required={!editingUser} 
                placeholder={editingUser ? "********" : "كلمة المرور لا تقل عن 8 أحرف"} 
              />
              
              <label>الدور والصلاحية *</label>
              <select name="role" defaultValue={editingUser?.role === 'technician' ? 'IT Support' : (editingUser?.role === 'admin' ? 'admin' : 'user')} required>
                <option value="user">User (مستخدم عادي)</option>
                <option value="IT Support">IT Support (دعم فني)</option>
                <option value="admin">Admin (مدير نظام)</option>
              </select>

              <label>رقم الهاتف</label>
              <input type="text" name="phone" defaultValue={editingUser?.phone || ""} pattern="^[0-9]{11,}$" title="رقم الهاتف يجب أن يتكون من أرقام فقط ولا يقل عن 11 رقم" />

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label>القسم</label>
                  <input type="text" name="department" defaultValue={editingUser?.department || ""} pattern="^[\u0621-\u064Aa-zA-Z\s]+$" title="يجب إدخال حروف فقط (عربي أو إنجليزي) بدون أرقام" />
                </div>
                <div style={{ flex: 1 }}>
                  <label>المسمى الوظيفي</label>
                  <input type="text" name="job_title" defaultValue={editingUser?.job_title || ""} pattern="^[\u0621-\u064Aa-zA-Z\s]+$" title="يجب إدخال حروف فقط (عربي أو إنجليزي) بدون أرقام" />
                </div>
              </div>

              <div className="modal-actions" style={{ position: "sticky", bottom: 0, background: "var(--bg-card)", padding: "10px 0 0 0" }}>
                <button type="button" className="btn" style={{ background: "var(--bg-input)" }} onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ البيانات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageCard>
  );
}
