import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import Modal from "../../components/Modal";

export default function DevicesView({ labId }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => { if (labId) fetchDevices() }, [labId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    payload.labId = labId;
    try {
      if (editingDevice) {
        await api(`/api/devices/${editingDevice.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api(`/api/devices`, { method: "POST", body: JSON.stringify(payload) });
      }
      setShowModal(false);
      fetchDevices();
    } catch(err) {
      alert("خطأ أثناء حفظ الجهاز");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if(!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/devices/${deleteTarget.id}`, { method: "DELETE" });
      fetchDevices();
      setDeleteTarget(null);
    } catch(err) {
      alert("خطأ أثناء حذف الجهاز");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && devices.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse">
       <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
       <p className="mt-3 text-slate-400 text-xs font-bold uppercase tracking-widest">تحميل قائمة الأجهزة...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
           <h3 className="text-xl font-black text-slate-800 tracking-tight">الأصول الملحقة بالمعمل ({devices.length})</h3>
           <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full">مُحدث</span>
        </div>
        <button 
          className="px-5 py-2 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95"
          onClick={() => { setEditingDevice(null); setShowModal(true); }}
        >
          + تسجيل جهاز جديد
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">ID</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">اسم الأصول/العتاد</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">النوع</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">الحالة التشغيلية</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-20">
                     <div className="text-slate-300 mb-4 flex justify-center">
                       <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                     </div>
                     <p className="text-slate-400 font-bold">لا يوجد أصول مسجلة في هذا المعمل حالياً.</p>
                  </td>
                </tr>
              ) : (
                devices.map(dev => (
                  <tr key={dev.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-center">
                       <span className="text-xs font-black text-slate-400">#{dev.id}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{dev.name}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500 text-sm">
                       {dev.type || "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                        dev.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                        dev.status === 'Maintenance' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {dev.status === 'Active' ? 'نشط' : dev.status === 'Maintenance' ? 'صيانة' : dev.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingDevice(dev); setShowModal(true); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button 
                          onClick={() => setDeleteTarget(dev)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal
          title={editingDevice ? "تحديث بيانات الأصول" : "تسجيل جهاز جديد في المعمل"}
          description="يرجى إدخال البيانات التقنية بدقة لتسهيل عمليات الجرد والتتبع."
          onCancel={() => setShowModal(false)}
          onConfirm={() => document.getElementById('deviceForm').requestSubmit()}
          confirmText={saving ? "جاري الحفظ..." : "حفظ الأصول"}
          type="primary"
        >
          <form id="deviceForm" className="space-y-6 text-right mt-6" onSubmit={handleSave}>
            <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">اسم الجهاز / العتاد</label>
               <input name="name" defaultValue={editingDevice?.name || ""} required placeholder="مثال: Dell Monitor 24\"" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900" />
            </div>
            
            <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">نوع الأصول (Category)</label>
               <input name="type" defaultValue={editingDevice?.type || ""} placeholder="مثال: PC, Printer, Projector..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900" />
            </div>

            <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">الحالة التشغيلية الحالية</label>
               <select name="status" defaultValue={editingDevice?.status || "Active"} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOWE5YmE3IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWpvaW5lcj0icm91bmQiIGQ9Ik0xOSA5bC03IDctNy03IiAvPjwvc3ZnPg==')] bg-no-repeat bg-[position:left_1rem_center] bg-[length:1.25rem]">
                  <option value="Active">نشط (Active)</option>
                  <option value="Inactive">غير نشط (Inactive)</option>
                  <option value="Maintenance">تحت الصيانة (Maintenance)</option>
                  <option value="Retired">خارج الخدمة (Retired)</option>
               </select>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          title="تأكيد حذف الجهاز"
          description={`هل أنت متأكد من حذف الجهاز "${deleteTarget.name}" نهائياً؟ لن تتمكن من استرجاع بياناته.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          confirmText={deleting ? "جاري الحذف..." : "حذف الجهاز نهائياً"}
          type="danger"
        />
      )}
    </div>
  );
}
