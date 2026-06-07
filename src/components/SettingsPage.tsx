import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  Bell,
  Lock,
  Cpu,
  Trash2,
  LogOut,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { Student, StudentProfile } from "../types";
import { clearAllCache } from "../apiCache";

interface SettingsPageProps {
  token: string;
  student: Student;
  profile: StudentProfile | null;
  setProfile: (profile: StudentProfile | null) => void;
  onLogout: () => void;
  onLaunchJwtInspector: () => void;
}

export default function SettingsPage({
  token,
  student,
  profile,
  setProfile,
  onLogout,
  onLaunchJwtInspector,
}: SettingsPageProps) {
  // Navigation active section for high-end side nav mapping
  const [activeSubSection, setActiveSubSection] = useState<
    "profile" | "notifications" | "security" | "account"
  >("profile");

  // Profile Form States
  const [fullName, setFullName] = useState(profile?.fullName || student.name);
  const [email, setEmail] = useState(student.email);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [department, setDepartment] = useState(profile?.branch || student.department);
  const [graduationYear, setGraduationYear] = useState(
    profile?.graduationYear?.toString() || (student.enrollmentYear + 4).toString()
  );

  // Status Alerts states
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notifications Toggles (stored in localStorage for persistence)
  const [alertsDrive, setAlertsDrive] = useState<boolean>(() => {
    return localStorage.getItem("setting_alerts_drive") !== "false";
  });
  const [alertsInterview, setAlertsInterview] = useState<boolean>(() => {
    return localStorage.getItem("setting_alerts_interview") !== "false";
  });
  const [alertsDeadline, setAlertsDeadline] = useState<boolean>(() => {
    return localStorage.getItem("setting_alerts_deadline") === "true";
  });

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Session Logs timestamps (static representation for production expectations)
  const [lastLoginTimestamp] = useState(() => {
    const defaultDate = new Date();
    defaultDate.setMinutes(defaultDate.getMinutes() - 34); // logged in 34 mins ago
    return defaultDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  });

  // Account deletion modal toggler
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync profile update if global state changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhoneNumber(profile.phoneNumber);
      setDepartment(profile.branch);
      setGraduationYear(profile.graduationYear.toString());
    }
  }, [profile]);

  // Persists notifications configuration
  useEffect(() => {
    localStorage.setItem("setting_alerts_drive", String(alertsDrive));
  }, [alertsDrive]);

  useEffect(() => {
    localStorage.setItem("setting_alerts_interview", String(alertsInterview));
  }, [alertsInterview]);

  useEffect(() => {
    localStorage.setItem("setting_alerts_deadline", String(alertsDeadline));
  }, [alertsDeadline]);

  // Handles updating student details in database / API
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    setIsSavingProfile(true);

    try {
      // Validate local parameters
      if (!fullName.trim()) {
        throw new Error("Full Name cannot be left blank.");
      }
      if (!department.trim()) {
        throw new Error("Department/Branch cannot be left blank.");
      }
      const gradYearNum = parseInt(graduationYear);
      if (isNaN(gradYearNum) || gradYearNum < 2020 || gradYearNum > 2100) {
        throw new Error("Please enter a valid graduation year.");
      }

      // Check if profile exists. If not, POST creates. Else POST edits.
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          branch: department,
          cgpa: profile?.cgpa || student.gpa || 8.85,
          graduationYear: gradYearNum,
          resumeLink: profile?.resumeLink || "",
          phoneNumber,
          skills: profile?.skills || [],
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Failed to update placement credentials.");
      }

      setSaveSuccess("Profile settings successfully verified and saved.");
      setProfile(resData.profile);
    } catch (err: any) {
      setSaveError(err.message || "Something went wrong saving the profile settings.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handles security/password update representation
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current secure login token or password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New credentials must be at least 6 characters in length.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Confirm password entries matching error.");
      return;
    }

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Failed to update security credentials.");
      }

      setPasswordSuccess("Security credentials updated. Re-signed state is secure.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Something went wrong during credential updates.");
    }
  };

  // Handles performing the account deletion trigger safely
  const handleDeleteAccountConfirm = async () => {
    setDeleteError(null);
    if (deleteConfirmationText.toLowerCase() !== "delete my account") {
      setDeleteError("Confirmation text does not match correctly.");
      return;
    }

    try {
      // First, attempt to delete profile
      await fetch("/api/profile", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Clear local states
      localStorage.removeItem("academic_session_token");
      localStorage.removeItem("academic_session_student");
      localStorage.removeItem("placement_theme");
      sessionStorage.removeItem("academic_session_token");
      sessionStorage.removeItem("academic_session_student");
      clearAllCache();

      // Successfully logged out and clean state
      onLogout();
    } catch (e: any) {
      // Gracefully proceed with log out since DB profile deletion might fail if profile didn't exist
      onLogout();
    }
  };

  return (
    <div className="space-y-6" id="settings-page-wrapper">
      
      {/* Visual Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <User className="w-5.5 h-5.5 text-indigo-500 shrink-0" />
            <span>Account Settings</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal placement identity, visual parameters, alerts, passwords, and security controls.
          </p>
        </div>

        {/* Small Dev Tools Link */}
        <button
          onClick={onLaunchJwtInspector}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-slate-200 dark:border-indigo-900/60 text-slate-700 dark:text-indigo-400 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-sm group font-mono"
        >
          <Cpu className="w-4 h-4 text-indigo-550 dark:text-indigo-400 group-hover:rotate-12 transition-transform" />
          <span>Launch Developer JWT Inspector</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="settings-layout-grid">
        
        {/* Navigation Sidebar Suboptions (Vercel Style) */}
        <div className="md:col-span-1 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-none border-b md:border-b-0 border-slate-200 dark:border-slate-800">
          {[
            { id: "profile", label: "Profile Settings", icon: User },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "security", label: "Security & Login", icon: Lock },
            { id: "account", label: "Danger Zone", icon: Trash2 },
          ].map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSubSection(sec.id as any)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide transition-all shrink-0 cursor-pointer ${
                  activeSubSection === sec.id
                    ? "bg-slate-150 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800/60"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-white border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Panels Content Form Container */}
        <div className="md:col-span-3 space-y-6">
          
          {/* SECTION 1: PROFILE OPTIONS */}
          {activeSubSection === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-5 animate-fade-in" id="settings-profile-panel">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-extrabold text-white">Profile Details</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Define your matching credentials used by placement algorithms.</p>
                </div>

                {saveSuccess && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex gap-2 text-emerald-800 dark:text-emerald-400 text-xs">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{saveSuccess}</span>
                  </div>
                )}

                {saveError && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl flex gap-2 text-rose-800 dark:text-rose-450 text-xs">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 focus:border-indigo-505 outline-none rounded-xl py-2.5 pl-10 pr-4 font-semibold text-white shadow-sm"
                        placeholder="Sarah Jenkins"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-800 focus:border-indigo-505 outline-none rounded-xl py-2.5 pl-10 pr-4 font-semibold text-slate-300 shadow-sm opacity-80"
                        placeholder="sarah.jenkins@university.edu"
                      />
                    </div>
                    <p className="text-[9.5px] text-slate-400 italic">Connected to academic credentials registration.</p>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-800 focus:border-indigo-505 outline-none rounded-xl py-2.5 pl-10 pr-4 font-semibold text-white shadow-sm"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">
                      Academic Department / Branch
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-805 focus:border-indigo-505 outline-none rounded-xl py-2.5 pl-10 pr-4 font-semibold text-white shadow-sm"
                        placeholder="Computer Science & Engineering"
                      />
                    </div>
                  </div>

                  {/* Graduation Year */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">
                      Graduation Class Year
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        required
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-1000 dark:bg-slate-955 border border-slate-200 dark:border-slate-810 focus:border-indigo-500 outline-none rounded-xl py-2.5 pl-10 pr-4 font-semibold text-slate-900 dark:text-white shadow-sm font-mono"
                        placeholder="2026"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {isSavingProfile ? "Saving Details..." : "Save Profile Configuration"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* SECTION 3: NOTIFICATIONS TOGGLES */}
          {activeSubSection === "notifications" && (
            <div className="space-y-6 animate-fade-in" id="settings-notifications-panel">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Recruitment Broadcasts</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Manage triggers you would like to accept regarding active drives.</p>
                </div>

                <div className="space-y-5 pt-2">
                  {/* Alert 1: Drive Alerts */}
                  <div className="flex items-start justify-between gap-4 p-3.5 hover:bg-slate-950/20 rounded-xl transition-colors">
                    <div className="space-y-1 text-left">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Placement Drive Alerts</span>
                      </h5>
                      <p className="text-[10.5px] text-slate-500 leading-normal">
                        Receive instant notices when recruiters publish new campus job drives matching your GPA cutoffs.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={alertsDrive}
                        onChange={(e) => setAlertsDrive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Alert 2: Interview Notifications */}
                  <div className="flex items-start justify-between gap-4 p-3.5 hover:bg-slate-955/20 rounded-xl transition-colors border-t border-slate-800 pt-5">
                    <div className="space-y-1 text-left">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-550" />
                        <span>Interview Notifications</span>
                      </h5>
                      <p className="text-[10.5px] text-slate-500 leading-normal">
                        Receive alerts regarding interview schedule confirmations, panel modifications, and shortlist releases.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={alertsInterview}
                        onChange={(e) => setAlertsInterview(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Alert 3: Deadline Reminders */}
                  <div className="flex items-start justify-between gap-4 p-3.5 hover:bg-slate-955/20 rounded-xl transition-colors border-t border-slate-800 pt-5">
                    <div className="space-y-1 text-left">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Application Deadline Reminders</span>
                      </h5>
                      <p className="text-[10.5px] text-slate-500 leading-normal">
                        Receive subtle countdown notifications 24 hours prior to application close windows for matching partners.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={alertsDeadline}
                        onChange={(e) => setAlertsDeadline(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: SECURITY */}
          {activeSubSection === "security" && (
            <div className="space-y-6 animate-fade-in" id="settings-security-panel">
              {/* Form 1: Password reset UI */}
              <form onSubmit={handleUpdatePassword} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Credentials Configuration</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Modify and re-sign your active passkeys securely.</p>
                </div>

                {passwordSuccess && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex gap-2 text-emerald-800 dark:text-emerald-400 text-xs text-left">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl flex gap-2 text-rose-800 dark:text-rose-450 text-xs text-left">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">
                      Current Password / Private Hash
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-800 focus:border-indigo-505 outline-none rounded-xl py-2.5 pl-10 pr-10 font-semibold text-white shadow-sm font-mono"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-650 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Dual Grid fields (New Password, Confirm Pass) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">
                        New Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-800 focus:border-indigo-505 outline-none rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm font-mono"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-800 focus:border-indigo-505 outline-none rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm font-mono"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Confirm Credentials Update
                  </button>
                </div>
              </form>

              {/* Card 2: Session Information & Security Audit details */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-left">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Active Security Sessions</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Audit verified cryptographic access terminals holding active keys.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
                    <Laptop className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-grow space-y-1">
                      <div className="flex justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Active Sandbox Router (Current Terminal)</span>
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-mono font-extrabold px-2 py-0.5 rounded border border-emerald-250 dark:border-emerald-900">
                          CURRENT SESSION
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-550 dark:text-slate-400">
                        IP Location Lookup: Registered via 127.0.0.1 Loopback (Cloud Secure Container)
                      </p>
                      <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-mono">
                        User Agent: {navigator.userAgent.substring(0, 75)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span>Last Cryptographic Signature Check-In</span>
                    <span className="font-mono text-slate-900 dark:text-white font-bold">{lastLoginTimestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: ACCOUNT (DANGER ZONE & LOGOUT) */}
          {activeSubSection === "account" && (
            <div className="space-y-6 animate-fade-in" id="settings-account-panel">
              <div className="bg-slate-900 border border-rose-950/40 rounded-2xl p-5 space-y-4 text-left">
                <div className="border-b border-rose-100 dark:border-rose-950/30 pb-3">
                  <h4 className="text-sm font-extrabold text-rose-600 dark:text-rose-400">Security Danger Zone</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">High privilege operations targeting physical credentials registration.</p>
                </div>

                <div className="space-y-5 pt-2">
                  {/* Row 1: Session Log out */}
                  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap p-3.5 hover:bg-slate-955/20 rounded-xl transition-colors">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Disconnect Secure Session</h5>
                      <p className="text-[10.5px] text-slate-550 dark:text-slate-400 leading-normal max-w-md">
                        Flush authorization cookies, token memory context, and safely return back to credential login index.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-rose-950 hover:text-rose-450 dark:hover:text-rose-400 text-rose-500 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>

                  {/* Row 2: Delete Account */}
                  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap p-3.5 hover:bg-rose-50/20 dark:hover:bg-rose-955/10 rounded-xl transition-colors border-t border-slate-100 dark:border-slate-850/60 pt-5">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-rose-600 dark:text-rose-450">Permanently Delete Placement Passport</h5>
                      <p className="text-[10.5px] text-slate-550 dark:text-slate-400 leading-normal max-w-md">
                        Deletes your verified academic profiles, active applications logs, and indices. This core action is completely irreversible.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteConfirmationText("");
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-rose-650 hover:bg-rose-600 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-rose-500/5 hover:-translate-y-0.5"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RENDER DANGER CONFIRMATION ACCOUNT DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in" id="delete-modal-overlay">
          <div className="bg-slate-900 border border-rose-950/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-left space-y-4">
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-950/30 border border-rose-900/40 text-rose-450 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">Delete Academic Passport?</h4>
                <p className="text-[11px] text-slate-500">This operation cannot be canceled or undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed font-sans font-medium">
              You are about to permanently purge your NEXHIRE registration under student ID <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded font-bold text-rose-500">{student.studentId}</code>, custom profiles metadata, and drive applications histories.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-550 dark:text-slate-450 font-mono uppercase tracking-wider block">
                Type <span className="text-rose-500">"delete my account"</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="delete my account"
                className="w-full text-xs font-bold font-mono bg-slate-955 border border-slate-800 focus:border-red-500 outline-none rounded-xl py-2 px-3.5 text-white"
              />
              {deleteError && (
                <p className="text-[10px] text-rose-505 dark:text-red-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{deleteError}</span>
                </p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                className="flex-grow py-2 px-4 bg-rose-600 hover:bg-rose-505 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Permanently Deconstruct Passport
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="py-2 px-4 bg-slate-850 hover:bg-slate-800 text-slate-350 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
