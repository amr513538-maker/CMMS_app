import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageCard from "../components/PageCard";

export default function TrackInputPage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleTrack = () => {
    if (code.trim()) {
      navigate(`/track/${code.trim()}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 sm:py-20 animate-fade-up">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 mx-auto mb-8 transform hover:scale-105 transition-transform duration-500">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">مركز تتبع الطلبات الذكي 🔍</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-xl mx-auto leading-relaxed">
          أدخل كود التتبع الخاص بك للحصول على تحديثات فورية حول حالة الصيانة وجدول التنفيذ المتوقع.
        </p>
      </div>

      <PageCard>
        <div className="p-2 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <span className="absolute inset-y-0 right-5 flex items-center text-blue-600 font-black text-xl pointer-events-none group-focus-within:scale-110 transition-transform">#</span>
              <input 
                type="text" 
                placeholder="أدخل كود الطلب (مثال: CMMS-2026-XXXXX)" 
                className="w-full pr-12 pl-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-lg"
                value={code} 
                onChange={e => setCode(e.target.value)} 
                onKeyDown={e => e.key === "Enter" && handleTrack()}
              />
            </div>
            <button 
              className="px-10 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all text-lg whitespace-nowrap"
              onClick={handleTrack}
            >
              بدأ التتبع الآن
            </button>
          </div>
          
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-slate-100 dark:border-slate-800">
             <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 group">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-xs font-black uppercase tracking-widest">تحديثات فورية</span>
             </div>
             <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <span className="text-xs font-black uppercase tracking-widest">آمن ومشفر</span>
             </div>
             <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 group">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-xs font-black uppercase tracking-widest">متاح دائماً</span>
             </div>
          </div>
        </div>
      </PageCard>


    </div>
  );
}
