import React, { useState, useRef, useEffect } from "react";
import PageCard from "../components/PageCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function ProfilePage() {
  const { user, login, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // States for Admin-only selection
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedDeptName, setSelectedDeptName] = useState(user?.department || "");
  const [selectedJobTitle, setSelectedJobTitle] = useState(user?.job_title || "");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      api("/api/departments")
        .then(res => res.json())
        .then(data => {
          setDepartments(data);
          const currentDept = data.find(d => d.name === user?.department);
          if (currentDept) {
            setSelectedDeptId(currentDept.id);
          }
        })
        .catch(err => console.error("Error fetching departments:", err));
    }
  }, [isAdmin, user?.department]);

  useEffect(() => {
    if (isAdmin && selectedDeptId) {
      api(`/api/job-titles?department_id=${selectedDeptId}`)
        .then(res => res.json())
        .then(data => setJobTitles(data))
        .catch(err => console.error("Error fetching job titles:", err));
    } else {
      setJobTitles([]);
    }
  }, [isAdmin, selectedDeptId]);

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const res = await fetch("/api/auth/profile/image", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload");
      
      login(token, { ...user, avatar_url: data.avatar_url });
      setSuccess("تم تحديث الصورة الشخصية بنجاح ✨");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);

    if (isAdmin) {
      payload.department = selectedDeptName;
      payload.job_title = selectedJobTitle;
    }
    
    try {
      const res = await api("/api/auth/profile", { method: "PUT", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const meRes = await api("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        login(token, meData);
      }
      setSuccess("تم تحديث بيانات الحساب بنجاح ✅");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-up pb-20">
      {/* Header */}
      <div className="relative h-48 rounded-[2.5rem] overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        <div className="absolute bottom-8 right-8 text-white">
          <h1 className="text-4xl font-black tracking-tight mb-2">مرحباً، {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-blue-100 font-bold flex items-center gap-2 opacity-90">
             <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
             أنت مسجل كـ {isAdmin ? "مدير النظام" : user?.role === "IT Support" ? "فني دعم" : "مقدم طلب"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 -mt-16 px-4 sm:px-8">
        
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-6 z-10">
          <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-[2rem] border border-white dark:border-slate-800 shadow-2xl shadow-slate-200/50 p-8 text-center sticky top-24 transition-colors">
             <div className="relative inline-block group">
                <div onClick={handleAvatarClick} className="w-32 h-32 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-2xl mx-auto flex items-center justify-center overflow-hidden cursor-pointer transition-transform hover:scale-105 active:scale-95">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-600 dark:text-blue-400 font-black text-4xl">{user?.full_name?.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                     <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
             </div>
             <div className="mt-6 space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{user?.full_name}</h3>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-black uppercase tracking-widest">{user?.email}</p>
             </div>
             <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">القسم</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user?.department || "عام"}</p>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">المسمى</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user?.job_title || "موظف"}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Settings */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden transition-colors">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
               <h2 className="text-xl font-black text-slate-900 dark:text-white">البيانات الشخصية</h2>
               {!isAdmin && <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-lg border border-amber-100 dark:border-amber-800">🔒 تحكم المدير فقط</span>}
            </div>
            
            <form className="p-8 space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">الاسم الكامل</label>
                   <input type="text" name="full_name" defaultValue={user?.full_name} readOnly={!isAdmin} required className={`w-full px-5 py-3.5 rounded-2xl font-bold outline-none transition-all ${!isAdmin ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent" : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-blue-500/10"}`} />
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">البريد الإلكتروني</label>
                   <input type="email" defaultValue={user?.email} disabled className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-2xl font-bold text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">رقم الهاتف</label>
                   <input type="text" name="phone" defaultValue={user?.phone} placeholder="01XXXXXXXXX" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white transition-all" />
                </div>
                
                <div className="space-y-2">
                   <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">القسم / الإدارة</label>
                   {isAdmin ? (
                     <select 
                       className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white transition-all"
                       value={selectedDeptId}
                       onChange={(e) => {
                         const id = e.target.value;
                         setSelectedDeptId(id);
                         const name = departments.find(d => d.id == id)?.name || "";
                         setSelectedDeptName(name);
                         setSelectedJobTitle(""); 
                       }}
                     >
                       <option value="">اختر القسم...</option>
                       {departments.map(dept => (
                         <option key={dept.id} value={dept.id}>{dept.name}</option>
                       ))}
                     </select>
                   ) : (
                     <input type="text" value={user?.department || "عام"} readOnly className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent rounded-2xl font-bold" />
                   )}
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">المسمى الوظيفي</label>
                 {isAdmin ? (
                   <select 
                     className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white transition-all"
                     value={selectedJobTitle}
                     onChange={(e) => setSelectedJobTitle(e.target.value)}
                     disabled={!selectedDeptId}
                   >
                     <option value="">اختر المسمى...</option>
                     {jobTitles.map(job => (
                       <option key={job.id} value={job.title}>{job.title}</option>
                     ))}
                   </select>
                 ) : (
                   <input type="text" value={user?.job_title || "موظف"} readOnly className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent rounded-2xl font-bold" />
                 )}
              </div>

              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-50 dark:border-slate-800">
                 <div className="text-right flex-1">
                    {success && <p className="text-emerald-600 dark:text-emerald-400 text-sm font-black animate-fade-in">{success}</p>}
                    {error && <p className="text-red-500 dark:text-red-400 text-sm font-black animate-fade-in">{error}</p>}
                 </div>
                 <button type="submit" disabled={loading} className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white font-black rounded-[1.25rem] shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all text-sm disabled:opacity-50">
                    {loading ? "جاري الحفظ..." : "تحديث البيانات"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
