import { useState, useEffect } from "react";
import { User } from "./types";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import Maintenance from "./components/Maintenance";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteStatus, setSiteStatus] = useState<"open" | "closed">("open");
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      // Check user status
      const userRes = await fetch("/api/user/status");
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      // Check site status
      const siteRes = await fetch("/api/site-status");
      if (siteRes.ok) {
        const siteData = await siteRes.json();
        setSiteStatus(siteData.status);
      }
    } catch (err) {
      console.error("Initialization failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setShowAuth(false);
    // Re-check site status after login (admin might have changed it)
    initApp();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const handleRefresh = () => {
    initApp();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isAdmin = user?.role === "Admin";
  const isClosed = siteStatus === "closed" && !isAdmin;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-slate-500/5 blur-[150px]" />
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {showAuth ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center min-h-screen p-4"
            >
              <div className="w-full max-w-md relative">
                <button 
                  onClick={() => setShowAuth(false)}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ← Tutup Login
                </button>
                <Auth onAuthSuccess={handleAuthSuccess} />
              </div>
            </motion.div>
          ) : isClosed ? (
            <motion.div
              key="maintenance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Maintenance onAdminLogin={() => setShowAuth(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Dashboard 
                user={user} 
                onLogout={handleLogout} 
                onRefresh={handleRefresh} 
                onLoginRequest={() => setShowAuth(true)}
                siteStatus={siteStatus}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
