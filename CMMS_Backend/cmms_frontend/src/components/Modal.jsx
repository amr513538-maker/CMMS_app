import React from "react";
import { createPortal } from "react-dom";

export default function Modal({ title, description, onCancel, onConfirm, confirmText = "تأكيد", cancelText = "إلغاء", type = "danger", maxWidth = "max-w-md", children }) {
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-500">
      <div className={`bg-white dark:bg-slate-900 w-full ${maxWidth} rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh] relative transition-colors`}>
        
        {/* Close Button (Top Right) */}
        <button 
          onClick={onCancel}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all z-[160]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 sm:p-10 text-center">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-lg transform -rotate-3 ${
              type === 'danger' ? 'bg-red-50 dark:bg-red-900/30 text-red-500 shadow-red-200/50' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 shadow-blue-200/50'
            }`}>
              {type === 'danger' ? (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{title}</h3>
            {description && <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">{description}</p>}
            
            {children && <div className="text-right">{children}</div>}
          </div>
        </div>

        {/* Actions (Only show if onConfirm is provided) */}
        {onConfirm && (
          <div className="bg-slate-50/50 dark:bg-slate-800/50 px-8 py-6 flex flex-row-reverse gap-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onConfirm}
              className={`flex-1 py-4 rounded-2xl text-base font-black shadow-xl transition-all active:scale-95 ${
                type === 'danger' ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              {confirmText}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-2xl text-base font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
            >
              {cancelText}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
