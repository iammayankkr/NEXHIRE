import React, { useState } from "react";
import { UserPlus, User, Mail, Lock, BookOpen, Calendar, ShieldCheck, AlertCircle, Loader, Eye, EyeOff } from "lucide-react";
import { Student } from "../types";

interface RegisterFormProps {
  onAuthSuccess: (token: string, student: Student) => void;
  onToggleForm: () => void;
}

const DEPARTMENTS = [
  "Computer Science",
  "Data Science & AI",
  "Electronic Engineering",
  "Mechanical Engineering",
  "Mathematical Physics",
  "Business Analytics"
];

const YEARS = [2022, 2023, 2024, 2025, 2026];

export default function RegisterForm({ onAuthSuccess, onToggleForm }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Support Legacy and New registers with auto-initialized state:
  const [studentId, setStudentId] = useState("AUTO-GENERATED");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [enrollmentYear, setEnrollmentYear] = useState(YEARS[2].toString()); // 2024 as default
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !studentId || !password || !confirmPassword) {
      setError("Please fill out all registration inputs.");
      triggerShake();
      return;
    }

    const emailStr = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailStr)) {
      setError("Please enter a valid email address.");
      triggerShake();
      return;
    }

    if (password.length < 6) {
      setError("Password security barrier: Must be at least 6 characters.");
      triggerShake();
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords mismatch. Please confirm correct repetitions.");
      triggerShake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          studentId: studentId.trim().toUpperCase(),
          department,
          enrollmentYear: Number(enrollmentYear),
          password,
          role
        })
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const rawText = await response.text();
        console.error("[Register Debug] Non-JSON Response received:", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          rawText: rawText.substring(0, 300)
        });
        throw new Error(
          `System registration server is initializing (Status: ${response.status}). Please wait 5 seconds and click register again.`
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Registration enrollment failed.");
      }

      onAuthSuccess(data.token, data.student);
    } catch (err: any) {
      console.error("[Register Exception]", err);
      if (err.message && (err.message.includes("Unexpected token") || err.message.includes("is not valid JSON") || err.message.includes("JSON.parse"))) {
        setError("Database server is starting up or updating. Please try registering again in 5 seconds.");
      } else {
        setError(err.message || "Server enrollment cluster inaccessible.");
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 transition-transform ${shake ? "animate-shake" : ""}`} id="register-card">
      <div className="flex flex-col mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight">NEXHIRE</h2>
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mt-1">Placement & Career Services Platform</h3>
        <p className="text-slate-400 text-xs mt-2.5 leading-relaxed font-sans">Create your account to unlock career opportunities and start tracking matching drives in our recruitment network.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-rose-950/40 border border-rose-900/60 text-rose-400 p-4 rounded-xl mb-6 text-xs" id="register-error-container">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4" id="register-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <User className="w-4.5 h-4.5" />
              </span>
              <input
                id="register-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-650 focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500/20"
                placeholder="Ex: Mark Taylor"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 opacity-70">Roll Number (Student ID)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-650">
                <ShieldCheck className="w-4.5 h-4.5" />
              </span>
              <input
                id="register-id-input"
                type="text"
                readOnly
                disabled
                value="AUTO-GENERATED ON ENROLL"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-850 text-slate-500 rounded-xl text-sm outline-none cursor-not-allowed select-none italic font-mono focus:ring-0 focus:border-slate-850"
                title="Your Student ID is automatically generated upon account creation based on your selected enrollment year."
              />
            </div>
            <p className="text-[9px] text-slate-500 mt-1 font-mono leading-none">
              * Auto-sequenced format: STUYYYYNNN (e.g. STU2026001).
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Institutional Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Mail className="w-4.5 h-4.5" />
            </span>
            <input
              id="register-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-650 focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500/20"
              placeholder="mtaylor@university.edu"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">NEXHIRE Role / Authorization</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <User className="w-4.5 h-4.5" />
            </span>
            <select
              id="register-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500"
            >
              <option value="student">Student Candidate (Apply & Match Drives)</option>
              <option value="admin">Placement Admin (Manage Drives & Track Recruits)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Academic Department</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <BookOpen className="w-4.5 h-4.5" />
              </span>
              <select
                id="register-dept-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Enrollment Batch Year</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Calendar className="w-4.5 h-4.5" />
              </span>
              <select
                id="register-year-select"
                value={enrollmentYear}
                onChange={(e) => setEnrollmentYear(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Secure Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                id="register-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-650 focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500/20"
                placeholder="Min 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Confirm Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                id="register-confirm-input"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-650 focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500/20"
                placeholder="Re-enter password"
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
        </div>

        <button
          id="register-submit-button"
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-8 cursor-pointer"
        >
          {loading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
              <span>Register & Create NEXHIRE Profile</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
        <p className="text-slate-450 text-xs">
          Already registered?{" "}
          <button
            id="toggle-to-login-btn"
            onClick={onToggleForm}
            className="text-indigo-400 hover:text-indigo-350 font-bold focus:outline-none underline cursor-pointer ml-1"
          >
            Sign In to Existing Account
          </button>
        </p>
      </div>
    </div>
  );
}
