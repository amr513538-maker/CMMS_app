import React, { useState, useEffect } from "react";
import PageCard from "../../components/PageCard";
import { api } from "../../api/client";
import Modal from "../../components/Modal";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LabsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [labs, setLabs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [filteredLabs, setFilteredLabs] = useState([]);
  const [expandedLabId, setExpandedLabId] = useState(null);
  const [prefillLab, setPrefillLab] = useState(null);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [buildingNameError, setBuildingNameError] = useState(false);
  const [buildingFilter, setBuildingFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState({ type: null, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [labsR, devR, deptR, bldR] = await Promise.allSettled([
        api("/api/labs").then(r => r.json()),
        api("/api/devices").then(r => r.json()),
        api("/api/departments").then(r => r.json()),
        api("/api/buildings").then(r => r.json()),
      ]);
      if (labsR.status === "fulfilled" && Array.isArray(labsR.value)) setLabs(labsR.value);
      if (devR.status === "fulfilled" && Array.isArray(devR.value)) setDevices(devR.value);
      if (deptR.status === "fulfilled" && Array.isArray(deptR.value)) setDepartments(deptR.value);
      if (bldR.status === "fulfilled" && Array.isArray(bldR.value)) setBuildings(bldR.value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const b = prefillLab?.building || selectedBuilding;
    if (b) setFilteredLabs(labs.filter(l => l.building === b));
    else setFilteredLabs([]);
  }, [selectedBuilding, labs, prefillLab]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const selectClass = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white appearance-none transition-colors";
  const inputClass = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white transition-colors";

  const handleSaveLab = async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = editingLab 
        ? await api(`/api/labs/${editingLab.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await api("/api/labs", { method: "POST", body: JSON.stringify(payload) });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "فشل الحفظ");
        return;
      }
      
      setShowModal(false); 
      setEditingLab(null); 
      fetchData();
    } catch (err) { 
      console.error(err);
      alert("حدث خطأ في الاتصال بالسيرفر"); 
    }
  };

  const handleSaveDevice = async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = editingDevice 
        ? await api(`/api/devices/${editingDevice.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await api("/api/devices", { method: "POST", body: JSON.stringify(payload) });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "فشل حفظ الجهاز");
        return;
      }
      
      setShowDeviceModal(false); 
      setPrefillLab(null); 
      setEditingDevice(null); 
      fetchData();
    } catch (err) { 
      console.error(err);
      alert("حدث خطأ في الاتصال بالسيرفر"); 
    }
  };

  const handleAddBuilding = async () => {
    if (!newBuildingName.trim()) {
      setBuildingNameError(true);
      return;
    }
    setBuildingNameError(false);
    try {
      const res = await api("/api/buildings", { method: "POST", body: JSON.stringify({ name: newBuildingName.trim() }) });
      const data = await res.json();
      if (!res.ok) { setBuildingNameError(true); alert(data.error); return; }
      setNewBuildingName(""); fetchData();
    } catch { setBuildingNameError(true); alert("فشل إضافة المبنى"); }
  };

  const requestDelete = (type, id, name) => setDeleteTarget({ type, id, name });

  const executeDelete = async () => {
    if (!deleteTarget.id) return;
    setDeleting(true);
    try {
      const { type, id } = deleteTarget;
      if (type === 'lab') await api(`/api/labs/${id}`, { method: "DELETE" });
      else if (type === 'device') await api(`/api/devices/${id}`, { method: "DELETE" });
      else if (type === 'building') await api(`/api/buildings/${id}`, { method: "DELETE" });
      fetchData();
      setDeleteTarget({ type: null, id: null, name: "" });
    } catch { alert("فشل الحذف"); }
    finally { setDeleting(false); }
  };

  const displayedLabs = buildingFilter ? labs.filter(l => l.building === buildingFilter) : labs;

  if (loading && labs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-pulse">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-xs">جاري مزامنة بيانات الأصول...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up pb-10">
      {/* Buildings Manager — FIRST */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm p-8 transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">إدارة المباني 🏢</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">أضف المباني أولاً ثم أنشئ المعامل والأجهزة داخلها</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase">{buildings.length} مباني</span>
        </div>
        <div className="flex gap-3 mb-4">
          <input 
            value={newBuildingName} 
            onChange={e => {
              setNewBuildingName(e.target.value.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ''));
              if(buildingNameError) setBuildingNameError(false);
            }} 
            maxLength={5}
            placeholder="اسم المبنى الجديد (مثال: B9)" 
            className={`flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-bold text-slate-900 dark:text-white text-sm transition-all ${buildingNameError ? 'border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-600' : 'border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600'}`} 
            onKeyDown={e => e.key === 'Enter' && handleAddBuilding()} 
          />
          <button onClick={handleAddBuilding} className="px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl text-sm hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20">+ إضافة مبنى</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {buildings.map(b => (
            <div key={b.id} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl group">
              <span className="font-black text-slate-700 dark:text-slate-300 text-sm">{b.name}</span>
              <button onClick={() => requestDelete('building', b.id, b.name)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
          {buildings.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">لا توجد مباني — أضف مبنى أعلاه للبدء</p>}
        </div>
      </section>

      {/* Header — Add Lab */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">إدارة المعامل والأصول 🧪</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">المباني → المعامل → الأجهزة</p>
        </div>
        <button onClick={() => { setEditingLab(null); setShowModal(true); }} className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
          + إضافة معمل جديد
        </button>
      </div>

      {/* Filter */}
      {buildings.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setBuildingFilter("")} className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${!buildingFilter ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>الكل</button>
          {buildings.map(b => (
            <button key={b.id} onClick={() => setBuildingFilter(b.name)} className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${buildingFilter === b.name ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{b.name}</button>
          ))}
        </div>
      )}

      {/* Labs Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden transition-colors">
        <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">قائمة المعامل</h3>
          <span className="px-4 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase">{displayedLabs.length} معامل</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="w-10 px-6 py-5 text-center text-xs font-black text-slate-400 dark:text-slate-500 uppercase">#</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase">المبنى</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase">رقم المعمل</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase">القسم</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase text-center">الأجهزة</th>
                <th className="px-10 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedLabs.length === 0 ? (
                <tr><td colSpan="6" className="px-10 py-20 text-center text-slate-400 dark:text-slate-600 font-bold italic">لا توجد معامل {buildingFilter && `في ${buildingFilter}`}</td></tr>
              ) : displayedLabs.map(lab => (
                <React.Fragment key={lab.id}>
                  <tr className={`transition-all cursor-pointer group ${expandedLabId === lab.id ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`} onClick={() => setExpandedLabId(expandedLabId === lab.id ? null : lab.id)}>
                    <td className="px-6 py-6 text-center">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${expandedLabId === lab.id ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                      </div>
                    </td>
                    <td className="px-6 py-6"><span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black">{lab.building || "—"}</span></td>
                    <td className="px-6 py-6"><span className="font-black text-slate-900 dark:text-white text-sm">{lab.name}</span></td>
                    <td className="px-6 py-6 text-slate-500 dark:text-slate-400 font-bold text-sm">{lab.department || "عام"}</td>
                    <td className="px-6 py-6 text-center"><span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${lab.device_count > 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{lab.device_count || 0}</span></td>
                    <td className="px-10 py-6 text-left" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setPrefillLab(lab); setEditingDevice(null); setShowDeviceModal(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all text-[10px] font-black">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>جهاز
                        </button>
                        <button onClick={() => { setEditingLab(lab); setShowModal(true); }} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onClick={() => requestDelete('lab', lab.id, lab.name)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedLabId === lab.id && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                      <td colSpan="6" className="p-0 border-b border-slate-200 dark:border-slate-800">
                        <div className="p-6 pr-16">
                          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <table className="w-full text-right text-xs">
                              <thead className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 uppercase">اسم الجهاز</th>
                                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 uppercase">النوع</th>
                                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 uppercase">الحالة</th>
                                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 uppercase text-left">إجراءات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {devices.filter(d => String(d.lab_id) === String(lab.id)).length === 0 ? (
                                  <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 dark:text-slate-600 font-bold italic">لا توجد أجهزة</td></tr>
                                ) : devices.filter(d => String(d.lab_id) === String(lab.id)).map(dev => (
                                  <tr key={dev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-200">{dev.name}</td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-bold uppercase">{dev.type || "عام"}</td>
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${dev.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : dev.status === 'Maintenance' ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>{dev.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => { setEditingDevice(dev); setPrefillLab(lab); setShowDeviceModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-all">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        </button>
                                        <button onClick={() => requestDelete('device', dev.id, dev.name)} className="p-1.5 text-slate-400 hover:text-red-600 transition-all">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lab Modal */}
      {showModal && (
        <Modal title={editingLab ? "تعديل بيانات المعمل" : "إضافة معمل جديد"} onCancel={() => { setShowModal(false); setEditingLab(null); }} onConfirm={() => document.getElementById('labForm').requestSubmit()} confirmText={editingLab ? "حفظ التغييرات" : "إضافة المعمل"} type="primary">
          <form id="labForm" className="space-y-6 text-right mt-6" onSubmit={handleSaveLab} autoComplete="off">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">المبنى</label>
                <select name="building" defaultValue={editingLab?.building || ""} required className={selectClass}>
                  <option value="">اختر المبنى</option>
                  {buildings.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">القسم</label>
                <select name="department" defaultValue={editingLab?.department || ""} required className={selectClass}>
                  <option value="">اختر القسم</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">رقم المعمل / القاعة</label>
              <input type="number" name="name" defaultValue={editingLab?.name || ""} required placeholder="مثال: 101" className={inputClass} />
            </div>
          </form>
        </Modal>
      )}

      {/* Device Modal */}
      {showDeviceModal && (
        <Modal title={editingDevice ? "تعديل بيانات الجهاز" : "تسجيل جهاز جديد"} description={prefillLab && !editingDevice ? `إضافة جهاز إلى: ${prefillLab.name}` : ""} onCancel={() => { setShowDeviceModal(false); setPrefillLab(null); setEditingDevice(null); }} onConfirm={() => document.getElementById('deviceForm').requestSubmit()} confirmText={editingDevice ? "حفظ التغييرات" : "تسجيل الجهاز"} type="primary" maxWidth="max-w-lg">
          <form id="deviceForm" className="space-y-6 text-right mt-6" onSubmit={handleSaveDevice} autoComplete="off">
            {!editingDevice && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">المبنى</label>
                  <select required value={prefillLab?.building || selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)} disabled={!!prefillLab} className={selectClass + " disabled:opacity-70"}>
                    <option value="">اختر المبنى</option>
                    {buildings.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">المعمل</label>
                  <select name="lab_id" required value={prefillLab ? String(prefillLab.id) : ""} disabled={!!prefillLab} onChange={() => {}} className={selectClass + " disabled:opacity-70"}>
                    <option value="">اختر المعمل</option>
                    {filteredLabs.map(l => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
                  </select>
                  {prefillLab && <input type="hidden" name="lab_id" value={prefillLab.id} />}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">اسم الجهاز</label>
              <input name="name" defaultValue={editingDevice?.name || ""} required placeholder="مثال: PC-LAB1-01" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">نوع الجهاز</label>
                <input name="type" defaultValue={editingDevice?.type || ""} placeholder="Desktop, Printer..." className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">الحالة</label>
                <select name="status" defaultValue={editingDevice?.status || "Active"} className={selectClass}>
                  <option value="Active">نشط (Active)</option>
                  <option value="Maintenance">تحت الصيانة</option>
                  <option value="Out of Order">خارج الخدمة</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget.type && (
        <Modal
          title="تأكيد الحذف"
          description={
            deleteTarget.type === 'lab' ? `هل أنت متأكد من حذف المعمل "${deleteTarget.name}" وجميع أجهزته نهائياً؟` :
            deleteTarget.type === 'device' ? `هل أنت متأكد من حذف الجهاز "${deleteTarget.name}" نهائياً؟` :
            `هل أنت متأكد من حذف المبنى "${deleteTarget.name}" نهائياً؟`
          }
          onCancel={() => setDeleteTarget({ type: null, id: null, name: "" })}
          onConfirm={executeDelete}
          confirmText={deleting ? "جاري الحذف..." : "حذف نهائياً"}
          type="danger"
        />
      )}
    </div>
  );
}
