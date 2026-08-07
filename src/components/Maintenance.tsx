import { motion } from "motion/react";
import { AlertCircle, Zap } from "lucide-react";

interface MaintenanceProps {
  onAdminLogin: () => void;
}

export default function Maintenance({ onAdminLogin }: MaintenanceProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl text-center"
      >
        <div className="w-20 h-20 bg-rose-50 rounded-[24px] flex items-center justify-center text-rose-600 mx-auto mb-8 ring-8 ring-rose-50/50">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">Website Closed</h1>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
          Mohon maaf, layanan sedang ditutup sementara oleh Administrator. Silakan kembali lagi nanti.
        </p>
        
        <div className="pt-8 border-t border-slate-100 flex flex-col gap-4">
          <button 
            onClick={onAdminLogin}
            className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
          >
            Admin Login
          </button>
          
          <div className="flex items-center justify-center gap-2 opacity-30">
            <Zap className="w-4 h-4 text-slate-900" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Up AM Premium</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
