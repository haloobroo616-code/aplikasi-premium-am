import { User } from "../types";
import { LogOut, Zap, Shield, Crown, Clock, Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight, Activity, Calendar } from "lucide-react";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  onRefresh: () => void;
  onLoginRequest: () => void;
  siteStatus: "open" | "closed";
}

export default function Dashboard({ user, onLogout, onRefresh, onLoginRequest, siteStatus }: DashboardProps) {
  const [email, setEmail] = useState("");
  const [magicUrl, setMagicUrl] = useState("");
  const [step, setStep] = useState(1); // 1: Send, 2: Verif
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/am/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStep(2);
        setMessage({ type: "success", text: "Magic link sent! Check your email." });
        onRefresh();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to send link" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSite = async () => {
    setLoading(true);
    try {
      const newStatus = siteStatus === 'open' ? 'closed' : 'open';
      const res = await fetch("/api/admin/toggle-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerif = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/am/verif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: magicUrl }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: "success", 
          text: `Berhasil diaktifkan! Code Order: ${data.codeorder || '-'}` 
        });
        setStep(1);
        setEmail("");
        setMagicUrl("");
        onRefresh();
      } else {
        setMessage({ type: "error", text: data.error || "Verification failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'Admin';
  const limitDisplay = isAdmin ? "∞" : (user?.limit || "Unlimited");
  const remaining = isAdmin ? "∞" : (user ? user.limit - user.todayCount : "Unlimited");

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-12"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-[14px] flex items-center justify-center text-white shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Up AM Premium</h1>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 ${siteStatus === 'open' ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full animate-pulse`} />
              <p className="text-[13px] text-slate-500 font-bold uppercase tracking-widest">
                {siteStatus === 'open' ? 'Service Online' : 'Service Offline'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-slate-900">@{user.username}</span>
                <span className="text-xs font-medium text-slate-500">{user.role} Account</span>
              </div>
              <button
                onClick={onLogout}
                className="group flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 transition-all font-bold text-sm text-slate-600 active:scale-95"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={onLoginRequest}
              className="group flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-900 text-white hover:bg-indigo-600 transition-all font-bold text-sm active:scale-95 shadow-lg shadow-slate-100"
            >
              Admin Login
            </button>
          )}
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Left Column: User Profile & Stats */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 space-y-6"
        >
          {isAdmin && (
            <div className={`p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden group transition-colors duration-500 ${
              siteStatus === 'open' ? 'bg-slate-900' : 'bg-rose-950'
            }`}>
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Shield className="w-24 h-24 rotate-12" />
              </div>
              <h3 className="text-lg font-bold mb-4 relative z-10 flex items-center gap-2 text-indigo-400">
                <Shield className="w-5 h-5" />
                Admin Dashboard Control
              </h3>
              <p className="text-slate-400 text-sm mb-6 relative z-10 font-medium">
                {siteStatus === 'open' 
                  ? "Status: Public. Website dapat diakses oleh semua pengguna." 
                  : "Status: Private. Website ditutup untuk publik. Hanya Admin yang bisa melihat Dashboard."}
              </p>
              <button 
                onClick={toggleSite}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 relative z-10 shadow-lg ${
                  siteStatus === 'open' 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                }`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                  siteStatus === 'open' ? 'Tutup Website (Close)' : 'Buka Website (Open)'
                )}
              </button>
            </div>
          )}

          {/* Profile Card / Guest Card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
              <Crown className="w-32 h-32 rotate-12" />
            </div>
            
            <div className="flex items-center gap-5 mb-8 relative">
              <div className="w-16 h-16 bg-slate-50 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-400">
                {user ? <Shield className="w-8 h-8" /> : <Zap className="w-8 h-8 text-indigo-600" />}
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">
                  {user ? 'Account Profile' : 'Guest Mode'}
                </p>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                  {user ? `@${user.username}` : 'Public User'}
                </h3>
              </div>
            </div>
            
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isAdmin ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                    <Crown className={`w-4 h-4 ${isAdmin ? 'text-amber-600' : 'text-indigo-600'}`} />
                  </div>
                  <span className="text-sm font-bold text-slate-600">Access</span>
                </div>
                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                  isAdmin ? 'bg-amber-100 text-amber-700' : (user ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600')
                }`}>
                  {user ? user.role : 'Public'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-600">Daily Quota</span>
                </div>
                <span className="text-sm font-black text-slate-900">{remaining} / {limitDisplay}</span>
              </div>
            </div>

            {user && (
              <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Reset</p>
                    <p className="text-sm font-bold text-slate-900">{new Date(user.lastReset).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reset Cycle</p>
                    <p className="text-sm font-bold text-slate-900">Every 30 Hours</p>
                  </div>
                </div>
              </div>
            )}
            
            {!user && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 leading-relaxed italic text-center">
                  Nikmati layanan premium AM gratis tanpa login. Gunakan fitur di sebelah kanan untuk memulai.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column: Main Action */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8"
        >
          <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-3">
                  <Zap className="w-7 h-7 text-indigo-600 fill-indigo-600/10" />
                  Premium AM Upgrade
                </h3>
                <p className="text-slate-500 font-medium">Layanan aktivasi Alight Motion Premium cepat & mudah</p>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2].map((s) => (
                  <div 
                    key={s} 
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      step === s ? 'w-10 bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.3)]' : 
                      step > s ? 'w-6 bg-emerald-500' : 'w-6 bg-slate-100'
                    }`} 
                  />
                ))}
              </div>
            </div>

            <div className="mb-10">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.form 
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleSend} 
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[13px] font-black text-slate-700 uppercase tracking-wider">Step 1: AM Email</label>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">REQUIRED</span>
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="your.email@example.com"
                          className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-200 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400 font-bold"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                      <p className="text-[13px] text-indigo-700 leading-relaxed font-semibold">
                        Masukkan email yang terdaftar di Alight Motion. Magic link akan dikirim ke inbox email tersebut.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || (!isAdmin && remaining === 0)}
                      className="w-full bg-slate-900 text-white py-5 rounded-[20px] font-black text-lg hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-3 group"
                    >
                      {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <span>Request Magic Link</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                    {!isAdmin && remaining === 0 && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-600">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">Daily limit reached. Resets in 30h.</p>
                      </div>
                    )}
                  </motion.form>
                ) : (
                  <motion.form 
                    key="step2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleVerif} 
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[13px] font-black text-slate-700 uppercase tracking-wider">Step 2: Activation URL</label>
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">VERIFICATION</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mb-2 pl-1">
                        Cek email <span className="text-indigo-600">{email}</span> lalu copy link dari tombol aktivasi.
                      </p>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <input
                          type="url"
                          required
                          placeholder="https://alightcreative.com/login/..."
                          className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-200 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400 font-bold"
                          value={magicUrl}
                          onChange={(e) => setMagicUrl(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 px-6 py-5 rounded-[20px] border-2 border-slate-100 font-black text-slate-500 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
                      >
                        Go Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] bg-indigo-600 text-white py-5 rounded-[20px] font-black text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-3"
                      >
                        {loading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <span>Activate Now</span>
                            <Zap className="w-5 h-5 fill-white" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {message.text && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-5 rounded-[24px] flex items-start gap-4 ${
                    message.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-100/50' 
                      : 'bg-rose-50 text-rose-800 border-2 border-rose-100/50'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${message.type === 'success' ? 'bg-emerald-200/50' : 'bg-rose-200/50'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold uppercase tracking-wider mb-0.5 opacity-60">
                      {message.type === 'success' ? 'Operation Success' : 'Operation Failed'}
                    </p>
                    <p className="text-sm font-black leading-snug">{message.text}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-slate-400 py-12"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-50">Authorized Access Only</p>
        <p className="text-[11px] font-medium">© 2026 Up AM Premium Service • Powered by Advanced Cloud Infrastructure</p>
      </motion.footer>
    </div>
  );
}
