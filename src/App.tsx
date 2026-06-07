import React, { useState, useEffect } from "react";
import { GraduationCap, Shield, Database, AlertTriangle, Briefcase, TrendingUp, Award, Activity, Heart } from "lucide-react";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import StudentDashboard from "./components/StudentDashboard";
import PlacementCoordinatorDashboard from "./components/PlacementCoordinatorDashboard";
import { Student } from "./types";
import { clearAllCache } from "./apiCache";

interface DbStatus {
  connected: boolean;
  configured: boolean;
  type: string;
  error?: string | null;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("academic_session_token") || sessionStorage.getItem("academic_session_token");
  });
  
  const [student, setStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem("academic_session_student") || sessionStorage.getItem("academic_session_student");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeForm, setActiveForm] = useState<"login" | "register">("login");
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    localStorage.removeItem("placement_theme");
  }, []);

  // Monitor server database connection state
  useEffect(() => {
    fetch("/api/status")
      .then((res) => {
        const isJson = res.headers.get("content-type")?.includes("application/json");
        return res.ok && isJson ? res.json() : null;
      })
      .then((data) => {
        if (data && data.database) {
          setDbStatus(data.database);
        }
      })
      .catch((err) => console.error("[Diagnostics Status] Service down:", err));
  }, []);

  // Track state consistency
  useEffect(() => {
    if (token && student) {
      localStorage.setItem("academic_session_token", token);
      localStorage.setItem("academic_session_student", JSON.stringify(student));
      sessionStorage.setItem("academic_session_token", token);
      sessionStorage.setItem("academic_session_student", JSON.stringify(student));
    } else {
      localStorage.removeItem("academic_session_token");
      localStorage.removeItem("academic_session_student");
      sessionStorage.removeItem("academic_session_token");
      sessionStorage.removeItem("academic_session_student");
    }
  }, [token, student]);

  const handleAuthSuccess = (newToken: string, newStudent: Student) => {
    const previousEmail = student?.email || "none";
    const previousRole = student?.role || "none";

    console.log("[Authentication Audit Log] Authenticated session replacement starting.");
    console.log(`- Previous user email: ${previousEmail}`);
    console.log(`- Previous role: ${previousRole}`);
    console.log(`- New user email: ${newStudent.email}`);
    console.log(`- New role: ${newStudent.role}`);

    // Prerequisite: Clear stale student/previous auth state before storing new auth state
    localStorage.removeItem("academic_session_token");
    localStorage.removeItem("academic_session_student");
    sessionStorage.removeItem("academic_session_token");
    sessionStorage.removeItem("academic_session_student");

    // Prevent cached profile or analytics data from carrying over between different users
    clearAllCache();

    // Verify localStorage and sessionStorage updates on every successful login
    localStorage.setItem("academic_session_token", newToken);
    localStorage.setItem("academic_session_student", JSON.stringify(newStudent));
    sessionStorage.setItem("academic_session_token", newToken);
    sessionStorage.setItem("academic_session_student", JSON.stringify(newStudent));

    // Update React Auth context state
    setToken(newToken);
    setStudent(newStudent);

    // Verify role-based routing executes after authentication state updates
    const routingTarget = newStudent.role === "admin" ? "Admin Dashboard" : "Student Dashboard";
    console.log(`[Role Routing] Routing executing: Target Dashboard -> ${routingTarget}`);
  };

  const handleLogout = () => {
    // Flush storage and cache on logout to be fully safe
    localStorage.removeItem("academic_session_token");
    localStorage.removeItem("academic_session_student");
    sessionStorage.removeItem("academic_session_token");
    sessionStorage.removeItem("academic_session_student");
    clearAllCache();

    setToken(null);
    setStudent(null);
    setActiveForm("login");
  };

  const isAuth = !!(token && student);

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-white transition-colors duration-250" id="portal-root">
      
      {/* 1. Global Navigation Sticky Top Navbar (Visible only when logged in, or customized for split screens) */}
      {isAuth && (
        <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50 px-4 sm:px-8 py-3" id="global-portal-header">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white border border-indigo-505/30 shadow-lg shadow-indigo-500/10 shrink-0">
                <GraduationCap className="w-5 h-5" id="header-gradcap-icon" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono tracking-widest text-indigo-400 block font-bold leading-none">NEXHIRE</span>
                <h2 className="text-sm font-extrabold tracking-tight text-white mt-0.5" id="header-org-title">Placement & Career Services Platform</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {dbStatus && (
                <div
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border ${
                    dbStatus.connected
                      ? "bg-emerald-950/40 border-emerald-800 text-emerald-400 font-semibold"
                      : dbStatus.configured
                      ? "bg-amber-950/40 border-amber-800 text-amber-400 font-semibold"
                      : "bg-slate-900 border-slate-800 text-slate-400 font-medium"
                  }`}
                  id="db-status-badge"
                  title={dbStatus.type}
                >
                  <Database className={`w-3.5 h-3.5 ${dbStatus.connected ? "text-emerald-500" : dbStatus.configured ? "text-amber-500" : "text-slate-500"}`} />
                  <span className="hidden md:inline">
                    {dbStatus.connected ? "Database Connected" : dbStatus.configured ? "Fallback File Mode" : "Virtual Sandbox Active"}
                  </span>
                  <span className="md:hidden">
                    {dbStatus.connected ? "Live" : "Fallback"}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-800 border border-slate-705/80 rounded-xl px-3 py-1.5 shrink-0" id="header-auth-badge">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-slate-300 font-mono hidden sm:inline">{student?.studentId}</span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Database Diagnostic/Warning banner for users with misconfigured URIs */}
      {isAuth && dbStatus && dbStatus.configured && !dbStatus.connected && (
        <div className="bg-amber-950/30 border-b border-amber-900/50 text-amber-300 py-3.5 px-4 sm:px-8 text-xs sm:text-sm" id="mongo-warning-banner">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-250">JSON Fallback Database Active</p>
              <p className="text-slate-305 leading-relaxed font-sans text-xs">
                Custom MongoDB URI connection was unreachable. App has gracefully loaded sandbox disk registry (<code>students_db.json</code>) so that you can evaluate the entire application loop and drives immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Primary Page Workspace Canvas */}
      {!isAuth ? (
        <div className="flex flex-col lg:flex-row min-h-screen w-full bg-slate-955 relative animate-fade-in" id="portal-landing-split">
          
          {/* Left panel: Statistics and Branding */}
          <div className="w-full lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-900">
            {/* Background vector visual details */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-12 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-2xl"></div>

            <div className="relative flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white border border-indigo-400/20 shadow-xl shadow-indigo-500/10">
                <GraduationCap className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 block font-bold leading-none">NEXHIRE</span>
                <h1 className="text-lg font-black tracking-tight text-white mt-1">Placement & Career Services Platform</h1>
              </div>
            </div>

            <div className="relative my-10 lg:my-0 space-y-10">
              <div className="space-y-4">
                <span className="text-xs font-semibold text-indigo-400 font-mono uppercase tracking-wider block bg-indigo-950/60 w-fit px-3 py-1 rounded-full border border-indigo-900/50">Unified Recruitment Engine</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Connect with the world's <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 dark:to-emerald-400">
                    elite recruiters.
                  </span>
                </h2>
                <p className="text-slate-400 text-sm max-w-lg leading-relaxed font-sans">
                  Instantly verify academic performance credentials, track placement drives through your dashboard, and find job profiles tailored exactly to your department profile.
                </p>
              </div>

              {/* Showcase core placement indicators */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-900 max-w-md">
                <div className="space-y-1">
                  <span className="text-[26px] font-black tracking-tight text-white flex items-center gap-1.5">
                    94.8% <TrendingUp className="w-5 h-5 text-indigo-400 inline" />
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Overall Placement Rate</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[26px] font-black tracking-tight text-white flex items-center gap-1.5">
                    18.5 LPA <Award className="w-5 h-5 text-emerald-400 inline" />
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Average CTC Package</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[26px] font-black tracking-tight text-white flex items-center gap-1.5">
                    150+ <Briefcase className="w-5 h-5 text-purple-400 inline" />
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Hiring Partners</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[26px] font-black tracking-tight text-white flex items-center gap-1.5">
                    52.0 LPA <Activity className="w-5 h-5 text-indigo-400 inline" />
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Highest Package Offered</p>
                </div>
              </div>
            </div>

            <div className="relative text-xs text-slate-500 font-sans flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-slate-600" />
              <span>Secure and authenticated college candidate access.</span>
            </div>

          </div>

          {/* Right panel: Glassmorphic Auth Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-950 min-h-[550px] relative">
            <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl"></div>
            <div className="relative z-10 w-full max-w-md">
              {activeForm === "login" ? (
                <LoginForm
                  onAuthSuccess={handleAuthSuccess}
                  onToggleForm={() => setActiveForm("register")}
                />
              ) : (
                <RegisterForm
                  onAuthSuccess={handleAuthSuccess}
                  onToggleForm={() => setActiveForm("login")}
                />
              )}
            </div>
          </div>

        </div>
      ) : (
        <main className="flex-grow flex flex-col w-full" id="portal-main-panel">
          {student && (student.role === "admin" || student.role === "placement_coordinator") ? (
            <PlacementCoordinatorDashboard
              token={token}
              student={student}
              onLogout={handleLogout}
            />
          ) : (
            <StudentDashboard
              token={token}
              student={student}
              onLogout={handleLogout}
            />
          )}
        </main>
      )}

      {/* 3. Global Footer copyright and guidelines references (Omitted on landing for clean split structure) */}
      {isAuth && (
        <footer className="bg-slate-900 border-t border-slate-800 py-6 px-4 shrink-0 transition-colors" id="global-portal-footer">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center">
            <div className="space-y-1 text-left">
              <p className="text-xs text-slate-400 font-medium">
                &copy; 2026 NEXHIRE. All Rights Reserved.
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-505 font-sans">
                Placement & Career Services Platform
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 uppercase font-mono tracking-widest font-semibold" id="footer-integrity-statement">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Performance Verified Gateway</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
