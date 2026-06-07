import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  UserCheck,
  Send,
  MoreVertical,
  Activity,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import { Student, Company } from "../types";
import { getCachedValue, setCachedValue, clearCachedValue } from "../apiCache";

interface Application {
  id: string;
  studentId: string;
  companyId: string;
  status: "Applied" | "Shortlisted" | "Interview Scheduled" | "Selected" | "Rejected";
  applicationDate: string;
  companyInfo?: Company;
  studentInfo?: Student;
  profileInfo?: any;
}

interface ApplicationTrackerProps {
  token: string;
  student: Student;
  refreshDrives?: () => void;
}

export default function ApplicationTracker({ token, student, refreshDrives }: ApplicationTrackerProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showActionError = (message: string) => {
    setActionError(message);
    setTimeout(() => {
      setActionError(null);
    }, 4500);
  };
  
  // Filter indices
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  
  // Status Changing Trigger
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Load appropriate data based on student account role
  const fetchApplications = async (forceRefetch = false) => {
    try {
      setError(null);
      
      const endpoint = student.role === "admin" ? "/api/applications" : "/api/applications/student";

      if (!forceRefetch) {
        const cached = getCachedValue(endpoint);
        if (cached) {
          setApplications(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      console.log(`[Navigation API Fetch CACHE MISS] Retransmitting request for: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Could not fetch application records database.");
      }

      const data = await response.json();
      setApplications(data);
      setCachedValue(endpoint, data);
    } catch (err: any) {
      setError(err.message || "Failed pulling candidate placement files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [token, student.role]);

  // Update applicant status (Admin action)
  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      const response = await fetch(`/api/applications/${appId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Failed changing candidate placement pipeline status.");
      }

      // Mutated, so clear caches for all users/dashboards/analytics
      clearCachedValue("/api/applications");
      clearCachedValue("/api/applications/student");
      clearCachedValue("/api/student/dashboard");
      clearCachedValue("/api/analytics/student");
      clearCachedValue("/api/analytics/admin");

      setApplications(prev => 
        prev.map(app => app.id === appId ? { ...app, status: newStatus as any } : app)
      );
      
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err: any) {
      showActionError("Error updating status: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Status Colors styling tags helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Selected":
        return "bg-emerald-950/40 text-emerald-400 border-emerald-900/60 font-bold";
      case "Rejected":
        return "bg-rose-955/15 text-rose-450 border-rose-900/60 font-bold";
      case "Shortlisted":
        return "bg-indigo-950/40 text-indigo-400 border-indigo-900/60 font-bold";
      case "Interview Scheduled":
        return "bg-amber-950/40 text-amber-400 border-amber-900/60 font-bold";
      case "Applied":
      default:
        return "bg-slate-950/40 text-slate-400 border-slate-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Selected":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "Rejected":
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case "Shortlisted":
        return <AwardIcon className="w-4 h-4 text-indigo-400 shrink-0" />;
      case "Interview Scheduled":
        return <Calendar className="w-4 h-4 text-amber-500 shrink-0" />;
      case "Applied":
      default:
        return <Clock className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  const AwardIcon = ({ className }: { className: string }) => {
    return <TrendingUp className={className} />;
  };

  const getStepIndex = (status: string) => {
    if (status === "Selected" || status === "Rejected") return 3;
    if (status === "Interview Scheduled") return 2;
    if (status === "Shortlisted") return 1;
    return 0; // Applied
  };

  // Filtering Logic
  const getFilteredApps = () => {
    return applications.filter(app => {
      const q = searchQuery.toLowerCase();
      const matchSearch = searchQuery === "" || 
        (app.companyInfo?.name?.toLowerCase().includes(q)) ||
        (app.companyInfo?.jobRole?.toLowerCase().includes(q)) ||
        (app.studentInfo?.name?.toLowerCase().includes(q)) ||
        (app.studentInfo?.studentId?.toLowerCase().includes(q)) ||
        (app.studentInfo?.email?.toLowerCase().includes(q));

      const matchStatus = statusFilter === "" || app.status === statusFilter;
      const matchCompany = companyFilter === "" || app.companyId === companyFilter;

      return matchSearch && matchStatus && matchCompany;
    });
  };

  const filteredApps = getFilteredApps();

  const distinctCompanies = Array.from(
    new Map(applications.map(app => [app.companyId, app.companyInfo?.name])).entries()
  );

  const totalApplied = applications.length;
  const totalSelected = applications.filter(a => a.status === "Selected").length;
  const totalShortlisted = applications.filter(a => a.status === "Shortlisted").length;
  const totalInterviews = applications.filter(a => a.status === "Interview Scheduled").length;

  return (
    <div className="space-y-6 animate-fade-in" id="applications-tracker-main">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-150 dark:border-slate-800 font-sans">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-505 dark:text-indigo-400 shrink-0" />
            <span>Placement Applications Tracker</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Realtime verification pipeline tracking candidates through active on-campus rounds and official recruiter callbacks.
          </p>
        </div>

        <button
          onClick={fetchApplications}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Database</span>
        </button>
      </div>

      {/* KPI METRIC CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="tracker-kpis">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left shadow-sm">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest font-mono">Total Submissions</span>
          <span className="text-2xl font-black text-white block mt-1 tracking-tight pr-1 truncate">{totalApplied} Applications</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left shadow-sm">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest font-mono">Shortlisted Pool</span>
          <span className="text-2xl font-black text-indigo-400 block mt-1 tracking-tight pr-1 truncate">{totalShortlisted} Candidates</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left shadow-sm">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest font-mono">Interviews Slated</span>
          <span className="text-2xl font-black text-amber-500 block mt-1 tracking-tight pr-1 truncate font-mono">{totalInterviews} Active</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left shadow-sm">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest font-mono">Offers Accepted</span>
          <span className="text-2xl font-black text-emerald-400 block mt-1 tracking-tight pr-1 truncate font-mono">{totalSelected} Placed</span>
        </div>
      </div>

      {/* SEARCH AND FILTER MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg text-left grid grid-cols-1 sm:grid-cols-3 gap-4" id="applications-filter-container">
        
        {/* A. Search Field */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-505">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={student.role === "admin" ? "Search student, branch, or drives..." : "Search drive or role..."}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all font-medium"
            id="tracker-text-search"
          />
        </div>

        {/* B. Status Milestone Selection Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-405 dark:text-slate-505">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-455" />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300 outline-none cursor-pointer focus:border-indigo-500 transition-all font-sans font-semibold"
            id="tracker-status-filter"
          >
            <option value="">Status Milestone (All)</option>
            <option value="Applied">Applied</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* C. Company Filter selection dropdown */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-405 dark:text-slate-505">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-455" />
          </span>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300 outline-none cursor-pointer focus:border-indigo-500 transition-all font-sans font-semibold"
            id="tracker-company-filter"
          >
            <option value="">Recruiting Company Drive (All)</option>
            {distinctCompanies.map(([cid, cname]) => (
              <option key={cid} value={cid}>{cname || "Unnamed Corporates"}</option>
            ))}
          </select>
        </div>

      </div>

      {/* LOADING AND ERROR BANNER STATUS BLOCKS */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="relative inline-flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-solid border-indigo-650/20 border-t-indigo-650"></div>
            <Clock className="w-5 h-5 text-indigo-400 absolute" />
          </div>
          <p className="text-xs text-slate-500 mt-3 font-mono">Querying application directories...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-955/15 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-455 text-xs sm:text-sm rounded-2xl flex items-center gap-3 text-left">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>Sync Failure: {error}</span>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-400 dark:text-slate-700 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-400">No application submissions logged</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">
            {student.role === "admin" 
              ? "All active academic drive registries are cleared. Awaiting student submissions." 
              : "You have not registered for any active drives. Visit corporate drives to enroll."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT/MAIN DECK: APPLICANT MATRIX LIST */}
          <div className="lg:col-span-2 space-y-4">
            
            {student.role === "admin" ? (
              /* ADMIN TABULAR WORKSPACE LIST */
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl" id="tracker-table-container">
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs sm:text-sm border-collapse">
                     <thead className="bg-slate-955 text-[9.5px] uppercase font-bold text-slate-400 border-b border-slate-850 tracking-widest font-mono">
                      <tr>
                        <th className="py-4 px-6">Candidate Parameters</th>
                        <th className="py-4 px-4">Placement Drive</th>
                        <th className="py-4 px-4">Date Enrolled</th>
                        <th className="py-4 px-4">Pipeline Step</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {filteredApps.map((app) => {
                        const isSelected = selectedApp?.id === app.id;
                        return (
                          <tr 
                            key={app.id} 
                            onClick={() => setSelectedApp(app)}
                            className={`group cursor-pointer transition-all duration-200 font-sans ${
                              isSelected 
                                ? "bg-indigo-950/15 shadow-[inset_0_1px_0_0_rgba(99,102,241,0.03),0_4px_16px_rgba(99,102,241,0.03)]" 
                                : "hover:bg-slate-950/60"
                            }`}
                          >
                            
                            {/* Student Candidate profile column */}
                            <td className={`py-4 pr-6 font-normal transition-all duration-200 border-l-[3px] ${
                              isSelected 
                                ? "border-indigo-600 dark:border-indigo-500 pl-[21px]" 
                                : "border-transparent pl-6"
                            }`}>
                              <div className="space-y-1">
                                <span className={`font-extrabold block text-sm leading-tight transition-colors ${
                                  isSelected ? "text-indigo-650 dark:text-indigo-400" : "text-slate-900 dark:text-white"
                                }`}>
                                  {app.studentInfo?.name || "Anonymous Member"}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-semibold font-mono">
                                  <span className="text-slate-400">{app.studentInfo?.studentId || "ID Ref"}</span>
                                  <span>·</span>
                                  <span className="text-indigo-600 dark:text-indigo-400">{app.studentInfo?.department || "CSE"}</span>
                                  {app.profileInfo?.cgpa && (
                                    <>
                                      <span>·</span>
                                      <span className="text-emerald-700 dark:text-emerald-450 font-bold">CGPA {app.profileInfo.cgpa.toFixed(2)}</span>
                                    </>
                                  )}
                                </div>
                                {app.profileInfo?.resumeLink && (
                                  <a 
                                    href={app.profileInfo.resumeLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] text-indigo-605 dark:text-indigo-400 font-bold hover:text-indigo-505 dark:hover:text-indigo-300 inline-flex items-center gap-0.5 mt-1 transition-colors"
                                  >
                                    <span>View Resume Link</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </td>

                            {/* Recruiting drive info */}
                            <td className="py-4 px-4 text-xs">
                              <div className="space-y-0.5">
                                <span className="font-extrabold text-slate-900 dark:text-white block">{app.companyInfo?.name || "Microsoft"}</span>
                                <span className="text-slate-550 dark:text-slate-400 font-semibold">{app.companyInfo?.jobRole || "SWE Associate"}</span>
                              </div>
                            </td>

                            {/* Date Enrolled parameter */}
                            <td className="py-4 px-4 text-slate-500 dark:text-slate-440 font-medium text-xs font-mono">
                              {new Date(app.applicationDate).toLocaleDateString()}
                            </td>

                            {/* Level Steps */}
                            <td className="py-4 px-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-md border text-[10px] leading-tight font-sans ${getStatusBadge(app.status)}`}>
                                {app.status}
                              </span>
                            </td>

                            {/* Interactive status selectors */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {/* Detailed modal timeline */}
                                <button
                                  onClick={() => setSelectedApp(app)}
                                  className={`px-2.5 py-1 border text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                    isSelected 
                                      ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" 
                                      : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900"
                                  }`}
                                >
                                  Timeline
                                </button>

                                {/* Simple dropdown select to change status directly on row */}
                                <select
                                  disabled={updatingId === app.id}
                                  value={app.status}
                                  onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                  className="p-1 px-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 focus:border-indigo-500 outline-none cursor-pointer animate-none"
                                >
                                  <option value="Applied">Applied</option>
                                  <option value="Shortlisted">Shortlisted</option>
                                  <option value="Interview Scheduled">Interview Scheduled</option>
                                  <option value="Selected">Selected</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* STUDENT SUBMISSIONS CARD VIEW */
              <div className="space-y-4">
                {filteredApps.map((app) => {
                  const isSelected = selectedApp?.id === app.id;
                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`border rounded-2xl p-4 sm:p-5 text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer transition-all duration-200 relative overflow-hidden group ${
                        isSelected 
                          ? "border-indigo-500/80 ring-1 ring-indigo-500/10 bg-indigo-950/15 shadow-[0_4px_20px_rgba(99,102,241,0.06)]" 
                          : "border-slate-800 bg-slate-900 hover:bg-slate-950/40 hover:border-slate-705 shadow-sm"
                      }`}
                    >
                      {/* Status accent side mark or selected feedback strip */}
                      <div className={`absolute top-0 left-0 w-1 h-full transition-all ${
                        isSelected 
                          ? "w-[4px] bg-indigo-600 dark:bg-indigo-500" 
                          : app.status === "Selected" 
                            ? "bg-emerald-500" 
                            : app.status === "Rejected" 
                              ? "bg-rose-500" 
                              : "bg-indigo-500"
                      }`}></div>

                    <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 rounded-xl bg-slate-955 border border-slate-850 flex items-center justify-center font-black text-xs text-indigo-400 shrink-0 leading-none">
                        {app.companyInfo?.name?.charAt(0) || "C"}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-605 dark:group-hover:text-indigo-400 transition-all">{app.companyInfo?.name || "Corporate Drive"}</h4>
                          <span className="text-[10px] text-slate-500 font-bold font-mono">({app.companyInfo?.packageLpa} LPA offered)</span>
                        </div>
                        <p className="text-xs text-slate-605 dark:text-slate-455 font-semibold leading-none">{app.companyInfo?.jobRole || "Assoc Graduate Trainer"}</p>
                        
                        <span className="text-[10.5px] text-slate-500 block pt-0.5">
                          Enrolled Date: <strong className="font-mono text-slate-700 dark:text-slate-400">{new Date(app.applicationDate).toLocaleDateString()}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Stepper progress view details */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 font-sans">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg border text-xs ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-405 dark:text-slate-600 group-hover:text-slate-905 dark:group-hover:text-white transition-colors" />
                    </div>

                  </div>
                  );
                })}
              </div>
            )}

          </div>          {/* RIGHT COL: APPLICATION TIMELINE VISUALIZER */}
          <div className="space-y-4">
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl h-full flex flex-col justify-between" id="visualizer-right-bento">
              {selectedApp ? (
                /* 1. TIMELINE DETAILED VIEW */
                <div className="space-y-5">
                  
                  {/* Visualizer Header metadata info */}
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-4 text-left">
                    <span className="text-[9.5px] font-mono uppercase tracking-widest text-indigo-650 dark:text-indigo-400 font-bold block">Enrolled Milestone Stepper</span>
                    
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5 leading-snug">{selectedApp.companyInfo?.name || "Hiring Corporate Drive"}</h4>
                    <p className="text-xs text-indigo-600 dark:text-indigo-405 font-bold mt-0.5 inline-flex items-center leading-none">{selectedApp.companyInfo?.jobRole || "Target Placement Role"}</p>
                  </div>

                  {/* Candidate readout parameters if admin */}
                  {student.role === "admin" && (
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-xs space-y-2 text-left">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest font-mono">University Candidate Parameters</span>
                      <p className="font-extrabold text-slate-900 dark:text-white">{selectedApp.studentInfo?.name}</p>
                      <p className="font-mono text-[10px] text-slate-505 dark:text-slate-450 leading-relaxed">
                        UID: <strong className="text-slate-800 dark:text-slate-300">{selectedApp.studentInfo?.studentId}</strong> <br />
                        Academic CGPA: <strong className="text-emerald-700 dark:text-emerald-455">{selectedApp.profileInfo?.cgpa?.toFixed(2) || selectedApp.studentInfo?.gpa?.toFixed(2)} / 10.00</strong>
                      </p>
                      
                      {selectedApp.profileInfo?.resumeLink && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-850 mt-2">
                          <a 
                            href={selectedApp.profileInfo.resumeLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-indigo-600 hover:bg-indigo-505 text-white gap-1 flex items-center justify-center py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-md mt-1 cursor-pointer"
                          >
                            <span>Open Candidate Resume Archive</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* APPLICATION PROGRESSION STEPPER CODES */}
                  <div className="space-y-6 pt-2 font-sans">
                    {(() => {
                      const currentStepIdx = getStepIndex(selectedApp.status);
                      const isRejected = selectedApp.status === "Rejected";

                      return [
                        { name: "Portfolio Applied", desc: "Submitted online application form registry successfully.", key: "Applied" },
                        { name: "Syllabus Shortlisted", desc: "Academic criteria verified and technical eligibility clears.", key: "Shortlisted" },
                        { name: "Interview Sequence", desc: "Panel interviews scheduled with product engineering selectors.", key: "Interview Scheduled" },
                        { 
                          name: isRejected ? "Sequence Terminated" : "Direct Hiring Placement!", 
                          desc: isRejected ? "The corporate recruiters have decided to terminate active evaluations." : "Campus placement extended successfully! Offer contract dispatched! 🎓🎉", 
                          key: "Selected_Or_Rejected" 
                        }
                      ].map((step, idx) => {
                        const isCompleted = idx < currentStepIdx || (idx === currentStepIdx && selectedApp.status !== "Rejected");
                        const isActive = idx === currentStepIdx;
                        const stepRejected = idx === 3 && isRejected;

                        return (
                          <div key={step.name} className="flex gap-3 text-xs relative">
                            {idx < 3 && (
                              <div className={`absolute top-5 left-2 w-0.5 h-12 -z-10 ${
                                idx < currentStepIdx ? "bg-indigo-600 dark:bg-indigo-550" : "bg-slate-100 dark:bg-slate-800"
                              }`} />
                            )}

                            {/* Milestone Dot styling inside stepper list */}
                            <div className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                              stepRejected
                                ? "bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-500 ring-4 ring-rose-500/10 dark:ring-rose-950/40"
                                : isActive
                                ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-500 dark:border-indigo-550 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-500/15 dark:ring-indigo-950/40"
                                : isCompleted
                                ? "bg-indigo-605 border-indigo-605 text-white"
                                : "bg-slate-955 border-slate-850 text-slate-550"
                            }`}>
                              {isCompleted && !isActive ? "✓" : ""}
                            </div>

                            {/* Metadata description list items */}
                            <div className="space-y-0.5 text-left">
                              <span className={`text-xs font-bold block ${
                                stepRejected ? "text-rose-600 dark:text-rose-455" : isActive ? "text-indigo-600 dark:text-indigo-400 font-black" : isCompleted ? "text-slate-805 dark:text-slate-202" : "text-slate-400 dark:text-slate-550"
                              }`}>{step.name}</span>
                              <span className="text-[10.5px] text-slate-500 dark:text-slate-450 font-medium block leading-relaxed">{step.desc}</span>
                              
                              {isActive && (
                                <span className="inline-flex text-[9px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 mt-1 border rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-605 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40 animate-pulse">
                                  Current standing position
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Admin controls inside Timeline view drawer */}
                  {student.role === "admin" && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-left">
                       <span className="text-[10px] text-slate-505 dark:text-slate-450 font-bold uppercase tracking-wider font-mono">Operations Actions Hub:</span>
                       <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={updatingId !== null || selectedApp.status === "Selected"}
                            onClick={() => handleUpdateStatus(selectedApp.id, "Selected")}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2 rounded-xl text-[10px] font-bold transition-all shadow-md cursor-pointer text-center"
                          >
                            Hiring Selected
                          </button>
                          <button
                            disabled={updatingId !== null || selectedApp.status === "Rejected"}
                            onClick={() => handleUpdateStatus(selectedApp.id, "Rejected")}
                            className="bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:text-rose-400 dark:hover:bg-rose-950/20 text-rose-500 font-semibold p-2 rounded-xl text-[10px] transition-all cursor-pointer text-center"
                          >
                            Hiring Rejected
                          </button>
                       </div>
                    </div>
                  )}

                </div>
              ) : (
                /* 2. PROMPT CHOOSE TIMELINE ELEMENT */
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-3.5 flex flex-col justify-center h-full items-center min-h-[300px]">
                  <Activity className="w-12 h-12 text-slate-300 dark:text-slate-800 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-550 dark:text-slate-400 font-mono uppercase tracking-wider">Placement Step Timeline</p>
                    <p className="text-[11px] font-medium leading-relaxed max-w-xs text-slate-400 dark:text-slate-505 mt-1">
                      {student.role === "admin" 
                        ? "Select any applicant registration record above to inspect, audit, and modify milestone status steps." 
                        : "Click any registered drive in your catalog list to display detailed processing timers and recruiter states."}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {actionError && (
        <div className="fixed bottom-5 right-5 z-[100] p-4 bg-rose-950 border border-rose-900 text-rose-300 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in max-w-sm" id="application-tracker-action-error-toast">
          <AlertCircle className="w-5 h-5 text-rose-450 shrink-0 animate-pulse" />
          <span className="text-xs font-sans font-medium">{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-auto text-rose-400 hover:text-white font-bold cursor-pointer">×</button>
        </div>
      )}

    </div>
  );
}
