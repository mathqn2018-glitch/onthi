import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onClose: () => void; // Optional if we want to force input
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave }) => {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all scale-100 border border-white/20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/20 rotate-3 hover:rotate-6 transition-transform">
            <i className="fa-solid fa-key text-white text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Kết nối Gemini AI</h2>
          <p className="text-slate-500 mt-3 text-sm leading-relaxed">
            Nhập API Key để kích hoạt trí tuệ nhân tạo. Key của bạn được lưu an toàn cục bộ trên trình duyệt này.
          </p>
        </div>

        <div className="relative mb-6">
           <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
           <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Dán API Key (bắt đầu bằng AIza...)"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all bg-slate-50"
           />
        </div>

        <button
          onClick={() => {
            if (key.trim().length > 0) onSave(key);
          }}
          className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Kết nối & Bắt đầu <i className="fa-solid fa-arrow-right"></i>
        </button>
        
        <div className="mt-6 text-center pt-4 border-t border-slate-100">
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noreferrer"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center justify-center gap-1"
          >
            <i className="fa-brands fa-google"></i> Lấy API Key miễn phí tại đây
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;