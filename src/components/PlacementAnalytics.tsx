import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Colors
} from "chart.js";
import { Bar, Pie, Doughnut, Line } from "react-chartjs-2";
import {
  TrendingUp,
  Users,
  Building2,
  FileText,
  UserCheck,
  Percent,
  RefreshCw,
  Award,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart4,
  Clock
} from "lucide-react";
import { Student } from "../types";
import { getCachedValue, setCachedValue } from "../apiCache";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Colors
);

interface AdminAnalytics {
  totalStudents: number;
  totalCompanies: number;
  totalApplications: number;
  totalSelectedStudents: number;
  selectionRate: number;
  applicationsPerCompany: { companyName: string; count: number }[];
  branchWiseApplications: { branch: string; count: number }[];
  selectionStatistics: { status: string; count: number }[];
  companyWiseHiring: { companyName: string; hiredCount: number }[];
}

interface StudentAnalytics {
  applicationsSubmitted: number;
  eligibleCompanies: number;
  selectionStatus: {
    Applied: number;
    Shortlisted: number;
    "Interview Scheduled": number;
    Selected: number;
    Rejected: number;
  };
  applications: any[];
}

interface PlacementAnalyticsProps {
  token: string;
  student: Student;
}

export default function PlacementAnalytics({ token, student }: PlacementAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminAnalytics | null>(null);
  const [studentData, setStudentData] = useState<StudentAnalytics | null>(null);

  const isAdmin = student.role === "admin";

  const fetchAnalytics = async (forceRefetch = false) => {
    try {
      setError(null);
      const url = isAdmin ? "/api/analytics/admin" : "/api/analytics/student";
      
      if (!forceRefetch) {
        const cached = getCachedValue(url);
        if (cached) {
          if (isAdmin) {
            setAdminData(cached);
          } else {
            setStudentData(cached);
          }
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      console.log(`[Navigation API Fetch CACHE MISS] Retransmitting request for: ${url}`);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to load secure database aggregations from backend router.");
      }

      const raw = await response.json();
      if (isAdmin) {
        setAdminData(raw);
      } else {
        setStudentData(raw);
      }
      setCachedValue(url, raw);
    } catch (err: any) {
      setError(err.message || "An exception occurred pulling analytics registries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token, student.role]);

  if (loading) {
    return (
      <div className="py-24 text-center" id="analytics-loader">
        <div className="relative inline-flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-solid border-indigo-650/20 border-t-indigo-550"></div>
          <Clock className="w-5 h-5 text-indigo-400 absolute animate-pulse" />
        </div>
        <p className="text-xs text-slate-500 mt-4 font-mono">Running high-efficiency pipeline aggregators...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-rose-955/15 border border-rose-900/50 text-rose-450 rounded-2xl flex items-center gap-3 text-left shadow-lg" id="analytics-error">
        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 animate-bounce" />
        <div>
          <h4 className="font-extrabold text-white text-xs sm:text-sm font-mono uppercase">Aggregation Operational Fault</h4>
          <p className="text-xs mt-0.5 text-slate-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER ADMIN DASHBOARD DESIGN
  // ==========================================
  if (isAdmin && adminData) {
    const {
      totalStudents,
      totalCompanies,
      totalApplications,
      totalSelectedStudents,
      selectionRate,
      applicationsPerCompany,
      branchWiseApplications,
      selectionStatistics,
      companyWiseHiring
    } = adminData;

    // 1. Applications Per Company Chart Data
    const appCompanyData = {
      labels: applicationsPerCompany.map(item => item.companyName),
      datasets: [
        {
          label: "Registered Applicants",
          data: applicationsPerCompany.map(item => item.count),
          backgroundColor: "#6366f1", // Indigo Accent
          borderColor: "#4f46e5",
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 24,
        }
      ]
    };

    // 2. Branch Wise Applications Chart Data
    const branchColours = [
      "rgba(99, 102, 241, 0.8)",  // indigo
      "rgba(16, 185, 129, 0.8)",  // emerald
      "rgba(245, 158, 11, 0.8)",  // amber
      "rgba(239, 68, 68, 0.8)",   // red
      "rgba(139, 92, 246, 0.8)",  // violet
      "rgba(6, 182, 212, 0.8)",   // cyan
    ];

    const branchData = {
      labels: branchWiseApplications.map(item => item.branch),
      datasets: [
        {
          label: "Applications submitted",
          data: branchWiseApplications.map(item => item.count),
          backgroundColor: branchColours.slice(0, branchWiseApplications.length || 4),
          borderWidth: 1.5,
          borderColor: "#0f172a"
        }
      ]
    };

    // 3. Selection Statistics Selection
    const selectionData = {
      labels: selectionStatistics.map(item => item.status),
      datasets: [
        {
          label: "Current Status",
          data: selectionStatistics.map(item => item.count),
          backgroundColor: [
            "rgba(100, 116, 139, 0.75)", // Applied (slate)
            "rgba(99, 102, 241, 0.75)", // Shortlisted (indigo)
            "rgba(245, 158, 11, 0.75)", // Interview Scheduled (amber)
            "rgba(16, 185, 129, 0.85)", // Selected (emerald)
            "rgba(239, 68, 68, 0.8)",  // Rejected (rose)
          ],
          borderColor: [
            "#64748b",
            "#6366f1",
            "#f59e0b",
            "#10b981",
            "#ef4444",
          ],
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    };

    // 4. Company Wise Hiring
    const hiringData = {
      labels: companyWiseHiring.map(item => item.companyName),
      datasets: [
        {
          label: "Selected Candidates (Hired)",
          data: companyWiseHiring.map(item => item.hiredCount),
          backgroundColor: "#10b981", // Emerald Accent
          borderColor: "#059669",
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 24,
        }
      ]
    };

    const isDark = document.documentElement.classList.contains("dark");

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom" as const,
          labels: {
            font: { family: "Inter", size: 10, weight: "bold" as const },
            color: isDark ? "#94a3b8" : "#475569"
          }
        },
        tooltip: {
          padding: 12,
          backgroundColor: isDark ? "#020617" : "#ffffff",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
          borderWidth: 1,
          bodyFont: { family: "Inter", size: 11 },
          bodyColor: isDark ? "#f8fafc" : "#0f172a",
          titleFont: { family: "Inter", size: 12, weight: "bold" as const },
          titleColor: isDark ? "#ffffff" : "#0f172a"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: { family: "JetBrains Mono", size: 10 },
            color: isDark ? "#64748b" : "#475569"
          },
          grid: { color: isDark ? "#1e293b" : "#f1f5f9" }
        },
        x: {
          ticks: {
            font: { family: "Inter", size: 10, weight: "bold" as const },
            color: isDark ? "#64748b" : "#475569"
          },
          grid: { display: false }
        }
      }
    };

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right" as const,
          labels: {
            font: { family: "Inter", size: 10, weight: "bold" as const },
            color: isDark ? "#94a3b8" : "#475569"
          }
        },
        tooltip: {
          padding: 12,
          backgroundColor: isDark ? "#020617" : "#ffffff",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
          borderWidth: 1,
          bodyFont: { family: "Inter", size: 11 },
          bodyColor: isDark ? "#f8fafc" : "#0f172a",
          titleColor: isDark ? "#ffffff" : "#0f172a"
        }
      }
    };

    return (
      <div className="space-y-8 animate-fade-in" id="admin-analytics-view">
        
        {/* TOP INTRO BANNER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <TrendingUp className="w-5.5 h-5.5 text-indigo-400" />
              <span>Campus Recruitment Control Center</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Secure MongoDB aggregator reporting on placement registration rates, matching pipelines, and active selection milestones.
            </p>
          </div>
          <button 
            onClick={() => fetchAnalytics(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Indices</span>
          </button>
        </div>

        {/* 1. KEY KPI VALUE MATRIX */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between text-left shadow-sm">
            <span className="text-[9px] tracking-widest font-mono font-bold text-slate-400 uppercase">Registered Pool</span>
            <div className="flex items-end gap-1.5 mt-4">
              <span className="text-2xl font-black text-white tracking-tight font-mono">{totalStudents}</span>
              <span className="text-[10px] text-slate-450 font-bold mb-1">Students</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold mt-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Total Active Student Logins
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between text-left shadow-sm">
            <span className="text-[9px] tracking-widest font-mono font-bold text-slate-400 uppercase">Affiliated Drives</span>
            <div className="flex items-end gap-1.5 mt-4">
              <span className="text-2xl font-black text-white tracking-tight font-mono">{totalCompanies}</span>
              <span className="text-[10px] text-slate-450 font-bold mb-1">Drives</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold mt-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Active Corporate Pipelines
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between text-left shadow-sm">
            <span className="text-[9px] tracking-widest font-mono font-bold text-indigo-400 uppercase">Submissions Received</span>
            <div className="flex items-end gap-1.5 mt-4">
              <span className="text-2xl font-black text-white tracking-tight font-mono">{totalApplications}</span>
              <span className="text-[10px] text-indigo-400 font-bold mb-1">Rolls</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold mt-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Catalogued Submissions
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between text-left shadow-sm">
            <span className="text-[9px] tracking-widest font-mono font-bold text-emerald-500 uppercase">Hiring Cleared</span>
            <div className="flex items-end gap-1.5 mt-4">
              <span className="text-2xl font-black text-emerald-400 tracking-tight font-mono">{totalSelectedStudents}</span>
              <span className="text-[10px] text-emerald-500 font-bold mb-1">Placed</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold mt-2 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Approved Selection Contracts
            </p>
          </div>

          <div className="bg-indigo-950/20 border border-indigo-900 p-4 rounded-3xl flex flex-col justify-between text-left shadow-md col-span-2 lg:col-span-1">
            <span className="text-[9px] tracking-widest font-mono font-extrabold text-indigo-400 uppercase">Selection Ratio</span>
            <div className="flex items-end gap-1 mt-4">
              <span className="text-2xl font-black text-indigo-400 tracking-tight font-mono">{selectionRate}%</span>
            </div>
            <p className="text-[9px] text-slate-350 font-bold mt-2 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Target Match Metric
            </p>
          </div>

        </div>

        {/* 2. GRIDS OF CHART.JS CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chart A: Applications per company */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left shadow-lg flex flex-col justify-between">
            <div className="border-b border-slate-850 pb-3 mb-4">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <BarChart4 className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                <span>Applications Received per Placement Drive</span>
              </h4>
              <p className="text-[10.5px] text-slate-450 mt-0.5">Distribution showing total candidates enrolled per campus drive.</p>
            </div>
            <div className="h-[220px] relative">
              {applicationsPerCompany.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">No applications registered.</div>
              ) : (
                <Bar data={appCompanyData} options={commonOptions} />
              )}
            </div>
          </div>

          {/* Chart B: Hiring Statistics (Selected count) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left shadow-lg flex flex-col justify-between">
            <div className="border-b border-slate-850 pb-3 mb-4">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Award className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <span>Offers Dispatched per Recruiting partner</span>
              </h4>
              <p className="text-[10.5px] text-slate-450 mt-0.5">Corporate selection stats indicating actual hiring count clearances.</p>
            </div>
            <div className="h-[220px] relative">
              {companyWiseHiring.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">No candidates hired yet.</div>
              ) : (
                <Bar data={hiringData} options={commonOptions} />
              )}
            </div>
          </div>

          {/* Chart C: Branch Wise Applications */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left shadow-lg flex flex-col justify-between">
            <div className="border-b border-slate-850 pb-3 mb-4">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <PieIcon className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                <span>Department Wise Submission Rates</span>
              </h4>
              <p className="text-[10.5px] text-slate-455 mt-0.5">Breakdown showing student application ratios across academic branches.</p>
            </div>
            <div className="h-[220px] relative">
              {branchWiseApplications.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">No subdivisions tracked.</div>
              ) : (
                <Doughnut data={branchData} options={doughnutOptions} />
              )}
            </div>
          </div>

          {/* Chart D: Selection Statistics */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left shadow-lg flex flex-col justify-between">
            <div className="border-b border-slate-850 pb-3 mb-4">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <CheckCircle className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                <span>Verification Pipeline Status Funnel</span>
              </h4>
              <p className="text-[10.5px] text-slate-455 mt-0.5">Total candidate pools currently mapping over pipeline milestones.</p>
            </div>
            <div className="h-[220px] relative">
              <Bar 
                data={selectionData} 
                options={{
                  ...commonOptions,
                  plugins: {
                    ...commonOptions.plugins,
                    legend: { display: false }
                  }
                }} 
              />
            </div>
          </div>

        </div>

        {/* INSIGHT PANEL */}
        <div className="p-5 border border-indigo-900 bg-indigo-950/20 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <h4 className="text-sm font-bold text-white">Dynamic Recruiter Action Summary</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Target analysis indicates high matches inside CSE and IT. Check eligibility filters (such as branch maps and minimum CGPA criteria) if general enrollment curves decay.
            </p>
          </div>
          <p className="text-[10.5px] font-mono font-bold text-indigo-400 shrink-0">MongoDB Aggregators Active</p>
        </div>

      </div>
    );
  }

  // ==========================================
  // RENDER STUDENT PLACEMENT ANALYTICS
  // ==========================================
  if (!isAdmin && studentData) {
    const {
      applicationsSubmitted,
      eligibleCompanies,
      selectionStatus,
      applications
    } = studentData;

    const selectionArray = Object.entries(selectionStatus).map(([status, count]) => ({
      status,
      count
    }));

    // Status colors mapping
    const getStatusTheme = (status: string) => {
      switch (status) {
        case "Selected":
          return { bg: "bg-emerald-950/40 border-emerald-900/40 text-emerald-400", icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> };
        case "Rejected":
          return { bg: "bg-rose-955/15 border-rose-900/40 text-rose-455", icon: <AlertCircle className="w-3.5 h-3.5 text-rose-550 shrink-0" /> };
        case "Interview Scheduled":
          return { bg: "bg-amber-955/20 border-amber-900/40 text-amber-400", icon: <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0" /> };
        case "Shortlisted":
          return { bg: "bg-indigo-955/20 border-indigo-900/40 text-indigo-400", icon: <Award className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> };
        case "Applied":
        default:
          return { bg: "bg-slate-950/40 border-slate-800 text-slate-400", icon: <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" /> };
      }
    };

    // Chart.js doughnut setup
    const studentStatusChart = {
      labels: Object.keys(selectionStatus),
      datasets: [
        {
          label: "Your Applications count",
          data: Object.values(selectionStatus),
          backgroundColor: [
            "rgba(100, 116, 139, 0.65)", // Applied
            "rgba(99, 102, 241, 0.65)", // Shortlisted
            "rgba(245, 158, 11, 0.65)", // Interview Scheduled
            "rgba(16, 185, 129, 0.8)",  // Selected
            "rgba(239, 68, 68, 0.75)",  // Rejected
          ],
          borderWidth: 1.5,
          borderColor: "#0f172a"
        }
      ]
    };

    return (
      <div className="space-y-6 animate-fade-in" id="student-analytics-view">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <TrendingUp className="w-5.5 h-5.5 text-indigo-400" />
              <span>Placement Eligibility & Milestones Metrics</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Audit secure candidate parameters, corporate drive eligibility fits, CGPA checks, and interview statistics.
            </p>
          </div>
          <button 
            onClick={() => fetchAnalytics(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Indices</span>
          </button>
        </div>

        {/* STAT OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between text-left shadow-lg">
            <span className="text-[9px] tracking-widest font-mono font-bold text-slate-400 block uppercase">Submitted Drives</span>
            <div className="flex items-end gap-1.5 mt-4">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">{applicationsSubmitted}</span>
              <span className="text-xs text-slate-500 dark:text-slate-450 font-bold leading-none">Drives Applied</span>
            </div>
            <p className="text-[9.5px]/none text-slate-505 dark:text-slate-400 font-bold mt-4 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-900 pt-3">
              <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-405" /> Direct submissions log active
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between text-left shadow-lg">
            <span className="text-[9px] tracking-widest font-mono font-bold text-slate-400 block uppercase">Qualified Drive Opportunities</span>
            <div className="flex items-end gap-1.5 mt-4">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-450 font-mono leading-none">{eligibleCompanies}</span>
              <span className="text-xs text-slate-500 dark:text-slate-455 font-bold leading-none animate-pulse">Drives Match</span>
            </div>
            <p className="text-[9.5px]/none text-slate-505 dark:text-slate-400 font-bold mt-4 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-900 pt-3">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> CGPA threshold and branch qualified
            </p>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-900 p-5 rounded-3xl flex flex-col justify-between text-left shadow-md">
            <span className="text-[9px] tracking-widest font-mono font-bold text-indigo-550 dark:text-indigo-400 block uppercase">Selection Clearance Status</span>
            <div className="flex items-end gap-1.5 mt-4">
              {selectionStatus.Selected > 0 ? (
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-sans">OFFER DISPATCHED 🎓</span>
              ) : selectionStatus.Rejected > 0 && applicationsSubmitted === selectionStatus.Rejected ? (
                <span className="text-lg font-black text-rose-600 dark:text-rose-450 tracking-tight font-sans">TERMINATED</span>
              ) : (
                <span className="text-[15px] font-bold text-slate-900 dark:text-white tracking-wide font-sans uppercase">Under active review</span>
              )}
            </div>
            <p className="text-[9.5px]/none text-indigo-650 dark:text-indigo-455 font-bold mt-4 flex items-center gap-1.5 border-t border-indigo-200 dark:border-indigo-900 pt-3">
              <Award className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" /> Verified Placement Pipeline
            </p>
          </div>

        </div>

        {/* DETAILED SPLIT AND TIMELINE CHARTS CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Status Breakdown Tracker */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left shadow-lg lg:col-span-1 flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Pipeline Phase Split</h4>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-455 mt-0.5">Visually details division across active application channels.</p>
            </div>
            <div className="h-[180px] relative">
              {applicationsSubmitted === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">No submissions logged yet.</div>
              ) : (
                <Doughnut 
                  data={studentStatusChart} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom" as const,
                        labels: {
                          font: { family: "Inter", size: 9.5, weight: "bold" },
                          color: "#64748b"
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>
          </div>

          {/* Table representing all submitted metrics */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left shadow-lg lg:col-span-2">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Drive Submissions Catalog Logs</h4>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-455 mt-0.5">Real-time status summaries of CTC packages, job roles, and verification checkpoints.</p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl font-mono italic">
                Awaiting corporate registrations. Visit placement drives to enroll.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-955 text-[9px] uppercase font-bold text-slate-400 border-b border-slate-850 font-mono tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Recruiting partner</th>
                      <th className="py-3 px-3">Hiring Role</th>
                      <th className="py-3 px-3">Annual Package Offering</th>
                      <th className="py-3 px-3 text-right">Pipeline Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300 font-sans font-medium">
                    {applications.map((app: any) => {
                      const theme = getStatusTheme(app.status);
                      return (
                        <tr key={app.id} className="hover:bg-slate-950/50 hover:text-white transition-all duration-150">
                          <td className="py-3.5 px-3 font-extrabold text-slate-900 dark:text-white">{app.companyInfo?.name || "Microsoft"}</td>
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-450">{app.companyInfo?.jobRole || "SDE Associate"}</td>
                          <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 font-mono font-bold">{app.companyInfo?.packageLpa} LPA CTC</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-md border text-[10px] select-none ${theme.bg}`}>
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    );
  }

  return null;
}
