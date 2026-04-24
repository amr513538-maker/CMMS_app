import React, { useState, useEffect } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";
import Modal from "../components/Modal";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Validation state
  const [touched, setTouched] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const validateField = (name, value) => {
    let err = "";
    if (!value && name !== "phone" && name !== "department" && name !== "job_title" && (name !== "password" || !editingUser)) {
      err = "هذا الحقل مطلوب";
    } else {
      if (name === "full_name") {
        if (value.length < 3 || value.length > 50) err = "الاسم يجب أن يكون بين 3 و 50 حرفاً";
        else if (!/^[\u0621-\u064Aa-zA-Z\s]+$/.test(value)) err = "يجب استخدام الحروف والمسافات فقط";
      }
      if (name === "email" && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(value)) {
        err = "يجب أن يكون بريد Gmail صالح (example@gmail.com)";
      }
      if (name === "password" && value && value.length < 8) {
        err = "كلمة المرور يجب أن لا تقل عن 8 أحرف";
      }
      if (name === "phone" && value && !/^\d{11,}$/.test(value)) {
        err = "رقم الهاتف يجب أن يتكون من 11 رقماً على الأقل";
      }
    }
    return err;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFormErrors(prev => ({ ...prev, [name]: error }));
  };

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

  const fetchDepartments = async () => {
    try {
      const res = await api("/api/departments");
      setDepartments(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchJobTitles = async (deptId) => {
    if (!deptId) return setJobTitles([]);
    try {
      const res = await api(`/api/job-titles?department_id=${deptId}`);
      setJobTitles(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchJobTitles(selectedDeptId);
  }, [selectedDeptId]);

  const openNewForm = () => { 
    setEditingUser(null); 
    setTouched({});
    setFormErrors({});
    setSelectedDeptId("");
    setShowModal("form"); 
  };
  
  const openEditForm = (user) => { 
    setEditingUser(user); 
    setTouched({});
    setFormErrors({});
    
    // Find department id from name to set dropdown correctly (since API returns name)
    const dept = departments.find(d => d.name === user.department);
    setSelectedDeptId(dept ? dept.id : "");
    
    setShowModal("form"); 
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    
    // Final Validation
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);
    
    // Map department_name back to department to match backend expectations
    if (payload.department_name) {
      payload.department = payload.department_name;
      delete payload.department_name;
    } else {
      payload.department = null;
    }

    const errors = {};
    Object.keys(payload).forEach(key => {
      const err = validateField(key, payload[key]);
      if (err) errors[key] = err;
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setTouched(Object.keys(payload).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const res = await api(`/api/users/${editingUser.id}`, { method: "PUT", body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await api(`/api/users`, { method: "POST", body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert("تعذر حفظ البيانات: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (user) => {
    // Prevent self-deletion
    const currentUser = JSON.parse(localStorage.getItem("cmms_user"));
    if (currentUser && currentUser.id === user.id) {
      alert("لا يمكنك حذف حسابك الخاص!");
      return;
    }
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      // Using the batch delete endpoint which is more stable across server restarts
      const res = await api("/api/users/delete", { 
        method: "POST", 
        body: JSON.stringify({ ids: [userToDelete.id] }) 
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(res.ok ? "تم الحذف بنجاح" : `خطأ من الخادم: ${res.status}`);
      }

      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      alert("تعذر الحذف: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">إدارة المستخدمين 👥</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">تحكم في الصلاحيات والحسابات المسجلة في النظام.</p>
        </div>
        <button 
          onClick={openNewForm}
          className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          مستخدم جديد
        </button>
      </div>

      <PageCard>
        <div className="overflow-x-auto -mx-6 sm:-mx-8">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">الاسم</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">البريد</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">الصلاحية</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">المسمى</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group" onClick={() => openEditForm(u)}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3 lowercase">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black uppercase">{u.full_name?.charAt(0)}</div>
                      <span className="text-slate-800 dark:text-slate-200">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-500 dark:text-slate-400 text-sm font-medium lowercase tracking-tight">{u.email}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      u.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 
                      u.role === 'IT Support' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-8 py-5 text-center text-slate-400 text-xs font-bold uppercase">{u.job_title || "عضو"}</td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteUser(u); }}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="حذف المستخدم"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal === "form" && (
          <Modal
            title={editingUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
            description="يرجى ملأ البيانات بدقة. سيتم التحقق من الحقول تلقائياً."
            onCancel={() => setShowModal(false)}
            onConfirm={() => document.getElementById('userForm').requestSubmit()}
            confirmText={saving ? "جاري الحفظ..." : "حفظ الحساب"}
            type="primary"
            maxWidth="max-w-lg"
          >
            <form id="userForm" className="space-y-5 text-right mt-4" onSubmit={handleSubmitForm} noValidate autoComplete="off">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">الاسم الكامل</label>
                <input 
                  type="text" name="full_name" 
                  defaultValue={editingUser?.full_name || ""} 
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-bold text-slate-900 dark:text-white transition-all ${
                    touched.full_name && formErrors.full_name ? 'border-red-400 ring-4 ring-red-500/10' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10'
                  }`} 
                />
                {touched.full_name && formErrors.full_name && <p className="text-[10px] font-black text-red-500 mr-1 animate-fade-in">{formErrors.full_name}</p>}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">البريد الإلكتروني (Gmail)</label>
                <input 
                  type="email" name="email" 
                  defaultValue={editingUser?.email || ""} 
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-bold text-slate-900 dark:text-white lowercase transition-all ${
                    touched.email && formErrors.email ? 'border-red-400 ring-4 ring-red-500/10' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10'
                  }`} 
                />
                {touched.email && formErrors.email && <p className="text-[10px] font-black text-red-500 mr-1 animate-fade-in">{formErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">
                  كلمة المرور {editingUser && <span className="text-blue-500 normal-case">(اتركه فارغاً لعدم التغيير)</span>}
                </label>
                  <input 
                    type="password" name="password" 
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    placeholder={editingUser ? "••••••••" : "أدخل كلمة المرور"}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-bold text-slate-900 dark:text-white transition-all ${
                      touched.password && formErrors.password ? 'border-red-400 ring-4 ring-red-500/10' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10'
                    }`} 
                  />
                {touched.password && formErrors.password && <p className="text-[10px] font-black text-red-500 mr-1 animate-fade-in">{formErrors.password}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">الدور</label>
                  <select name="role" defaultValue={editingUser?.role || 'user'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white appearance-none transition-colors">
                    <option value="user">User (مستخدم)</option>
                    <option value="IT Support">IT Support (فني)</option>
                    <option value="admin">Admin (مدير)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">الهاتف</label>
                  <input 
                    type="text" name="phone" 
                    defaultValue={editingUser?.phone || ""} 
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-bold text-slate-900 dark:text-white transition-all ${
                      touched.phone && formErrors.phone ? 'border-red-400 ring-4 ring-red-500/10' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10'
                    }`} 
                  />
                  {touched.phone && formErrors.phone && <p className="text-[10px] font-black text-red-500 mr-1 animate-fade-in">{formErrors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">القسم</label>
                  <select 
                    name="department" 
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white appearance-none transition-colors"
                  >
                    <option value="">-- اختر القسم --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {/* Hidden input to pass department NAME to the backend for now, to maintain compatibility */}
                  <input type="hidden" name="department_name" value={departments.find(d => d.id == selectedDeptId)?.name || ''} />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">المسمى الوظيفي</label>
                  <select 
                    name="job_title" 
                    defaultValue={editingUser?.job_title || ''}
                    disabled={!selectedDeptId}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white appearance-none disabled:opacity-50 transition-colors"
                  >
                    <option value="">-- اختر المسمى --</option>
                    {jobTitles.map(j => (
                      <option key={j.id} value={j.title}>{j.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          </Modal>
        )}
        {userToDelete && (
          <Modal
            title="تأكيد حذف المستخدم"
            description={`هل أنت متأكد من حذف المستخدم "${userToDelete.full_name}"؟ سيؤدي هذا إلى إزالة صلاحياته تماماً من النظام.`}
            onCancel={() => setUserToDelete(null)}
            onConfirm={confirmDelete}
            confirmText={deleting ? "جاري الحذف..." : "حذف المستخدم نهائياً"}
            type="danger"
          />
        )}
      </PageCard>
    </div>
  );
}
