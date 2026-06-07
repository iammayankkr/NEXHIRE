import React, { useState, useEffect } from "react";
import {
  Briefcase,
  FileText,
  Phone,
  Calendar,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  User,
  Award,
  Sparkles,
  BookOpen,
  Send,
  UserPlus,
  Github,
  Linkedin,
  MapPin,
  TrendingUp,
  Building
} from "lucide-react";
import { Student, StudentProfile } from "../types";
import { getCachedValue, setCachedValue, clearCachedValue } from "../apiCache";

interface PlacementProfileProps {
  token: string;
  student: Student;
  onProfileUpdate?: (profile: StudentProfile | null) => void;
}

export default function PlacementProfile({ token, student, onProfileUpdate }: PlacementProfileProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form States
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [resumeLink, setResumeLink] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  // Custom Career Target States
  const [desiredRole, setDesiredRole] = useState("");
  const [targetPackage, setTargetPackage] = useState("");
  const [preferredIndustry, setPreferredIndustry] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  
  // Helper to determine completed semesters count dynamically using Graduation Year
  const getSemestersCount = (gradYearStr: string | number): number => {
    const gradYear = parseInt(gradYearStr.toString());
    if (isNaN(gradYear)) return 4;
    if (gradYear <= 2026) return 8;
    if (gradYear === 2027) return 6;
    if (gradYear === 2028) return 4;
    return 2; // For 2029 and onwards
  };

  // Semester-wise Academic performance states
  // Requirement 7: Show only semesters relevant to the student's academic stage.
  // Requirement 1: Add Semester 1 - 8 fields.
  const [semesterCgpas, setSemesterCgpas] = useState<{ [key: string]: string }>({});

  const activeGradYear = isEditing ? graduationYear : (profile ? profile.graduationYear.toString() : (student.enrollmentYear + 4).toString());
  const completedSemCount = getSemestersCount(activeGradYear);

  // Requirement 3: Automatically calculate cumulative CGPA from semester values
  const handleSemesterCgpaChange = (semNum: number, value: string) => {
    const updated = { ...semesterCgpas, [semNum.toString()]: value };
    setSemesterCgpas(updated);

    let sum = 0;
    let count = 0;
    for (let s = 1; s <= 8; s++) {
      const valStr = updated[s.toString()];
      if (valStr !== undefined && valStr !== null && valStr.trim() !== "") {
        const semVal = parseFloat(valStr);
        if (!isNaN(semVal) && semVal >= 0 && semVal <= 10) {
          sum += semVal;
          count++;
        }
      }
    }

    if (count > 0) {
      setCgpa((sum / count).toFixed(2));
    } else {
      setCgpa("0.00");
    }
  };

  const handleGraduationYearChange = (year: string) => {
    setGraduationYear(year);
    
    const newCompletedSemCount = getSemestersCount(year);
    
    setSemesterCgpas(prev => {
      const updated = { ...prev };
      for (let s = 1; s <= 8; s++) {
        const key = s.toString();
        if (s <= newCompletedSemCount) {
          if (updated[key] === undefined || updated[key] === "") {
            updated[key] = cgpa || student.gpa?.toString() || "8.85";
          }
        }
      }
      
      let sum = 0;
      let count = 0;
      for (let s = 1; s <= 8; s++) {
        const valStr = updated[s.toString()];
        if (valStr !== undefined && valStr !== null && valStr.trim() !== "") {
          const semVal = parseFloat(valStr);
          if (!isNaN(semVal) && semVal >= 0 && semVal <= 10) {
            sum += semVal;
            count++;
          }
        }
      }
      
      if (count > 0) {
        setCgpa((sum / count).toFixed(2));
      }
      return updated;
    });
  };

  // Validation Errors state
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Fetch placement profile data
  const fetchProfile = async (forceRefetch = false) => {
    try {
      setError(null);

      if (!forceRefetch) {
        const cached = getCachedValue("/api/profile");
        if (cached !== null) {
          if (cached.profile) {
            const prof = cached.profile;
            setProfile(prof);
            onProfileUpdate?.(prof);
            populateForm(prof);
          } else {
            setProfile(null);
            onProfileUpdate?.(null);
            setFullName(student.name);
            setBranch(student.department);
            const defaultCgpaStr = student.gpa ? student.gpa.toString() : "8.85";
            setCgpa(defaultCgpaStr);
            const defaultGradYear = (student.enrollmentYear + 4).toString();
            setGraduationYear(defaultGradYear);
            setGithubUrl("");
            setLinkedinUrl("");
            setDesiredRole("");
            setTargetPackage("");
            setPreferredIndustry("");
            setPreferredLocation("");

            // Initialize defaults for relevant semesters based on base GPA
            const initialSemCount = getSemestersCount(defaultGradYear);
            const initialSems: { [key: string]: string } = {};
            for (let s = 1; s <= 8; s++) {
              if (s <= initialSemCount) {
                initialSems[s.toString()] = defaultCgpaStr;
              } else {
                initialSems[s.toString()] = "";
              }
            }
            setSemesterCgpas(initialSems);
          }
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      console.log("[Navigation API Fetch CACHE MISS] Retransmitting request for: /api/profile");
      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        setProfile(null);
        onProfileUpdate?.(null);
        setFullName(student.name);
        setBranch(student.department);
        const defaultCgpaStr = student.gpa ? student.gpa.toString() : "8.85";
        setCgpa(defaultCgpaStr);
        const defaultGradYear = (student.enrollmentYear + 4).toString();
        setGraduationYear(defaultGradYear);
        setGithubUrl("");
        setLinkedinUrl("");
        setDesiredRole("");
        setTargetPackage("");
        setPreferredIndustry("");
        setPreferredLocation("");

        // Initialize defaults for relevant semesters based on base GPA
        const initialSemCount = getSemestersCount(defaultGradYear);
        const initialSems: { [key: string]: string } = {};
        for (let s = 1; s <= 8; s++) {
          if (s <= initialSemCount) {
            initialSems[s.toString()] = defaultCgpaStr;
          } else {
            initialSems[s.toString()] = "";
          }
        }
        setSemesterCgpas(initialSems);
        
        setCachedValue("/api/profile", { profile: null });
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to load placement profile.");
      }

      const data = await response.json();
      if (data && data.profile) {
        const prof = data.profile;
        setProfile(prof);
        onProfileUpdate?.(prof);
        populateForm(prof);
        setCachedValue("/api/profile", data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred checking placement database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token, student]);

  const populateForm = (prof: StudentProfile) => {
    setFullName(prof.fullName);
    setBranch(prof.branch);
    setCgpa(prof.cgpa.toString());
    setGraduationYear(prof.graduationYear.toString());
    setResumeLink(prof.resumeLink);
    setPhoneNumber(prof.phoneNumber);
    setGithubUrl(prof.githubUrl || "");
    setLinkedinUrl(prof.linkedinUrl || "");
    setSkills(prof.skills);
    setDesiredRole(prof.desiredRole || "");
    setTargetPackage(prof.targetPackage || "");
    setPreferredIndustry(prof.preferredIndustry || "");
    setPreferredLocation(prof.preferredLocation || "");

    const formSemCount = getSemestersCount(prof.graduationYear);
    const sems: { [key: string]: string } = {};
    for (let s = 1; s <= 8; s++) {
      const storedVal = prof.semesterCgpas?.[s.toString()];
      if (storedVal !== undefined && storedVal !== null) {
        sems[s.toString()] = storedVal.toString();
      } else {
        if (s <= formSemCount) {
          sems[s.toString()] = prof.cgpa.toString();
        } else {
          sems[s.toString()] = "";
        }
      }
    }
    setSemesterCgpas(sems);
  };

  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newSkill.trim();
    if (!clean) return;
    if (skills.some(s => s.toLowerCase() === clean.toLowerCase())) {
      setNewSkill("");
      return;
    }
    setSkills([...skills, clean]);
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    if (!branch.trim()) errs.branch = "Branch / Department is required.";
    
    const parsedCgpa = parseFloat(cgpa);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10.00) {
      errs.cgpa = "CGPA must be between 0.00 and 10.00.";
    }

    const yearNum = parseInt(graduationYear);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
      errs.graduationYear = "Please enter a valid graduation year.";
    }

    if (phoneNumber && !/^[\d\s()+-]{7,20}$/.test(phoneNumber.trim())) {
      errs.phoneNumber = "Please enter a valid phone number.";
    }

    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

    if (resumeLink && !urlRegex.test(resumeLink.trim())) {
      errs.resumeLink = "Please enter a valid HTTP/HTTPS URL.";
    }

    if (githubUrl && !urlRegex.test(githubUrl.trim())) {
      errs.githubUrl = "Please enter a valid HTTP/HTTPS URL.";
    }

    if (linkedinUrl && !urlRegex.test(linkedinUrl.trim())) {
      errs.linkedinUrl = "Please enter a valid HTTP/HTTPS URL.";
    }

    const completedSemCountNum = getSemestersCount(graduationYear);
    for (let s = 1; s <= 8; s++) {
      const valStr = semesterCgpas[s.toString()];
      const isCompleted = s <= completedSemCountNum;
      if (isCompleted) {
        if (valStr === undefined || valStr === null || valStr.trim() === "") {
          errs[`semester_${s}`] = `Semester ${s} CGPA is required.`;
        } else {
          const sVal = parseFloat(valStr);
          if (isNaN(sVal) || sVal < 0 || sVal > 10.0) {
            errs[`semester_${s}`] = `Semester ${s} CGPA must be between 0.00 and 10.00.`;
          }
        }
      } else {
        if (valStr !== undefined && valStr !== null && valStr.trim() !== "") {
          const sVal = parseFloat(valStr);
          if (isNaN(sVal) || sVal < 0 || sVal > 10.0) {
            errs[`semester_${s}`] = `Semester ${s} CGPA must be between 0.00 and 10.00.`;
          }
        }
      }
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!validateForm()) {
      setFormError("Please fix the validation errors below.");
      return;
    }

    const hasExistingProfile = !!profile;

    // Build the dynamic semester CGPAs payload compiled from entered semesters
    const cleanSemesters: { [key: string]: number } = {};
    for (let s = 1; s <= 8; s++) {
      const key = s.toString();
      const valStr = semesterCgpas[key];
      if (valStr !== undefined && valStr !== null && valStr.trim() !== "") {
        const val = parseFloat(valStr);
        if (!isNaN(val) && val >= 0 && val <= 10) {
          cleanSemesters[key] = Number(val.toFixed(2));
        }
      }
    }

    try {
      const response = await fetch("/api/profile", {
        method: hasExistingProfile ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          branch,
          cgpa: parseFloat(cgpa),
          graduationYear: parseInt(graduationYear),
          resumeLink,
          phoneNumber,
          githubUrl,
          linkedinUrl,
          skills,
          semesterCgpas: cleanSemesters,
          desiredRole,
          targetPackage,
          preferredIndustry,
          preferredLocation
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Failed to save profile.");
      }

      setFormSuccess(hasExistingProfile ? "Your placement profile has been successfully updated." : "Your placement profile has been successfully saved.");
      setProfile(resData.profile);
      onProfileUpdate?.(resData.profile);
      
      // Update cache
      setCachedValue("/api/profile", resData);
      clearCachedValue("/api/student/dashboard");
      clearCachedValue("/api/analytics/student");
      clearCachedValue("/api/analytics/admin");

      setIsEditing(false);
    } catch (err: any) {
      setFormError(err.message || "Something went wrong saving the profile.");
    }
  };

  const handleDeleteProfile = async () => {
    setFormError(null);
    setFormSuccess(null);
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to delete profile.");
      }

      setProfile(null);
      onProfileUpdate?.(null);
      
      // Invalidate target keys cleanly
      clearCachedValue("/api/profile");
      clearCachedValue("/api/student/dashboard");
      clearCachedValue("/api/analytics/student");
      clearCachedValue("/api/analytics/admin");

      setFullName(student.name);
      setBranch(student.department);
      setCgpa(student.gpa ? student.gpa.toString() : "8.85");
      setGraduationYear((student.enrollmentYear + 4).toString());
      setResumeLink("");
      setPhoneNumber("");
      setGithubUrl("");
      setLinkedinUrl("");
      setSkills([]);
      setSemesterCgpas({});
      setFormSuccess("Your placement profile has been permanently deleted.");
      setIsEditing(false);
      setDeleteConfirm(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to delete profile.");
    }
  };

  const calculatePlacementsMetrics = () => {
    if (!profile) return { score: 0, status: "Awaiting Data", levelColor: "text-slate-400 bg-slate-900/50 border-slate-800" };
    
    let baseScore = 34;
    const cgScore = Math.max(0, parseFloat((profile.cgpa * 3).toFixed(1)));
    baseScore += cgScore;

    const skillScore = Math.min(30, profile.skills.length * 6);
    baseScore += skillScore;

    if (profile.resumeLink) baseScore += 10;
    if (profile.phoneNumber) baseScore += 4;
    if (profile.githubUrl) baseScore += 3;
    if (profile.linkedinUrl) baseScore += 3;

    const finalScore = Math.min(100, Math.round(baseScore));
    
    let readiness = "Beginner Portfolio";
    let levelColor = "text-amber-400 bg-amber-950/40 border-amber-900/50";

    if (finalScore >= 88) {
      readiness = "Elite Match Candidate";
      levelColor = "text-emerald-400 bg-emerald-950/40 border-emerald-900/50";
    } else if (finalScore >= 72) {
      readiness = "High Placement Index";
      levelColor = "text-indigo-400 bg-indigo-950/40 border-indigo-900/50";
    } else if (finalScore >= 55) {
      readiness = "Intermediate Pool Focus";
      levelColor = "text-blue-400 bg-blue-950/40 border-blue-900/50";
    }

    return { score: finalScore, status: readiness, levelColor };
  };

  const metrics = calculatePlacementsMetrics();

  if (loading) {
    return (
      <div className="py-12 text-center" id="profile-inner-loader">
        <div className="relative inline-flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-solid border-indigo-650/20 border-t-indigo-600"></div>
          <Briefcase className="w-5 h-5 text-indigo-400 absolute animate-pulse" />
        </div>
        <p className="mt-4 text-xs text-slate-400 font-bold font-mono">Retrieving recruiter indexes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="placement-profile-wrapper">
      
      {/* Visual Header Segment */}
      <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-405 dark:text-indigo-400 shrink-0" />
            <span>Placement Profile</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Build your profile, list your skills, and link your resume to easily match with recruiting partners and drives.</p>
        </div>

        {profile && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsEditing(true);
                populateForm(profile);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-indigo-900/50 bg-indigo-950/40 hover:bg-indigo-900/30 text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              id="profile-edit-trigger"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-rose-550/80 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              id="profile-delete-trigger"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Profile</span>
            </button>
          </div>
        )}
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-slate-800 rounded-2xl flex items-start gap-2 text-rose-700 dark:text-rose-400 text-xs text-left" id="profile-form-error">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-slate-800 rounded-2xl flex items-start gap-2 text-emerald-700 dark:text-emerald-400 text-xs text-left" id="profile-form-success">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Delete confirmation block alert */}
      {deleteConfirm && (
        <div className="p-5 bg-rose-50 dark:bg-rose-955/10 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-3" id="profile-delete-block">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-xs sm:text-sm uppercase tracking-wider font-mono">
            <Trash2 className="w-4.5 h-4.5 text-rose-500" />
            <span>Confirm Profile Deletion</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed font-sans">
            This action cannot be undone. All of your stored profile metrics will be permanently removed from our active database.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={handleDeleteProfile}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Permanently Delete Profile
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* VIEW STATE (Profile Active Card displays) */}
      {profile && !isEditing ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="profile-interactive-view">
          
          {/* Column 1: Match Score Summary Dashboard card */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6" id="metrics-summary-card">
            <div className="space-y-4">
              <span className="text-[10px] font-mono tracking-wider text-slate-500 font-bold uppercase block">Readiness Score</span>
              
              <div className="w-24 h-24 rounded-full border-4 border-solid border-indigo-500/10 flex flex-col items-center justify-center bg-slate-900 mx-auto shadow-sm">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight font-sans">{metrics.score}%</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 leading-none">Readiness</span>
              </div>

              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Placement Status Tier</p>
                <div className={`inline-block border px-3 py-1.5 font-bold text-xs rounded-xl ${metrics.levelColor}`}>
                  {metrics.status}
                </div>
              </div>
            </div>

            <div className="space-y-3.5 border-t border-slate-200 dark:border-slate-850 pt-4 text-xs select-none">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Database Index Status</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-550 dark:bg-emerald-400 animate-pulse inline-block"></span> Verified Link
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Student ID Link</span>
                <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{profile.studentId}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-450">
                <span>Last Synced</span>
                <span className="font-mono text-[10px] text-slate-550 dark:text-slate-500">
                  {profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : "Just Now"}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2 & 3: Detailed Corporate Passport Card */}
          <div className="lg:col-span-2 space-y-6" id="detailed-portfolio">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex gap-3 items-center">
                <span className="p-2.5 bg-indigo-950/40 text-indigo-450 border border-indigo-900/30 rounded-xl shrink-0">
                  <User className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider font-mono">Candidate Name</span>
                  <p className="text-sm font-bold text-slate-200 dark:text-white mt-0.5">{profile.fullName}</p>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex gap-3 items-center">
                <span className="p-2.5 bg-indigo-950/40 text-indigo-405 border border-indigo-900/30 rounded-xl shrink-0">
                  <Award className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider font-mono">Academic Branch</span>
                  <p className="text-sm font-bold text-slate-200 dark:text-white mt-0.5">{profile.branch}</p>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex gap-3 items-center">
                <span className="p-2.5 bg-emerald-950/40 text-emerald-450 border border-emerald-900/30 rounded-xl shrink-0">
                  <Plus className="w-4 h-4 rotate-45" />
                </span>
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider font-mono">Placement CGPA</span>
                  <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">{profile.cgpa.toFixed(2)} / 10.00</p>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex gap-3 items-center">
                <span className="p-2.5 bg-indigo-950/40 text-indigo-405 border border-indigo-900/30 rounded-xl shrink-0">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider font-mono">Graduation Year</span>
                  <p className="text-sm font-semibold tracking-wide text-slate-200 dark:text-white mt-0.5">Class of {profile.graduationYear}</p>
                </div>
              </div>
            </div>

            {/* Profile Contact Details row fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex gap-3 items-center">
                <span className="p-2.5 bg-blue-950/40 text-blue-400 border border-blue-900/30 rounded-xl shrink-0">
                  <Phone className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider font-mono">Communication Phone</span>
                  <p className="text-sm font-semibold text-slate-300 mt-0.5 truncate">{profile.phoneNumber || "No phone linked"}</p>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex gap-3 items-center">
                <span className="p-2.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 rounded-xl shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-grow">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider font-mono">Candidate Resume</span>
                  {profile.resumeLink ? (
                    <a
                      href={profile.resumeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-350 flex items-center gap-1 transition-all mt-0.5"
                    >
                      <span>Show Resume Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium italic mt-0.5">Resume link not mapped</p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Social Links row fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex gap-3 items-center">
                <span className="p-2.5 bg-blue-950/40 text-blue-400 border border-blue-900/30 rounded-xl shrink-0 animate-pulse">
                  <Linkedin className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-grow">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider font-mono">LinkedIn Profile</span>
                  {profile.linkedinUrl ? (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-350 flex items-center gap-1 transition-all mt-0.5"
                    >
                      <span className="truncate inline-block max-w-[200px] font-mono">{profile.linkedinUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium italic mt-0.5">LinkedIn link not mapped</p>
                  )}
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex gap-3 items-center">
                <span className="p-2.5 bg-slate-850 text-slate-300 border border-slate-800 rounded-xl shrink-0 animate-pulse">
                  <Github className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-grow">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider font-mono">GitHub Developer Profile</span>
                  {profile.githubUrl ? (
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-350 flex items-center gap-1 transition-all mt-0.5"
                    >
                      <span className="truncate inline-block max-w-[200px] font-mono">{profile.githubUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium italic mt-0.5">GitHub link not mapped</p>
                  )}
                </div>
              </div>
            </div>

            {/* Career Goals & Target Preferences */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-3xl p-5 space-y-3.5">
              <span className="text-[10px] font-mono tracking-wider text-purple-400 font-bold uppercase block">🎯 Career Goals & Target Preferences</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5 flex gap-2.5 items-center">
                  <span className="p-2 bg-purple-950/40 text-purple-400 border border-purple-900/30 rounded-lg shrink-0">
                    <Briefcase className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider">Desired Role</span>
                    <p className="text-xs font-bold text-slate-205 mt-0.5 truncate">{profile.desiredRole || "Not Configured"}</p>
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5 flex gap-2.5 items-center">
                  <span className="p-2 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-lg shrink-0">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider">Target Package</span>
                    <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5 truncate">{profile.targetPackage || "Not Configured"}</p>
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5 flex gap-2.5 items-center">
                  <span className="p-2 bg-blue-950/40 text-blue-400 border border-blue-900/30 rounded-lg shrink-0">
                    <Building className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider">Pref. Industry</span>
                    <p className="text-xs font-bold text-slate-205 mt-0.5 truncate">{profile.preferredIndustry || "Not Configured"}</p>
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5 flex gap-2.5 items-center">
                  <span className="p-2 bg-pink-950/40 text-pink-400 border border-pink-900/30 rounded-lg shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block tracking-wider">Pref. Location</span>
                    <p className="text-xs font-bold text-slate-205 mt-0.5 truncate">{profile.preferredLocation || "Not Configured"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Set of Verified Technologies Skills */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-3xl p-5 space-y-3.5">
              <span className="text-[10px] font-mono tracking-wider text-indigo-600 dark:text-indigo-405 font-bold uppercase block">Verified Professional Skill Deck</span>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(sk => (
                    <span
                      key={sk}
                      className="text-xs bg-slate-950 border border-slate-850 text-slate-300 px-3 py-1.5 rounded-xl font-bold font-mono tracking-tight flex items-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{sk}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 bg-slate-950/60 border border-transparent rounded-2xl shadow-sm">
                  <p className="text-xs text-slate-400 font-medium font-mono">No professional skills indexed. Add skills to boost matcher indicators.</p>
                </div>
              )}
            </div>

            {/* Academic Semester-wise Breakdown Card */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-wider text-emerald-400 font-bold uppercase block">Semester-wise Academic Records</span>
                <span className="text-[9px] font-mono text-slate-500 font-bold">Completed progression (Sem 1 - Sem {completedSemCount})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => {
                  const val = profile.semesterCgpas?.[s.toString()];
                  const isCompleted = s <= completedSemCount;
                  const hasVal = val !== undefined && val !== null && val !== "";
                  
                  // Only display completed semesters OR optional ones that have been entered
                  if (!isCompleted && !hasVal) return null;
                  
                  return (
                    <div key={s} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center flex flex-col justify-between h-20 shadow-sm hover:border-slate-700 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 block font-mono uppercase tracking-wider">
                          Semester {s}
                        </span>
                        {!isCompleted && (
                          <span className="text-[7.5px] text-indigo-400 font-mono uppercase tracking-widest font-bold">Future</span>
                        )}
                      </div>
                      <span className="text-sm font-black text-white mt-1 leading-none font-mono">
                        {hasVal ? Number(val).toFixed(2) : parseFloat(cgpa).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* CREATE / EDIT FORM STATE */
        <form onSubmit={handleSubmitProfile} className="space-y-6" id="profile-form-state">
          
          {/* Informative Banner card */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-955/20 border border-indigo-150 dark:border-indigo-900/40 rounded-2xl flex gap-3 text-left">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-405 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">Placement Passport Dynamic Sync</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
                {profile 
                  ? "Updating your profile will synchronously adjust your match standing for campus placements."
                  : "Welcome candidate! Direct academic credentials link once profile parameters are instantiated."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Legal Full Name */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 block font-mono uppercase">Candidate Legal Name <span className="text-indigo-405 dark:text-indigo-410">*</span></label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full text-xs sm:text-sm bg-slate-950 border ${validationErrors.fullName ? 'border-amber-500 dark:border-red-500' : 'border-slate-800 focus:border-indigo-500'} rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm outline-none`}
                placeholder="e.g., Sarah Jenkins"
              />
              {validationErrors.fullName && (
                <p className="text-[10px] font-sans font-semibold text-rose-500 dark:text-rose-450">{validationErrors.fullName}</p>
              )}
            </div>

            {/* Academic Branch */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 block font-mono uppercase">Placement Academic Branch <span className="text-indigo-405 dark:text-indigo-410">*</span></label>
              <input
                type="text"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className={`w-full text-xs sm:text-sm bg-slate-955 border ${validationErrors.branch ? 'border-amber-505' : 'border-slate-805 focus:border-indigo-505'} rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm outline-none`}
                placeholder="e.g., Computer Science & Engineering"
              />
              {validationErrors.branch && (
                <p className="text-[10px] font-sans font-semibold text-rose-500 dark:text-rose-455">{validationErrors.branch}</p>
              )}
            </div>

            {/* Semester-wise Academic Records Section */}
            <div className="md:col-span-2 border border-slate-800 bg-slate-900/40 rounded-3xl p-5 space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-100 block font-mono uppercase tracking-wider">Semester-wise GPA Entries <span className="text-indigo-400 font-bold">*</span></label>
                <p className="text-[10.5px] text-slate-400 mt-0.5">Define your CGPA score for completions up to your active stage. Semesters up to {completedSemCount} are required, future semesters are optional. Cumulative CGPA calculates automatically.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => {
                  const isCompleted = s <= completedSemCount;
                  return (
                    <div key={s} className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block font-mono">
                        Semester {s} CGPA {isCompleted ? <span className="text-indigo-405 font-bold">*</span> : <span className="text-slate-405 font-normal lowercase">(Optional)</span>}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.00"
                        max="10.00"
                        required={isCompleted}
                        value={semesterCgpas[s.toString()] || ""}
                        onChange={(e) => handleSemesterCgpaChange(s, e.target.value)}
                        className={`w-full text-xs sm:text-sm bg-slate-950 border ${validationErrors[`semester_${s}`] ? 'border-amber-500 dark:border-red-500' : 'border-slate-850 focus:border-indigo-500'} rounded-xl py-2.5 px-3 font-semibold text-white shadow-sm font-mono outline-none`}
                        placeholder={isCompleted ? "e.g., 9.00" : "Optional"}
                      />
                      {validationErrors[`semester_${s}`] && (
                        <p className="text-[9px] font-sans font-semibold text-rose-500 leading-tight mt-1">{validationErrors[`semester_${s}`]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CGPA Score index */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 block font-mono uppercase">Calculated Cumulative CGPA</label>
              <input
                type="number"
                step="0.01"
                disabled
                value={cgpa}
                className="w-full text-xs sm:text-sm bg-slate-900/60 border border-slate-800/80 rounded-xl py-2.5 px-3.5 font-bold text-emerald-450 font-mono cursor-not-allowed outline-none opacity-90"
                placeholder="Averaged automatically"
              />
              <p className="text-[9.5px] text-indigo-455 font-semibold font-sans block mt-1">✓ Averaged automatically from semesters above</p>
            </div>

            {/* Calendar Graduation year */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 block font-mono uppercase">Graduation Calendar Year <span className="text-indigo-405 dark:text-indigo-410">*</span></label>
              <input
                type="number"
                min="2020"
                max="2100"
                required
                value={graduationYear}
                onChange={(e) => handleGraduationYearChange(e.target.value)}
                className={`w-full text-xs sm:text-sm bg-slate-955 border ${validationErrors.graduationYear ? 'border-amber-505' : 'border-slate-805 focus:border-indigo-505'} rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm font-mono outline-none`}
                placeholder="e.g., 2026"
              />
              {validationErrors.graduationYear && (
                <p className="text-[10px] font-sans font-semibold text-rose-500 dark:text-rose-455">{validationErrors.graduationYear}</p>
              )}
            </div>

            {/* Communications phone */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-455 block font-mono uppercase">Communication Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={`w-full text-xs sm:text-sm bg-slate-955 border ${validationErrors.phoneNumber ? 'border-amber-500' : 'border-slate-805 focus:border-indigo-505'} rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm font-mono outline-none`}
                placeholder="e.g., +91 98765 43210"
              />
              {validationErrors.phoneNumber && (
                <p className="text-[10px] font-sans font-semibold text-rose-500 dark:text-rose-455">{validationErrors.phoneNumber}</p>
              )}
            </div>

            {/* Resume hyperlink */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-455 block font-mono uppercase">Resume URL Address (HTTP/HTTPS URL)</label>
              <input
                type="url"
                value={resumeLink}
                onChange={(e) => setResumeLink(e.target.value)}
                className={`w-full text-xs sm:text-sm bg-slate-955 border ${validationErrors.resumeLink ? 'border-amber-500' : 'border-slate-805 focus:border-indigo-505'} rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm font-mono outline-none`}
                placeholder="e.g., https://myresume-storage.com/pdf"
              />
              {validationErrors.resumeLink && (
                <p className="text-[10px] font-sans font-semibold text-rose-500 dark:text-rose-455">{validationErrors.resumeLink}</p>
              )}
            </div>

            {/* LinkedIn Profile URL */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-455 block font-mono uppercase">LinkedIn Profile URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className={`w-full text-xs sm:text-sm bg-slate-955 border ${validationErrors.linkedinUrl ? 'border-amber-500' : 'border-slate-805 focus:border-indigo-505'} rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm font-mono outline-none`}
                placeholder="e.g., https://linkedin.com/in/username"
              />
              {validationErrors.linkedinUrl && (
                <p className="text-[10px] font-sans font-semibold text-rose-500 dark:text-rose-455">{validationErrors.linkedinUrl}</p>
              )}
            </div>

            {/* GitHub Profile URL */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-455 block font-mono uppercase">GitHub Profile URL</label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className={`w-full text-xs sm:text-sm bg-slate-955 border ${validationErrors.githubUrl ? 'border-amber-500' : 'border-slate-805 focus:border-indigo-505'} rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm font-mono outline-none`}
                placeholder="e.g., https://github.com/username"
              />
              {validationErrors.githubUrl && (
                <p className="text-[10px] font-sans font-semibold text-rose-500 dark:text-rose-455">{validationErrors.githubUrl}</p>
              )}
            </div>
          </div>

          {/* Career Goal & Target Preferences Form Block */}
          <div className="border border-slate-800 bg-slate-900/40 rounded-3xl p-5 space-y-4 text-left">
            <div>
              <label className="text-xs font-bold text-slate-200 dark:text-white block font-mono uppercase tracking-wider">🎯 Career Target Preferences</label>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Specify your target trajectories and packaging thresholds to align your dynamic placement readiness models.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block font-mono uppercase">Desired Role</label>
                <input
                  type="text"
                  value={desiredRole}
                  onChange={(e) => setDesiredRole(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-805 focus:border-indigo-505 rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm outline-none"
                  placeholder="e.g., Full Stack Engineer"
                  id="profile-desired-role-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block font-mono uppercase">Target Package (LPA)</label>
                <input
                  type="text"
                  value={targetPackage}
                  onChange={(e) => setTargetPackage(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-805 focus:border-indigo-505 rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm outline-none"
                  placeholder="e.g., 12 LPA"
                  id="profile-target-package-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block font-mono uppercase">Preferred Industry</label>
                <input
                  type="text"
                  value={preferredIndustry}
                  onChange={(e) => setPreferredIndustry(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-805 focus:border-indigo-505 rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm outline-none"
                  placeholder="e.g., FinTech, SaaS"
                  id="profile-preferred-industry-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block font-mono uppercase">Preferred Location</label>
                <input
                  type="text"
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-955 border border-slate-805 focus:border-indigo-505 rounded-xl py-2.5 px-3.5 font-semibold text-white shadow-sm outline-none"
                  placeholder="e.g., Bengaluru, Remote"
                  id="profile-preferred-location-input"
                />
              </div>
            </div>
          </div>

          {/* Interactive Skills Deck tag builder */}
          <div className="border border-slate-800 bg-slate-900/40 rounded-3xl p-5 space-y-4 text-left">
            <div>
              <label className="text-xs font-bold text-slate-905 dark:text-white block font-mono uppercase tracking-wider">Professional Technical Skills Deck</label>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-450 mt-0.5">Define core technologies, structures, or methodologies to increase recruiter match ratings.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                className="flex-grow text-xs sm:text-sm bg-slate-950 border border-slate-850 rounded-xl py-2 px-3.5 font-semibold text-white focus:border-indigo-500 shadow-sm outline-none"
                placeholder="Add professional skill (e.g., React, Go, TensorFlow, PyTorch)"
              />
              <button
                type="button"
                onClick={() => handleAddSkill()}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Skill</span>
              </button>
            </div>

            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {skills.map(sk => (
                  <span
                    key={sk}
                    className="text-xs bg-slate-950 border border-slate-850 text-slate-300 px-3 py-1 rounded-xl font-bold font-mono tracking-tight flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{sk}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(sk)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove Skill"
                    >
                      <Trash2 className="w-3 h-3 hover:text-rose-500" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-800 rounded-2xl text-center bg-transparent">
                <p className="text-xs text-slate-400 font-medium font-sans italic">Your skill deck is empty. Add professional keywords above.</p>
              </div>
            )}
          </div>

          {/* Form Action Controls buttons */}
          <div className="flex items-center gap-3 pt-4 justify-end">
            {profile && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  populateForm(profile);
                  setValidationErrors({});
                  setFormError(null);
                }}
                className="px-5 py-2.5 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-350 font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
              >
                Discard Changes
              </button>
            )}

            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-500/10 transition-all cursor-pointer"
              id="profile-submit-button"
            >
              {profile ? <Send className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>{profile ? "Save Configurations" : "Instantiate Placement Profile"}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
