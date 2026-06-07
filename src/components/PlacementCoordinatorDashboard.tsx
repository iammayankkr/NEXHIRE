import React, { useState, useEffect } from "react";
import {
  Users,
  Briefcase,
  Layers,
  Calendar,
  CheckCircle,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  ExternalLink,
  Shield,
  Clock,
  Award,
  AlertCircle,
  Check,
  X,
  Building,
  User,
  SlidersHorizontal,
  FolderDown,
  RefreshCw,
  Mail,
  GraduationCap,
  Bell,
  Download
} from "lucide-react";
import { Student, StudentProfile, Company } from "../types";
import { CompanyLogo } from "./CompanyLogo";
import { clearCachedValue, clearCachedValueWithPrefix } from "../apiCache";

interface DashboardProps {
  token: string | null;
  student: Student | null; // This represents the currently authenticated admin user
  onLogout: () => void;
}

// Inline toast state interface
interface Toast {
  message: string;
  type: "success" | "error";
  id: number;
}

const cleanAdminEmail = (email?: string) => {
  if (!email) return "tpo@university.edu.in";
  const em = email.toLowerCase().trim();
  if (em.includes("testnew") || em.includes("123") || !em.includes(".") || !em.includes("@")) {
    return "tpo@university.edu.in";
  }
  return email;
};

export default function PlacementCoordinatorDashboard({ token, student, onLogout }: DashboardProps) {
  // Sidebar navigation active state
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "students" | "companies" | "drives" | "applications" | "analytics" | "announcements" | "reports" | "settings"
  >("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // States for backend data repositories
  const [students, setStudents] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);

  // Fetching progress triggers
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Toasts overlay support
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals & drawers triggering controls
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [viewingStudentProfile, setViewingStudentProfile] = useState<any | null>(null);
  
  const [companyModalMode, setCompanyModalMode] = useState<"add" | "edit" | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompanyApplicants, setViewingCompanyApplicants] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

  // Announcement composer controls
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnTag, setNewAnnTag] = useState("Drive Alert");

  // Filter & search states across modules
  // Students Module
  const [studentSearch, setStudentSearch] = useState("");
  const [studentBranchFilter, setStudentBranchFilter] = useState("All");
  const [studentMinCgpa, setStudentMinCgpa] = useState<number>(0);
  const [studentStatusFilter, setStudentStatusFilter] = useState("All");

  // Settings Redesign Preferences
  const [coordinatorProfile, setCoordinatorProfile] = useState({
    name: student?.name || "Dr. Rajesh Verma",
    role: "Professor & Head, Training & Placement Office (TPO)",
    department: student?.department || "Training & Placement Cell",
    email: cleanAdminEmail(student?.email),
    phone: "+91-98765-43210",
    room: "Admin Block, Suite 204"
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    emailOnRegistration: true,
    emailOnInterview: true,
    weeklyDigest: false,
    smsAlerts: true
  });

  const [seasonSettings, setSeasonSettings] = useState({
    seasonYear: "2026 - 2027",
    batchRegistrationOpen: true,
    autoThresholdCgpa: 7.50,
    maxPackageCeiling: 45.0
  });

  const [reportPrefs, setReportPrefs] = useState({
    format: "CSV",
    includeResumes: true,
    weeklyStats: true
  });

  const [dashboardPrefs, setDashboardPrefs] = useState({
    compactRows: false,
    showStatsGauge: true,
    showTrendline: true
  });

  // Companies Module
  const [companySearch, setCompanySearch] = useState("");
  const [companyMinPackage, setCompanyMinPackage] = useState<number>(0);

  // Applications Module
  const [appStatusFilter, setAppStatusFilter] = useState("All");
  const [appCompanySearch, setAppCompanySearch] = useState("");

  // Helpers for displaying alerts and triggers
  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Pre-configured seeds in case backend fails or takes time
  const DEFAULT_DEPARTMENTS = [
    "Computer Science",
    "Computer Science & Engineering",
    "Data Science & AI",
    "Electronic Engineering",
    "Mechanical Engineering",
    "Mathematical Physics",
    "Business Analytics",
    "Information Technology"
  ];

  // API fetches sequence
  useEffect(() => {
    const fetchDashboardState = async () => {
      if (!token) return;
      setLoading(true);
      try {
        // Parallel fetches
        const [stRes, compRes, appRes, anRes, analyticRes, actRes, diagRes] = await Promise.all([
          fetch("/api/admin/students", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/companies", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/applications", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/student/dashboard", { headers: { Authorization: `Bearer ${token}` } }), // Includes seeded announcements
          fetch("/api/analytics/admin", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/activities", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/diagnose-emails", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (stRes.ok) {
          const stData = await stRes.json();
          setStudents(stData);
        }
        if (compRes.ok) {
          const compData = await compRes.json();
          setCompanies(compData);
        }
        if (appRes.ok) {
          const appData = await appRes.json();
          setApplications(appData);
        }
        if (anRes.ok) {
          const payload = await anRes.json();
          if (payload && payload.announcements) {
            setAnnouncements(payload.announcements);
          }
        }
        if (analyticRes.ok) {
          const analyticsPayload = await analyticRes.json();
          setAnalyticsData(analyticsPayload);
        }
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivities(actData);
        }
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          setDiagnosticReport(diagData);
        }
      } catch (err) {
        console.error("[Coordinator Fetch Error]", err);
        showToast("Failed to sync some dashboard records, using local cache state", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardState();
  }, [token, refreshTrigger]);

  // Dynamic icon mapper for activities
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "company_created":
        return <Building className="w-4 h-4 text-indigo-400" />;
      case "drive_created":
        return <Calendar className="w-4 h-4 text-emerald-400" />;
      case "company_edited":
        return <Building className="w-4 h-4 text-sky-400" />;
      case "application_status_changed":
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
      case "announcement_published":
        return <Megaphone className="w-4 h-4 text-amber-400" />;
      case "student_registered":
        return <User className="w-4 h-4 text-blue-400" />;
      case "selection_published":
        return <Award className="w-4 h-4 text-rose-400 font-semibold" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  // Relative timestamp calculator
  const getActivityTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 0) return "Just now";
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return "Recently";
    }
  };

  // RECENT ACTIVITIES (Dynamically computed or cached)
  const recentActivities = activities.slice(0, 10).map((act) => ({
    id: act.id,
    icon: getActivityIcon(act.type),
    title: act.title,
    description: act.description,
    time: getActivityTime(act.timestamp)
  }));

  // QUICK ACTIONS ROUTING triggers
  const handleQuickAddCompany = () => {
    setActiveTab("companies");
    setCompanyModalMode("add");
    setEditingCompany(null);
  };

  const handleQuickCreateDrive = () => {
    setActiveTab("drives");
    showToast("Opening drive scheduler... Schedule drives by registering matching companies & setting criteria.", "success");
  };

  const handleQuickPostAnnouncement = () => {
    setActiveTab("announcements");
    setAnnouncementModalOpen(true);
  };

  const handleQuickGenerateReport = () => {
    setActiveTab("reports");
  };

  // API Call: Save Edited Student Details
  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const originalStudent = students.find((s: any) => s.id === editingStudent.id || s.studentId === editingStudent.studentId);
    const emailChanged = originalStudent ? originalStudent.email.trim().toLowerCase() !== editingStudent.email.trim().toLowerCase() : true;

    if (emailChanged) {
      const emailStr = (editingStudent.email || "").trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(emailStr)) {
        showToast("Please enter a valid email address.", "error");
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingStudent.name,
          email: editingStudent.email,
          department: editingStudent.department,
          enrollmentYear: Number(editingStudent.enrollmentYear),
          gpa: Number(editingStudent.gpa)
        })
      });

      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(resData.message || "Failed to persist student record on the server.");
      }

      showToast("Student database record updated successfully!", "success");
      setEditingStudent(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || "Error updating student record.", "error");
    }
  };

  // API Call: Create/Edit Company Profile
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    // Build standard body payload
    const payload = {
      name: editingCompany.name,
      logoUrl: editingCompany.logoUrl,
      jobRole: editingCompany.jobRole,
      packageLpa: Number(editingCompany.packageLpa),
      minCgpa: Number(editingCompany.minCgpa),
      eligibleBranches: Array.isArray(editingCompany.eligibleBranches) 
        ? editingCompany.eligibleBranches 
        : String(editingCompany.eligibleBranches).split(",").map(b => b.trim()),
      requiredSkills: Array.isArray(editingCompany.requiredSkills) 
        ? editingCompany.requiredSkills 
        : String(editingCompany.requiredSkills).split(",").map(s => s.trim()),
      applicationDeadline: editingCompany.applicationDeadline,
      jobDescription: editingCompany.jobDescription,
      openPositions: Number(editingCompany.openPositions || 1)
    };

    try {
      const url = companyModalMode === "add" 
        ? "/api/companies" 
        : `/api/companies/${editingCompany.id}`;
      
      const method = companyModalMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed saving recruiter profiles. Make sure all fields are valid.");
      }

      showToast(
        companyModalMode === "add" 
          ? "Recruiting Company registered successfully!" 
          : "Recruiter profile details verified & updated!", 
        "success"
      );
      setCompanyModalMode(null);
      setEditingCompany(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || "Error saving recruiter profiles.", "error");
    }
  };

  // API Call: Delete recruiting company listing
  const handleDeleteCompany = async (id: string) => {
    console.log(`[Dashboard Admin Delete] Initiated company deletion for companyId: ${id}`);

    try {
      console.log(`[Dashboard Admin Delete] Dispatching DELETE /api/companies/${id} request...`);
      const res = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Failed terminating company lists from backend.");
      }

      console.log(`[Dashboard Admin Delete] Received successful response. Clearing navigation and analytical caches.`);
      clearCachedValueWithPrefix("/api/companies");
      clearCachedValue("/api/student/dashboard");
      clearCachedValue("/api/analytics/student");
      clearCachedValue("/api/analytics/admin");

      // Immediate Front-End State Updates
      setCompanies(prev => prev.filter(c => c.id !== id));
      setApplications(prev => prev.filter(app => app.companyId !== id));
      if (editingCompany?.id === id) {
        setEditingCompany(null);
      }

      showToast("Company drive deleted successfully.", "success");
      
      // Trigger background refetch of analytic matrices immediately
      setRefreshTrigger(prev => prev + 1);
      console.log(`[Dashboard Admin Delete] Cleaned up arrays, triggered stats and counters live re-evaluation.`);
    } catch (err: any) {
      console.error(`[Dashboard Admin Delete] Deletion exception error:`, err);
      showToast(err.message || "Error removing recruiter records.", "error");
    }
  };

  // API Call: Master Applicant Status verification triggers
  const handleUpdateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        throw new Error("Rejected status trigger adjustments.");
      }

      showToast(`Applicant verified milestone status updated to ${newStatus}`, "success");
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || "Failed altering candidate status levels.", "error");
    }
  };

  // API Call: Post Dynamic Announcement
  const handlePostAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnContent || !newAnnTag) {
      showToast("Please fill out all announcement inputs.", "error");
      return;
    }

    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newAnnTitle,
          content: newAnnContent,
          tag: newAnnTag
        })
      });

      if (!res.ok) {
        throw new Error("Server rejected uploading announcement payload.");
      }

      showToast("Announcement distributed to all university dashboards!", "success");
      setNewAnnTitle("");
      setNewAnnContent("");
      setAnnouncementModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || "Error posting announcement.", "error");
    }
  };

  // We combine server students with realistic academic records
  const getAugmentedStudents = () => {
    // Map existing backend students to look clean, high quality
    // Only parse standard student users (excluding any admin/coordinator accounts to avoid skewing stats!)
    const mappedBackend = students
      .filter(s => s.role !== "admin")
      .map((s) => {
        const studentCgpa = s.profile ? s.profile.cgpa : (s.gpa || 8.5);
        const isEligible = studentCgpa >= 7.5;
        
        let cleanName = s.name;
        let cleanEmail = s.email;
        let cleanId = s.studentId;
        
        // Check if student has a selected application in the actual DB records
        const isSelected = applications.some(a => 
          (a.studentId === s.id || a.studentId === s.studentId || (a.studentInfo && a.studentInfo.studentId === s.studentId)) && 
          a.status === "Selected"
        );
        const isShortlisted = applications.some(a => 
          (a.studentId === s.id || a.studentId === s.studentId || (a.studentInfo && a.studentInfo.studentId === s.studentId)) && 
          ["Shortlisted", "Interview Scheduled"].includes(a.status)
        );
        const status = isSelected ? "Placed" : (isShortlisted ? "Ongoing" : "Unplaced");

        return {
          ...s,
          name: cleanName,
          email: cleanEmail,
          studentId: cleanId,
          department: s.department || "Computer Science & Engineering",
          gpa: studentCgpa,
          placementStatus: status,
          skills: s.profile?.skills || ["React", "TypeScript", "Python", "SQL"],
          resumeUploaded: !!s.profile || true,
          eligibility: isEligible ? "Eligible" : "Not Eligible"
        };
      });

    return mappedBackend;
  };

  const augmentedStudents = getAugmentedStudents();

  const getAugmentedCompanies = () => {
    // Realistic static profiles for major tech partners
    const demoCompanyProfiles: { [key: string]: { logoUrl: string, location: string } } = {
      "Google": {
        logoUrl: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop",
        location: "Mountain View / Bangalore"
      },
      "Amazon": {
        logoUrl: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=100&h=100&fit=crop",
        location: "Seattle / Hyderabad"
      },
      "Microsoft": {
        logoUrl: "https://images.unsplash.com/photo-1625014020903-e329f586c990?w=100&h=100&fit=crop",
        location: "Redmond / Noida"
      },
      "TCS": {
        logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop",
        location: "Mumbai / Chennai"
      },
      "Infosys": {
        logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&h=100&fit=crop",
        location: "Bangalore / Pune"
      },
      "Meta": {
        logoUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=100&h=100&fit=crop",
        location: "Menlo Park / Gurgaon"
      },
      "Adobe": {
        logoUrl: "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=100&h=100&fit=crop",
        location: "San Jose / Noida"
      }
    };

    return companies.map(c => {
      const match = demoCompanyProfiles[c.name] || {
        logoUrl: c.logoUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&h=100&fit=crop",
        location: "Bangalore HQ"
      };

      // Determine company status dynamically based on application states and deadline dates
      const compApps = applications.filter(a => a.companyId === c.id || a.companyInfo?.name === c.name);
      const regCount = compApps.length;
      const shortlistedCount = compApps.filter(a => ["Shortlisted", "Interview Scheduled", "Selected"].includes(a.status)).length;
      const selectedCount = compApps.filter(a => a.status === "Selected").length;

      const isPastDeadline = new Date(c.applicationDeadline) < new Date();
      const selectionProcessActive = shortlistedCount > 0;
      const companyStatus = ((c as any).status || "").toUpperCase();

      let status = "Open";

      // 1. CONCLUDED SELECTIONS (Closed status)
      if (
        (isPastDeadline && !selectionProcessActive) ||
        (selectionProcessActive && selectedCount >= shortlistedCount) ||
        ["COMPLETED", "CLOSED", "OFFER_RELEASED"].includes(companyStatus)
      ) {
        status = "Closed";
      }
      // 2. ONGOING EVALUATIONS (Ongoing status)
      else if (
        (isPastDeadline && selectionProcessActive && selectedCount < shortlistedCount) ||
        (selectionProcessActive && selectedCount < shortlistedCount) ||
        ["UNDER_REVIEW", "ASSESSMENT", "INTERVIEW", "SHORTLISTING"].includes(companyStatus)
      ) {
        status = "Ongoing";
      }
      // 3. UPCOMING DRIVES (Open status)
      else if (
        (!isPastDeadline && !selectionProcessActive) ||
        companyStatus === "REGISTRATION_OPEN"
      ) {
        status = "Open";
      } else {
        status = isPastDeadline ? "Closed" : "Open";
      }

      return {
        ...c,
        logoUrl: match.logoUrl,
        location: match.location,
        status: status
      };
    });
  };

  const augmentedCompanies = getAugmentedCompanies();

  const getAugmentedApplications = () => {
    return applications.map(app => {
      // Find matching student
      const matchedStud = augmentedStudents.find(s => 
        s.studentId === app.studentId || 
        s.id === app.studentId || 
        (app.studentInfo && s.studentId === app.studentInfo.studentId)
      );
      const matchedComp = augmentedCompanies.find(c => c.id === app.companyId);

      return {
        ...app,
        studentInfo: matchedStud ? {
          name: matchedStud.name,
          studentId: matchedStud.studentId,
          department: matchedStud.department
        } : app.studentInfo,
        companyInfo: matchedComp ? {
          name: matchedComp.name,
          jobRole: matchedComp.jobRole,
          packageLpa: matchedComp.packageLpa
        } : app.companyInfo
      };
    });
  };
  
  const augmentedApplications = getAugmentedApplications();

  // Recount statistics dynamically from current memory caches representing full-stack TPO statistics
  const totalStudentsCount = augmentedStudents.length; 
  const eligibleStudentsCount = augmentedStudents.filter(s => s.eligibility === "Eligible").length; 
  const placedStudentsCount = augmentedStudents.filter(s => s.placementStatus === "Placed").length; 
  const activeCompaniesCount = augmentedCompanies.length; 
  
  const upcomingPlacementDrivesCount = augmentedCompanies.filter(c => {
    const deadline = new Date(c.applicationDeadline);
    return deadline >= new Date();
  }).length;

  const calculatedPlacementRatePercent = totalStudentsCount > 0 
    ? Math.min(100, Math.round((placedStudentsCount / totalStudentsCount) * 100)) 
    : 0;

  // Filtering Students list in memory
  const filteredStudents = augmentedStudents.filter((s) => {
    const studentCgpa = s.gpa || 0;
    const searchMatch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.studentId.toLowerCase().includes(studentSearch.toLowerCase());

    const branchMatch =
      studentBranchFilter === "All" ||
      s.department.toLowerCase().includes(studentBranchFilter.toLowerCase());

    const cgpaMatch = studentCgpa >= studentMinCgpa;

    const statusMatch =
      studentStatusFilter === "All" ||
      s.placementStatus.toLowerCase() === studentStatusFilter.toLowerCase();

    return searchMatch && branchMatch && cgpaMatch && statusMatch;
  });

  // Filtering Companies list in memory
  const filteredCompanies = augmentedCompanies.filter((c) => {
    const term = companySearch.toLowerCase();
    const searchMatch =
      c.name.toLowerCase().includes(term) ||
      c.jobRole.toLowerCase().includes(term) ||
      c.jobDescription.toLowerCase().includes(term);

    const matchPackage = c.packageLpa >= companyMinPackage;

    return searchMatch && matchPackage;
  });

  // Filtering applications logs
  const filteredApplications = augmentedApplications.filter((app) => {
    const companyName = app.companyInfo ? app.companyInfo.name : "";
    const studentName = app.studentInfo ? app.studentInfo.name : "";
    const studentId = app.studentInfo ? app.studentInfo.studentId : "";

    const searchMatch =
      companyName.toLowerCase().includes(appCompanySearch.toLowerCase()) ||
      studentName.toLowerCase().includes(appCompanySearch.toLowerCase()) ||
      studentId.toLowerCase().includes(appCompanySearch.toLowerCase());

    const statusMatch = appStatusFilter === "All" || app.status === appStatusFilter;

    return searchMatch && statusMatch;
  });

  // Analytics helper lists
  // Classify selections and salaries by Branch compiled from current loaded structures
  const DEPARTMENTS_LIST = [
    "Computer Science & Engineering",
    "Data Science & AI",
    "Electronic Engineering",
    "Mechanical Engineering"
  ];

  const branchSalaryMap: { [key: string]: { sum: number; count: number; max: number; placementsCount: number } } = {};
  DEPARTMENTS_LIST.forEach(dept => {
    branchSalaryMap[dept] = { sum: 0, count: 0, max: 0, placementsCount: 0 };
  });

  augmentedStudents.forEach(s => {
    const dept = s.department || "Computer Science & Engineering";
    if (!branchSalaryMap[dept]) {
      branchSalaryMap[dept] = { sum: 0, count: 0, max: 0, placementsCount: 0 };
    }

    const isPlaced = s.placementStatus === "Placed";
    if (isPlaced) {
      branchSalaryMap[dept].placementsCount++;
      // Find package lpa for placed student
      const studentApps = augmentedApplications.filter(a => 
        (a.studentId === s.id || a.studentId === s.studentId || (a.studentInfo && a.studentInfo.studentId === s.studentId)) && 
        a.status === "Selected"
      );
      let pkg = 0;
      if (studentApps.length > 0) {
        pkg = studentApps[1 - 1]?.companyInfo?.packageLpa || 0;
        if (!pkg && studentApps[0].companyId) {
          const matchedComp = augmentedCompanies.find(c => c.id === studentApps[0].companyId);
          if (matchedComp) {
            pkg = matchedComp.packageLpa;
          }
        }
      }
      if (pkg > 0) {
        branchSalaryMap[dept].sum += pkg;
        branchSalaryMap[dept].count++;
        if (pkg > branchSalaryMap[dept].max) {
          branchSalaryMap[dept].max = pkg;
        }
      }
    }
  });

  const processedBranchAnalytics = Object.keys(branchSalaryMap).map(branch => {
    const data = branchSalaryMap[branch];
    const avg = data.count > 0 ? parseFloat((data.sum / data.count).toFixed(1)) : 0;
    return {
      branch,
      averagePackage: avg || 0,
      highestPackage: data.max || 0,
      selectionsCount: data.placementsCount || 0
    };
  });

  // SVG dimensions for curvature scaling in SPLINE graph
  // Let's count how many students are placed in each month dynamically
  const monthlyCounts = { "Jan": 0, "Feb": 0, "Mar": 0, "Apr": 0, "May": 0, "Jun": 0 };
  const selectedApplications = augmentedApplications.filter(a => a.status === "Selected");
  selectedApplications.forEach(a => {
    const d = new Date(a.applicationDate);
    if (!isNaN(d.getTime())) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mName = monthNames[d.getMonth()];
      if (mName in monthlyCounts) {
        monthlyCounts[mName as keyof typeof monthlyCounts]++;
      }
    }
  });

  const points = [
    { x: 50, y: 160 - (monthlyCounts["Jan"] * 12), label: "Jan", hires: monthlyCounts["Jan"] },
    { x: 150, y: 160 - (monthlyCounts["Feb"] * 12), label: "Feb", hires: monthlyCounts["Feb"] },
    { x: 250, y: 160 - (monthlyCounts["Mar"] * 12), label: "Mar", hires: monthlyCounts["Mar"] },
    { x: 350, y: 160 - (monthlyCounts["Apr"] * 12), label: "Apr", hires: monthlyCounts["Apr"] },
    { x: 450, y: 160 - (monthlyCounts["May"] * 12), label: "May", hires: monthlyCounts["May"] },
    { x: 550, y: 160 - (monthlyCounts["Jun"] * 12), label: "Jun", hires: monthlyCounts["Jun"] }
  ];

  // Map curves dynamically
  let splinePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    // Bezier control points calculation for beautiful curves
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (curr.x - prev.x) / 2;
    const cpY2 = curr.y;
    splinePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
  }

  return (
    <div className="flex-grow flex flex-col md:flex-row min-h-[calc(100vh-65px)] bg-slate-955 text-slate-100" id="admin-workspace-grid">
      
      {/* Dynamic Toast feedback layer */}
      <div className="fixed bottom-5 right-5 z-100 space-y-2 max-w-sm" id="toast-overlay">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl ${
              toast.type === "success"
                ? "bg-slate-900 border-emerald-800/80 text-emerald-400"
                : "bg-slate-900 border-rose-900/80 text-rose-400"
            } animate-slide-in text-xs`}
          >
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="font-sans font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* MOBILE HEADER BUTTON BAR */}
      <div className="md:hidden flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800" id="portal-mobile-hud">
        <div className="flex items-center gap-2">
          <Shield className="w-4.5 h-4.5 text-indigo-400" />
          <span className="text-xs font-black uppercase text-white font-mono tracking-wider">Placement Coordinator</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* ==========================================================
          SIDEBAR NAVIGATION (COLLAPSIBLE / RESPONSIVE)
          ========================================================== */}
      <aside
        className={`${
          mobileMenuOpen ? "block" : "hidden"
        } md:block w-full md:w-64 bg-slate-950 border-r border-slate-900 shrink-0 select-none`}
        id="portal-nav-sidebar"
      >
        <div className="h-full flex flex-col justify-between py-6 px-4">
          <div className="space-y-6">
            
            {/* Header branding profile banner */}
            <div className="px-3 pb-4 border-b border-slate-900 flex items-center gap-2.5">
              <div className="h-9 w-9 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center shrink-0 animate-pulse">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">{coordinatorProfile.name}</p>
                <span className="text-[9px] text-indigo-400 font-mono tracking-wider flex items-center gap-1 mt-0.5 font-bold uppercase">
                  <Shield className="w-2.5 h-2.5" /> Placement Coordinator
                </span>
                <span className="text-[8px] text-slate-500 font-sans truncate block">{coordinatorProfile.email}</span>
              </div>
            </div>

            {/* Sidebar navigation list links */}
            <nav className="space-y-1.5" id="sidebar-main-nav">
              <button
                onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-overview"
              >
                <Layers className="w-4.5 h-4.5" />
                <span>Overview Dashboard</span>
              </button>

              <button
                onClick={() => { setActiveTab("students"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "students" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-students"
              >
                <Users className="w-4.5 h-4.5" />
                <span>Students Registry</span>
              </button>

              <button
                onClick={() => { setActiveTab("companies"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "companies" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-companies"
              >
                <Building className="w-4.5 h-4.5" />
                <span>Companies Portal</span>
              </button>

              <button
                onClick={() => { setActiveTab("drives"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "drives" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-drives"
              >
                <Calendar className="w-4.5 h-4.5" />
                <span>Placement Drives</span>
              </button>

              <button
                onClick={() => { setActiveTab("applications"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "applications" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-applications"
              >
                <Briefcase className="w-4.5 h-4.5" />
                <span>Applications Tracker</span>
              </button>

              <button
                onClick={() => { setActiveTab("analytics"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "analytics" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-analytics"
              >
                <BarChart3 className="w-4.5 h-4.5" />
                <span>Visual Analytics</span>
              </button>

              <button
                onClick={() => { setActiveTab("announcements"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "announcements" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-announcements"
              >
                <Megaphone className="w-4.5 h-4.5" />
                <span>Broadcasts Panel</span>
              </button>

              <button
                onClick={() => { setActiveTab("reports"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "reports" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-reports"
              >
                <FileText className="w-4.5 h-4.5" />
                <span>Placement Reports</span>
              </button>

              <button
                onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === "settings" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                id="sidebar-tab-settings"
              >
                <Settings className="w-4.5 h-4.5" />
                <span>Global Settings</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Footer element: Log Out Action */}
          <div className="pt-6 border-t border-slate-900">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-rose-500 hover:bg-rose-950/20 hover:text-rose-400 transition-all rounded-xl text-xs font-bold text-left cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Sign Out Session</span>
            </button>
          </div>

        </div>
      </aside>

      {/* ==========================================================
          MAIN VIEW CANVAS
          ========================================================== */}
      <section className="flex-grow p-6 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8" id="admin-main-canvas">
        
        {/* Dynamic subview rendering panel */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold tracking-tight text-slate-400">Loading university databases registry...</p>
          </div>
        ) : (
          <>
            {/* ==========================================================
                TAB 1: OVERVIEW DASHBOARD
                ========================================================== */}
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-fade-in" id="view-section-overview">
                
                {/* Header title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Placement Intelligence Console</h1>
                    <p className="text-xs text-slate-400 font-sans mt-1">Real-time indicators, recruiter registration pools, and candidate analytics pipeline statistics.</p>
                  </div>
                  <button
                    onClick={() => { setRefreshTrigger(prev => prev + 1); showToast("Refreshing database...", "success"); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-indigo-400 font-bold active:scale-95 transition-all cursor-pointer w-fit"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Live Data</span>
                  </button>
                </div>

                {/* OVERVIEW STATS CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="stats-indicators-grid">
                  
                  <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between" id="card-stats-totalstudents">
                    <div className="flex items-center justify-between gap-2 text-slate-400">
                      <span className="text-[10px] font-bold tracking-wider uppercase leading-none">Total Students</span>
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight mt-3">{totalStudentsCount}</p>
                    <span className="text-[9px] text-indigo-400/90 font-mono mt-1 block">University Enrolled</span>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between" id="card-stats-eligibility">
                    <div className="flex items-center justify-between gap-2 text-slate-400">
                      <span className="text-[10px] font-bold tracking-wider uppercase leading-none font-sans">Eligible Students</span>
                      <Shield className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight mt-3">{eligibleStudentsCount}</p>
                    <span className="text-[9px] text-emerald-400/90 font-mono mt-1 block">&gt;= 7.50 Cumulative CGPA</span>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between" id="card-stats-placed">
                    <div className="flex items-center justify-between gap-2 text-slate-400">
                      <span className="text-[10px] font-bold tracking-wider uppercase leading-none">Placed Students</span>
                      <CheckCircle className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight mt-3">{placedStudentsCount}</p>
                    <span className="text-[9px] text-indigo-400/90 font-mono mt-1 block">Overall Selections Rec</span>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between" id="card-stats-activecompanies">
                    <div className="flex items-center justify-between gap-2 text-slate-400">
                      <span className="text-[10px] font-bold tracking-wider uppercase leading-none">Active Companies</span>
                      <Building className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight mt-3">{activeCompaniesCount}</p>
                    <span className="text-[9px] text-amber-500/90 font-mono mt-1 block">Registered Recruiters</span>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between" id="card-stats-upcomingdrives">
                    <div className="flex items-center justify-between gap-2 text-slate-400">
                      <span className="text-[10px] font-bold tracking-wider uppercase leading-none">Upcoming Drives</span>
                      <Calendar className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight mt-3">{upcomingPlacementDrivesCount}</p>
                    <span className="text-[9px] text-purple-400/90 font-mono mt-1 block">Ongoing Active Drives</span>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between" id="card-stats-placementrate">
                    <div className="flex items-center justify-between gap-2 text-slate-400">
                      <span className="text-[10px] font-bold tracking-wider uppercase leading-none">Placement Rate</span>
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight mt-3">{calculatedPlacementRatePercent}%</p>
                    <div className="w-full bg-slate-950 h-1 rounded-full mt-2.5 overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${calculatedPlacementRatePercent}%` }}></div>
                    </div>
                  </div>

                </div>

                {/* TWO-PANEL INTERACTION WORKSPACE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* PAN 1: RECENT ACTIVITIES */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 lg:col-span-2 space-y-6" id="panel-recent-activities">
                    <div>
                      <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-400" /> Recent Academic Placement Activity
                      </h2>
                      <p className="text-[11px] text-slate-500 font-sans mt-0.5">Real-time timeline update logs generated across campus departments and corporate partner requests.</p>
                    </div>

                    <div className="space-y-4">
                      {recentActivities.map((act) => (
                        <div key={act.id} className="flex gap-4 p-3 bg-slate-950/50 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all">
                          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                            {act.icon}
                          </div>
                          <div className="flex-grow min-w-0">
                            <h4 className="text-xs font-semibold text-slate-300 truncate">{act.title}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed truncate">{act.description}</p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0 whitespace-nowrap">{act.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PAN 2: QUICK ACTIONS */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6 flex flex-col justify-between" id="panel-quick-actions">
                    <div className="space-y-1.5">
                      <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-400" /> Operational Quick Actions
                      </h2>
                      <p className="text-[11px] text-slate-500 font-sans">Immediate shortcuts targeting management modules below directly.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 my-4">
                      <button
                        onClick={handleQuickAddCompany}
                        className="w-full flex items-center justify-between px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 transition-all rounded-xl text-xs font-semibold text-slate-300 group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" /> Add Recruiting Company
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>

                      <button
                        onClick={handleQuickCreateDrive}
                        className="w-full flex items-center justify-between px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 transition-all rounded-xl text-xs font-semibold text-slate-300 group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> Create Placement Drive
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>

                      <button
                        onClick={handleQuickPostAnnouncement}
                        className="w-full flex items-center justify-between px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 transition-all rounded-xl text-xs font-semibold text-slate-300 group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" /> Post Live Announcement
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>

                      <button
                        onClick={handleQuickGenerateReport}
                        className="w-full flex items-center justify-between px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 transition-all rounded-xl text-xs font-semibold text-slate-300 group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" /> Compile Placement Report
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-xl text-[11px] text-slate-400 leading-relaxed font-sans">
                      <p className="font-bold text-amber-500 text-xs mb-1">🛡️ Coordinator Mode Enabled</p>
                      <p>You can search students, CRUD corporate records, audit application milestones status and post campus broadcasts.</p>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ==========================================================
                TAB 2: STUDENTS REGISTRY
                ========================================================== */}
            {activeTab === "students" && (
              <div className="space-y-6 animate-fade-in text-xs" id="view-section-students">
                
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-extrabold text-white tracking-tight">University Student Registry</h1>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">Edit academic files, track candidate placement options, and verify student information records.</p>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-900/40 border border-slate-900 p-4 rounded-2xl" id="student-filters-panel">
                  
                  {/* Text search */}
                  <div className="relative col-span-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search Roll, Name, Skills..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>

                  {/* Branch filter */}
                  <div className="relative col-span-1">
                    <select
                      value={studentBranchFilter}
                      onChange={(e) => setStudentBranchFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-all font-sans font-medium"
                    >
                      <option value="All">All Departments</option>
                      {DEFAULT_DEPARTMENTS.map((dept, idx) => (
                        <option key={idx} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Placement Status Filter */}
                  <div className="relative col-span-1">
                    <select
                      value={studentStatusFilter}
                      onChange={(e) => setStudentStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-all font-sans font-medium"
                    >
                      <option value="All">All Placement States</option>
                      <option value="Placed">Placed Candidates</option>
                      <option value="Ongoing">Ongoing Evaluations</option>
                      <option value="Unplaced">Unplaced Candidates</option>
                    </select>
                  </div>

                  {/* Slider CGPA filtering */}
                  <div className="flex items-center gap-3 col-span-2 bg-slate-950/40 border border-slate-900 rounded-xl px-4 py-1.5 font-sans">
                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Min CGPA:</span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={studentMinCgpa}
                      onChange={(e) => setStudentMinCgpa(Number(e.target.value))}
                      className="flex-grow cursor-pointer accent-indigo-500 bg-slate-900 h-1 rounded-full outline-none"
                    />
                    <span className="font-mono font-bold text-white bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-lg shrink-0">
                      {studentMinCgpa.toFixed(1)} +
                    </span>
                  </div>

                </div>

                {/* STUDENTS DATA TABLE */}
                <div className="overflow-x-auto bg-slate-900/40 border border-slate-900 rounded-2xl shadow-xl" id="student-data-table-container">
                  <table className="w-full border-collapse text-left" id="students-table">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-400 font-mono uppercase tracking-wider text-[10px] bg-slate-950/60 font-black">
                        <th className="py-3 px-4">Student ID / Roll</th>
                        <th className="py-3 px-4">Candidate Details</th>
                        <th className="py-3 px-4">Department & Branch</th>
                        <th className="py-3 px-4 text-center font-mono">CGPA</th>
                        <th className="py-3 px-4">Key Skills</th>
                        <th className="py-3 px-4 text-center">Resume</th>
                        <th className="py-3 px-4 text-center">Eligibility</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-sans">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 px-4 text-center text-slate-500 font-sans font-semibold">
                            No students found matching your filtering parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => {
                          const studentCgpa = s.gpa || 8.85;
                          const isEligible = s.eligibility === "Eligible";
                          const hasResume = s.resumeUploaded;

                          return (
                            <tr key={s.id} className="hover:bg-slate-900/30 transition-all font-medium text-slate-300" id={`student-row-${s.id}`}>
                              {/* Student ID */}
                              <td className="py-3.5 px-4 font-mono font-black text-indigo-400">{s.studentId}</td>
                              
                              {/* Profile Details */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-0.5">
                                  <span className="text-white font-extrabold block">{s.name}</span>
                                  <span className="text-[10px] text-slate-500 hover:text-indigo-400 block break-all">{s.email}</span>
                                </div>
                              </td>

                              {/* Department */}
                              <td className="py-3.5 px-4 text-slate-300 truncate max-w-[160px]" title={s.department}>
                                {s.department}
                              </td>

                              {/* GPA */}
                              <td className="py-3.5 px-4 text-center">
                                <span className="font-mono text-white bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg inline-block font-black">
                                  {studentCgpa.toFixed(2)}
                                </span>
                              </td>

                              {/* Skills */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {s.skills.slice(0, 3).map((skill: string, skIdx: number) => (
                                    <span key={skIdx} className="bg-slate-950 border border-slate-800 text-[9px] text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                      {skill}
                                    </span>
                                  ))}
                                  {s.skills.length > 3 && (
                                    <span className="text-[9px] text-indigo-400 font-bold px-1 py-0.5">+{s.skills.length - 3}</span>
                                  )}
                                </div>
                              </td>

                              {/* Resume Status */}
                              <td className="py-3.5 px-4 text-center">
                                {hasResume ? (
                                  <span className="bg-emerald-950/20 border border-emerald-900 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                    YES
                                  </span>
                                ) : (
                                  <span className="bg-rose-950/25 border border-rose-900 text-rose-450 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                    NO
                                  </span>
                                )}
                              </td>

                              {/* Eligibility Status */}
                              <td className="py-3.5 px-4 text-center">
                                {isEligible ? (
                                  <span className="bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                                    Eligible
                                  </span>
                                ) : (
                                  <span className="bg-rose-950/40 border border-rose-900/60 text-rose-400 text-[10px] font-medium px-2 py-0.5 rounded-full inline-block">
                                    Locked
                                  </span>
                                )}
                              </td>

                              {/* Placement Status */}
                              <td className="py-3.5 px-4 text-center">
                                {s.placementStatus === "Placed" ? (
                                  <span className="bg-indigo-950/50 border border-indigo-900 text-indigo-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                    Placed
                                  </span>
                                ) : s.placementStatus === "Ongoing" ? (
                                  <span className="bg-amber-950/40 border border-amber-900 text-amber-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                    Ongoing
                                  </span>
                                ) : (
                                  <span className="bg-slate-950 border border-slate-850 text-slate-500 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                                    Unplaced
                                  </span>
                                )}
                              </td>

                              {/* Action tools */}
                              <td className="py-3.5 px-4 text-right space-y-1 sm:space-y-0 sm:space-x-1.5 shrink-0 block sm:table-cell">
                                <button
                                  onClick={() => setViewingStudentProfile({ ...s, fullName: s.name, branch: s.department, cgpa: s.gpa })}
                                  className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-indigo-400 font-bold active:scale-95 transition-all cursor-pointer text-[10px]"
                                  title="View full resume file info"
                                >
                                  View CV
                                </button>
                                <button
                                  onClick={() => setEditingStudent(s)}
                                  className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-505/20 hover:border-indigo-500 rounded-lg font-bold active:scale-95 transition-all cursor-pointer text-[10px]"
                                  title="Edit fundamental academic properties"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ==========================================================
                TAB 3: COMPANIES PORTAL
                ========================================================== */}
            {activeTab === "companies" && (
              <div className="space-y-6 animate-fade-in text-xs" id="view-section-companies">
                
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-extrabold text-white tracking-tight">Active Recruiter Listing Portal</h1>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">Add recruiting opportunities, set minimum eligibility criteria, and review candidate applicant registers.</p>
                  </div>
                  <button
                    onClick={() => {
                      setCompanyModalMode("add");
                      setEditingCompany({
                        id: "",
                        name: "",
                        logoUrl: "",
                        jobRole: "",
                        packageLpa: 12,
                        minCgpa: 7.00,
                        eligibleBranches: ["Computer Science", "Data Science & AI"],
                        requiredSkills: ["React", "TypeScript", "Node"],
                        applicationDeadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
                        jobDescription: "",
                        openPositions: 2
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer w-fit"
                    id="btn-register-recruiter"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register Corporate Recruiter</span>
                  </button>
                </div>

                {/* Search & filters row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-900 p-4 rounded-2xl" id="companies-filter-panel">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      placeholder="Search company or job openings..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>

                  <div className="flex items-center gap-3 col-span-2 bg-slate-950/40 border border-slate-900 rounded-xl px-4 py-1.5 font-sans">
                    <span className="text-[11px] font-bold text-slate-400 uppercase leading-none">Min Package (LPA):</span>
                    <input
                      type="range"
                      min="5"
                      max="55"
                      step="5"
                      value={companyMinPackage}
                      onChange={(e) => setCompanyMinPackage(Number(e.target.value))}
                      className="flex-grow cursor-pointer accent-indigo-505 bg-slate-900 h-1 rounded-full"
                    />
                    <span className="font-mono font-bold text-white bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg shrink-0">
                      {companyMinPackage} LPA +
                    </span>
                  </div>
                </div>

                {/* Recruiter GRID Listing cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="recruiter-listings-grid">
                  {filteredCompanies.length === 0 ? (
                    <div className="col-span-2 py-20 text-center font-sans font-semibold text-slate-500">
                      No recruiting operations found matching current credentials query filters.
                    </div>
                  ) : (
                    filteredCompanies.map((c) => {
                      const compApps = augmentedApplications.filter(a => a.companyId === c.id || a.companyInfo?.name === c.name);
                      const totalApplicantsCount = compApps.length;
                      const shortlistedCount = compApps.filter(a => ["Shortlisted", "Interview Scheduled", "Selected"].includes(a.status)).length;
                      const selectedCount = compApps.filter(a => a.status === "Selected").length;
                      
                      const minPkgRange = c.packageLpa - 4 > 4 ? c.packageLpa - 4 : 5;
                      const pkgRangeStr = `${minPkgRange} - ${c.packageLpa} LPA`;

                      return (
                        <div
                          key={c.id}
                          className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl hover:border-indigo-900 flex flex-col justify-between gap-5 transition-all relative overflow-hidden"
                          id={`company-card-${c.id}`}
                        >
                          {/* Company status badge */}
                          <div className="absolute top-0 right-0">
                            <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-bl-xl border-l border-b border-slate-900 tracking-wider ${
                              c.status === "Open"
                                ? "bg-emerald-950/80 text-emerald-450 border-emerald-900"
                                : c.status === "Ongoing"
                                ? "bg-amber-955/80 text-amber-500 border-amber-900"
                                : "bg-slate-950 text-slate-500 border-slate-800"
                            }`}>
                              ● {c.status}
                            </span>
                          </div>
                          
                          {/* Company branding detail */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-4">
                              <CompanyLogo name={c.name} logoUrl={c.logoUrl} className="w-12 h-12" />
                              <div>
                                <h3 className="text-sm font-extrabold text-white tracking-tight">{c.name}</h3>
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block font-mono mt-0.5">{c.jobRole}</span>
                                <span className="text-[10px] text-slate-400 font-sans block mt-1 font-bold">📍 {c.location}</span>
                              </div>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-center shrink-0 min-w-[90px] mr-12">
                              <span className="text-[8px] text-indigo-450 block uppercase font-black leading-none">CTC Package Range</span>
                              <span className="text-[11px] font-black text-white block mt-1">{pkgRangeStr}</span>
                            </div>
                          </div>

                          {/* Company statistcs dashboard counters */}
                          <div className="grid grid-cols-3 gap-2 py-3 bg-slate-950/60 border border-slate-900/60 rounded-xl text-center font-sans">
                            <div>
                              <span className="text-[8px] text-slate-500 block uppercase font-bold leading-none">Applicants</span>
                              <span className="text-xs font-black text-indigo-400 block mt-1 font-mono">{totalApplicantsCount}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-500 block uppercase font-bold leading-none">Shortlisted</span>
                              <span className="text-xs font-black text-amber-500 block mt-1 font-mono">{shortlistedCount}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-500 block uppercase font-bold leading-none">Placed (Selected)</span>
                              <span className="text-xs font-black text-emerald-400 block mt-1 font-mono">{selectedCount}</span>
                            </div>
                          </div>

                          {/* Criteria eligibility badges */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-t border-b border-slate-950/80 font-sans">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Eligible branches</span>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {/* Cast branch array entries */}
                                {(Array.isArray(c.eligibleBranches) ? c.eligibleBranches : String(c.eligibleBranches).split(",")).map((branch, bp) => (
                                  <span key={bp} className="text-[9px] bg-slate-950 text-slate-350 px-2 py-0.5 rounded border border-slate-900 leading-none">
                                    {branch.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Minimum CGPA criteria</span>
                              <span className="text-xs font-black text-rose-450 font-mono inline-block mt-2">{c.minCgpa.toFixed(2)} + CGPA criteria</span>
                            </div>
                          </div>

                          {/* Deadline elements and operations */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                            
                            <div className="flex items-center gap-2 text-slate-400 font-sans">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Deadline:</span>
                              <span className="font-mono text-white font-bold">{c.applicationDeadline}</span>
                            </div>

                          <div className="flex items-center gap-2 py-1 justify-end">
                            <button
                              onClick={() => setViewingCompanyApplicants(c)}
                              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-indigo-400 font-bold active:scale-95 transition-all cursor-pointer"
                              title="Audit student applications logged for this recruiter"
                            >
                              Applicants
                            </button>

                            <button
                              onClick={() => {
                                setCompanyModalMode("edit");
                                setEditingCompany(c);
                              }}
                              className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-lg text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
                              title="Modify recruiter constraints"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setCompanyToDelete(c.id)}
                              className="p-1.5 bg-rose-955/20 hover:bg-rose-900 border border-rose-900/30 hover:border-rose-800/80 rounded-lg text-rose-450 hover:text-white active:scale-95 transition-all cursor-pointer"
                              title="Delete corporate registration"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>

                      </div>
                    );
                  })
                  )}
                </div>

              </div>
            )}
                  {/* ==========================================================
                TAB 4: PLACEMENT DRIVES
                ========================================================== */}
            {activeTab === "drives" && (
              <div className="space-y-6 animate-fade-in text-xs" id="view-section-drives">
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight">Active Recruitment Drives Pipeline</h1>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">Timeline track of upcoming opportunities, active registration metrics, and ended corporate selections.</p>
                </div>

                {/* Subclassifying drives based on deadline dates */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="drives-timeline-columns">
                  
                  {/* COL 1: UPCOMING DRIVES */}
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 space-y-4" id="col-upcoming-drives">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                      <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span>●</span> Upcoming Drives
                      </h3>
                      <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg font-mono font-black text-white">
                        {augmentedCompanies.filter(c => c.status === "Open").length}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {augmentedCompanies.filter(c => c.status === "Open").map(c => {
                        const compApps = augmentedApplications.filter(a => a.companyId === c.id || a.companyInfo?.name === c.name);
                        const regCount = compApps.length;
                        const shortlistCount = compApps.filter(a => ["Shortlisted", "Interview Scheduled", "Selected"].includes(a.status)).length;
                        const selCount = compApps.filter(a => a.status === "Selected").length;
                        const rawEligibleCount = compApps.filter(app => {
                          const stud = augmentedStudents.find(s => s.studentId === app.studentId || s.id === app.studentId);
                          return stud ? stud.gpa >= (c.minCgpa || 7.5) : true;
                        }).length;
                        const eligibleCount = Math.min(regCount, Math.max(shortlistCount, rawEligibleCount));
                        const stageStr = "Registration Open";

                        return (
                          <div key={c.id} className="bg-slate-950/80 border border-slate-900 p-4 rounded-xl space-y-3">
                            <div className="flex items-center gap-3">
                              <CompanyLogo name={c.name} logoUrl={c.logoUrl} className="w-10 h-10" />
                              <div>
                                <h4 className="font-extrabold text-white text-xs leading-none">{c.name}</h4>
                                <p className="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-wider">{c.jobRole}</p>
                              </div>
                            </div>

                            {/* Drive specifications table fields */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 p-2 bg-slate-900/40 rounded-lg text-[10px] text-slate-400 font-sans border border-slate-900/30">
                              <div className="flex justify-between"><span>Registrations:</span> <span className="font-mono text-white font-bold">{regCount}</span></div>
                              <div className="flex justify-between"><span>Eligible Candidates:</span> <span className="font-mono text-white font-bold">{eligibleCount}</span></div>
                              <div className="flex justify-between"><span>Shortlisted:</span> <span className="font-mono text-white font-bold">{shortlistCount}</span></div>
                              <div className="flex justify-between"><span>Selected:</span> <span className="font-mono text-white font-bold">{selCount}</span></div>
                            </div>

                            <div className="pt-1 flex items-center justify-between border-t border-slate-900 text-[10px]">
                              <span className="text-slate-450">Current Stage:</span>
                              <span className="text-emerald-400 font-mono font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded">{stageStr}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* COL 2: ONGOING SELECTIONS */}
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 space-y-4" id="col-ongoing-drives">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                      <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span>●</span> Ongoing Evaluations
                      </h3>
                      <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg font-mono font-black text-white">
                        {augmentedCompanies.filter(c => c.status === "Ongoing").length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {augmentedCompanies.filter(c => c.status === "Ongoing").map(c => {
                        const compApps = augmentedApplications.filter(a => a.companyId === c.id || a.companyInfo?.name === c.name);
                        const regCount = compApps.length;
                        const shortlistCount = compApps.filter(a => ["Shortlisted", "Interview Scheduled", "Selected"].includes(a.status)).length;
                        const selCount = compApps.filter(a => a.status === "Selected").length;
                        const rawEligibleCount = compApps.filter(app => {
                          const stud = augmentedStudents.find(s => s.studentId === app.studentId || s.id === app.studentId);
                          return stud ? stud.gpa >= (c.minCgpa || 7.5) : true;
                        }).length;
                        const eligibleCount = Math.min(regCount, Math.max(shortlistCount, rawEligibleCount));
                        const stageStr = "Technical Interviews Ongoing";

                        return (
                          <div key={c.id} className="bg-slate-955 border border-slate-900 p-4 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="bg-amber-950/40 border border-amber-900 text-amber-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase leading-none">Active Assessment</span>
                              <span className="font-mono text-[10px] text-slate-450 font-bold">CTC: {c.packageLpa} LPA</span>
                            </div>
                            <h4 className="font-extrabold text-white text-xs leading-none">{c.name} — {c.jobRole}</h4>
                            
                            {/* Drive statistics indicators */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 p-2 bg-slate-950/60 rounded-lg text-[10px] text-slate-400 font-sans border border-slate-900">
                              <div className="flex justify-between"><span>Registrations:</span> <span className="font-mono text-white font-bold">{regCount}</span></div>
                              <div className="flex justify-between"><span>Eligible Candidates:</span> <span className="font-mono text-white font-bold">{eligibleCount}</span></div>
                              <div className="flex justify-between"><span>Shortlisted:</span> <span className="font-mono text-white font-bold">{shortlistCount}</span></div>
                              <div className="flex justify-between"><span>Selected:</span> <span className="font-mono text-white font-bold">{selCount}</span></div>
                            </div>

                            <div className="pt-1 flex items-center justify-between border-t border-slate-900 text-[10px]">
                              <span className="text-slate-450">Current Stage:</span>
                              <span className="text-amber-500 font-mono font-bold uppercase tracking-wider bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded">{stageStr}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* COL 3: RECENT COMPLETED */}
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 space-y-4" id="col-completed-drives">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                      <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5 font-sans font-bold font-black">
                        <span>●</span> Concluded Selections
                      </h3>
                      <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg font-mono font-black text-white">
                        {augmentedCompanies.filter(c => c.status === "Closed").length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {augmentedCompanies.filter(c => c.status === "Closed").map(c => {
                        const compApps = augmentedApplications.filter(a => a.companyId === c.id || a.companyInfo?.name === c.name);
                        const regCount = compApps.length;
                        const shortlistCount = compApps.filter(a => ["Shortlisted", "Interview Scheduled", "Selected"].includes(a.status)).length;
                        const selCount = compApps.filter(a => a.status === "Selected").length;
                        const rawEligibleCount = compApps.filter(app => {
                          const stud = augmentedStudents.find(s => s.studentId === app.studentId || s.id === app.studentId);
                          return stud ? stud.gpa >= (c.minCgpa || 7.5) : true;
                        }).length;
                        const eligibleCount = Math.min(regCount, Math.max(shortlistCount, rawEligibleCount));
                        const stageStr = "Selections Published";

                        return (
                          <div key={c.id} className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
                            <h4 className="font-extrabold text-slate-400 text-xs">{c.name} — Concluded Drive</h4>
                            
                            {/* Drive specs table */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 p-2 bg-slate-900/40 rounded-lg text-[10px] text-slate-400 font-sans border border-slate-900/30">
                              <div className="flex justify-between"><span>Registrations:</span> <span className="font-mono text-slate-400 font-bold">{regCount}</span></div>
                              <div className="flex justify-between"><span>Eligible Candidates:</span> <span className="font-mono text-slate-400 font-bold">{eligibleCount}</span></div>
                              <div className="flex justify-between"><span>Shortlisted:</span> <span className="font-mono text-slate-400 font-bold">{shortlistCount}</span></div>
                              <div className="flex justify-between"><span>Selected:</span> <span className="font-mono text-indigo-400 font-black">{selCount}</span></div>
                            </div>

                            <div className="pt-1 flex items-center justify-between border-t border-slate-900 text-[10px]">
                              <span className="text-slate-500">Result Status:</span>
                              <span className="text-indigo-400 font-mono font-bold uppercase tracking-wider bg-indigo-950/40 border border-indigo-900/40 px-1.5 py-0.5 rounded">{stageStr}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ==========================================================
                TAB 5: APPLICATIONS TRACKER
                ========================================================== */}
            {activeTab === "applications" && (
              <div className="space-y-6 animate-fade-in text-xs" id="view-section-applications">
                
                {/* Header Title */}
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight">Main Campus Applications Tracking</h1>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">Control pipeline states, shortlist candidates, evaluate candidate profiles, and edit selection results.</p>
                </div>

                {/* SUMMARY APP STATS CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4" id="apps-summary-indicators">
                  {(() => {
                    const appTotal = augmentedApplications.length;
                    const appShortlisted = augmentedApplications.filter(a => a.status === "Shortlisted").length;
                    const appInterviews = augmentedApplications.filter(a => a.status === "Interview Scheduled").length;
                    const appSelected = augmentedApplications.filter(a => a.status === "Selected").length;
                    const appRejected = augmentedApplications.filter(a => a.status === "Rejected").length;

                    return (
                      <>
                        <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl text-center">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Applications</span>
                          <span className="text-lg font-black text-white font-mono block mt-1.5">{appTotal}</span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl text-center">
                          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block font-sans">Shortlisted</span>
                          <span className="text-lg font-black text-amber-500 font-mono block mt-1.5">{appShortlisted}</span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl text-center">
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block font-sans font-bold">Interviews</span>
                          <span className="text-lg font-black text-indigo-400 font-mono block mt-1.5">{appInterviews}</span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl text-center">
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block font-sans">Selected Selections</span>
                          <span className="text-lg font-black text-emerald-400 font-mono block mt-1.5">{appSelected}</span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl text-center">
                          <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block font-sans">Rejected Slates</span>
                          <span className="text-lg font-black text-rose-450 font-mono block mt-1.5">{appRejected}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-900 p-4 rounded-2xl" id="apps-filter-panel">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={appCompanySearch}
                      onChange={(e) => setAppCompanySearch(e.target.value)}
                      placeholder="Search company, candidate name or roll..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={appStatusFilter}
                      onChange={(e) => setAppStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-all font-sans"
                    >
                      <option value="All">All Verification Milestones</option>
                      <option value="Applied">Applied</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Master table LIST */}
                <div className="overflow-x-auto bg-slate-900/40 border border-slate-900 rounded-2xl shadow-xl" id="apps-tracker-container">
                  <table className="w-full border-collapse text-left" id="applications-table">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-400 font-mono uppercase tracking-wider text-[10px] bg-slate-950/60 font-black">
                        <th className="py-3 px-4">Candidate Roll</th>
                        <th className="py-3 px-4">Student Candidate Name</th>
                        <th className="py-3 px-4">Target Company / Role</th>
                        <th className="py-3 px-4 font-mono">Package CTC</th>
                        <th className="py-3 px-4">Date Applied</th>
                        <th className="py-3 px-4">Assigned Milestone Status</th>
                        <th className="py-3 px-4 text-right">Alter Selection Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-sans">
                      {filteredApplications.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 px-4 text-center text-slate-500 font-sans font-semibold">
                            No applications submitted or found representing current filter choices.
                          </td>
                        </tr>
                      ) : (
                        filteredApplications.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-900/30 transition-all font-medium text-slate-300" id={`app-row-${app.id}`}>
                            {/* Roll number */}
                            <td className="py-3.5 px-4 font-mono font-black text-indigo-400">
                              {app.studentInfo ? app.studentInfo.studentId : "STU-FALL"}
                            </td>
                            
                            {/* Candidate name */}
                            <td className="py-3.5 px-4 font-bold text-white">
                              {app.studentInfo ? app.studentInfo.name : "Ashish Jha"}
                            </td>

                            {/* Company job Role */}
                            <td className="py-3.5 px-4">
                              <div>
                                <span className="font-extrabold text-slate-200 block">{app.companyInfo ? app.companyInfo.name : "Company Partner"}</span>
                                <span className="text-[10px] text-slate-400 block">{app.companyInfo ? app.companyInfo.jobRole : "Software Developer"}</span>
                              </div>
                            </td>

                            {/* CTC Package */}
                            <td className="py-3.5 px-4 font-mono">
                              {app.companyInfo ? `${app.companyInfo.packageLpa} LPA` : "12 LPA"}
                            </td>

                            {/* Application Date */}
                            <td className="py-3.5 px-4 font-mono select-none text-slate-400">
                              {app.applicationDate ? app.applicationDate.split("T")[0] : "2026-06-03"}
                            </td>

                            {/* Milestone tag */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] px-2.5 py-1 rounded-full font-bold inline-block border ${
                                  app.status === "Selected"
                                    ? "bg-emerald-950/40 border-emerald-900 text-emerald-400"
                                    : app.status === "Rejected"
                                    ? "bg-rose-955/30 border-rose-900 text-rose-450 font-semibold"
                                    : app.status === "Shortlisted"
                                    ? "bg-indigo-950/40 border-indigo-900 text-indigo-400"
                                    : app.status === "Interview Scheduled"
                                    ? "bg-amber-950/40 border-amber-905 text-amber-400"
                                    : "bg-slate-950 border-slate-800 text-slate-400"
                                }`}
                              >
                                {app.status}
                              </span>
                            </td>

                            {/* Direct selector action changes */}
                            <td className="py-3.5 px-4 text-right">
                              <select
                                value={app.status}
                                onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                                className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 text-[11px] font-bold rounded-xl outline-none focus:border-indigo-500 transition-all font-sans"
                              >
                                <option value="Applied">Applied</option>
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Interview Scheduled">Interview Scheduled</option>
                                <option value="Selected">Selected</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ==========================================================
                TAB 6: VISUAL ANALYTICS
                ========================================================== */}
            {activeTab === "analytics" && (
              <div className="space-y-8 animate-fade-in text-xs" id="view-section-analytics">
                
                {/* Header */}
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight">University Placement Analytics</h1>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">Custom computed statistical reports, monthly placement spline curves, selection indices and salary trends.</p>
                </div>

                {/* BAR and SPLINE CURVE CHARTS PANEL GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="analytics-charts-grid">
                  
                  {/* SPLINE LINE CHART (Monthly Placement Trends) */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-400" /> Monthly Placement Hires Trend
                      </h3>
                      <p className="text-[10px] text-slate-500 font-sans">Curved spline line visualization depicting selection counts over consecutive academic quarters.</p>
                    </div>

                    <div className="mx-auto w-full max-w-lg aspect-video bg-slate-950 border border-slate-900/60 p-4 rounded-xl relative flex flex-col justify-between" id="trend-spline-canvas">
                      <svg viewBox="0 0 600 200" className="w-full h-full text-indigo-500">
                        {/* Grid lines */}
                        <line x1="50" y1="30" x2="550" y2="30" stroke="#1e293b" strokeDasharray="3" />
                        <line x1="50" y1="90" x2="550" y2="90" stroke="#1e293b" strokeDasharray="3" />
                        <line x1="50" y1="150" x2="550" y2="150" stroke="#1e293b" strokeDasharray="3" />
                        
                        {/* Solid curve */}
                        <path d={splinePath} fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-500" />
                        
                        {/* Dots and Labels */}
                        {points.map((pt, index) => (
                          <g key={index}>
                            <circle cx={pt.x} cy={pt.y} r="5" className="fill-indigo-500 stroke-white stroke-2 hover:r-7 transition-all cursor-crosshair" />
                            <text x={pt.x} y={pt.y - 12} textAnchor="middle" className="fill-white text-[10px] font-mono font-bold">
                              {pt.hires}
                            </text>
                            <text x={pt.x} y="190" textAnchor="middle" className="fill-slate-500 text-[10px] font-sans font-bold">
                              {pt.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>

                  {/* PROGRESS BAR SELECTIONS BY DEPT */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-400" /> Student Selections by Department
                      </h3>
                      <p className="text-[10px] text-slate-500 font-sans">Relative hiring volume compiled dynamically across university branches.</p>
                    </div>

                    <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                      {processedBranchAnalytics.length === 0 ? (
                        <p className="text-slate-500 text-center font-sans font-semibold py-8">Need active selection records to compile department data.</p>
                      ) : (
                        processedBranchAnalytics.map((branchData, index) => {
                          const maxCount = Math.max(...processedBranchAnalytics.map(b => b.selectionsCount), 1);
                          const percentage = Math.round((branchData.selectionsCount / maxCount) * 100);

                          return (
                            <div key={index} className="space-y-1.5 font-sans">
                              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-300">
                                <span>{branchData.branch}</span>
                                <span className="font-mono text-white font-bold">{branchData.selectionsCount} Selected</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

                {/* BENTO STATISTICAL CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="bento-salary-analytics">
                  
                  {/* Average CTC column list */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-400" /> Average CTC Packages (LPA)
                    </h4>
                    
                    <div className="space-y-3 font-sans">
                      {processedBranchAnalytics.map((b, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-900 rounded-xl">
                          <span className="text-slate-300 font-semibold">{b.branch}</span>
                          <span className="font-mono text-indigo-400 font-black">{b.averagePackage} LPA Average</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Highest CTC column list */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-500" /> Highest CTC Offered (LPA)
                    </h4>

                    <div className="space-y-3 font-sans">
                      {processedBranchAnalytics.map((b, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-900 rounded-xl">
                          <span className="text-slate-300 font-semibold">{b.branch}</span>
                          <span className="font-mono text-amber-400 font-black">{b.highestPackage} LPA Max Limit</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ==========================================================
                TAB 7: BROADCASTS PANEL (ANNOUNCEMENTS)
                ========================================================== */}
            {activeTab === "announcements" && (
              <div className="space-y-6 animate-fade-in text-xs" id="view-section-announcements">
                
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-extrabold text-white tracking-tight">University Broadcasts Control Panel</h1>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">Publish alerts, advise students about deadlines, and check broadcast updates logs.</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewAnnTitle("");
                      setNewAnnContent("");
                      setNewAnnTag("Drive Alert");
                      setAnnouncementModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer w-fit"
                    id="btn-create-broadcast"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Announcement Broadcast</span>
                  </button>
                </div>

                {/* Broadcast logs feed cards list */}
                <div className="space-y-4" id="broadcasts-timeline-feed">
                  {announcements.length === 0 ? (
                    <div className="bg-slate-900/40 border border-slate-900 p-8 text-center text-slate-500 font-semibold font-sans rounded-2xl">
                      No announcements published to university panels yet.
                    </div>
                  ) : (
                    announcements.map((ann) => (
                      <div key={ann.id} className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3 relative overflow-hidden" id={`ann-card-${ann.id}`}>
                        
                        {/* Card metadata label row */}
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-[10px] bg-indigo-950/60 border border-indigo-905 text-indigo-400 font-bold px-2.5 py-0.5 rounded-full inline-block leading-none uppercase tracking-wider">
                            {ann.tag || "General Advisory"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{ann.date}</span>
                        </div>

                        {/* Title & Body */}
                        <h3 className="text-sm font-extrabold text-slate-200 mt-1">{ann.title}</h3>
                        <p className="text-slate-400 text-xs mt-1 font-sans leading-relaxed text-left font-medium">{ann.content}</p>

                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* ==========================================================
                TAB 8: PLACEMENT REPORTS
                ========================================================== */}
            {activeTab === "reports" && (
              <div className="space-y-6 animate-fade-in text-xs" id="view-section-reports">
                
                {/* Header panel */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-extrabold text-white tracking-tight">Compiled Placement Performance Reports</h1>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">Export student evaluation sheets, generate text summary logs, and review statistical rosters.</p>
                  </div>
                  
                  {/* Download Plain text summary log */}
                  <button
                    onClick={() => {
                      const summaryText = `NEXHIRE UNIVERSITY PLACEMENT DIGEST REPORT\n============================================\nDate compiled: ${new Date().toLocaleDateString()}\nTotal enrolled candidates: ${totalStudentsCount}\nPlacement rate estimate: ${calculatedPlacementRatePercent}%\nTotal Recruiter Partners: ${activeCompaniesCount}\nPlaced Candidates: ${placedStudentsCount}\n============================================`;
                      const element = document.createElement("a");
                      const file = new Blob([summaryText], { type: 'text/plain' });
                      element.href = URL.createObjectURL(file);
                      element.download = "nexhire_placement_report.txt";
                      document.body.appendChild(element);
                      element.click();
                      showToast("Summary report compiled & downloaded successfully!", "success");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-indigo-400 font-bold rounded-xl active:scale-95 transition-all cursor-pointer w-fit"
                  >
                    <FolderDown className="w-4 h-4" />
                    <span>Download Plain Text Summary XML/CSV</span>
                  </button>
                </div>

                {/* Printable Digest styled panel */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-8 space-y-6 max-w-4xl mx-auto" id="report-digest-preview-card">
                  
                  {/* Branding Header */}
                  <div className="border-b border-slate-900 pb-5 text-center flex flex-col items-center">
                    <GraduationCap className="w-10 h-10 text-indigo-500 mb-2" />
                    <h2 className="text-base font-black tracking-tight text-white">NEXHIRE CAMPUS PLACEMENT COMPREHENSIVE PERFORMANCE PORTFOLIO</h2>
                    <span className="text-[10px] text-slate-400 font-mono tracking-widest mt-1">OFFICIAL UNIVERSITY COMPILATION INDEX</span>
                  </div>

                  {/* Summary variables */}
                  {(() => {
                    const selectedApps = augmentedApplications.filter(a => a.status === "Selected");
                    const sumPkg = selectedApps.reduce((acc, a) => acc + (a.companyInfo?.packageLpa || 0), 0);
                    const avgPkg = selectedApps.length > 0 ? parseFloat((sumPkg / selectedApps.length).toFixed(1)) : 0;

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-center">
                        <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl">
                          <span className="text-[10px] text-slate-500 block uppercase">Student Base</span>
                          <span className="text-lg font-black font-mono text-white block mt-1">{totalStudentsCount} Checked</span>
                        </div>

                        <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl">
                          <span className="text-[10px] text-slate-500 block uppercase">Placed Candidates</span>
                          <span className="text-lg font-black font-mono text-white block mt-1">{placedStudentsCount} Placed</span>
                        </div>

                        <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl">
                          <span className="text-[10px] text-slate-500 block uppercase">Avg Package CTC</span>
                          <span className="text-lg font-black font-mono text-indigo-400 block mt-1">{avgPkg > 0 ? `${avgPkg} LPA` : "0 LPA"}</span>
                        </div>

                        <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl">
                          <span className="text-[10px] text-slate-500 block uppercase">Overall Index Score</span>
                          <span className="text-lg font-black font-mono text-emerald-400 block mt-1">{calculatedPlacementRatePercent}% Rate</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dynamic brief summaries logs list */}
                  <div className="space-y-3 font-sans">
                    <h3 className="text-xs font-bold text-slate-350 tracking-wider">Hired Placement Records:</h3>
                    
                    {augmentedApplications.filter(a => a.status === "Selected").length === 0 ? (
                      <p className="text-slate-500 font-sans italic text-left">No hired selections recorded in database pipelines currently.</p>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {augmentedApplications.filter(a => a.status === "Selected").map((app, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-950 p-3 border border-slate-910/80 rounded-xl">
                            <div>
                              <span className="font-extrabold text-white block">{app.studentInfo ? app.studentInfo.name : "Ashish Jha"}</span>
                              <span className="text-[10px] text-slate-550 font-mono block mt-0.5">{app.studentInfo ? app.studentInfo.studentId : "STU-1"} — {app.studentInfo ? app.studentInfo.department : "Engineering"}</span>
                            </div>

                            <div className="text-right">
                              <span className="font-extrabold text-indigo-400 block">{app.companyInfo ? app.companyInfo.name : "CompanyPartner"}</span>
                              <span className="text-[10px] text-emerald-400 font-mono block font-black mt-0.5">{app.companyInfo ? `${app.companyInfo.packageLpa} LPA Selected` : "12 LPA"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Real-time Email Registry Integrity Diagnostics */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4 max-w-4xl mx-auto mt-6" id="email-registry-diagnostics-card">
                  <div className="flex items-center justify-between border-b border-slate-905 pb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
                      <div className="text-left">
                        <h3 className="text-xs font-bold text-white tracking-wider uppercase">Database Email Integrity Scan</h3>
                        <p className="text-[9.5px] text-slate-400 italic">Compliance audits for active and historical user email credentials.</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setRefreshTrigger(p => p + 1);
                        showToast("Diagnostic audit started...", "success");
                      }}
                      className="px-3 py-1 bg-indigo-950/60 border border-indigo-900 hover:bg-slate-850 text-indigo-400 hover:text-white rounded-lg text-[9.5px] font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      Recalculate Audit
                    </button>
                  </div>

                  {diagnosticReport ? (
                    <div className="space-y-4">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                        <div className="bg-slate-950 p-3.5 border border-slate-900 rounded-xl relative overflow-hidden font-sans">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Total Users</span>
                          <span className="text-sm font-black font-mono text-white block mt-1">{diagnosticReport.totalUsers} Records</span>
                          <div className="absolute right-2.5 bottom-2 opacity-5 text-indigo-400">
                            <Users className="w-8 h-8" />
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3.5 border border-slate-900 rounded-xl relative overflow-hidden font-sans">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Valid Emails</span>
                          <span className="text-sm font-black font-mono text-emerald-400 block mt-1">{diagnosticReport.validEmailsCount} Accounts</span>
                          <div className="absolute right-2.5 bottom-2 opacity-5 text-emerald-400">
                            <CheckCircle className="w-8 h-8" />
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3.5 border border-slate-900 rounded-xl relative overflow-hidden font-sans">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider font-sans">Invalid Legacy</span>
                          <span className={`text-sm font-black font-mono block mt-1 ${diagnosticReport.invalidLegacyCount > 0 ? "text-rose-400" : "text-slate-500"}`}>{diagnosticReport.invalidLegacyCount} Invalid</span>
                          <div className="absolute right-2.5 bottom-2 opacity-5 text-rose-450">
                            <AlertCircle className="w-8 h-8" />
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3.5 border border-slate-900 rounded-xl relative overflow-hidden font-sans">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Duplicate Emails</span>
                          <span className={`text-sm font-black font-mono block mt-1 ${diagnosticReport.duplicateEmailsCount > 0 ? "text-amber-400" : "text-slate-500"}`}>{diagnosticReport.duplicateEmailsCount} Dupes</span>
                          <div className="absolute right-2.5 bottom-2 opacity-5 text-amber-500">
                            <Layers className="w-8 h-8" />
                          </div>
                        </div>
                      </div>

                      {/* List flagged details */}
                      <div className="space-y-2 text-left">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identified Credentials Anomalies:</h4>
                        
                        {(() => {
                          const flagged = (diagnosticReport.users || []).filter((u: any) => !u.isValidFormat || u.isDuplicate);
                          if (flagged.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-6 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl space-y-2 text-center text-slate-450">
                                <Check className="w-6 h-6 text-emerald-400 stroke-[3px]" />
                                <div>
                                  <p className="font-extrabold text-xs text-white">All Registry Databases Complying</p>
                                  <p className="text-[9.5px] text-slate-400 mt-0.5">Zero duplicates or invalid legacy addresses detected in university registries.</p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                              {flagged.map((user: any, ui: number) => (
                                <div key={ui} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950 p-3 border border-slate-900 rounded-xl hover:border-slate-850 transition-colors">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-white text-[11px] block">{user.name}</span>
                                      <span className={`text-[8.5px] px-1.5 py-0.5 rounded-md font-bold uppercase ${user.role === "admin" ? "bg-indigo-950 text-indigo-400" : "bg-slate-900 text-slate-400"}`}>
                                        {user.role}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-405 font-mono block">{user.email}</span>
                                    <span className="text-[9px] text-slate-500 font-sans block">Student ID / Roll: {user.studentId || "N/A"}</span>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex flex-wrap gap-1">
                                      {!user.isValidFormat && (
                                        <span className="bg-rose-955/80 text-rose-400 text-[8.5px] px-2 py-0.5 rounded-lg border border-rose-900/40 font-bold block font-sans">
                                          Invalid Format
                                        </span>
                                      )}
                                      {user.isDuplicate && (
                                        <span className="bg-amber-955/80 text-amber-400 text-[8.5px] px-2 py-0.5 rounded-lg border border-amber-900/40 font-bold block font-sans">
                                          Duplicate Address
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => {
                                        setEditingStudent(user);
                                        showToast(`Editing records for ${user.name}`, "success");
                                      }}
                                      className="text-[10px] text-indigo-400 hover:text-white font-black hover:underline cursor-pointer font-sans"
                                    >
                                      Edit Details
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 font-sans italic">
                      Gathering audit indices, please wait...
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ==========================================================
                TAB 9: GLOBAL CONFIGURATION (SETTINGS)
                ========================================================== */}
            {activeTab === "settings" && (
              <div className="space-y-6 animate-fade-in text-xs" id="view-section-settings">
                
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-extrabold text-white tracking-tight">TPO Office Settings & Personalization</h1>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">Configure placement seasons, coordinate notification dispatch queues, edit academic export templates, and alter coordinator files.</p>
                  </div>
                  <button
                    onClick={() => {
                      showToast("Configuration profile saved successfully!", "success");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer w-fit"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save TPO Configuration</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="settings-controls-workspace">
                  
                  {/* 1. COORDINATOR INDIVIDUAL PROFILE FILE */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4" id="profile-controls-panel">
                    <h3 className="text-xs font-bold text-white tracking-wider uppercase border-b border-slate-900 pb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-400" /> TPO Coordinator Identity Profile
                    </h3>

                    <div className="space-y-3 font-sans">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Coordinator Name</label>
                        <input
                          type="text"
                          value={coordinatorProfile.name}
                          onChange={(e) => setCoordinatorProfile({ ...coordinatorProfile, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-all font-sans font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Official Designation</label>
                        <input
                          type="text"
                          value={coordinatorProfile.role}
                          onChange={(e) => setCoordinatorProfile({ ...coordinatorProfile, role: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-505 transition-all font-sans font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Department</label>
                        <input
                          type="text"
                          value={coordinatorProfile.department}
                          onChange={(e) => setCoordinatorProfile({ ...coordinatorProfile, department: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-505 transition-all font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Official University Email</label>
                        <input
                          type="email"
                          value={coordinatorProfile.email}
                          onChange={(e) => setCoordinatorProfile({ ...coordinatorProfile, email: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-505 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. PLACEMENT SEASON SETTINGS & PARAMS */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4" id="placement-season-panel">
                    <h3 className="text-xs font-bold text-white tracking-wider uppercase border-b border-slate-900 pb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" /> University Placement Season Settings
                    </h3>

                    <div className="space-y-3 font-sans">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Batch Recruitment Year</label>
                        <select
                          value={seasonSettings.currentSeason}
                          onChange={(e) => setSeasonSettings({ ...seasonSettings, currentSeason: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-505 transition-all font-sans font-bold"
                        >
                          <option value="Placement Season 2026-2027">Placement Season 2026-2027 (Active)</option>
                          <option value="Placement Season 2025-2026">Placement Season 2025-2026 (Archived)</option>
                          <option value="Summer Interships 2026">Summer Interships 2026 (Active)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Eligibility GPA Ceiling</label>
                        <input
                          type="number"
                          step="0.1"
                          min="5.0"
                          max="9.5"
                          value={seasonSettings.minCgpaLmt}
                          onChange={(e) => setSeasonSettings({ ...seasonSettings, minCgpaLmt: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-505 transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={seasonSettings.autoExcludePlaced}
                            onChange={(e) => setSeasonSettings({ ...seasonSettings, autoExcludePlaced: e.target.checked })}
                            className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                          />
                          <span className="text-[11px] text-slate-300">Exclude candidates securely once selected (TPO Safe Lock)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={seasonSettings.strictCvDeadlines}
                            onChange={(e) => setSeasonSettings({ ...seasonSettings, strictCvDeadlines: e.target.checked })}
                            className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                          />
                          <span className="text-[11px] text-slate-300">Enforce strict CV compilation deadlines</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 3. COORDINATOR NOTIFICATION dispatch PREF */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4" id="notifications-panel">
                    <h3 className="text-xs font-bold text-white tracking-wider uppercase border-b border-slate-900 pb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-500" /> Notification Dispatch Queues
                    </h3>

                    <div className="space-y-3 font-sans pr-4 py-1">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.emailDigests}
                          onChange={(e) => setNotificationPrefs({ ...notificationPrefs, emailDigests: e.target.checked })}
                          className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                        />
                        <div>
                          <span className="text-[11px] text-white font-bold block">Daily Academic Summary Reports</span>
                          <span className="text-[9px] text-slate-500">Sends daily summaries of candidate shortlists & company registrations.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.newStudentRegistered}
                          onChange={(e) => setNotificationPrefs({ ...notificationPrefs, newStudentRegistered: e.target.checked })}
                          className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                        />
                        <div>
                          <span className="text-[11px] text-white font-bold block">Instant Student Approvals Alert</span>
                          <span className="text-[9px] text-slate-500">Notify immediately when a student submits their resume.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.newCompanyRequests}
                          onChange={(e) => setNotificationPrefs({ ...notificationPrefs, newCompanyRequests: e.target.checked })}
                          className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                        />
                        <div>
                          <span className="text-[11px] text-white font-bold block">Immediate Recruiter Registration Signals</span>
                          <span className="text-[9px] text-slate-500">Dispatch triggers when details are changed for recruiters.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 4. EXPORT / REPORT PREFERENCES & FORMATS */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4" id="report-pref-panel">
                    <h3 className="text-xs font-bold text-white tracking-wider uppercase border-b border-slate-900 pb-2 flex items-center gap-2">
                      <Download className="w-4 h-4 text-purple-400" /> Academic Reports & Exports Builder
                    </h3>

                    <div className="space-y-3 font-sans">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Standard Export File Type</label>
                        <select
                          value={reportPrefs.exportFormat}
                          onChange={(e) => setReportPrefs({ ...reportPrefs, exportFormat: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl outline-none focus:border-indigo-500 transition-all font-sans font-medium"
                        >
                          <option value="CSV">Comma Separated Values (.CSV)</option>
                          <option value="TSV">Tab Separated Values (.TSV)</option>
                          <option value="JSON">Raw JSON Database Records (.JSON)</option>
                          <option value="PDF">Formatted PDF University Report (.PDF)</option>
                        </select>
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reportPrefs.includeGpaTrend}
                            onChange={(e) => setReportPrefs({ ...reportPrefs, includeGpaTrend: e.target.checked })}
                            className="bg-slate-900 border border-slate-800 rounded accent-indigo-500"
                          />
                          <span className="text-[11px] text-slate-300">Include CGPA growth spline coordinates</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reportPrefs.includeShortlistData}
                            onChange={(e) => setReportPrefs({ ...reportPrefs, includeShortlistData: e.target.checked })}
                            className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                          />
                          <span className="text-[11px] text-slate-300">Pre-calculate shortlist/interview ratios</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 5. INTERACTIVE DASHBOARD VIEWS AND RADIAL PREF */}
                  <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4 lg:col-span-2" id="dashboard-pref-panel">
                    <h3 className="text-xs font-bold text-white tracking-wider uppercase border-b border-slate-900 pb-2 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-indigo-400" /> TPO Intelligence Console Display Preferences
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dashboardPrefs.denseView}
                            onChange={(e) => setDashboardPrefs({ ...dashboardPrefs, denseView: e.target.checked })}
                            className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                          />
                          <span className="text-[11px] text-slate-300">Activate compact tables (reduces padding sizes for readability)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dashboardPrefs.showSalaryAverages}
                            onChange={(e) => setDashboardPrefs({ ...dashboardPrefs, showSalaryAverages: e.target.checked })}
                            className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                          />
                          <span className="text-[11px] text-slate-300">Render branch-wise CTC metric estimates</span>
                        </label>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dashboardPrefs.animateGraphs}
                            onChange={(e) => setDashboardPrefs({ ...dashboardPrefs, animateGraphs: e.target.checked })}
                            className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                          />
                          <span className="text-[11px] text-slate-300">Enable micro-animations & fade effects</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dashboardPrefs.autoscrollAnnouncements}
                            onChange={(e) => setDashboardPrefs({ ...dashboardPrefs, autoscrollAnnouncements: e.target.checked })}
                            className="bg-slate-950 border-slate-800 rounded accent-indigo-500"
                          />
                          <span className="text-[11px] text-slate-300">Auto-rotate campus announcements alerts</span>
                        </label>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </>
        )}

      </section>

      {/* ==========================================================
          MODALS & DRAWER ELEMENT OVERLAYS
          ========================================================== */}
      
      {/* 1. VIEW STUDENT PROFILE DRAWER */}
      {viewingStudentProfile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-300 flex items-center justify-end" id="profile-drawer-backdrop">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full p-8 flex flex-col justify-between overflow-y-auto animate-slide-in text-xs" id="profile-drawer-body">
            
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                  <User className="w-4.5 h-4.5 text-indigo-400" /> University Candidate Record
                </h2>
                <button
                  onClick={() => setViewingStudentProfile(null)}
                  className="p-1.5 bg-slate-950 border border-slate-805 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Basic credentials details */}
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-500 font-mono tracking-wide leading-none">{viewingStudentProfile.studentId}</span>
                  <p className="text-sm font-black text-white">{viewingStudentProfile.name}</p>
                  <p className="text-slate-400 hover:text-indigo-350 cursor-pointer">{viewingStudentProfile.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Department</label>
                    <p className="p-3 bg-slate-950 border border-slate-850 rounded-xl font-bold text-slate-300">{viewingStudentProfile.department}</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Enrollment Year</label>
                    <p className="p-3 bg-slate-950 border border-slate-805 rounded-xl font-mono text-white font-black">{viewingStudentProfile.enrollmentYear || 2024}</p>
                  </div>
                </div>

                {viewingStudentProfile.profile ? (
                  <div className="space-y-4">
                    
                    {/* CGPA */}
                    <div className="p-3.5 bg-slate-950 border border-slate-805 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cumulative GPA</span>
                      <span className="font-mono text-base font-black text-rose-400">{viewingStudentProfile.profile.cgpa.toFixed(2)} / 10.00</span>
                    </div>

                    {/* Resume files link */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Submitted Resume CV File Link</label>
                      <div className="p-3.5 bg-slate-950 border border-slate-855 rounded-xl flex items-center justify-between">
                        <span className="text-slate-400 truncate max-w-[200px] font-mono">{viewingStudentProfile.profile.resumeLink || "No web CV submitted"}</span>
                        {viewingStudentProfile.profile.resumeLink ? (
                          <a
                            href={viewingStudentProfile.profile.resumeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Open CV <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic font-sans">Unavailable</span>
                        )}
                      </div>
                    </div>

                    {/* Phone details and links */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Phone Number</label>
                        <p className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-300 font-bold">{viewingStudentProfile.profile.phoneNumber || "No phone added"}</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Roles Preferred</label>
                        <p className="p-3 bg-slate-950 border border-slate-805 rounded-xl text-slate-300 truncate font-semibold" title={viewingStudentProfile.profile.desiredRole}>
                          {viewingStudentProfile.profile.desiredRole || "Software Developer"}
                        </p>
                      </div>
                    </div>

                    {/* Skills bubbles list */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Skills bubble Tags</label>
                      <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                        {(!viewingStudentProfile.profile.skills || viewingStudentProfile.profile.skills.length === 0) ? (
                          <span className="text-slate-500 italic">No skills listed</span>
                        ) : (
                          viewingStudentProfile.profile.skills.map((skill: string, skId: number) => (
                            <span key={skId} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-205 px-2.5 py-0.5 rounded-md font-sans">
                              {skill}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-8 bg-slate-950 border border-slate-850 rounded-2xl text-center text-slate-550 leading-relaxed font-sans">
                    <span>⚠️ Candidate has not filled or finalized their Placement CV credentials parameters yet. They show base GPA file records representing {viewingStudentProfile.gpa || 8.85} CPGA.</span>
                  </div>
                )}
              </div>

            </div>

            <div className="pt-6 border-t border-slate-800">
              <button
                onClick={() => setViewingStudentProfile(null)}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-805 transition-all cursor-pointer"
              >
                Close Candidate Dialog
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. EDIT STUDENT FUNDAMENTALS DIALOG MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-300 flex items-center justify-center p-4" id="edit-student-backdrop">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative animate-scale-up text-xs" id="edit-student-body">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-400" /> Edit Student Roster Record
              </h2>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                id="btn-close-edit-student"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-4" id="edit-student-form">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Candidate Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contact University Email</label>
                <input
                  type="email"
                  required
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Department Specialty</label>
                <select
                  value={editingStudent.department}
                  onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                >
                  {DEFAULT_DEPARTMENTS.map((dept, di) => (
                    <option key={di} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Academic CGPA (0-10)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="10"
                    step="0.01"
                    value={editingStudent.gpa}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gpa: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-805 text-white rounded-xl outline-none focus:border-indigo-505 transition-all font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Enrollment Year</label>
                  <input
                    type="number"
                    required
                    value={editingStudent.enrollmentYear}
                    onChange={(e) => setEditingStudent({ ...editingStudent, enrollmentYear: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-805 text-slate-350 hover:text-white font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Apply Verification Edits
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 3. REGISTER RECRUITER / ADD COMPANY MODAL DIALOG */}
      {companyModalMode && editingCompany && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-300 flex items-center justify-center p-4 overflow-y-auto" id="edit-company-backdrop">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative my-8 animate-scale-up text-xs" id="edit-company-body">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                <Building className="w-4.5 h-4.5 text-indigo-400" /> {companyModalMode === "add" ? "Register Recruiting Enterprise" : "Modify Recruiter Profile Constraints"}
              </h2>
              <button
                onClick={() => { setCompanyModalMode(null); setEditingCompany(null); }}
                className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4" id="edit-company-form">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                    placeholder="e.g. Google"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Branding Logo Url</label>
                  <input
                    type="text"
                    value={editingCompany.logoUrl}
                    onChange={(e) => setEditingCompany({ ...editingCompany, logoUrl: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Specified Job Role</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.jobRole}
                    onChange={(e) => setEditingCompany({ ...editingCompany, jobRole: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                    placeholder="e.g. Software Engineer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">CTC Package CTC (LPA)</label>
                  <input
                    type="number"
                    required
                    value={editingCompany.packageLpa}
                    onChange={(e) => setEditingCompany({ ...editingCompany, packageLpa: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-mono text-xs"
                    placeholder="e.g. 18"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Minimum CGPA Criterion</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="10"
                    step="0.1"
                    value={editingCompany.minCgpa}
                    onChange={(e) => setEditingCompany({ ...editingCompany, minCgpa: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-mono text-xs"
                    placeholder="7.5"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Application Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={editingCompany.applicationDeadline}
                    onChange={(e) => setEditingCompany({ ...editingCompany, applicationDeadline: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Eligible branches / Departments (comma-separated list)</label>
                <input
                  type="text"
                  required
                  value={editingCompany.eligibleBranches}
                  onChange={(e) => setEditingCompany({ ...editingCompany, eligibleBranches: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                  placeholder="e.g. Computer Science, Data Science & AI"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Required Skills bubble Tags (comma-separated list)</label>
                <input
                  type="text"
                  required
                  value={editingCompany.requiredSkills}
                  onChange={(e) => setEditingCompany({ ...editingCompany, requiredSkills: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                  placeholder="e.g. React, TypeScript, Go"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Job Open positions Count</label>
                <input
                  type="number"
                  value={editingCompany.openPositions || 1}
                  onChange={(e) => setEditingCompany({ ...editingCompany, openPositions: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Job Role Description Summary & Guidelines</label>
                <textarea
                  required
                  rows={4}
                  value={editingCompany.jobDescription}
                  onChange={(e) => setEditingCompany({ ...editingCompany, jobDescription: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs resize-none"
                  placeholder="Provide explicit responsibilities and company objectives info..."
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setCompanyModalMode(null); setEditingCompany(null); }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-805 text-slate-350 hover:text-white font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Save Recruiter Profile
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 4. VIEW APPLICANT LIST DIALOG DRAWER */}
      {viewingCompanyApplicants && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-300 flex items-center justify-end" id="applicants-drawer-backdrop">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full p-8 flex flex-col justify-between overflow-y-auto animate-slide-in text-xs" id="applicants-drawer-body">
            
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-sm font-black text-white tracking-tight leading-none">{viewingCompanyApplicants.name} Applicant Pool</h2>
                  <span className="text-[10px] text-slate-400 block mt-1 uppercase tracking-wider font-mono">{viewingCompanyApplicants.jobRole} ({viewingCompanyApplicants.packageLpa} LPA)</span>
                </div>
                <button
                  onClick={() => setViewingCompanyApplicants(null)}
                  className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pool list */}
              <div className="space-y-4">
                {applications.filter(app => app.companyId === viewingCompanyApplicants.id).length === 0 ? (
                  <p className="text-slate-500 font-sans italic py-12 text-center text-xs">No students have applied to this opportunity yet.</p>
                ) : (
                  applications.filter(app => app.companyId === viewingCompanyApplicants.id).map((app, idx) => {
                    const st = app.studentInfo || {};
                    return (
                      <div key={idx} className="bg-slate-950 p-4 border border-slate-850 rounded-xl flex items-center justify-between gap-4 font-sans">
                        <div>
                          <span className="font-extrabold text-white block">{st.name || "Ashish Jha"}</span>
                          <span className="text-[10px] text-slate-450 font-mono block mt-0.5">{st.studentId || "STU-FALL"} | {st.department || "Engineering"}</span>
                          <span className="text-[10px] text-emerald-400 block mt-1 font-mono font-bold">GPA Score: {st.gpa || 8.85}</span>
                        </div>

                        <div className="text-right space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 block font-mono">Status: {app.status}</span>
                          <select
                            value={app.status}
                            onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                            className="bg-slate-900 text-slate-350 text-[11px] font-bold px-2 py-1 rounded-md border border-slate-800 outline-none focus:border-indigo-500 font-sans"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interview Scheduled">Interview Scheduled</option>
                            <option value="Selected">Selected</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            <div className="pt-6 border-t border-slate-805">
              <button
                onClick={() => setViewingCompanyApplicants(null)}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-805 transition-all cursor-pointer"
              >
                Close Applicants Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. CREATE CAMPUS BROADCAST MODAL */}
      {announcementModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-300 flex items-center justify-center p-4" id="broadcast-modal-backdrop">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative animate-scale-up text-xs" id="broadcast-modal-body">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                <Megaphone className="w-4.5 h-4.5 text-indigo-400" /> Create Broadcast Announcement
              </h2>
              <button
                onClick={() => setAnnouncementModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handlePostAnnouncementSubmit} className="space-y-4" id="broadcast-form">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Broadcast Title</label>
                <input
                  type="text"
                  required
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                  placeholder="Registration Open for Electives..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Broadcast Category tag</label>
                <select
                  value={newAnnTag}
                  onChange={(e) => setNewAnnTag(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs"
                >
                  <option value="Academic Advisory">Academic Advisory</option>
                  <option value="Student Life">Student Life</option>
                  <option value="Drive Alert">Drive Alert</option>
                  <option value="Facilities Update">Facilities Update</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Content Announcement Message Body</label>
                <textarea
                  required
                  rows={4}
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-indigo-500 transition-all font-sans text-xs resize-none"
                  placeholder="Publish explicit advise guidelines..."
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-805 text-slate-350 hover:text-white font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Broadcast to Campus
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modern React Confirmation Modal: Terminate Recruitment Drive */}
      {companyToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="delete-company-confirm-modal">
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
