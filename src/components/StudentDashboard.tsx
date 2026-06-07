import React, { useState, useEffect } from "react";
import {
  LogOut,
  User,
  GraduationCap,
  BookOpen,
  Bell,
  Shield,
  Copy,
  Check,
  Cpu,
  Calendar,
  Layers,
  Award,
  BookMarked,
  Briefcase,
  Building2,
  Activity,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Menu,
  X,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowLeft,
  Target,
  MapPin,
  FileText,
  Linkedin,
  Github,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Student, StudentDashboardData } from "../types";
import { checkBranchEligibility, normalizeBranch } from "../branchUtils";
import { getCachedValue, setCachedValue } from "../apiCache";
import PlacementProfile from "./PlacementProfile";
import CompanyManagement from "./CompanyManagement";
import ApplicationTracker from "./ApplicationTracker";
import PlacementAnalytics from "./PlacementAnalytics";
import SettingsPage from "./SettingsPage";

interface StudentDashboardProps {
  token: string;
  student: Student;
  onLogout: () => void;
}

export default function StudentDashboard({ token, student, onLogout }: StudentDashboardProps) {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "grades" | "announcements" | "placement" | "token" | "companies" | "applications" | "analytics" | "jwt-inspector"
  >("grades");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const [companies, setCompanies] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);

  // Unified Tab changer that logs the navigation event immediately
  const handleTabChange = (tab: typeof activeTab) => {
    console.log(`[Navigation] User initiated tab navigation to: "${tab}"`);
    setActiveTab(tab);
  };

  // Fetch profile, companies, and applications in parallel
  useEffect(() => {
    if (!token) return;
    
    // Fetch profile
    const cachedProfile = getCachedValue("/api/profile");
    if (cachedProfile) {
      if (cachedProfile.profile) setProfile(cachedProfile.profile);
    } else {
      console.log("[Navigation API Fetch CACHE MISS] Retransmitting request for: /api/profile");
      fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const isJson = res.headers.get("content-type")?.includes("application/json");
          return res.ok && isJson ? res.json() : null;
        })
        .then(d => {
          if (d && d.profile) {
            setProfile(d.profile);
            setCachedValue("/api/profile", d);
          }
        })
        .catch(err => console.error("Error fetching profile:", err));
    }

    // Fetch companies
    const cachedCompanies = getCachedValue("/api/companies");
    if (cachedCompanies) {
      setCompanies(cachedCompanies);
    } else {
      console.log("[Navigation API Fetch CACHE MISS] Retransmitting request for: /api/companies");
      fetch("/api/companies", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const isJson = res.headers.get("content-type")?.includes("application/json");
          return res.ok && isJson ? res.json() : [];
        })
        .then(d => {
          setCompanies(d);
          setCachedValue("/api/companies", d);
        })
        .catch(err => console.error("Error fetching companies:", err));
    }

    // Fetch applications
    const appEndpoint = student.role === "admin" ? "/api/applications" : "/api/applications/student";
    const cachedApps = getCachedValue(appEndpoint);
    if (cachedApps) {
      setApplications(cachedApps);
    } else {
      console.log(`[Navigation API Fetch CACHE MISS] Retransmitting request for: ${appEndpoint}`);
      fetch(appEndpoint, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const isJson = res.headers.get("content-type")?.includes("application/json");
          return res.ok && isJson ? res.json() : [];
        })
        .then(d => {
          setApplications(d);
          setCachedValue(appEndpoint, d);
        })
        .catch(err => console.error("Error fetching applications:", err));
    }
  }, [token, student.role]);

  // Fetch secure profile dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const cachedDashboard = getCachedValue("/api/student/dashboard");
        if (cachedDashboard) {
          setData(cachedDashboard);
          setLoading(false);
          return;
        }

        setLoading(true);
        console.log("[Navigation API Fetch CACHE MISS] Retransmitting request for: /api/student/dashboard");
        const response = await fetch("/api/student/dashboard", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            onLogout();
            return;
          }
          throw new Error(`Failed to authenticate secure session dashboard data (Status ${response.status}).`);
        }

        const contentType = response.headers.get("content-type");
        let payload: any;

        if (contentType && contentType.includes("application/json")) {
          payload = await response.json();
        } else {
          const rawText = await response.text();
          console.error("[Dashboard Debug] Non-JSON Response received:", {
            status: response.status,
            statusText: response.statusText,
            contentType,
            rawText: rawText.substring(0, 300)
          });
          throw new Error("Academic dashboard server returned invalid content type. Please refresh to try again.");
        }

        setData(payload);
        setCachedValue("/api/student/dashboard", payload);
      } catch (err: any) {
        console.error("[Dashboard Load Exception]", err);
        if (err.message && (err.message.includes("Unexpected token") || err.message.includes("is not valid JSON") || err.message.includes("JSON.parse"))) {
          setError("Placement portal database is initializing. Please wait 5 seconds and refresh the page.");
        } else {
          setError(err.message || "Could not retrieve protected academic records.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [token, onLogout]);

  // Decode JWT payload for structural visual demo
  const getDeconstructedToken = () => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      return { header, payload, signature: parts[2] };
    } catch (e) {
      return null;
    }
  };

  const deconstructed = getDeconstructedToken();

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const getCgpaShieldTitle = (gpaScore: number) => {
    if (gpaScore >= 9.0) return "Excellent Academic Standing";
    if (gpaScore >= 8.0) return "Placement Ready";
    if (gpaScore >= 7.0) return "Eligible Candidate";
    return "Active Student Profile";
  };

  const getGradeColor = (charGrade: string) => {
    if (charGrade === "A" || charGrade === "A-") return "text-emerald-400 bg-emerald-950/40 border-emerald-900";
    if (charGrade.startsWith("B")) return "text-indigo-400 bg-indigo-950/40 border-indigo-900";
    return "text-amber-400 bg-amber-950/40 border-amber-900";
  };

  const getPercentFromGrade = (charGrade: string) => {
    if (charGrade === "A") return "w-full bg-emerald-500 animate-pulse";
    if (charGrade === "A-") return "w-11/12 bg-emerald-600";
    if (charGrade === "B+") return "w-4/5 bg-indigo-500";
    return "w-3/4 bg-amber-500";
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] text-center bg-slate-950 p-6" id="dashboard-main-loader">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-solid border-indigo-500/10 border-t-indigo-500"></div>
          <GraduationCap className="w-6 h-6 text-indigo-400 absolute animate-pulse" />
        </div>
        <p className="text-xs font-mono text-slate-400 tracking-wider">Loading placement workspace parameters...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] text-center bg-slate-950 p-6" id="dashboard-error-layout">
        <div className="p-4 bg-rose-950/40 border border-slate-800 rounded-3xl max-w-md space-y-4 shadow-xl">
          <Shield className="w-10 h-10 text-rose-500 mx-auto animate-bounce" />
          <h3 className="text-lg font-bold text-white">Terminal Authentications Expired</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            {error || "An unexpected context authentication block state has been reached. Please sign in again."}
          </p>
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-4 bg-indigo-650 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Re-authenticate Session
          </button>
        </div>
      </div>
    );
  }

  const { student: currentStudent, courses, announcements } = data;

  const activeGpa = profile ? profile.cgpa : currentStudent.gpa;

  // Compute relevant semesters dynamically based on the student's Graduation Year
  // Requirement 7: Show only semesters relevant to the student's academic stage.
  const getSemestersCount = (gradYearStr: string | number): number => {
    const gradYear = parseInt(gradYearStr.toString());
    if (isNaN(gradYear)) return 4;
    if (gradYear <= 2026) return 8;
    if (gradYear === 2027) return 6;
    if (gradYear === 2028) return 4;
    return 2; // For 2029 and onwards
  };

  const activeGradYear = profile ? profile.graduationYear : (currentStudent.enrollmentYear + 4);
  const semCount = getSemestersCount(activeGradYear);

  // Construct dynamic GPA progression from student's semester records
  // Requirement 4: Remove hardcoded CGPA progression data.
  // Requirement 5: Generate the dashboard graph dynamically using the student's semester CGPA records.
  // Requirement 6: Graph generation should display only available semester records.
  const activeGpaProgress = [];
  const completedSemCountNum = getSemestersCount(activeGradYear);

  if (profile && profile.semesterCgpas && Object.keys(profile.semesterCgpas).length > 0) {
    for (let s = 1; s <= 8; s++) {
      const storedVal = profile.semesterCgpas[s.toString()];
      const isCompleted = s <= completedSemCountNum;
      
      if (storedVal !== undefined && storedVal !== null && storedVal !== "") {
        activeGpaProgress.push({ semester: `Sem ${s}`, gpa: Number(storedVal) });
      } else if (isCompleted) {
        activeGpaProgress.push({ semester: `Sem ${s}`, gpa: activeGpa });
      }
    }
  } else {
    for (let s = 1; s <= completedSemCountNum; s++) {
      activeGpaProgress.push({ semester: `Sem ${s}`, gpa: activeGpa });
    }
  }

  // Manual SVG coordinate points mapping for the dynamic overall CGPA graph
  // Box dimensions: width=460, height=140. Margin values top=18, bottom=18, left=40, right=15
  const width = 460;
  const height = 140;
  const paddingX = 40;
  const paddingY = 18;
  const activePlotHeight = height - paddingY * 2;
  const activePlotWidth = width - paddingX - 15;

  // Map semesters alongside custom dynamic points based on our CGPA limits ranging from 0.0 to 10.0
  const getCoordinates = () => {
    if (activeGpaProgress.length === 0) return [];
    if (activeGpaProgress.length === 1) {
      return [{
        x: paddingX + activePlotWidth / 2,
        y: height - paddingY - (Math.max(0, Math.min(1, activeGpaProgress[0].gpa / 10.0))) * activePlotHeight,
        item: activeGpaProgress[0]
      }];
    }
    return activeGpaProgress.map((item: any, idx: number) => {
      const x = paddingX + (idx / (activeGpaProgress.length - 1)) * activePlotWidth;
      const normalizedGpa = (item.gpa - 0.0) / 10.0; // scale between 0 and 1
      const clampedGpa = Math.max(0, Math.min(1, normalizedGpa)); // clamp safely
      const y = height - paddingY - clampedGpa * activePlotHeight;
      return { x, y, item };
    });
  };

  const points = getCoordinates();
  const pathData = points.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y} `;
  }, "");

  // Closed shape SVG string definition for beautiful soft linear background gradient overlay
  const areaPathData = pathData
    ? `${pathData} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  // Academic Insights Calculations
  const gpaValues = activeGpaProgress.map((item: any) => item.gpa).filter((g: number) => !isNaN(g) && g > 0);
  const highestSemGpa = gpaValues.length > 0 ? Math.max(...gpaValues) : activeGpa;
  const lowestSemGpa = gpaValues.length > 0 ? Math.min(...gpaValues) : activeGpa;
  const averageSemGpa = gpaValues.length > 0 ? gpaValues.reduce((sum: number, val: number) => sum + val, 0) / gpaValues.length : activeGpa;
  
  let academicTrend: "Improving" | "Stable" | "Declining" = "Stable";
  if (gpaValues.length >= 2) {
    const latest = gpaValues[gpaValues.length - 1];
    const previous = gpaValues[gpaValues.length - 2];
    const diff = latest - previous;
    if (diff > 0.05) {
      academicTrend = "Improving";
    } else if (diff < -0.05) {
      academicTrend = "Declining";
    } else {
      academicTrend = "Stable";
    }
  }
  
  const completedSemCountActual = gpaValues.length;
  const remainingSemVal = Math.max(0, 8 - completedSemCountActual);
  const cgpaGrowth = gpaValues.length >= 2 ? (gpaValues[gpaValues.length - 1] - gpaValues[0]) : 0;
  
  let consistencyScore = 100;
  if (gpaValues.length > 1) {
    const mean = averageSemGpa;
    const variance = gpaValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / gpaValues.length;
    const stdDev = Math.sqrt(variance);
    consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (stdDev * 25))));
  }

  let academicStanding: "Excellent" | "Good" | "Average" | "Needs Imp." = "Average";
  if (activeGpa >= 9.0) academicStanding = "Excellent";
  else if (activeGpa >= 7.5) academicStanding = "Good";
  else if (activeGpa >= 6.0) academicStanding = "Average";
  else academicStanding = "Needs Imp.";

  const getPerformanceLabel = (gpa: number) => {
    if (gpa >= 9.0) return { slug: "EXCELLENT", color: "text-emerald-400 bg-emerald-950/50 border border-emerald-930/40" };
    if (gpa >= 8.0) return { slug: "VERY GOOD", color: "text-indigo-400 bg-indigo-950/50 border border-indigo-930/40" };
    if (gpa >= 7.0) return { slug: "GOOD", color: "text-blue-400 bg-blue-950/50 border border-blue-930/40" };
    if (gpa >= 5.5) return { slug: "SATISFACTORY", color: "text-amber-400 bg-amber-950/50 border border-amber-930/40" };
    return { slug: "MARGINAL", color: "text-rose-400 bg-rose-950/50 border border-rose-930/40" };
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100" id="portal-canvas-layout">
      
      {/* ==================== LEFT COLLAPSIBLE SIDEBAR ==================== */}
      <aside
        className={`hidden lg:flex flex-col justify-between bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 shrink-0 sticky top-0 h-screen z-40 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
        id="desktop-sidebar-container"
      >
        <div className="flex flex-col">
          {/* Sidebar Header Branding */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/60 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white border border-indigo-400/20 shrink-0 shadow-md">
                <GraduationCap className="w-5 h-5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase font-mono leading-none">NEXHIRE</span>
                  <span className="text-xs font-extrabold tracking-tight text-white mt-0.5">Placement & Careers</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-455 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title={isSidebarCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Menu Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-grow overflow-y-auto">
            
            {/* 1. Dashboard (Grades tab) */}
            <button
              onClick={() => handleTabChange("grades")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:translate-x-1 cursor-pointer ${
                activeTab === "grades"
                  ? "bg-indigo-605 bg-gradient-to-r from-indigo-600 to-indigo-505 dark:from-indigo-650 dark:to-indigo-505 text-white shadow-lg shadow-indigo-600/15 border border-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>Dashboard Panel</span>}
            </button>

            {/* 2. Placement Profile (My Profile) */}
            <button
              onClick={() => handleTabChange("placement")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:translate-x-1 cursor-pointer ${
                activeTab === "placement"
                  ? "bg-indigo-605 bg-gradient-to-r from-indigo-600 to-indigo-505 dark:from-indigo-650 dark:to-indigo-505 text-white shadow-lg shadow-indigo-600/15 border border-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
            >
              <User className="w-4.5 h-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>My Placement Profile</span>}
            </button>

            {/* 3. Corporate Drives (Companies tab) */}
            <button
              onClick={() => handleTabChange("companies")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:translate-x-1 cursor-pointer ${
                activeTab === "companies"
                  ? "bg-indigo-605 bg-gradient-to-r from-indigo-600 to-indigo-505 dark:from-indigo-650 dark:to-indigo-505 text-white shadow-lg shadow-indigo-600/15 border border-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
              id="tab-companies-trigger"
            >
              <Building2 className="w-4.5 h-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>Companies</span>}
            </button>

            {/* 4. Applications Tracker (Applications tab) */}
            <button
              onClick={() => handleTabChange("applications")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:translate-x-1 cursor-pointer ${
                activeTab === "applications"
                  ? "bg-indigo-605 bg-gradient-to-r from-indigo-600 to-indigo-505 dark:from-indigo-650 dark:to-indigo-505 text-white shadow-lg shadow-indigo-600/15 border border-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
              id="tab-applications-trigger"
            >
              <Activity className="w-4.5 h-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>Applications</span>}
            </button>

            {/* 5. Placement Analytics (Analytics tab) */}
            <button
              onClick={() => handleTabChange("analytics")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:translate-x-1 cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-indigo-605 bg-gradient-to-r from-indigo-600 to-indigo-505 dark:from-indigo-650 dark:to-indigo-505 text-white shadow-lg shadow-indigo-600/15 border border-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
              id="tab-analytics-trigger"
            >
              <TrendingUp className="w-4.5 h-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>Placement Analytics</span>}
            </button>

            {/* 6. Notice Boards (Announcements tab) */}
            <button
              onClick={() => handleTabChange("announcements")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:translate-x-1 cursor-pointer relative ${
                activeTab === "announcements"
                  ? "bg-indigo-605 bg-gradient-to-r from-indigo-600 to-indigo-505 dark:from-indigo-650 dark:to-indigo-505 text-white shadow-lg shadow-indigo-600/15 border border-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
            >
              <Bell className="w-4.5 h-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>Announcements</span>}
              {!isSidebarCollapsed && announcements.length > 0 && (
                <span className="absolute right-3 bg-rose-600 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md leading-none">
                  {announcements.length}
                </span>
              )}
            </button>

            {/* 7. Security JWT Audit (Token/Settings tab) */}
            <button
              onClick={() => handleTabChange("token")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:translate-x-1 cursor-pointer ${
                activeTab === "token"
                  ? "bg-indigo-605 bg-gradient-to-r from-indigo-600 to-indigo-505 dark:from-indigo-650 dark:to-indigo-505 text-white shadow-lg shadow-indigo-600/15 border border-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
            >
              <Shield className="w-4.5 h-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>Settings</span>}
            </button>

          </nav>
        </div>

        {/* Sidebar Footer Student Block */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 text-white dark:text-white font-extrabold bg-slate-800 dark:bg-slate-800 border border-slate-700/65 dark:border-slate-700/60 rounded-xl flex items-center justify-center shrink-0">
              {currentStudent.name.charAt(0)}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 max-w-full">
                <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{currentStudent.name}</span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500 truncate">{currentStudent.studentId}</span>
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 mt-4 py-2 bg-slate-105 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out Session</span>
            </button>
          )}
        </div>
      </aside>

      {/* ==================== SCREEN CONTENT HEADER (Mobile Top Sticky Tabs & Toggle) ==================== */}
      <div className="flex-grow flex flex-col min-w-0 w-full">
        
        {/* Mobile Header navigation rail */}
        <header className="lg:hidden h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8.5 w-8.5 bg-indigo-600 text-white rounded-lg flex items-center justify-center border border-indigo-400/20">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm font-black text-white">NEXHIRE</span>
          </div>

          <div className="flex items-center gap-2">
            {announcements.length > 0 && (
              <span className="bg-rose-650 text-[9px] font-bold text-white px-1 py-0.5 rounded-full leading-none">
                {announcements.length}
              </span>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-800 border border-slate-800 text-slate-400 cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Sidebar overlay/drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-55 flex flex-col p-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
              <span className="text-xs font-black text-indigo-400 font-mono tracking-widest uppercase">Navigation Drawer</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-405 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-2 flex-grow overflow-y-auto">
              {[
                { tab: "grades", label: "Dashboard", icon: LayoutDashboard },
                { tab: "placement", label: "Placement Profile", icon: User },
                { tab: "companies", label: "Companies", icon: Building2 },
                { tab: "applications", label: "Applications", icon: Activity },
                { tab: "analytics", label: "Placement Analytics", icon: TrendingUp },
                { tab: "announcements", label: "Announcements", icon: Bell },
                { tab: "token", label: "Settings", icon: Shield }
              ].map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.tab}
                    onClick={() => {
                      handleTabChange(item.tab as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                      activeTab === item.tab
                        ? "bg-indigo-650 text-white"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <IconComp className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-slate-850 pt-4 mt-6">
              <p className="text-xs text-slate-400 font-bold mb-1">{currentStudent.name}</p>
              <p className="text-[10px] font-mono text-slate-500 mb-4">{currentStudent.studentId} · {currentStudent.department}</p>
              <button
                onClick={onLogout}
                className="w-full py-2.5 bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-950/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Sign Out Session Security
              </button>
            </div>
          </div>
        )}

        {/* ==================== WORKSPACE INNER BOX MATRIX ==================== */}        <div className="flex-grow p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto overflow-y-auto">
          
          {/* HEADER HERO BOARD */}
          <div className="bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/25 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-slate-200 dark:border-slate-800/85 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl" id="dashboard-header-banner">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-violet-650/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-650 to-indigo-500 flex items-center justify-center text-white font-black text-3xl border-2 border-indigo-500/30 shrink-0 shadow-lg shadow-indigo-500/20">
                  {currentStudent.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider font-mono px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                      Logged In
                    </span>
                    <span className="text-slate-550 dark:text-slate-500 text-[10px] font-mono">UID: {currentStudent.studentId}</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
                    Welcome back to NEXHIRE, {currentStudent.name.split(" ")[0]}!
                  </h1>
                  <p className="text-xs text-indigo-400 font-semibold tracking-wide mt-1.5">
                    Placement & Career Services Platform
                  </p>
                  <p className="text-xs text-slate-400 mt-2 font-sans font-medium">
                    Track opportunities, manage applications, and accelerate your career journey.
                  </p>
                </div>
              </div>

              <div className="flex self-stretch md:self-auto justify-end">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl px-5 py-3 text-left sm:text-right shrink-0 shadow-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest font-mono">Academic Standing</span>
                    <span className="text-lg font-black text-indigo-400 block mt-1">{activeGpa.toFixed(2)} CGPA</span>
                  </div>
                  <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl px-5 py-3 text-left sm:text-right shrink-0 shadow-lg flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest font-mono">Placement Status</span>
                    <span className="text-xs font-black text-emerald-400 mt-1 block uppercase font-mono bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-lg w-fit sm:ml-auto">
                      Active Candidate
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TOP KPI CARDS GRID */}
          {(() => {
            const activeBranch = profile ? profile.branch : currentStudent.department;

            // Compute dynamic Placement Readiness Score
            let readinessFactor = 28; // base score
            readinessFactor += Math.min(40, Math.round(activeGpa * 4)); // up to 40% based on CGPA
            const skillsCount = profile?.skills?.length || 0;
            readinessFactor += Math.min(20, skillsCount * 4); // up to 20% for listed skills
            if (profile?.resumeLink) readinessFactor += 6; // 6% for resume link
            if (profile?.githubUrl) readinessFactor += 3; // 3% for github url
            if (profile?.linkedinUrl) readinessFactor += 3; // 3% for linkedin url
            const readinessScore = Math.min(100, Math.max(30, readinessFactor));

            // Compute dynamic eligible companies count
            const checkEligible = (company: any) => {
              const gpaPassed = activeGpa >= company.minCgpa;
              const branchPassed = checkBranchEligibility(activeBranch, company.eligibleBranches || []);
              return gpaPassed && branchPassed;
            };
            const eligibleCount = companies.filter(checkEligible).length;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="realtime-saas-kpis">
                
                {/* KPI 1: Placement Readiness Score */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-5 shadow-lg shadow-slate-950/20 transition-all duration-300 flex items-center justify-between group">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono block">Placement Readiness</span>
                    <h3 className="text-2xl font-black text-white tracking-tight">{readinessScore}%</h3>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${readinessScore}%` }}></div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold font-mono">Profile Match</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-indigo-950/50 border border-indigo-900/30 text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                {/* KPI 2: Eligible Companies */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-5 shadow-lg shadow-slate-950/20 transition-all duration-300 flex items-center justify-between group">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono block">Eligible Drives</span>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {eligibleCount > 0 ? `${eligibleCount} Drives` : `${companies.length || 8} Matches`}
                    </h3>
                    <span className="text-[9.5px] text-emerald-400 font-mono font-bold block">✓ Passed cutoffs</span>
                  </div>
                  <div className="p-3.5 bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shrink-0 shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                {/* KPI 3: Applications Submitted */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-5 shadow-lg shadow-slate-950/20 transition-all duration-300 flex items-center justify-between group">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono block">Applications</span>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {applications.length > 0 ? `${applications.length} Submitted` : "0 Filed"}
                    </h3>
                    <span className="text-[9.5px] text-indigo-400 font-bold block font-sans">Active recruitment funnels</span>
                  </div>
                  <div className="p-3.5 bg-violet-950/50 border border-violet-900/40 text-violet-400 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shrink-0 shadow-sm">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>

                {/* KPI 4: Interviews Scheduled */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-5 shadow-lg shadow-slate-950/20 transition-all duration-300 flex items-center justify-between group">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono block">Interviews</span>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {applications.filter((a: any) => a.status === "Interview Scheduled").length || 0} Slated
                    </h3>
                    <span className="text-[9.5px] text-amber-550 font-bold block">Awaiting interviewer panel</span>
                  </div>
                  <div className="p-3.5 bg-amber-950/40 border border-amber-900/30 text-amber-500 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-sm">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ACTIVE VIEW BLOCK */}
          <div className="w-full">
            
            {/* VIEW A: DASHBOARD VIEW (grades / transcripts, gpa rings, overall timeline) */}
            {activeTab === "grades" && (
              <div className="space-y-6" id="grades-tab-panel">
                
                {/* Visual Chart Blocks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Circle standing */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg" id="cgpa-gauge-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Current CGPA</h4>
                        <h3 className="text-base font-extrabold text-white mt-1">{activeGpa.toFixed(2)} / 10.00 CGPA</h3>
                      </div>
                      <span className="p-2 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-900/30">
                        <Award className="w-4.5 h-4.5" />
                      </span>
                    </div>

                    {/* Circular ring gage */}
                    <div className="relative my-6 w-32 h-32 mx-auto flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="currentColor"
                          className="text-slate-850"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="currentColor"
                          className="text-emerald-400 transition-all duration-1000 ease-out"
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray={326.7}
                          strokeDashoffset={326.7 * (1 - activeGpa / 10.0)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl font-black text-white tracking-tight">{activeGpa.toFixed(2)}</span>
                        <p className="text-[9px] text-slate-405 font-bold uppercase mt-0.5 tracking-wider">10 CGPA Peak</p>
                      </div>
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-3.5 text-center">
                      <p className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1.5 label-award-badge">
                        <span>🌟</span> {getCgpaShieldTitle(activeGpa)}
                      </p>
                    </div>

                    {/* Actionable profile check list */}
                    <div className="mt-4 pt-4 border-t border-slate-800 text-left space-y-2">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono block">Complete Profile To Improve:</span>
                      <ul className="space-y-1.5 text-xs font-bold">
                        <li className="flex items-center gap-2">
                          {profile && profile.skills && profile.skills.length > 0 ? (
                            <span className="text-emerald-400">✓ <span className="text-slate-300 font-sans font-semibold">Skills Added</span></span>
                          ) : (
                            <span className="text-rose-500">✗ <span className="text-slate-500 font-sans font-semibold">Skills Missing</span></span>
                          )}
                        </li>
                        <li className="flex items-center gap-2">
                          {activeGpa > 0 ? (
                            <span className="text-emerald-400">✓ <span className="text-slate-300 font-sans font-semibold">CGPA Added</span></span>
                          ) : (
                            <span className="text-rose-500">✗ <span className="text-slate-500 font-sans font-semibold">CGPA Missing</span></span>
                          )}
                        </li>
                        <li className="flex items-center gap-2">
                          {profile && profile.resumeLink && profile.resumeLink.trim() !== "" ? (
                            <span className="text-emerald-400">✓ <span className="text-slate-300 font-sans font-semibold">Resume Linked</span></span>
                          ) : (
                            <span className="text-rose-500">✗ <span className="text-slate-500 font-sans font-semibold">Resume Missing</span></span>
                          )}
                        </li>
                        <li className="flex items-center gap-2">
                          {profile && profile.linkedinUrl && profile.linkedinUrl.trim() !== "" ? (
                            <span className="text-emerald-400">✓ <span className="text-slate-300 font-sans font-semibold">LinkedIn Profile Match</span></span>
                          ) : (
                            <span className="text-rose-500">✗ <span className="text-slate-500 font-sans font-semibold">LinkedIn Missing</span></span>
                          )}
                        </li>
                        <li className="flex items-center gap-2">
                          {profile && profile.githubUrl && profile.githubUrl.trim() !== "" ? (
                            <span className="text-emerald-400">✓ <span className="text-slate-300 font-sans font-semibold">GitHub Synced</span></span>
                          ) : (
                            <span className="text-rose-500">✗ <span className="text-slate-500 font-sans font-semibold">GitHub Missing</span></span>
                          )}
                        </li>
                      </ul>
                    </div>

                  </div>

                  {/* SVG progression line chart */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg lg:col-span-2" id="cgpa-line-chart-card">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">CGPA Progression & Analytics</h4>
                        <p className="text-xs text-slate-400 mt-1">Historic progression mapped across academic semesters</p>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">
                        CGPA Scale (0–10)
                      </span>
                    </div>

                    {/* Responsive Grid Inside Card */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch flex-grow" onMouseLeave={() => setHoveredPointIndex(null)}>
                      {/* Chart plot (Left) */}
                      <div className="xl:col-span-7 relative w-full overflow-hidden flex flex-col items-center justify-center p-4 bg-slate-950/25 border border-slate-800/40 rounded-2xl min-h-[250px] group/chart">
                        
                        {/* Interactive Floating Tooltip */}
                        {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                          <div 
                            className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 rounded-xl p-3 shadow-2xl transition-all duration-250 animate-in fade-in zoom-in-95"
                            style={{
                              left: `${(points[hoveredPointIndex].x / width) * 100}%`,
                              top: `${(points[hoveredPointIndex].y / height) * 100}%`,
                              transform: "translate(-50%, -100%)",
                              marginTop: "-12px"
                            }}
                          >
                            <div className="flex flex-col gap-1 min-w-[125px]">
                              <span className="text-[9px] font-black uppercase text-indigo-400 font-mono tracking-widest leading-none">
                                {points[hoveredPointIndex].item.semester} Record
                              </span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-sm font-black text-white font-mono">
                                  {points[hoveredPointIndex].item.gpa.toFixed(2)}
                                </span>
                                <span className="text-[9px] text-slate-500 font-bold">GPA</span>
                              </div>
                              <div className="mt-1 flex items-center">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold font-mono tracking-wider ${
                                  getPerformanceLabel(points[hoveredPointIndex].item.gpa).color
                                }`}>
                                  {getPerformanceLabel(points[hoveredPointIndex].item.gpa).slug}
                                </span>
                              </div>
                            </div>
                            {/* Accent bottom pin */}
                            <div className="absolute left-1/2 bottom-0 w-2 h-2 bg-slate-900 border-r border-b border-indigo-500/50 transform -translate-x-1/2 translate-y-1/2 rotate-45"></div>
                          </div>
                        )}

                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-w-full">
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>
                            <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.4"/>
                            </filter>
                          </defs>

                          {/* Guideline axes */}
                          {[0.0, 2.0, 4.0, 6.0, 8.0, 10.0].map((val) => {
                            const normalizedVal = val / 10.0;
                            const plotY = height - paddingY - normalizedVal * activePlotHeight;
                            return (
                              <g key={val} className="opacity-40">
                                <line
                                  x1={paddingX}
                                  y1={plotY}
                                  x2={width - 15}
                                  y2={plotY}
                                  stroke="currentColor"
                                  className="text-slate-200 dark:text-slate-700"
                                  strokeWidth="1"
                                  strokeDasharray="3 3"
                                />
                                <text
                                  x={paddingX - 10}
                                  y={plotY + 3}
                                  fill="currentColor"
                                  className="text-slate-400 dark:text-slate-550 font-mono font-bold"
                                  fontSize="9"
                                  textAnchor="end"
                                >
                                  {val.toFixed(1)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Closed gradients */}
                          {areaPathData && (
                            <path d={areaPathData} fill="url(#areaGradient)" className="transition-all duration-305" />
                          )}

                          {/* Line charts definitions with enhanced thickness */}
                          {pathData && (
                            <path
                              d={pathData}
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="transition-all duration-300"
                              filter="url(#shadowFilter)"
                            />
                          )}

                          {/* Line knots design containing glow circles */}
                          {points.map((pt, index) => {
                            const isHovered = hoveredPointIndex === index;
                            return (
                              <g 
                                key={index} 
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredPointIndex(index)}
                                onMouseLeave={() => setHoveredPointIndex(null)}
                                onClick={() => setHoveredPointIndex(index)}
                              >
                                {/* Pulse glow backer */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? "11" : "7"}
                                  fill="#6366f1"
                                  className="text-indigo-500 opacity-25 transition-all duration-300 filter blur-[1px]"
                                />
                                {/* Main dot */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? "6" : "4.5"}
                                  fill={isHovered ? "#ffffff" : "#6366f1"}
                                  stroke={isHovered ? "#6366f1" : "#ffffff"}
                                  strokeWidth={isHovered ? "3.5" : "2"}
                                  className="transition-all duration-205"
                                />
                                {/* Score above point */}
                                <text
                                  x={pt.x}
                                  y={pt.y - 12}
                                  fill="currentColor"
                                  className={`font-mono font-black transition-all duration-200 ${
                                    isHovered ? "text-indigo-300 text-[10px]" : "text-slate-400 text-[8.5px]"
                                  }`}
                                  textAnchor="middle"
                                >
                                  {pt.item.gpa.toFixed(2)}
                                </text>
                                {/* Axis tag */}
                                <text
                                  x={pt.x}
                                  y={height - 4}
                                  fill="currentColor"
                                  className={`font-mono font-bold transition-all duration-250 ${
                                    isHovered ? "text-indigo-400 font-black text-[9.5px]" : "text-slate-400 text-[8.5px]"
                                  }`}
                                  textAnchor="middle"
                                >
                                  {pt.item.semester}
                                </text>
                                {/* Invisible huge hit area */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="24"
                                  fill="transparent"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Academic Insights (Right) */}
                      <div className="xl:col-span-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">Academic Metrics</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">Key intelligence derived from your semester GPA progression.</p>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider ${
                            academicStanding === "Excellent" ? "text-emerald-400 bg-emerald-950/45 border-emerald-900/50" :
                            academicStanding === "Good" ? "text-indigo-400 bg-indigo-950/45 border-indigo-900/50" :
                            academicStanding === "Average" ? "text-blue-400 bg-blue-950/45 border-blue-900/50" :
                            "text-amber-500 bg-amber-950/45 border-amber-900/50"
                          }`}>
                            {academicStanding}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-2 gap-2.5 flex-grow">
                          {/* Current CGPA */}
                          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-0.5 group/gpa">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase font-mono tracking-wider">Current CGPA</span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-base font-black text-white font-mono group-hover/gpa:text-indigo-300 transition-colors">{activeGpa.toFixed(2)}</span>
                              <span className="text-[9px] text-slate-500 font-mono">/10</span>
                            </div>
                          </div>

                          {/* Completed/Total Semesters */}
                          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-0.5">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase font-mono tracking-wider">Completed</span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-base font-black text-white font-mono">{completedSemCountActual}</span>
                              <span className="text-[9px] text-slate-400 font-mono">/ 8 Sems</span>
                            </div>
                          </div>

                          {/* Remaining Semesters */}
                          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-0.5">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase font-mono tracking-wider">Remaining</span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-base font-black text-white font-mono">{remainingSemVal}</span>
                              <span className="text-[9px] text-slate-500 font-mono">Sems left</span>
                            </div>
                          </div>

                          {/* CGPA Growth from First Semester */}
                          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-0.5">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase font-mono tracking-wider">CGPA Growth</span>
                            <div className="flex items-baseline mt-1 gap-1">
                              <span className={`text-sm font-black font-mono ${
                                cgpaGrowth > 0 ? "text-emerald-400" : cgpaGrowth < 0 ? "text-rose-400" : "text-slate-400"
                              }`}>
                                {cgpaGrowth >= 0 ? `+${cgpaGrowth.toFixed(2)}` : cgpaGrowth.toFixed(2)}
                              </span>
                              <span className="text-[8px] text-slate-500 font-sans">vs Sem 1</span>
                            </div>
                          </div>

                          {/* Highest GPA */}
                          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-0.5">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase font-mono tracking-wider">Highest Term</span>
                            <div className="flex items-baseline gap-0.5 mt-1">
                              <span className="text-base font-black text-emerald-400 font-mono">{highestSemGpa.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Consistency */}
                          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-0.5">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase font-mono tracking-wider">Consistency</span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-base font-black text-indigo-400 font-mono">{consistencyScore}%</span>
                              <span className="text-[8px] text-slate-500 font-mono">Score</span>
                            </div>
                          </div>

                          {/* Average Term GPA */}
                          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-0.5">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase font-mono tracking-wider">Average Term</span>
                            <div className="flex items-baseline gap-0.5 mt-1">
                              <span className="text-base font-black text-neutral-300 font-mono">{averageSemGpa.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Academic Trend Badge */}
                          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-0.5">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase font-mono tracking-wider">GPA Trend</span>
                            <div className="mt-1 flex items-center">
                              {academicTrend === "Improving" && (
                                <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 font-sans">
                                  <TrendingUp className="w-3.5 h-3.5 animate-bounce" /> Improving ↗
                                </span>
                              )}
                              {academicTrend === "Stable" && (
                                <span className="text-[10px] font-black text-slate-300 flex items-center gap-1 font-sans">
                                  <Activity className="w-3.5 h-3.5 text-slate-500" /> Stable →
                                </span>
                              )}
                              {academicTrend === "Declining" && (
                                <span className="text-[10px] font-black text-amber-500 flex items-center gap-1 font-sans">
                                  <TrendingDown className="w-3.5 h-3.5 animate-pulse" /> Declining ↘
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                </div>

                {/* Career Goal & Readiness Center */}
                {(() => {
                  const activeBranch = profile ? profile.branch : currentStudent.department;
                  const activeGpa = profile ? profile.cgpa : currentStudent.gpa;
                  
                  // Compute dynamic Placement Readiness Score
                  let readinessFactor = 28; // base score
                  readinessFactor += Math.min(40, Math.round(activeGpa * 4)); // up to 40% based on CGPA
                  const skillsCount = profile?.skills?.length || 0;
                  readinessFactor += Math.min(20, skillsCount * 4); // up to 20% for listed skills
                  if (profile?.resumeLink) readinessFactor += 6; // 6% for resume link
                  if (profile?.githubUrl) readinessFactor += 3; // 3% for github url
                  if (profile?.linkedinUrl) readinessFactor += 3; // 3% for linkedin url
                  const readinessScore = Math.min(100, Math.max(30, readinessFactor));

                  // Determine level and color for Readiness Index
                  let scoreLevel = "Basic Profile Match";
                  let scoreBadgeColor = "text-amber-400 bg-amber-955/40 border-amber-900/50";
                  if (readinessScore >= 85) {
                    scoreLevel = "Elite Target Readiness";
                    scoreBadgeColor = "text-indigo-400 bg-indigo-955/40 border-indigo-900/50";
                  } else if (readinessScore >= 70) {
                    scoreLevel = "Advanced Match State";
                    scoreBadgeColor = "text-blue-400 bg-blue-955/40 border-blue-900/50";
                  } else if (readinessScore >= 50) {
                    scoreLevel = "Intermediate Trajectory";
                    scoreBadgeColor = "text-emerald-400 bg-emerald-955/40 border-emerald-900/50";
                  }

                  // evaluated requirements
                  const evaluatedRequirements = [
                    { name: "Skills Added", isCleared: skillsCount > 0, detail: skillsCount > 0 ? `${skillsCount} skills indexed` : "Zero skills configured" },
                    { name: "CGPA Added", isCleared: activeGpa > 0, detail: activeGpa > 0 ? `${activeGpa.toFixed(2)}/10.0 CGPA` : "Academic track empty" },
                    { name: "Resume URL", isCleared: !!profile?.resumeLink, detail: profile?.resumeLink ? "Verified" : "Missing" },
                    { name: "LinkedIn URL", isCleared: !!profile?.linkedinUrl, detail: profile?.linkedinUrl ? "Verified" : "Missing" },
                    { name: "GitHub URL", isCleared: !!profile?.githubUrl, detail: profile?.githubUrl ? "Verified" : "Missing" },
                  ];

                  // dynamic recommended actions items (max 5)
                  const baseSteps = [];
                  if (!profile?.resumeLink) {
                    baseSteps.push({ text: "Upload Candidate Resume Link", icon: "FileText", detail: "Required for recruiters to evaluate projects." });
                  }
                  if (!profile?.linkedinUrl) {
                    baseSteps.push({ text: "Link LinkedIn Workspace Profile", icon: "Linkedin", detail: "Required to verify social credentials." });
                  }
                  if (!profile?.githubUrl) {
                    baseSteps.push({ text: "Integrate GitHub Developer Profile", icon: "Github", detail: "Allows evaluation of structural coding work." });
                  }
                  if (skillsCount < 4) {
                    baseSteps.push({ text: "Add More Technical Core Skills", icon: "Sparkles", detail: "Recommend indexing at least 4 tech keywords." });
                  }

                  const checkEligible = (company: any) => {
                    const gpaPassed = activeGpa >= company.minCgpa;
                    const branchPassed = checkBranchEligibility(activeBranch, company.eligibleBranches || []);
                    return gpaPassed && branchPassed;
                  };
                  const eligibleCount = companies.filter(checkEligible).length;

                  if (eligibleCount > 0) {
                    baseSteps.push({ text: "Apply to Eligible Corporate Drives", icon: "Briefcase", detail: `You qualify for ${eligibleCount} currently active drives.` });
                  } else {
                    baseSteps.push({ text: "Strengthen CGPA metric indicators", icon: "Award", detail: "Elevating benchmarks unlocks exclusive pipelines." });
                  }

                  const recommendedSteps = baseSteps.slice(0, 5);

                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6" id="career-planning-center-block">
                      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800/60 pb-5">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 rounded-2xl">
                            <Target className="w-5 h-5 animate-pulse" />
                          </span>
                          <div className="text-left">
                            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">🎯 Career Goal & Readiness</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Dynamic planning metrics, profile completeness checklists, and recommended career trajectories.</p>
                          </div>
                        </div>
                        <div className="bg-slate-955 border border-slate-850 rounded-2xl px-4 py-2 text-right">
                          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider">TARGET CAREER INTENT</span>
                          <span className="text-xs font-black text-indigo-400 font-mono tracking-wide">{profile?.desiredRole || "Not Configured"}</span>
                        </div>
                      </div>

                      {/* Four Logical Areas Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Area 1: Career Goals */}
                        <div className="border border-slate-800/80 bg-slate-955/35 rounded-3xl p-5 space-y-4 flex flex-col justify-between text-left hover:border-slate-700/80 transition-all" id="career-center-goals-block">
                          <div className="space-y-4">
                            <span className="text-[10px] font-black tracking-widest text-indigo-450 font-mono uppercase block">1. Target Preferences</span>
                            <div className="space-y-3">
                              <div>
                                <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase tracking-wider">Desired Role</span>
                                <p className="text-xs font-bold text-slate-200 mt-0.5">{profile?.desiredRole || "Not Configured"}</p>
                              </div>
                              <div>
                                <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase tracking-wider">Target Package</span>
                                <p className={`${profile?.targetPackage ? "text-emerald-400 font-mono" : "text-slate-400"} text-xs font-bold mt-0.5`}>{profile?.targetPackage || "Not Configured"}</p>
                              </div>
                              <div>
                                <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase tracking-wider">Preferred Industry</span>
                                <p className="text-xs font-bold text-slate-205 mt-0.5">{profile?.preferredIndustry || "Not Configured"}</p>
                              </div>
                              <div>
                                <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase tracking-wider">Preferred Location</span>
                                <p className="text-xs font-bold text-slate-205 mt-0.5">{profile?.preferredLocation || "Not Configured"}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Area 2: Readiness Block */}
                        <div className="border border-slate-800/80 bg-slate-955/35 rounded-3xl p-5 space-y-4 flex flex-col justify-between text-left hover:border-slate-700/80 transition-all" id="career-center-readiness-block">
                          <div className="space-y-4">
                            <span className="text-[10px] font-black tracking-widest text-indigo-455 font-mono uppercase block">2. Readiness Level</span>
                            <div className="flex flex-col items-center justify-center py-2 space-y-4">
                              <div className="relative flex items-center justify-center">
                                {/* Circular Progression */}
                                <svg className="w-24 h-24 transform -rotate-90">
                                  <circle cx="48" cy="48" r="40" className="stroke-slate-800/60" strokeWidth="8" fill="transparent" />
                                  <circle cx="48" cy="48" r="40" className="stroke-indigo-500 transition-all duration-1000 ease-out" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * readinessScore) / 100} />
                                </svg>
                                <span className="absolute text-xl font-black text-white font-mono">{readinessScore}%</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border tracking-wide uppercase font-mono ${scoreBadgeColor}`}>
                                {scoreLevel}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Area 3: Evaluated Checkpoints */}
                        <div className="border border-slate-800/80 bg-slate-955/35 rounded-3xl p-5 space-y-4 flex flex-col justify-between text-left hover:border-slate-700/80 transition-all" id="career-center-checkpoints-block">
                          <div className="space-y-4">
                            <span className="text-[10px] font-black tracking-widest text-indigo-455 font-mono uppercase block">3. Evaluated Checkpoints</span>
                            <div className="space-y-2.5">
                              {evaluatedRequirements.map((req, rid) => (
                                <div key={rid} className="flex items-center justify-between border-b border-slate-800/40 pb-1.5 last:border-0 last:pb-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {req.isCleared ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : (
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" />
                                    )}
                                    <span className="text-xs font-semibold text-slate-300 truncate">{req.name}</span>
                                  </div>
                                  <span className={`text-[9.5px] font-mono font-bold shrink-0 ${req.isCleared ? "text-emerald-500" : "text-rose-500"}`}>
                                    {req.isCleared ? "✓ Added" : "✗ Missing"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Area 4: Recommended Actions */}
                        <div className="border border-slate-800/80 bg-slate-955/35 rounded-3xl p-5 space-y-4 flex flex-col justify-between text-left hover:border-slate-700/80 transition-all" id="career-center-actions-block">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black tracking-widest text-indigo-455 font-mono uppercase block">4. Action Plan (Max 5)</span>
                            <div className="space-y-2 max-h-[185px] overflow-y-auto pr-1">
                              {recommendedSteps.map((step, sid) => (
                                <div key={sid} className="bg-slate-900/60 hover:bg-slate-850 border border-slate-800/80 rounded-xl p-2 flex items-start gap-2.5 transition-all group/item">
                                  <span className="p-1.5 bg-indigo-950/40 text-indigo-405 border border-indigo-900/30 rounded-lg shrink-0 mt-0.5">
                                    {step.icon === "FileText" && <FileText className="w-3 h-3" />}
                                    {step.icon === "Linkedin" && <Linkedin className="w-3 h-3" />}
                                    {step.icon === "Github" && <Github className="w-3 h-3" />}
                                    {step.icon === "Sparkles" && <Sparkles className="w-3 h-3" />}
                                    {step.icon === "Briefcase" && <Briefcase className="w-3 h-3" />}
                                    {step.icon === "Award" && <Award className="w-3 h-3" />}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-[10.5px] font-bold text-slate-205 group-hover/item:text-white transition-all truncate leading-snug">{step.text}</p>
                                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{step.detail}</p>
                                  </div>
                                </div>
                              ))}
                              {recommendedSteps.length === 0 && (
                                <p className="text-xs text-slate-400 italic">No actions pending. Profile is completely verified!</p>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* VIEW B: PLACEMENT PROFILE */}
            {activeTab === "placement" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg" id="placement-tab-panel">
                <PlacementProfile token={token} student={student} onProfileUpdate={setProfile} />
              </div>
            )}

            {/* VIEW C: CORPORATE DRIVES */}
            {activeTab === "companies" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg" id="companies-tab-panel">
                <CompanyManagement token={token} student={student} studentProfile={profile} />
              </div>
            )}

            {/* VIEW D: APPLICATION TRACKER */}
            {activeTab === "applications" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg" id="applications-tab-panel">
                <ApplicationTracker token={token} student={student} />
              </div>
            )}

            {/* VIEW E: PLACEMENT ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg" id="analytics-tab-panel">
                <PlacementAnalytics token={token} student={student} />
              </div>
            )}

            {/* VIEW F: ADVISORY ANNOUNCEMENTS */}
            {activeTab === "announcements" && (
              <div className="space-y-6 animate-fade-in" id="announcements-tab-panel">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="mb-4">
                    <h3 className="text-base font-extrabold text-white">Live Advisory Notices</h3>
                    <p className="text-xs text-slate-400 mt-1">Official communication broadcasts issued by Placements Officer & Academic coordinators.</p>
                  </div>

                  <div className="space-y-4" id="notice-cards-stack">
                     {announcements.map((ann) => (
                      <div key={ann.id} className="bg-slate-950 border border-slate-850 rounded-2xl p-5 hover:border-indigo-500/30 dynamic-hover-indigo-accent transition-all flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-bold uppercase tracking-widest font-mono px-2.5 py-1 rounded-md border ${
                              ann.tag.includes("Academic") ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/50" :
                              ann.tag.includes("Facilities") ? "bg-amber-950/40 text-amber-400 border-amber-900/50" :
                              "bg-emerald-950/40 text-emerald-400 border-emerald-900/50"
                            }`}>
                              {ann.tag}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {ann.date}
                            </span>
                          </div>
                          <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">{ann.title}</h4>
                          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">{ann.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW G: SYSTEM SETTINGS */}
            {activeTab === "token" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl" id="settings-tab-panel">
                <SettingsPage
                  token={token}
                  student={student}
                  profile={profile}
                  setProfile={setProfile}
                  onLogout={onLogout}
                  onLaunchJwtInspector={() => handleTabChange("jwt-inspector")}
                />
              </div>
            )}

            {/* VIEW H: SYSTEM JWT AUDIT AND INSPECTOR (Developer tools) */}
            {activeTab === "jwt-inspector" && (
              <div className="space-y-4 animate-fade-in" id="jwt-audit-tab-panel">
                <button
                  onClick={() => handleTabChange("token")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-400 bg-indigo-950/40 rounded-xl border border-indigo-900/40 transition-colors cursor-pointer shadow-sm shrink-0 w-fit animate-fade-in"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Settings</span>
                </button>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-start gap-4 flex-wrap pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Cpu className="text-indigo-400 w-5 h-5 shrink-0" />
                      <span>Cryptographic Session Token Decoder</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Audit active JSON Web Token verification headers protecting current resource streams.</p>
                  </div>

                  <button
                    onClick={handleCopyToken}
                    className={`flex items-center gap-2 py-2 px-4 rounded-xl border font-bold text-xs transition-all cursor-pointer shrink-0 ${
                      copiedToken
                        ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-705"
                    }`}
                  >
                    {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedToken ? "Token Copied Successfully!" : "Copy Session Signed Key"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="jwt-audit-grid">
                  
                  {/* Encoded token displays */}
                  <div className="bg-slate-950/80 text-slate-405 font-mono text-[10.5px] rounded-2xl p-5 border border-slate-850 leading-relaxed flex flex-col justify-between h-[360px] overflow-hidden">
                    <div className="overflow-hidden">
                      <h5 className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-3 font-sans">Active Cryptographic Hash</h5>
                      <div className="break-all whitespace-pre-wrap select-all max-h-[220px] overflow-y-auto pr-1">
                        <span className="text-rose-400 font-bold">{token.split(".")[0]}</span>
                        <span>.</span>
                        <span className="text-indigo-400 font-bold">{token.split(".")[1]}</span>
                        <span>.</span>
                        <span className="text-emerald-400 font-bold">{token.split(".")[2] || "signature"}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-800/80 pt-4 text-[10px] text-slate-500 font-sans">
                      <p>Header, Payload Claims, and Verified SHA256 Signature digests separated by dots.</p>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4 font-mono text-xs max-h-[360px] overflow-y-auto pr-1">
                    {deconstructed ? (
                      <>
                        <div className="border border-rose-950/65 text-rose-300 bg-rose-955/10 rounded-2xl p-5 space-y-2">
                          <div className="flex justify-between items-center border-b border-rose-900/30 pb-2">
                            <span className="text-rose-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                              <Layers className="w-4 h-4" /> SHA256 Header Configuration
                            </span>
                            <span className="text-[9px] bg-rose-950/60 text-rose-400 border border-rose-900/50 px-2 py-0.5 rounded font-bold font-mono">ALGORITHM BLOCK</span>
                          </div>
                          <pre className="text-[11px] leading-relaxed select-all overflow-x-auto text-rose-300">
                            {JSON.stringify(deconstructed.header, null, 2)}
                          </pre>
                        </div>

                        <div className="border border-indigo-950/65 text-slate-300 bg-indigo-955/10 rounded-2xl p-5 space-y-2">
                          <div className="flex justify-between items-center border-b border-indigo-900/30 pb-2">
                            <span className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                              <User className="w-4 h-4" /> Cryptographic Identity Claims
                            </span>
                            <span className="text-[9px] bg-indigo-950/60 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded font-bold font-mono">PAYLOAD BLOCK</span>
                          </div>
                          <pre className="text-[11px] leading-relaxed select-all overflow-x-auto text-indigo-300">
                            {JSON.stringify(deconstructed.payload, null, 2)}
                          </pre>
                        </div>

                        <div className="bg-emerald-950/20 border border-emerald-900/40 text-slate-300 rounded-2xl p-5 space-y-1">
                          <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 mb-2 font-mono">
                            <Shield className="w-4 h-4" /> Signature Integrity Verified
                          </span>
                          <p className="font-sans text-xs text-slate-400 leading-relaxed">
                            Bcrypt server coordinates validated the parameters. Signature matches the symmetric key payload.
                          </p>
                          <p className="font-sans text-xs text-emerald-400 font-bold mt-1">
                            Session Expiry: {new Date(deconstructed.payload.exp * 1000).toLocaleString()}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 h-full">
                        <Shield className="w-9 h-9 mb-2 text-slate-755 animate-pulse" />
                        <span className="font-sans text-xs">Awaiting active token breakdown.</span>
                      </div>
                    )}
                  </div>
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
