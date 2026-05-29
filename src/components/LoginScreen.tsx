import React, { useState } from "react";
import { Lock, User, Kanban, Loader2 } from "lucide-react";
import { api } from "../api";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in both fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      if (res && res.success) {
        onLoginSuccess(res);
      } else {
        setError(res ? res.message : "Invalid username or password");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your service is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f3f8] flex items-center justify-center p-4 selection:bg-[#9a55ff]/10 selection:text-[#9a55ff] relative overflow-hidden">
      {/* Decorative ambient light background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#da8cff]/5 rounded-full blur-[125px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#9a55ff]/5 rounded-full blur-[125px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/50 shadow-xl relative z-10 transition-all duration-300 hover:border-[#9a55ff]/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary text-white mb-4 shadow-md shadow-purple-500/15">
            <Kanban size={28} className="animate-pulse" />
          </div>
          <h2 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Yajur Fibres</h2>
          <p className="text-[#9a55ff] text-sm mt-2 font-sans font-extrabold tracking-wide uppercase">Automate to Innovate.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User size={18} />
              </span>
              <input
                type="text"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#9a55ff] focus:bg-white focus:ring-1 focus:ring-[#9a55ff] transition-all duration-200"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#9a55ff] focus:bg-white focus:ring-1 focus:ring-[#9a55ff] transition-all duration-200"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0"></span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-primary hover:opacity-95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-md shadow-purple-500/10 hover:shadow-lg hover:shadow-purple-500/15 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-mono tracking-wider">Professional Project Management System</p>
        </div>
      </div>
    </div>
  );
}
