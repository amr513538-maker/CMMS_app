import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageCard from "../components/PageCard";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

export default function TrackingPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTech, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Comment state
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentSuccess, setCommentSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api(`/api/maintenance-requests/track/${code}`);
      if (!res.ok) throw new Error("لم يتم العثور على الطلب");
      const json = await res.json();
      setData({ ...json.request, events: json.events || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [code]);

  const handleUpdateStatus = async () => {
    if (savingStatus) return;

    // تحقق من وجود معرف الطلب
    if (!data?.id) {
      alert("خطأ: لم يتم تحديد معرف الطلب. يرجى تحديث الصفحة.");
      return;
    }

    // تحذير إذا لم تتغير الحالة
    if (newStatus === data.status) {
      alert("الحالة التي اخترتها هي نفس الحالة الحالية. يرجى اختيار حالة مختلفة.");
      return;
    }

    setSavingStatus(true);
    try {
      const res = await api(`/api/maintenance-requests/${data.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }) // content-type يتولى api() تحديده
      });
      if (res.ok) {
        await fetchData();
        setShowStatusModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "فشل تحديث الحالة");
      }
    } catch (err) {
      alert("فشل تحديث الحالة: " + err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 3) {
      setCommentError("التعليق يجب أن لا يقل عن 3 أحرف");
      return;
    }
    setSendingComment(true);
    setCommentError(null);
    setCommentSuccess(false);
    try {
      const res = await api(`/api/maintenance-requests/${data.id}/events`, {
        method: "POST",
        body: JSON.stringify({ event_type: "comment", message: comment.trim() })
      });
      if (!res.ok) {
        // قراءة رسالة الخطأ الحقيقية من الـ server
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "فشل إرسال التعليق");
      }
      setComment("");
      setCommentSuccess(true);
      await fetchData(); // ← انتظر تحديث Timeline
      setTimeout(() => setCommentSuccess(false), 3000); // إخفاء رسالة النجاح بعد 3 ثواني
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setSendingComment(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Done': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'In Progress': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Done': return 'مكتمل ✅';
      case 'In Progress': return 'قيد التنفيذ ⚙️';
      default: return 'جديد 🆕';
    }
  };

  const getEventIcon = (type, index) => {
    if (index === 0) return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
    if (type === 'comment') return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
    if (type === 'assignment') return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse transition-colors">
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full mb-4"></div>
      <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded mb-2"></div>
      <div className="h-3 w-32 bg-slate-50 dark:bg-slate-800 rounded"></div>
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto py-20 text-center">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">عذراً، الطلب غير موجود</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8">الكود الذي أدخلته غير صحيح أو انتهت صلاحيته.</p>
      <Link to="/track" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">العودة لمركز التتبع</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black uppercase tracking-widest">
            وضع التتبع المباشر
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            متابعة الطلب <span className="text-blue-600 dark:text-blue-400">#{data.request_code}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            تم تسجيل الطلب في {new Date(data.requested_at || data.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="relative z-10 flex gap-3">
          {(isAdmin() || isTech()) && (
            <button
              onClick={() => {
                // اختر الحالة التالية المنطقية تلقائياً عند فتح المودال
                const nextStatus =
                  data.status === 'New' ? 'In Progress' :
                  data.status === 'In Progress' ? 'Done' :
                  'New'; // إذا كان Done أو غيره، ارجع لـ New
                setNewStatus(nextStatus);
                setShowStatusModal(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              تحديث الحالة
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">

          <PageCard title="تفاصيل الطلب">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">الموضوع</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{data.title || "بدون عنوان"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">الأصل / الجهاز</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{data.asset_name || "جهاز غير محدد"}</p>
                </div>
              </div>
              {data.location && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">الموقع</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{data.location}</p>
                </div>
              )}
              <div className="space-y-2 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">وصف المشكلة</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{data.description}</p>
              </div>
              {data.image_url && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={data.image_url} alt="عطل" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              )}
            </div>
          </PageCard>

          {/* Timeline */}
          <PageCard title="سجل تتبع الحالة">
            <div className="relative pt-4 pb-4">
              <div className="absolute top-0 bottom-0 right-[25px] w-0.5 bg-slate-100 dark:bg-slate-800"></div>
              <div className="space-y-10 relative">
                {data.events?.map((evt, index) => (
                  <div key={index} className="flex flex-row-reverse items-start gap-8 group">
                    <div className="relative z-10 flex flex-col items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                        index === 0 ? 'bg-blue-600 text-white shadow-blue-500/30' :
                        evt.event_type === 'comment' ? 'bg-violet-50 dark:bg-violet-900/30 border-2 border-violet-200 dark:border-violet-700 text-violet-500' :
                        'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}>
                        {getEventIcon(evt.event_type, index)}
                      </div>
                    </div>
                    <div className="flex-1 text-right pt-2">
                      <h4 className={`text-lg font-black ${
                        index === 0 ? 'text-blue-600 dark:text-blue-400' :
                        evt.event_type === 'comment' ? 'text-violet-600 dark:text-violet-400' :
                        'text-slate-800 dark:text-slate-200'
                      }`}>
                        {evt.event_type === 'status_change' ? evt.message :
                         evt.event_type === 'comment' ? 'تعليق' :
                         evt.event_type === 'assignment' ? evt.message : 'تحديث على الطلب'}
                      </h4>
                      {evt.event_type === 'comment' && (
                        <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-medium bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">{evt.message}</p>
                      )}
                      {evt.user_name && <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">بواسطة: {evt.user_name}</p>}
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase inline-block mt-3 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                        {new Date(evt.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PageCard>

          {/* Comments Box - For All Users */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-50 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              إضافة تعليق
            </h3>
            <form onSubmit={handleSendComment} className="space-y-4">
              <textarea
                value={comment}
                onChange={e => { setComment(e.target.value); setCommentError(null); setCommentSuccess(false); }}
                rows="3"
                placeholder="اكتب تعليقك أو ملاحظتك هنا..."
                disabled={sendingComment}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none transition-all font-medium text-slate-800 dark:text-white resize-none disabled:opacity-60 ${
                  commentError
                    ? 'border-red-400 focus:ring-4 focus:ring-red-500/10'
                    : commentSuccess
                    ? 'border-emerald-400 focus:ring-4 focus:ring-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500'
                }`}
              />
              {commentError && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {commentError}
                </div>
              )}
              {commentSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  تم إرسال التعليق بنجاح وظهر في السجل أعلاه ✅
                </div>
              )}
              <button
                type="submit"
                disabled={sendingComment || !comment.trim()}
                className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sendingComment ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>جاري الإرسال...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>إرسال التعليق</>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
            <div className="text-center">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">الحالة الحالية</span>
              <div className={`inline-flex px-8 py-3 rounded-2xl text-xl font-black ${getStatusStyle(data.status)}`}>
                {getStatusLabel(data.status)}
              </div>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 text-right">الأولوية</span>
                <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <span className={`text-sm font-black ${data.priority === 'Critical' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {data.priority === 'Critical' ? 'حرجة 🔴' : data.priority === 'High' ? 'عالية 🟠' : data.priority === 'Medium' ? 'متوسطة 🟡' : 'منخفضة 🟢'}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${data.priority === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
                </div>
              </div>
              {data.requested_by_name && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 text-right">مُقدَّم من</span>
                  <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{data.requested_by_name}</span>
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">
                      {data.requested_by_name?.charAt(0)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showStatusModal && (
        <Modal
          title="تحديث حالة طلب الصيانة"
          description="يرجى اختيار الحالة الجديدة التي وصل إليها الطلب حالياً."
          onCancel={() => setShowStatusModal(false)}
          onConfirm={handleUpdateStatus}
          confirmText={savingStatus ? "جاري الحفظ..." : "حفظ الحالة"}
          type="primary"
          confirmDisabled={savingStatus}
        >
          <div className="space-y-4 mt-6">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">الحالة المستهدفة</label>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white appearance-none transition-colors"
            >
              <option value="New">New (جديد)</option>
              <option value="In Progress">In Progress (قيد التنفيذ)</option>
              <option value="Done">Done (مكتمل)</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
