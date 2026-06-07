import React, { useState } from "react";
import { LogIn, Mail, Lock, AlertCircle, Loader, Key, Eye, EyeOff } from "lucide-react";
import { Student } from "../types";

interface LoginFormProps {
  onAuthSuccess: (token: string, student: Student) => void;
  onToggleForm: () => void;
}

export default function LoginForm({ onAuthSuccess, onToggleForm }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please complete all credential fields.");
      triggerShake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const rawText = await response.text();
        console.error("[Login Debug] Non-JSON Response received:", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          rawText: rawText.substring(0, 300)
        });
        throw new Error(
          `System is currently initializing resources (Server status: ${response.status}). Please wait 3 seconds and try again.`
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Credential authentication failed.");
      }

      onAuthSuccess(data.token, data.student);
    } catch (err: any) {
      console.error("[Login Exception]", err);
      if (err.message && (err.message.includes("Unexpected token") || err.message.includes("is not valid JSON") || err.message.includes("JSON.parse"))) {
        setError("Database server is starting up or updating. Please try logging in again in 5 seconds.");
      } else {
        setError(err.message || "Server connection could not be established.");
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 transition-transform ${shake ? "animate-shake" : ""}`} id="login-card">
      <div className="flex flex-col mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight">NEXHIRE</h2>
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mt-1">Placement & Career Services Platform</h3>
        <p className="text-slate-400 text-xs mt-2.5 leading-relaxed font-sans">Empowering students, recruiters, and placement coordinators through a modern campus recruitment ecosystem.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-rose-950/40 border border-rose-900/60 text-rose-400 p-4 rounded-xl mb-6 text-xs" id="login-error-container">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4" id="login-form">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">University Email</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Mail className="w-4.5 h-4.5" />
            </span>
            <input
              id="login-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              placeholder="student@university.edu"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Access Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Lock className="w-4.5 h-4.5" />
            </span>
            <input
              id="login-password-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          id="login-submit-button"
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-8 cursor-pointer"
        >
          {loading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <LogIn className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
              <span>Sign In to NEXHIRE</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
        <p className="text-slate-400 text-xs">
          New university student?{" "}
          <button
            id="toggle-to-register-btn"
            onClick={onToggleForm}
            className="text-indigo-400 hover:text-indigo-350 font-bold focus:outline-none underline cursor-pointer ml-1"
          >
            Register Student Profile
          </button>
        </p>
      </div>

      <div className="mt-5 p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 text-left">
        <p className="font-bold text-amber-400 mb-1 flex items-center gap-1">
          <span>💡</span> Demo Access Credentials:
        </p>
        <p>Email: <span className="font-mono text-white select-all">student@university.edu</span></p>
        <p>Password: <span className="font-mono text-white select-all">password123</span></p>
      </div>
    </div>
  );
}
