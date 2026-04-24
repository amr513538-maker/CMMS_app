import React, { useState, useEffect } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  
  const [newDeptName, setNewDeptName] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [error, setError] = useState(null);

  // Edit states
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState("");
  const [editingJobId, setEditingJobId] = useState(null);
  const [editingJobTitleName, setEditingJobTitleName] = useState("");
  
  // Custom Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState({ show: false, type: null, id: null, title: "" });

  const fetchDepartments = async () => {
    try {
      const res = await api("/api/departments");
      const data = await res.json();
      setDepartments(data);
    } catch (err) { console.error(err); }
  };

  const fetchJobTitles = async (deptId) => {
    try {
      const res = await api(`/api/job-titles?department_id=${deptId}`);
      const data = await res.json();
      setJobTitles(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchJobTitles(selectedDept.id);
    } else {
      setJobTitles([]);
    }
  }, [selectedDept]);

  const handleAddDept = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api("/api/departments", {
        method: "POST",
        body: JSON.stringify({ name: newDeptName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewDeptName("");
      fetchDepartments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateDept = async (id) => {
    setError(null);
    try {
      const res = await api(`/api/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingDeptName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingDeptId(null);
      fetchDepartments();
    } catch (err) {
      setError(err.message);
    }
  };

  const executeDelete = async () => {
    const { type, id } = confirmDelete;
    try {
      if (type === "dept") {
        const res = await api(`/api/departments/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "فشل الحذف");
        }
        if (selectedDept && selectedDept.id === id) setSelectedDept(null);
        fetchDepartments();
      } else {
        const res = await api(`/api/job-titles/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "فشل الحذف");
        }
        fetchJobTitles(selectedDept.id);
      }
      setConfirmDelete({ show: false, type: null, id: null, title: "" });
    } catch (err) {
      alert("خطأ: " + err.message);
      setConfirmDelete({ show: false, type: null, id: null, title: "" });
    }
  };

  const openDeleteModal = (type, id, title) => {
    setConfirmDelete({ show: true, type, id, title });
  };

  const handleAddJobTitle = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api("/api/job-titles", {
        method: "POST",
        body: JSON.stringify({ department_id: selectedDept.id, title: newJobTitle })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewJobTitle("");
      fetchJobTitles(selectedDept.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateJobTitle = async (id) => {
    setError(null);
    try {
      const res = await api(`/api/job-titles/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title: editingJobTitleName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingJobId(null);
      fetchJobTitles(selectedDept.id);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">الأقسام والمسميات الوظيفية 🏢</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">إدارة الهيكل التنظيمي للنظام لتسهيل تسجيل المستخدمين.</p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl border border-red-100 dark:border-red-800">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Departments List */}
        <PageCard title="الأقسام المتوفرة">
          <form onSubmit={handleAddDept} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newDeptName} 
              onChange={e => setNewDeptName(e.target.value)} 
              placeholder="اسم القسم الجديد (مثل: قسم تكنولوجيا المعلومات)" 
              required
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
            />
            <button type="submit" className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all">إضافة</button>
          </form>

          <div className="space-y-2">
            {departments.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 font-bold text-center py-6">لا توجد أقسام مسجلة حتى الآن.</p>
            ) : (
              departments.map(dept => (
                <div 
                  key={dept.id} 
                  className={`flex justify-between items-center p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedDept?.id === dept.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  onClick={() => setSelectedDept(dept)}
                >
                  {editingDeptId === dept.id ? (
                    <div className="flex flex-1 gap-2 mr-2" onClick={e => e.stopPropagation()}>
                      <input 
                        autoFocus
                        className="flex-1 px-3 py-1 border border-blue-400 dark:border-blue-600 rounded-lg outline-none font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        value={editingDeptName}
                        onChange={e => setEditingDeptName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdateDept(dept.id)}
                      />
                      <button onClick={() => handleUpdateDept(dept.id)} className="text-green-600 font-black px-2">✓</button>
                      <button onClick={() => setEditingDeptId(null)} className="text-red-600 font-black px-2">✕</button>
                    </div>
                  ) : (
                    <span className="font-bold text-slate-800 dark:text-slate-200">{dept.name}</span>
                  )}
                  
                  <div className="flex gap-1">
                    {editingDeptId !== dept.id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingDeptId(dept.id); setEditingDeptName(dept.name); }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="تعديل القسم"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); openDeleteModal("dept", dept.id, dept.name); }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف القسم"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </PageCard>

        {/* Job Titles for selected Department */}
        <PageCard title={selectedDept ? `المسميات في: ${selectedDept.name}` : "المسميات الوظيفية"}>
          {!selectedDept ? (
            <div className="text-center py-20 text-slate-400 font-bold">
              يرجى تحديد قسم من القائمة أولاً لعرض مسمياته.
            </div>
          ) : (
            <>
              <form onSubmit={handleAddJobTitle} className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newJobTitle} 
                  onChange={e => setNewJobTitle(e.target.value)} 
                  placeholder="المسمى الوظيفي (مثل: مطور ويب، مدير النظام)" 
                  required
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all">إضافة</button>
              </form>

              <div className="space-y-2">
                {jobTitles.length === 0 ? (
                  <p className="text-slate-400 font-bold text-center py-6">لم يتم إضافة مسميات لهذا القسم بعد.</p>
                ) : (
                  jobTitles.map(job => (
                    <div key={job.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                      {editingJobId === job.id ? (
                        <div className="flex flex-1 gap-2 mr-2">
                          <input 
                            autoFocus
                            className="flex-1 px-3 py-1 border border-blue-400 dark:border-blue-600 rounded-lg outline-none font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            value={editingJobTitleName}
                            onChange={e => setEditingJobTitleName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateJobTitle(job.id)}
                          />
                          <button onClick={() => handleUpdateJobTitle(job.id)} className="text-green-600 font-black px-2">✓</button>
                          <button onClick={() => setEditingJobId(null)} className="text-red-600 font-black px-2">✕</button>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-800 dark:text-slate-200">{job.title}</span>
                      )}

                      <div className="flex gap-1">
                        {editingJobId !== job.id && (
                          <button 
                            onClick={() => { setEditingJobId(job.id); setEditingJobTitleName(job.title); }}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="تعديل المسمى"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        <button 
                          onClick={() => openDeleteModal("job", job.id, job.title)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="حذف المسمى"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </PageCard>

      </div>

      {/* Confirmation Modal */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-up border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center font-bold mb-8">
              هل أنت متأكد من حذف <span className="text-red-600 dark:text-red-400">"{confirmDelete.title}"</span>؟ 
              {confirmDelete.type === "dept" && " سيتم حذف جميع المسميات الوظيفية التابعة لهذا القسم أيضاً."}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={executeDelete}
                className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                تأكيد الحذف
              </button>
              <button 
                onClick={() => setConfirmDelete({ show: false, type: null, id: null, title: "" })}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
