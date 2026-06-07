import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Search,
  SlidersHorizontal,
  DollarSign,
  GraduationCap,
  Calendar,
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Building2,
  Sparkles,
  ArrowLeft,
  X,
  FileSpreadsheet
} from "lucide-react";
import { Company, Student, StudentProfile } from "../types";
import { checkBranchEligibility, normalizeBranch } from "../branchUtils";
import { CompanyLogo } from "./CompanyLogo";
import { getCachedValue, setCachedValue, clearCachedValue, clearCachedValueWithPrefix } from "../apiCache";

interface CompanyManagementProps {
  token: string;
  student: Student;
  studentProfile?: StudentProfile | null;
}

export default function CompanyManagement({ token, student, studentProfile: studentProfileProp }: CompanyManagementProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [minPackage, setMinPackage] = useState("");
  const [maxCgpaBarrier, setMaxCgpaBarrier] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [onlyEligible, setOnlyEligible] = useState(false);

  // Student Profile cache for eligibility calculations
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  // Sync prop with state for live reactive changes
  useEffect(() => {
    if (studentProfileProp !== undefined) {
      setStudentProfile(studentProfileProp);
    }
  }, [studentProfileProp]);

  // Toast indicator states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Admin and Form UI States
  const [activeForm, setActiveForm] = useState<"list" | "create" | "edit" | "details">("list");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  
  // Create / Edit Form Fields
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [packageLpa, setPackageLpa] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [eligibleBranchesText, setEligibleBranchesText] = useState("");
  const [requiredSkillsText, setRequiredSkillsText] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [openPositions, setOpenPositions] = useState("1");

  // Form notifications
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [applyStates, setApplyStates] = useState<{ [companyId: string]: string }>({});

  // 1. Fetch Student placement profile to evaluate eligibility rules
  const fetchStudentProfile = async (forceRefetch = false) => {
    try {
      if (!forceRefetch) {
        const cached = getCachedValue("/api/profile");
        if (cached && cached.profile) {
          setStudentProfile(cached.profile);
          return;
        }
      }

      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const body = await response.json();
        if (body && body.profile) {
          setStudentProfile(body.profile);
          setCachedValue("/api/profile", body);
        }
      }
    } catch (e) {
      console.warn("[Profile Lookup] Fails reading candidate parameters. Will fall back to default student fields.", e);
    }
  };

  // 1.5 Fetch current student's existing applications
  const fetchStudentApplications = async (forceRefetch = false) => {
    if (student.role !== "student") return;
    try {
      const appEndpoint = "/api/applications/student";
      
      if (!forceRefetch) {
        const cached = getCachedValue(appEndpoint);
        if (cached) {
          const initialStates: { [companyId: string]: string } = {};
          cached.forEach((app: any) => {
            if (app.companyId) {
              initialStates[app.companyId] = app.status || "Applied";
            }
          });
          setApplyStates(prev => ({ ...prev, ...initialStates }));
          return;
        }
      }

      console.log("[fetchStudentApplications] Syncing previously submitted application records.");
      const response = await fetch(appEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const apps = await response.json();
        console.log(`[fetchStudentApplications] Loaded ${apps.length} application records. Mapping states.`);
        const initialStates: { [companyId: string]: string } = {};
        apps.forEach((app: any) => {
          if (app.companyId) {
            initialStates[app.companyId] = app.status || "Applied";
          }
        });
        setApplyStates(prev => ({ ...prev, ...initialStates }));
        setCachedValue(appEndpoint, apps);
      }
    } catch (e) {
      console.error("[fetchStudentApplications] Error fetching existing applications:", e);
    }
  };

  // 2. Fetch all placement corporation lists from backend
  const fetchCompanies = async (forceRefetch = false) => {
    try {
      setError(null);

      // Build query parameters dynamically for analytical offloading
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (minPackage) queryParams.append("minPackage", minPackage);
      if (selectedBranch) queryParams.append("branch", selectedBranch);

      const cacheKey = `/api/companies?${queryParams.toString()}`;

      if (!forceRefetch) {
        const cached = getCachedValue(cacheKey);
        if (cached) {
          setCompanies(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      console.log(`[Navigation API Fetch CACHE MISS] Retransmitting request for: ${cacheKey}`);
      const response = await fetch(cacheKey, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Could not download placement listings database.");
      }

      const data = await response.json();
      setCompanies(data);
      setCachedValue(cacheKey, data);
    } catch (err: any) {
      setError(err.message || "Failed reading recruiter listing registers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentProfile();
    fetchCompanies();
    fetchStudentApplications();
  }, [token]);

  // Handle live search changes
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCompanies();
    }, 400);
    return () => clearTimeout(handler);
  }, [search, minPackage, selectedBranch]);

  // 3. Centralized Eligibility Calculation
  const checkEligibility = (company: Company) => {
    // Determine target variables: Favor StudentProfile first, fall back to initial Student
    const activeGpa = studentProfile ? studentProfile.cgpa : student.gpa;
    const activeBranch = studentProfile ? studentProfile.branch : student.department;

    const gpaPassed = activeGpa >= company.minCgpa;
    const branchPassed = checkBranchEligibility(activeBranch, company.eligibleBranches || []);

    return {
      eligible: gpaPassed && branchPassed,
      gpaPassed,
      branchPassed
    };
  };

  // 4. Client Side Form Setup
  const handleOpenCreateForm = () => {
    setFormError(null);
    setFormSuccess(null);
    setCompanyName("");
    setLogoUrl("");
    setJobRole("");
    setPackageLpa("");
    setMinCgpa("8.00");
    setEligibleBranchesText("CSE, IT, ECE");
    setRequiredSkillsText("React, Node.js, TypeScript");
    setApplicationDeadline(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setJobDescription("");
    setOpenPositions("5");
    setActiveForm("create");
  };

  const handleOpenEditForm = (company: Company) => {
    setFormError(null);
    setFormSuccess(null);
    setSelectedCompany(company);
    setCompanyName(company.name);
    setLogoUrl(company.logoUrl || "");
    setJobRole(company.jobRole);
    setPackageLpa(company.packageLpa.toString());
    setMinCgpa(company.minCgpa.toString());
    setEligibleBranchesText(company.eligibleBranches.join(", "));
    setRequiredSkillsText(company.requiredSkills.join(", "));
    setApplicationDeadline(new Date(company.applicationDeadline).toISOString().split("T")[0]);
    setJobDescription(company.jobDescription);
    setOpenPositions(company.openPositions.toString());
    setActiveForm("edit");
  };

  // Submit operations (Create and Modify)
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setMutationLoading(true);

    const lpa = parseFloat(packageLpa);
    const minGpaInput = parseFloat(minCgpa);
    const vacancies = parseInt(openPositions);

    if (!companyName.trim()) {
      setFormError("A professional organization logo index name is required.");
      setMutationLoading(false);
      return;
    }

    if (isNaN(minGpaInput) || minGpaInput < 0.00 || minGpaInput > 10.00) {
      setFormError("Cumulative CGPA requirements must match 10-point scales (0.00 to 10.00).");
      setMutationLoading(false);
      return;
    }

    const eligibleBranchesData = eligibleBranchesText
      .split(",")
      .map(b => b.trim())
      .filter(Boolean);

    const requiredSkillsData = requiredSkillsText
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const url = activeForm === "create" ? "/api/companies" : `/api/companies/${selectedCompany?.id}`;
      const method = activeForm === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: companyName,
          logoUrl,
          jobRole,
          packageLpa: lpa,
          minCgpa: minGpaInput,
          eligibleBranches: eligibleBranchesData,
          requiredSkills: requiredSkillsData,
          applicationDeadline,
          jobDescription,
          openPositions: vacancies
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Operation failed due to administrative session validation errors.");
      }

      clearCachedValueWithPrefix("/api/companies");
      clearCachedValue("/api/student/dashboard");
      clearCachedValue("/api/analytics/student");
      clearCachedValue("/api/analytics/admin");

      setFormSuccess(activeForm === "create" ? "Corporate Placement Drive initiated." : "Placement Drive parameters updated.");
      fetchCompanies(true);
      setTimeout(() => {
        setActiveForm("list");
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "An exception occurred during drive mutations save block.");
    } finally {
      setMutationLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    console.log(`[UI Delete Action] Initiating deletion process for companyId: ${companyId}`);

    try {
      console.log(`[UI Delete Action] Dispatching DELETE /api/companies/${companyId} request to backend server.`);
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || "Deletion request blocked by active server locking protocols.");
      }

      console.log(`[UI Delete Action] Backend deletion verified successfully for ID: ${companyId}`);
      clearCachedValueWithPrefix("/api/companies");
      clearCachedValue("/api/student/dashboard");
      clearCachedValue("/api/analytics/student");
      clearCachedValue("/api/analytics/admin");

      setCompanies(companies.filter(c => c.id !== companyId));
      showToast("Company drive deleted successfully.");
      console.log(`[UI Delete Action] View states, local memory caching elements and student records flushed immediately.`);
    } catch (err: any) {
      console.error(`[UI Delete Action] Deletion exception error caught:`, err);
      showToast("Error: " + err.message);
    }
  };

  // Apply to drive action handler
  const handleApplyToCompany = async (company: Company) => {
    console.log("[handleApplyToCompany] Initiating application pipeline.", {
      studentEmail: student.email,
      studentRole: student.role,
      companyId: company.id,
      companyName: company.name,
      jobRole: company.jobRole
    });

    const existingStatus = applyStates[company.id];
    if (existingStatus && existingStatus !== "idle" && existingStatus !== "applying") {
      console.warn("[handleApplyToCompany] Aborting. Student is already registered applied for this drive ID:", company.id);
      showToast("You have already applied to this company drive.");
      return;
    }

    const eligCheck = checkEligibility(company);
    if (!eligCheck.eligible) {
      const activeBranch = studentProfile ? studentProfile.branch : student.department;
      const eligibilityReason = `CGPA match: ${eligCheck.gpaPassed ? "PASSED" : "FAILED"}. Branch match: ${eligCheck.branchPassed ? "PASSED" : "FAILED"} (Student: ${activeBranch}).`;
      console.error("[handleApplyToCompany] Eligibility validation failed.", eligibilityReason);
      showToast(`Eligibility Mismatch: ${eligibilityReason}`);
      return;
    }

    setApplyStates(prev => ({ ...prev, [company.id]: "applying" }));

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          companyId: company.id,
          role: company.jobRole
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Application rejected by server tracking validation.");
      }

      console.log("[handleApplyToCompany] Server accepted placement application record successfully.", payload);
      setApplyStates(prev => ({ ...prev, [company.id]: "Applied" }));
      
      // Invalidate relevant cache scopes cleanly
      clearCachedValue("/api/applications/student");
      clearCachedValue("/api/applications");
      clearCachedValue("/api/student/dashboard");
      clearCachedValue("/api/analytics/student");
      clearCachedValue("/api/analytics/admin");

      // Toast notification trigger
      showToast("Application submitted successfully.");
      
      // Auto-trigger sync of tracker state or profile
      fetchStudentApplications();
    } catch (err: any) {
      console.error("[handleApplyToCompany] Exceptional failure during application creation:", err);
      setApplyStates(prev => ({ ...prev, [company.id]: "idle" }));
      showToast("Application submission failed: " + err.message);
    }
  };

  const getFilteredCompanies = () => {
    let result = [...companies];
    
    if (onlyEligible) {
      result = result.filter(company => checkEligibility(company).eligible);
    }

    if (maxCgpaBarrier) {
      result = result.filter(company => company.minCgpa <= parseFloat(maxCgpaBarrier));
    }

    return result;
  };

  const filteredCompanies = getFilteredCompanies();

  const totalOpenings = companies.reduce((sum, c) => sum + c.openPositions, 0);
  const maxLpaOffered = companies.length > 0 ? Math.max(...companies.map(c => c.packageLpa)) : 0;
  const avgEligibilityCgpa = companies.length > 0 
    ? (companies.reduce((sum, c) => sum + c.minCgpa, 0) / companies.length).toFixed(2)
    : "0.0";

  return (
    <div className="space-y-6 animate-fade-in" id="corporate-management-main">
      
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-sans font-semibold rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 border border-emerald-500 animate-bounce" id="application-success-toast">
          <CheckCircle className="w-5 h-5 shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>Corporate Placement Drives Portal</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Browse corporate vacancies, verify academic eligibility thresholds against hiring targets, and securely submit placement credentials.
          </p>
        </div>

        {student.role === "admin" && activeForm === "list" && (
          <button
            onClick={handleOpenCreateForm}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-650 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 shrink-0 cursor-pointer"
            id="register-drive-trigger"
          >
            <Plus className="w-4 h-4" />
            <span>Register Placement Drive</span>
          </button>
        )}
      </div>

      {/* 2. ADMIN PERFORMANCE MONITORING PANEL */}
      {student.role === "admin" && activeForm === "list" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="coordinator-dashboard-kpis">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-left shadow-sm">
            <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest font-mono">Drives Registered</span>
            <span className="text-2xl font-black text-white block mt-1 tracking-tight pr-1 truncate">{companies.length} Placements</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-left shadow-sm">
            <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest font-mono">Open Positions</span>
            <span className="text-2xl font-black text-white block mt-1 tracking-tight pr-1 truncate">{totalOpenings} Vacancies</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-left shadow-sm">
            <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest font-mono">Max LPA Offered</span>
            <span className="text-2xl font-black text-emerald-400 block mt-1 tracking-tight font-mono pr-1 truncate">{maxLpaOffered} LPA Peak</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-left shadow-sm">
            <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest font-mono">Avg CGPA Barrier</span>
            <span className="text-2xl font-black text-indigo-400 block mt-1 tracking-tight font-mono pr-1 truncate">{avgEligibilityCgpa} CGPA</span>
          </div>
        </div>
      )}

      {/* 3. SEARCH AND ADVANCED CLIENT-SIDE FILTERS LAYOUT */}
      {activeForm === "list" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4 text-left" id="placement-filter-box">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* A. Search Box */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recruiter or job role..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-550 transition-all font-semibold"
                id="filter-search-field"
              />
            </div>

            {/* B. Min Package threshold */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-550 dark:text-slate-500">
                <DollarSign className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              </span>
              <select
                value={minPackage}
                onChange={(e) => setMinPackage(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300 outline-none cursor-pointer focus:border-indigo-550 transition-all font-semibold"
                id="filter-package-select"
              >
                <option value="">Minimum annual package (All)</option>
                <option value="5">5.0 LPA and Above</option>
                <option value="8">8.0 LPA and Above</option>
                <option value="12">12.0 LPA and Above</option>
                <option value="20">20.0 LPA Super Dream</option>
              </select>
            </div>

            {/* C. Max MinCGPA Requirement constraint (So students match eligibility filters) */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-550 dark:text-slate-500">
                <GraduationCap className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              </span>
              <select
                value={maxCgpaBarrier}
                onChange={(e) => setMaxCgpaBarrier(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300 outline-none cursor-pointer focus:border-indigo-550 transition-all font-semibold"
                id="filter-cgpa-select"
              >
                <option value="">CGPA Requirement Barrier (All)</option>
                <option value="7.0">Maximum 7.00 CGPA Allowed</option>
                <option value="7.5">Maximum 7.50 CGPA Allowed</option>
                <option value="8.0">Maximum 8.00 CGPA Allowed</option>
                <option value="8.5">Maximum 8.50 CGPA Allowed</option>
                <option value="10.0">Strict Academic Cleared Only</option>
              </select>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
            {/* Quick checkbox filter for real candidate match criteria */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="checkbox-only-eligible"
                checked={onlyEligible}
                onChange={(e) => setOnlyEligible(e.target.checked)}
                className="h-4 w-4 bg-slate-950 border border-slate-800 rounded text-indigo-600 focus:ring-indigo-505 accent-indigo-600 cursor-pointer"
              />
              <label htmlFor="checkbox-only-eligible" className="text-xs text-slate-500 dark:text-slate-400 font-bold cursor-pointer select-none">
                Hide corporate recruitment drives where active standing eligibility is unmatched
              </label>
            </div>

            {/* Diagnostic readout matching profile */}
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-550">
              Evaluated profile: <strong className="text-slate-700 dark:text-slate-300">CGPA {studentProfile ? studentProfile.cgpa.toFixed(2) : student.gpa.toFixed(2)}</strong> · <strong className="text-indigo-600 dark:text-indigo-400">{studentProfile ? studentProfile.branch : student.department}</strong>
            </span>
          </div>

        </div>
      )}

      {/* 4. COMPANY LIST VIEW */}
      {activeForm === "list" && (
        <>
          {loading ? (
            <div className="py-16 text-center">
              <div className="relative inline-flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-solid border-indigo-650/25 border-t-indigo-600"></div>
                <Clock className="w-5 h-5 text-indigo-400 absolute" />
              </div>
              <p className="text-xs text-slate-500 mt-3 font-mono">Syncing drive database indices...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-955/10 border border-rose-900/50 text-rose-450 text-xs sm:text-sm rounded-2xl flex items-center lg:items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Drive registries failed loading: {error}</span>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">No active job drives matching your filters</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">
                Try adjusting your criteria, clearing active filters, or check back later for newly added job openings.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setMinPackage("");
                  setMaxCgpaBarrier("");
                  setOnlyEligible(false);
                }}
                className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs text-slate-300 font-bold transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (            /* Responsive Grid of Company Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="corporate-drives-grid">
              {filteredCompanies.map((company) => {
                const checkResult = checkEligibility(company);
                const hasApplied = applyStates[company.id] === "applied";
                const isApplying = applyStates[company.id] === "applying";

                return (
                  <div
                    key={company.id}
                    className="bg-slate-900 border border-slate-800 hover:border-indigo-500/30 rounded-3xl p-5 shadow-lg transition-all flex flex-col justify-between space-y-4 text-left relative overflow-hidden group"
                  >
                    {/* Abstract suitability indicator stripe */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${checkResult.eligible ? "bg-emerald-500" : "bg-rose-500"}`}></div>

                    {/* Drive Header Metadata */}
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <CompanyLogo name={company.name} logoUrl={company.logoUrl} className="w-11 h-11" />
                          <div>
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-450 transition-colors leading-tight truncate max-w-[140px]">{company.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold tracking-tight">{company.jobRole}</p>
                          </div>
                        </div>

                        {/* LPA package indicators inside drive card */}
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-105 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs py-1 px-2.5 rounded-xl font-bold font-mono tracking-tight shrink-0 flex items-center gap-0.5">
                          <span>{company.packageLpa}</span> <span className="text-[10px] text-emerald-600 dark:text-emerald-500">LPA</span>
                        </div>
                      </div>

                      {/* Recruiter brief constraints list */}
                      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 py-1 font-medium font-sans border-y border-slate-100 dark:border-slate-850/60 my-2">
                        <div className="flex justify-between">
                          <span>Required CGPA:</span>
                          <span className={`font-mono font-bold ${checkResult.gpaPassed ? "text-slate-800 dark:text-slate-300" : "text-rose-650 dark:text-rose-400"}`}>
                            {company.minCgpa.toFixed(2)} Minimum
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Open Positions:</span>
                          <span className="font-mono text-indigo-650 dark:text-indigo-400 font-bold">{company.openPositions} seats</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Apply Deadline:</span>
                          <span className="font-mono text-slate-500">{new Date(company.applicationDeadline).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Required skills tags snippets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {company.requiredSkills.slice(0, 3).map(s => (
                          <span key={s} className="text-[10.5px] bg-slate-955 text-slate-350 border border-slate-800 px-2 py-0.5 rounded font-bold font-mono">
                            {s}
                          </span>
                        ))}
                        {company.requiredSkills.length > 3 && (
                          <span className="text-[10.5px] bg-slate-955 text-slate-500 px-2 py-0.5 rounded border border-slate-800 font-mono font-bold">
                            +{company.requiredSkills.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Eligibility Status and Actions Bottom deck */}
                    <div className="border-t border-slate-100 dark:border-slate-850 pt-3 flex items-center justify-between gap-3">
                      
                      {/* Eligibility Banner readout */}
                      {checkResult.eligible ? (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shrink-0">
                          <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Eligible</span>
                        </span>
                      ) : (
                        <span
                          className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-455 border border-rose-100 dark:border-rose-900/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-help shrink-0"
                          title={`Your profile does not meet the CGPA or Branch eligibility requirements for this drive.`}
                        >
                          <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-500" />
                          <span>Ineligible</span>
                        </span>
                      )}

                      {/* Actions buttons */}
                      <div className="flex gap-1.5 shrink-0">
                        
                        {/* Details popup helper */}
                        <button
                          onClick={() => {
                            setSelectedCompany(company);
                            setActiveForm("details");
                          }}
                          className="text-slate-400 hover:text-white bg-slate-955 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl transition-all font-semibold text-xs cursor-pointer"
                          title="View Details"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin mutations deletion checks */}
                        {student.role === "admin" && (
                          <>
                            <button
                              onClick={() => handleOpenEditForm(company)}
                              className="text-indigo-400 hover:text-white bg-slate-955 hover:bg-indigo-950/40 border border-slate-800 p-2 rounded-xl cursor-pointer"
                              title="Modify Drive Specs"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setCompanyToDelete(company.id)}
                              className="text-rose-450 hover:text-white bg-slate-955 hover:bg-rose-955/25 border border-slate-800 p-2 rounded-xl cursor-pointer mr-0.5"
                              title="Delete Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {/* Student apply interactions actions */}
                        {student.role === "student" && (() => {
                          const statusOfApp = applyStates[company.id];
                          const hasApplied = !!statusOfApp && statusOfApp !== "idle" && statusOfApp !== "applying";
                          const isApplying = statusOfApp === "applying";

                          let buttonStyle = "";
                          let buttonText = "Apply";

                          if (isApplying) {
                            buttonStyle = "bg-slate-105 border border-slate-200 dark:bg-slate-955 dark:border-slate-850 text-slate-500 animate-pulse pointer-events-none";
                            buttonText = "Submitting...";
                          } else if (hasApplied) {
                            const normalizedStatus = statusOfApp.toLowerCase();
                            if (normalizedStatus.includes("selected")) {
                              buttonStyle = "bg-emerald-50 dark:bg-emerald-950 border border-emerald-250 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 pointer-events-none";
                              buttonText = "★ Selected";
                            } else if (normalizedStatus.includes("rejected")) {
                              buttonStyle = "bg-rose-50 dark:bg-rose-955 border border-rose-250 dark:border-rose-900 text-rose-700 dark:text-rose-450 pointer-events-none";
                              buttonText = "✗ Rejected";
                            } else if (normalizedStatus.includes("shortlist") || normalizedStatus.includes("interview")) {
                              buttonStyle = "bg-amber-50 dark:bg-amber-955 border border-amber-250 dark:border-amber-900 text-amber-700 dark:text-amber-450 pointer-events-none";
                              buttonText = "✓ Shortlisted";
                            } else {
                              buttonStyle = "bg-slate-100 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 text-slate-500 dark:text-slate-400 pointer-events-none";
                              buttonText = "✓ Applied";
                            }
                          } else {
                            if (checkResult.eligible) {
                              buttonStyle = "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20";
                              buttonText = "Apply";
                            } else {
                              buttonStyle = "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-655 cursor-not-allowed select-none";
                              buttonText = "Apply";
                            }
                          }

                          return (
                            <button
                              disabled={!checkResult.eligible || hasApplied || isApplying}
                              onClick={() => handleApplyToCompany(company)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer border border-transparent ${buttonStyle}`}
                              id={`apply-button-${company.id}`}
                            >
                              {buttonText}
                            </button>
                          );
                        })()}

                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {/* 5. CREATE OR EDIT PLACEMENT FORM STATE */}
      {(activeForm === "create" || activeForm === "edit") && (
        <form onSubmit={handleSaveCompany} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="text-indigo-500 dark:text-indigo-400 w-5 h-5" />
              <span>{activeForm === "create" ? "Add New Job Drive" : "Edit Job Drive: " + companyName}</span>
            </h4>
            <button
              type="button"
              onClick={() => setActiveForm("list")}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          </div>

          {formError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-955/15 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 text-xs rounded-xl flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-955/15 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-450 text-xs rounded-xl flex gap-2 animate-pulse">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Comp Index name */}            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Corporate Recruiter Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Google or Microsoft India"
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-550"
              />
            </div>

            {/* Logo Link URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Corporate Branding Logo URL (Optional)</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="e.g., https://logo.clearbit.com/google.com"
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-550 font-mono"
              />
            </div>

            {/* Designative designation role */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Recruiter Hiring Profile Role <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g., Software Development Engineer - SDE-1"
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-550"
              />
            </div>

            {/* Lpa Package offerings */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-455 font-mono uppercase block">Offered Annual LPA Package (INR LPA) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={packageLpa}
                onChange={(e) => setPackageLpa(e.target.value)}
                placeholder="e.g., 18.5"
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-550 font-mono"
              />
            </div>

            {/* Min CGPA Requirement */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Required Academic Standings Entry (0.00 - 10.00 Scale) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.00"
                max="10.00"
                required
                value={minCgpa}
                onChange={(e) => setMinCgpa(e.target.value)}
                placeholder="Scale 0.00 to 10.00 (Ex: 8.50)"
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-550 font-mono"
              />
            </div>

            {/* Open vacancy target */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Hiring Target Capacity Positions <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="1"
                required
                value={openPositions}
                onChange={(e) => setOpenPositions(e.target.value)}
                placeholder="e.g., 5"
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-550 font-mono"
              />
            </div>

            {/* Select block inputs */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Target Academic Branches (Comma separated) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={eligibleBranchesText}
                onChange={(e) => setEligibleBranchesText(e.target.value)}
                placeholder="Ex: CSE, IT, ECE or All"
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-550"
              />
            </div>

            {/* Skills */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Hiring Skills Requirements (Comma separated) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={requiredSkillsText}
                onChange={(e) => setRequiredSkillsText(e.target.value)}
                placeholder="Ex: Python, React, AWS, Docker"
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-550"
              />
            </div>

            {/* Deadline settings */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Drive Application Termination Deadline Calendar <span className="text-rose-500">*</span></label>
              <input
                type="date"
                required
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Long terms and description criteria */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono uppercase block">Detailed Job Description & Placement Criteria <span className="text-rose-500">*</span></label>
              <textarea
                rows={5}
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Input comprehensive job requirements, coding round dates, interview rounds, and location details..."
                className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-sans leading-relaxed"
              />
            </div>

          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={() => setActiveForm("list")}
              className="px-5 py-2.5 border border-slate-800 bg-slate-955 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              disabled={mutationLoading}
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/15 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {mutationLoading ? (
                <span className="h-4 w-4 rounded-full border-2 border-solid border-slate-500/20 border-t-white animate-spin"></span>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Commit Specifications</span>
            </button>
          </div>

        </form>
      )}
      {/* 6. PLACEMENT SPECIFICATION DETAILS PORTRAIT */}
      {activeForm === "details" && selectedCompany && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-6 animate-fade-in" id="company-detail-panel">
          
          <div className="flex justify-between items-start gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
            <div className="flex gap-4 items-center">
              <CompanyLogo name={selectedCompany.name} logoUrl={selectedCompany.logoUrl} className="w-14 h-14" />
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{selectedCompany.name}</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 tracking-tight flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  <span>{selectedCompany.jobRole}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveForm("list")}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-955/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Specs side info */}
            <div className="space-y-4">
              <div className="bg-slate-955/40 rounded-2xl p-4.5 border border-slate-850 space-y-3.5 text-xs text-slate-400 font-sans">
                <span className="text-[10px] font-mono tracking-wider text-indigo-405 font-bold uppercase block pb-1 border-b border-slate-850">Drive Parameters Summary</span>
                
                <div className="flex justify-between">
                  <span>CTC Packages Offered:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 text-sm font-mono font-black">{selectedCompany.packageLpa} LPA</strong>
                </div>

                <div className="flex justify-between">
                  <span>Minimum Required Standings:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{selectedCompany.minCgpa.toFixed(2)} CGPA</strong>
                </div>

                <div className="flex justify-between">
                  <span>Open Hires Capacity:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{selectedCompany.openPositions} Candidates</strong>
                </div>

                <div className="flex justify-between">
                  <span>Application Status Lock:</span>
                  <strong className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{new Date(selectedCompany.applicationDeadline).toLocaleDateString()}</strong>
                </div>
              </div>

              {/* Status block eligibility detail */}
              <div className="bg-slate-955/20 rounded-2xl p-4.5 border border-slate-850 space-y-3">
                <span className="text-[10px] font-mono tracking-wider text-slate-500 font-bold uppercase block">Personal Credentials Standing</span>
                
                      {(() => {
                        const check = checkEligibility(selectedCompany);
                        const activeBranch = studentProfile ? studentProfile.branch : student.department;
                        const activeNormalized = normalizeBranch(activeBranch);
                        const hasApplied = applyStates[selectedCompany.id] === "applied";
                        const isApplying = applyStates[selectedCompany.id] === "applying";
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs">
                              {check.gpaPassed ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                              )}
                              <span className={check.gpaPassed ? "text-slate-805 dark:text-slate-300 font-medium" : "text-rose-650 dark:text-rose-450 font-bold"}>
                                CGPA Threshold Cleared ({studentProfile ? studentProfile.cgpa.toFixed(2) : student.gpa.toFixed(2)} vs {selectedCompany.minCgpa.toFixed(2)})
                              </span>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl p-3 space-y-1.5 text-left">
                              <div className="flex items-center gap-2 text-xs font-bold">
                                {check.branchPassed ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 pb-0.5">
                                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> ✅ Branch Eligible
                                  </span>
                                ) : (
                                  <span className="text-rose-650 dark:text-rose-400 font-extrabold flex items-center gap-1 pb-0.5">
                                    <X className="w-4 h-4 shrink-0 text-rose-500" /> ❌ Branch Not Eligible
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pl-6">
                                <p>Student Branch: <strong className="text-slate-800 dark:text-white font-sans">{activeBranch}</strong></p>
                                <p>Matched Category: <strong className="text-indigo-600 dark:text-indigo-405 font-mono text-[11.5px]">{activeNormalized}</strong></p>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-201 dark:border-slate-850/60 flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-medium">Eligibility Status:</span>
                              {student.role === "student" ? (
                                (() => {
                                  const statusOfApp = applyStates[selectedCompany.id];
                                  const hasApplied = !!statusOfApp && statusOfApp !== "idle" && statusOfApp !== "applying";
                                  const isApplying = statusOfApp === "applying";

                                  let buttonStyle = "";
                                  let buttonText = "CLEAR TO APPLY!";

                                  if (isApplying) {
                                    buttonStyle = "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 animate-pulse pointer-events-none";
                                    buttonText = "Submitting...";
                                  } else if (hasApplied) {
                                    const normalizedStatus = statusOfApp.toLowerCase();
                                    if (normalizedStatus.includes("selected")) {
                                      buttonStyle = "bg-emerald-50 dark:bg-emerald-950 border border-emerald-250 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 pointer-events-none";
                                      buttonText = "Selected";
                                    } else if (normalizedStatus.includes("rejected")) {
                                      buttonStyle = "bg-rose-50 dark:bg-rose-955 border border-rose-250 dark:border-rose-900 text-rose-700 dark:text-rose-450 pointer-events-none";
                                      buttonText = "Rejected";
                                    } else if (normalizedStatus.includes("shortlist") || normalizedStatus.includes("interview")) {
                                      buttonStyle = "bg-amber-50 dark:bg-amber-955 border border-amber-250 dark:border-amber-900 text-amber-700 dark:text-amber-450 pointer-events-none";
                                      buttonText = "Shortlisted";
                                    } else {
                                      buttonStyle = "bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-500 dark:text-slate-400 pointer-events-none";
                                      buttonText = "Applied";
                                    }
                                  } else {
                                    if (check.eligible) {
                                      buttonStyle = "bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-850 dark:hover:bg-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer";
                                      buttonText = "CLEAR TO APPLY!";
                                    } else {
                                      buttonStyle = "bg-rose-50 dark:bg-rose-955/10 text-rose-700 dark:text-rose-450 border-rose-200 dark:border-rose-900/50 cursor-not-allowed select-none";
                                      buttonText = "Fails Clearances";
                                    }
                                  }

                                  return (
                                    <button
                                      type="button"
                                      id="clear-to-apply-details-btn"
                                      disabled={!check.eligible || hasApplied || isApplying}
                                      onClick={() => {
                                        console.log("Apply button clicked", {
                                          buttonId: "clear-to-apply-details-btn",
                                          companyId: selectedCompany.id,
                                          companyName: selectedCompany.name,
                                          isEligible: check.eligible,
                                          hasApplied,
                                          isApplying,
                                          studentEmail: student.email,
                                          studentId: student.id
                                        });
                                        handleApplyToCompany(selectedCompany);
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all border shrink-0 shadow-sm ${buttonStyle}`}
                                    >
                                      {buttonText}
                                    </button>
                                  );
                                })()
                              ) : (
                                <strong className={`inline-block border px-2 py-1 rounded text-[10.5px] uppercase font-bold tracking-tight ${
                                  check.eligible ? "bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50" : "bg-rose-50 dark:bg-rose-955/10 text-rose-700 dark:text-rose-450 border-rose-200 dark:border-rose-900/50"
                                }`}>
                                  {check.eligible ? "Clear to Apply!" : "Fails Clearances"}
                                </strong>
                              )}
                            </div>
                          </div>
                        );
                      })()}
              </div>
            </div>

            {/* Right Job description area */}
            <div className="lg:col-span-2 space-y-5">
              
              <div className="bg-slate-955/10 border border-slate-850 rounded-2xl p-5 space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans text-left">
                <span className="text-[10px] font-mono tracking-wider text-slate-500 font-bold uppercase block mb-1">Detailed Job Descriptors & Guidelines</span>
                <div className="whitespace-pre-wrap select-text pr-1">{selectedCompany.jobDescription}</div>
              </div>

              {/* Requirement skills deck */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-850 rounded-2xl p-4.5 text-left bg-slate-955/20">
                  <span className="text-[10px] font-mono tracking-wider text-slate-500 font-bold uppercase block mb-2">Hiring Technical Skillset</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.requiredSkills.map(sk => (
                      <span key={sk} className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-xl font-bold font-mono">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-850 rounded-2xl p-4.5 text-left bg-slate-955/20">
                  <span className="text-[10px] font-mono tracking-wider text-slate-500 font-bold uppercase block mb-2">Target Academic Branches</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.eligibleBranches.map(br => (
                      <span key={br} className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-xl font-bold font-mono">
                        {br}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Direct placement submission triggers */}
              {student.role === "student" && (
                <div className="flex justify-end pt-2">
                  {(() => {
                    const isEligible = checkEligibility(selectedCompany).eligible;
                    const hasApplied = applyStates[selectedCompany.id] === "applied";
                    const isApplying = applyStates[selectedCompany.id] === "applying";

                    return (
                      <button
                        disabled={!isEligible || hasApplied || isApplying}
                        onClick={() => handleApplyToCompany(selectedCompany)}
                        className={`w-full py-3.5 rounded-2xl text-xs font-bold transition-all sm:max-w-xs cursor-pointer ${
                          hasApplied
                            ? "bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-550 pointer-events-none"
                            : isApplying
                            ? "bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 text-slate-405 dark:text-slate-550 animate-pulse pointer-events-none"
                            : isEligible
                            ? "bg-indigo-650 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15"
                            : "bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-650 cursor-not-allowed select-none"
                        }`}
                      >
                        {hasApplied ? "Applied - Tracks on Status Timeline" : isApplying ? "Uploading application packages..." : "Submit Direct Placement Application"}
                      </button>
                    );
                  })()}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* Modern React Confirmation Modal: Terminate Recruitment Drive */}
      {companyToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="company-management-delete-confirm-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 font-extrabold text-sm uppercase tracking-wider font-mono">
              <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
              <span>Confirm Drive Deletion</span>
            </div>
            
            <p className="text-xs text-slate-300 font-medium leading-relaxed font-sans">
              Are you sure you want to delete this company drive? This action is irreversible. All associated documents, analytics metrics, and student applications will be completely purged from academic indices immediately.
            </p>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const idOfDeleted = companyToDelete;
                  setCompanyToDelete(null);
                  handleDeleteCompany(idOfDeleted);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
