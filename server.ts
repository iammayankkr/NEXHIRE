import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, StudentRecord, getDbStatus, isMongoConnected, MongoStudent } from "./server/db";
import { Course, StudentDashboardData } from "./src/types";
import { checkBranchEligibility } from "./src/branchUtils";

// Setup environment and server configuration
const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "student-academic-jwt-secure-salt-2026";

// Setup body parsers
app.use(express.json());

// Log incoming API calls
app.use((req, res, next) => {
  console.log(`[API PORTAL] ${req.method} ${req.url}`);
  next();
});

// System Health & DB verification status endpoint
app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    database: getDbStatus()
  });
});

// Helper: Custom types for Authenticated Request
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    studentId: string;
    role?: string;
  };
}

// ==========================================
// Live Dynamic Announcements Board Seed
// ==========================================
export let liveAnnouncements = [
  {
    id: "ann_1",
    title: "TCS Ninja Drive Registration Open",
    date: "2026-06-05",
    content: "The registration window for the TCS Ninja Recruitment Drive is officially open for all final year B.Tech, M.Tech, and MCA candidates. Please fill out your resume profiling sections immediately in the portal. CGPA Cut-off: 6.50.",
    tag: "Drive Alert"
  },
  {
    id: "ann_2",
    title: "Google Interview Schedule Released (SDE Role)",
    date: "2026-06-06",
    content: "Google APAC recruitment team has shared the initial technical interview slot schedules. All shortlisted students have been assigned round-1 interview schedules. Check your student inbox or TPO tracker page for time slots.",
    tag: "Interview Schedule"
  },
  {
    id: "ann_3",
    title: "Infosys Specialist Programmer Shortlist Published",
    date: "2026-06-04",
    content: "Submissions for Infosys HackWithInfy SDE positions have been processed. 24 students from CSE, IT, and DS&AI departments have been shortlisted for final round interview segments. Academic verifications are ongoing.",
    tag: "Shortlist Result"
  },
  {
    id: "ann_4",
    title: "Mandatory Campus Placement Orientation Session",
    date: "2026-06-02",
    content: "The Head of TPO will host a mandatory briefing on standard corporate ethics, resume verifications, and online assessment compliance on June 10 in the Central Seminar Hall. Attendance is strictly compulsory.",
    tag: "Orientation"
  },
  {
    id: "ann_5",
    title: "Interactive Resume Review & Soft Skills Workshop",
    date: "2026-05-28",
    content: "Join our placement mock panel to refine your resume bullet points and participate in group discussions. Group feedback of mock elevator pitches will be led by seasoned corporate trainers.",
    tag: "TPO Workshop"
  }
];

// ==========================================
// JWT Authentication Middleware
// ==========================================
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    res.status(401).json({ message: "Access Denied: No session token provided." });
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { id: string; email: string; studentId: string; role?: string };
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: "Session Expired or Invalid Token. Please login again." });
  }
}

// Middleware: Require Placement Coordinator (Admin)
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Access Denied: Placement Coordinator/Administrator credentials required." });
    return;
  }
  next();
}

// ==========================================
// Student Authentication Routes
// ==========================================

// 1. REGISTER STUDENT
app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { name, email, studentId, department, enrollmentYear, password, role } = req.body;

  // Basic Validation
  if (!name || !email || !studentId || !department || !enrollmentYear || !password) {
    res.status(400).json({ message: "Incomplete request. Please provide all fields." });
    return;
  }

  // Strict Email Format Validation
  const emailStr = (email || "").trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(emailStr)) {
    res.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  /* 
     Backend Validation (Requirement 7):
     Reject manual student ID submission for newly created students.
     Only "AUTO-GENERATED" (case-insensitive) keyword is accepted as valid input.
  */
  if (studentId && studentId.toUpperCase() !== "AUTO-GENERATED") {
    res.status(400).json({ 
      message: "Manual Student ID registration is prohibited. Roll numbers are automatically system-generated." 
    });
    return;
  }

  // Format checks
  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters long." });
    return;
  }

  try {
    // Attempt database creation (db.create does check duplicate email and duplicate studentId)
    const passwordHash = await bcrypt.hash(password, 10);
    const newStudent = await db.create({
      name,
      email,
      studentId: studentId.toUpperCase(),
      department,
      enrollmentYear: Number(enrollmentYear),
      passwordHash,
      role: role || "student"
    } as any);

    // Generate authenticated JWT Token
    const token = jwt.sign(
      { id: newStudent.id, email: newStudent.email, studentId: newStudent.studentId, role: newStudent.role || "student" },
      JWT_SECRET,
      { expiresIn: "6h" }
    );

    // Return student record (without secret hash) and active token
    const { passwordHash: _, ...studentData } = newStudent;
    res.status(201).json({
      message: "Student account created successfully!",
      token,
      student: studentData
    });
  } catch (error: any) {
    console.error("[Register Error]", error);
    if (error.message && error.message.includes("DuplicateError")) {
      res.status(409).json({ message: error.message.replace("DuplicateError: ", "") });
    } else {
      res.status(500).json({ message: "An unexpected error occurred during database enrollment." });
    }
  }
});

// 2. LOGIN STUDENT
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required credentials." });
    return;
  }

  try {
    // Normalizing email parameters
    const emailStr = (email || "").trim().toLowerCase();

    // Query database
    const student = await db.findOne({ email: emailStr });
    if (!student) {
      res.status(401).json({ message: "Invalid email or password. Please verify credentials." });
      return;
    }

    // Verify bcrypt hash matching
    const isMatched = await bcrypt.compare(password, student.passwordHash);
    if (!isMatched) {
      res.status(401).json({ message: "Invalid email or password. Please verify credentials." });
      return;
    }

    // Generate JWT Web Token
    const token = jwt.sign(
      { id: student.id, email: student.email, studentId: student.studentId, role: student.role || "student" },
      JWT_SECRET,
      { expiresIn: "6h" }
    );

    const { passwordHash: _, ...studentData } = student;
    res.status(200).json({
      message: "Welcome back! Login verified.",
      token,
      student: studentData
    });
  } catch (error) {
    console.error("[Login Error]", error);
    res.status(500).json({ message: "An error occurred checking credentials." });
  }
});

// 3. SECURE PROTECTED DASHBOARD
app.get("/api/student/dashboard", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      res.status(400).json({ message: "Malformed token identification." });
      return;
    }

    const studentRecord = await db.findOne({ studentId });
    if (!studentRecord) {
      res.status(404).json({ message: "Student record was not found." });
      return;
    }

    // Exclude security hashes
    const { passwordHash: _, ...student } = studentRecord;

    // Generate Personalized Mock Academic Courses depending on Department
    const academicDepartment = student.department || "Computer Science";
    let courses: Course[] = [];

    if (academicDepartment.toLowerCase().includes("computer") || academicDepartment.toLowerCase().includes("ai") || academicDepartment.toLowerCase().includes("data")) {
      courses = [
        { code: "CS-401", name: "Modern Artificial Intelligence Platforms", credits: 4, grade: "A", semester: "Fall 2025" },
        { code: "CS-352", name: "Distributed Databases & Storage Systems", credits: 3, grade: "A-", semester: "Fall 2025" },
        { code: "CS-310", name: "Algorithms Design & Complexity Analysis", credits: 4, grade: "B+", semester: "Spring 2025" },
        { code: "MAT-221", name: "Discrete Structures & Mathematics", credits: 3, grade: "A", semester: "Spring 2025" },
      ];
    } else {
      courses = [
        { code: "ENG-301", name: "Computational Fluid Mechanics", credits: 4, grade: "A", semester: "Fall 2025" },
        { code: "ENG-312", name: "System Control & Automation Dynamic", credits: 3, grade: "B+", semester: "Fall 2025" },
        { code: "MAT-250", name: "Applied Multivariate Calculus", credits: 4, grade: "A-", semester: "Spring 2025" },
        { code: "PHS-105", name: "Quantum Physics Labs", credits: 3, grade: "A", semester: "Spring 2025" },
      ];
    }

    // Generate Personalized CGPA Progression dynamically based on Student's profile semester records
    // Requirement 4: Remove hardcoded CGPA progression data.
    // Requirement 5: Generate the dashboard graph dynamically using the student's semester CGPA records.
    const profile = await db.findProfile(studentId);
    let gpaProgress: { semester: string; gpa: number }[] = [];

    // Calculate maximum relevant semesters dynamically using Profile's graduationYear or default enrollment year calculation
    const enrollmentYear = student.enrollmentYear || 2024;
    const gradYear = profile?.graduationYear || (enrollmentYear + 4);
    
    const getSemestersCount = (gYear: number): number => {
      if (gYear <= 2026) return 8;
      if (gYear === 2027) return 6;
      if (gYear === 2028) return 4;
      return 2; // For 2029 and onwards
    };

    const semCount = getSemestersCount(gradYear);

    if (profile && profile.semesterCgpas && Object.keys(profile.semesterCgpas).length > 0) {
      for (let s = 1; s <= 8; s++) {
        const storedVal = profile.semesterCgpas[s.toString()];
        const isCompleted = s <= semCount;
        
        if (storedVal !== undefined && storedVal !== null) {
          gpaProgress.push({ semester: `Sem ${s}`, gpa: Number(storedVal) });
        } else if (isCompleted) {
          const profileCgpa = profile ? profile.cgpa : student.gpa;
          gpaProgress.push({ semester: `Sem ${s}`, gpa: profileCgpa });
        }
      }
    } else {
      // Clean fallback if no profile or no semester records yet - use base scale
      const profileCgpa = profile ? profile.cgpa : student.gpa;
      for (let s = 1; s <= semCount; s++) {
        gpaProgress.push({ semester: `Sem ${s}`, gpa: profileCgpa });
      }
    }

    // Shared Campus Portal Announcements
    const announcements = liveAnnouncements;

    const dashboardPayload: StudentDashboardData = {
      student,
      courses,
      gpaProgress,
      announcements
    };

    res.status(200).json(dashboardPayload);
  } catch (error) {
    console.error("[Dashboard Fetch Error]", error);
    res.status(500).json({ message: "An error occurred assembling your academic dashboard." });
  }
});

// ==========================================
// Smart College Placement Profile Secure Routes
// ==========================================

// 1. GET PROFILE FOR LOGGED-IN STUDENT
app.get("/api/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      res.status(400).json({ message: "Malformed session authorization." });
      return;
    }

    const profile = await db.findProfile(studentId);
    if (!profile) {
      res.status(404).json({ message: "No placement profile found for student.", hasProfile: false });
      return;
    }

    res.status(200).json({ profile, hasProfile: true });
  } catch (err: any) {
    console.error("[Get Profile Error]", err);
    res.status(500).json({ message: "An error occurred retrieving your placement profile." });
  }
});

// 2. CREATE PROFILE
app.post("/api/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      res.status(400).json({ message: "Malformed session authorization." });
      return;
    }

    // Strict validation
    const { fullName, branch, cgpa, skills, graduationYear, resumeLink, phoneNumber, githubUrl, linkedinUrl, semesterCgpas, desiredRole, targetPackage, preferredIndustry, preferredLocation } = req.body;

    if (!fullName || !branch || graduationYear === undefined) {
      res.status(400).json({ message: "Incomplete profile: Full Name, Branch, and Graduation Year are required." });
      return;
    }

    let validatedSemesterCgpas: Record<string, number> = {};
    if (semesterCgpas && typeof semesterCgpas === "object") {
      Object.keys(semesterCgpas).forEach(key => {
        const val = Number(semesterCgpas[key]);
        if (!isNaN(val) && val >= 0 && val <= 10) {
          validatedSemesterCgpas[key] = Number(val.toFixed(2));
        }
      });
    }

    // Automatically calculate cumulative CGPA if semesters entered, else use raw input
    let cgpaNum = Number(cgpa);
    const keys = Object.keys(validatedSemesterCgpas);
    if (keys.length > 0) {
      let sum = 0;
      let count = 0;
      keys.forEach(key => {
        sum += validatedSemesterCgpas[key];
        count++;
      });
      cgpaNum = Number((sum / count).toFixed(2));
    } else {
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10.0) {
        res.status(400).json({ message: "Validation Error: CGPA must be a valid number between 0.00 and 10.00." });
        return;
      }
    }

    const gradYearNum = Number(graduationYear);
    if (isNaN(gradYearNum) || gradYearNum < 2000 || gradYearNum > 2100) {
      res.status(400).json({ message: "Validation Error: Graduation Year must be a realistic 4-digit calendar year (e.g., 2026)." });
      return;
    }

    // Prepare skills array
    const skillsArray = Array.isArray(skills) 
      ? skills.map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : [];

    // Check if profile already exists for this student to prevent DuplicateError blockages
    const existingProfile = await db.findProfile(studentId);
    if (existingProfile) {
      console.log(`[Create Profile] Profile already exists for student: ${studentId}. Seamlessly falling back to update logic.`);
      const updatePayload: any = {};
      if (fullName !== undefined) updatePayload.fullName = fullName.trim();
      if (branch !== undefined) updatePayload.branch = branch.trim();
      if (cgpa !== undefined || Object.keys(validatedSemesterCgpas).length > 0) {
        updatePayload.cgpa = cgpaNum;
      }
      if (skills !== undefined) updatePayload.skills = skillsArray;
      if (graduationYear !== undefined) updatePayload.graduationYear = gradYearNum;
      if (resumeLink !== undefined) updatePayload.resumeLink = resumeLink.trim();
      if (phoneNumber !== undefined) updatePayload.phoneNumber = phoneNumber.trim();
      if (githubUrl !== undefined) updatePayload.githubUrl = githubUrl.trim();
      if (linkedinUrl !== undefined) updatePayload.linkedinUrl = linkedinUrl.trim();
      if (semesterCgpas !== undefined) updatePayload.semesterCgpas = validatedSemesterCgpas;
      if (desiredRole !== undefined) updatePayload.desiredRole = desiredRole.trim();
      if (targetPackage !== undefined) updatePayload.targetPackage = targetPackage.trim();
      if (preferredIndustry !== undefined) updatePayload.preferredIndustry = preferredIndustry.trim();
      if (preferredLocation !== undefined) updatePayload.preferredLocation = preferredLocation.trim();

      const { profile: updatedProfile, diagnostics } = await db.updateProfile(studentId, updatePayload);

      res.status(201).json({
        message: "Placement profile updated successfully!",
        profile: updatedProfile,
        diagnostics
      });
      return;
    }

    const newProfile = await db.createProfile({
      studentId,
      fullName: fullName.trim(),
      branch: branch.trim(),
      cgpa: cgpaNum,
      skills: skillsArray,
      graduationYear: gradYearNum,
      resumeLink: (resumeLink || "").trim(),
      phoneNumber: (phoneNumber || "").trim(),
      githubUrl: (githubUrl || "").trim(),
      linkedinUrl: (linkedinUrl || "").trim(),
      semesterCgpas: validatedSemesterCgpas,
      desiredRole: (desiredRole || "").trim(),
      targetPackage: (targetPackage || "").trim(),
      preferredIndustry: (preferredIndustry || "").trim(),
      preferredLocation: (preferredLocation || "").trim()
    });

    res.status(201).json({
      message: "Placement profile created successfully!",
      profile: newProfile
    });
  } catch (error: any) {
    console.error("[Create Profile Error]", error);
    if (error.message && error.message.includes("DuplicateError")) {
      res.status(409).json({ message: "A placement profile already exists for your account. Please edit instead." });
    } else {
      res.status(500).json({ message: "An unexpected error occurred during profile registration." });
    }
  }
});

// 3. UPDATE PROFILE
app.put("/api/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      res.status(400).json({ message: "Malformed session authorization." });
      return;
    }

    const { fullName, branch, cgpa, skills, graduationYear, resumeLink, phoneNumber, githubUrl, linkedinUrl, semesterCgpas, desiredRole, targetPackage, preferredIndustry, preferredLocation } = req.body;

    // Build update payload
    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (branch !== undefined) updateData.branch = branch.trim();
    if (resumeLink !== undefined) updateData.resumeLink = resumeLink.trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber.trim();
    if (githubUrl !== undefined) updateData.githubUrl = githubUrl.trim();
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl.trim();
    if (desiredRole !== undefined) updateData.desiredRole = desiredRole.trim();
    if (targetPackage !== undefined) updateData.targetPackage = targetPackage.trim();
    if (preferredIndustry !== undefined) updateData.preferredIndustry = preferredIndustry.trim();
    if (preferredLocation !== undefined) updateData.preferredLocation = preferredLocation.trim();

    let validatedSemesterCgpas: Record<string, number> = {};
    if (semesterCgpas && typeof semesterCgpas === "object") {
      Object.keys(semesterCgpas).forEach(key => {
        const val = Number(semesterCgpas[key]);
        if (!isNaN(val) && val >= 0 && val <= 10) {
          validatedSemesterCgpas[key] = Number(val.toFixed(2));
        }
      });
      updateData.semesterCgpas = validatedSemesterCgpas;
    }

    // Automatically calculate or recompute cumulative CGPA
    if (semesterCgpas !== undefined && Object.keys(validatedSemesterCgpas).length > 0) {
      let sum = 0;
      let count = 0;
      Object.keys(validatedSemesterCgpas).forEach(key => {
        sum += validatedSemesterCgpas[key];
        count++;
      });
      updateData.cgpa = Number((sum / count).toFixed(2));
    } else if (cgpa !== undefined) {
      const cgpaNum = Number(cgpa);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10.0) {
        res.status(400).json({ message: "Validation Error: CGPA must be a valid number between 0.00 and 10.00." });
        return;
      }
      updateData.cgpa = cgpaNum;
    }

    if (graduationYear !== undefined) {
      const gradYearNum = Number(graduationYear);
      if (isNaN(gradYearNum) || gradYearNum < 2000 || gradYearNum > 2100) {
        res.status(400).json({ message: "Validation Error: Graduation Year must be a realistic 4-digit calendar year (e.g., 2026)." });
        return;
      }
      updateData.graduationYear = gradYearNum;
    }

    if (skills !== undefined) {
      updateData.skills = Array.isArray(skills)
        ? skills.map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : [];
    }

    const { profile: updatedProfile, diagnostics } = await db.updateProfile(studentId, updateData);

    res.status(200).json({
      message: "Placement profile updated successfully!",
      profile: updatedProfile,
      diagnostics
    });
  } catch (error: any) {
    console.error("[Update Profile Error]", error);
    if (error.message && error.message.includes("NotFoundError")) {
      res.status(404).json({ message: "Your placement profile was not found. Please create one first." });
    } else {
      res.status(500).json({ message: "An unexpected error occurred during profile updates." });
    }
  }
});

// 3.5 UPDATE PASSWORD
app.put("/api/profile/password", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      res.status(400).json({ message: "Malformed session authorization." });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Current password and new password are required." });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: "New password must be at least 6 characters in length." });
      return;
    }

    // Retrieve student record to verify old password
    const student = await db.findOne({ studentId });
    if (!student) {
      res.status(404).json({ message: "Student record not found." });
      return;
    }

    // Verify bcrypt hash matching
    const isMatched = await bcrypt.compare(currentPassword, student.passwordHash);
    if (!isMatched) {
      res.status(401).json({ message: "Authentication failed. Current password is incorrect." });
      return;
    }

    // Hash and save new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const success = await db.updatePassword(studentId, newPasswordHash);

    if (success) {
      res.status(200).json({ message: "Password updated successfully!" });
    } else {
      res.status(500).json({ message: "Failed to update password." });
    }
  } catch (error: any) {
    console.error("[Update Password Error]", error);
    res.status(500).json({ message: "An unexpected error occurred during password update." });
  }
});

// 4. DELETE PROFILE
app.delete("/api/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      res.status(400).json({ message: "Malformed session authorization." });
      return;
    }

    await db.deleteProfile(studentId);

    res.status(200).json({
      message: "Your placement profile has been successfully deleted."
    });
  } catch (error: any) {
    console.error("[Delete Profile Error]", error);
    if (error.message && error.message.includes("NotFoundError")) {
      res.status(404).json({ message: "Placement profile already deleted or does not exist." });
    } else {
      res.status(500).json({ message: "An unexpected database error occurred while deleting your profile." });
    }
  }
});

// ==========================================================
// Company Management Module API Endpoints
// ==========================================================

// 1. CREATE A NEW PLACEMENT COMPANY (Admin Protected)
app.post("/api/companies", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    logoUrl,
    jobRole,
    packageLpa,
    minCgpa,
    eligibleBranches,
    requiredSkills,
    applicationDeadline,
    jobDescription,
    openPositions
  } = req.body;

  // Validation
  if (!name || !jobRole || !packageLpa || !minCgpa || !eligibleBranches || !requiredSkills || !applicationDeadline || !jobDescription) {
    res.status(400).json({ message: "Incomplete request. Please provide all mandatory company details." });
    return;
  }

  try {
    const newCompany = await db.createCompany({
      name,
      logoUrl: logoUrl || "",
      jobRole,
      packageLpa: Number(packageLpa),
      minCgpa: Number(minCgpa),
      eligibleBranches,
      requiredSkills,
      applicationDeadline,
      jobDescription,
      openPositions: openPositions ? Number(openPositions) : 1
    });

    res.status(201).json({
      message: "Company profile registered successfully in academic recruiter records.",
      company: newCompany
    });
  } catch (error: any) {
    console.error("[Create Company Error]", error);
    res.status(500).json({ message: "Internal server error occurred creating corporate profile data." });
  }
});

// 2. GET ALL PLACEMENT COMPANIES (Student/Admin - supports query filters)
app.get("/api/companies", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companies = await db.findAllCompanies();
    let filtered = [...companies];

    const { search, minPackage, maxMinCgpa, branch } = req.query;

    // A. Text Search (Name or Job Role)
    if (search) {
      const term = String(search).toLowerCase();
      filtered = filtered.filter(
        c => c.name.toLowerCase().includes(term) || c.jobRole.toLowerCase().includes(term)
      );
    }

    // B. Package Filtering (LPA)
    if (minPackage) {
      filtered = filtered.filter(c => c.packageLpa >= Number(minPackage));
    }

    // C. Maximum CGPA Barrier Filtering (Student filters companies they are eligible for)
    if (maxMinCgpa) {
      filtered = filtered.filter(c => c.minCgpa <= Number(maxMinCgpa));
    }

    // D. Branch Eligibility Filtering
    if (branch) {
      filtered = filtered.filter(c => checkBranchEligibility(String(branch), c.eligibleBranches));
    }

    res.status(200).json(filtered);
  } catch (error) {
    console.error("[Get Companies Error]", error);
    res.status(500).json({ message: "Analytical error assembling corporate records databases." });
  }
});

// 3. GET SINGLE PLACEMENT COMPANY DETAILS BY ID (Student/Admin)
app.get("/api/companies/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const company = await db.findCompany(id);
    if (!company) {
      res.status(404).json({ message: "Placement company record not found." });
      return;
    }

    res.status(200).json(company);
  } catch (error) {
    console.error("[Get Company ID Error]", error);
    res.status(500).json({ message: "Database search failure finding specified company registration." });
  }
});

// 4. UPDATE EXISTING COMPANY DETAILS (Admin Protected)
app.put("/api/companies/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const updated = await db.updateCompany(id, req.body);
    res.status(200).json({
      message: "Recruiter profile updated successfully.",
      company: updated
    });
  } catch (error: any) {
    console.error("[Update Company Error]", error);
    if (error.message && error.message.includes("NotFoundError")) {
      res.status(404).json({ message: "Target company record does not exist." });
    } else {
      res.status(500).json({ message: "Failed updating registration records on the server database repository." });
    }
  }
});

// 5. DELETE RECRUITING COMPANY (Admin Protected)
app.delete("/api/companies/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    await db.deleteCompany(id);
    res.status(200).json({
      message: "Company enrollment successfully terminated and removed from listings."
    });
  } catch (error: any) {
    console.error("[Delete Company Error]", error);
    if (error.message && error.message.includes("NotFoundError")) {
      res.status(404).json({ message: "Target company record does not exist or was already deleted." });
    } else {
      res.status(500).json({ message: "An unexpected server error occurred removing company files." });
    }
  }
});

// ==========================================================
// Application Tracking System API Endpoints
// ==========================================================

// 1. POST /api/applications - Submit an application for a placement company
app.post("/api/applications", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { companyId } = req.body;
  const studentId = req.user?.id;

  console.log("[SERVER POST /api/applications] Incoming request payload parsed:", {
    companyId,
    studentId,
    userPayload: req.user
  });

  if (!companyId) {
    console.warn("[SERVER POST /api/applications] Bad Request: Missing companyId.");
    res.status(400).json({ message: "Incomplete request. Please specify target companyId." });
    return;
  }

  if (!studentId) {
    console.warn("[SERVER POST /api/applications] Unauthorized: Missing student ID from token claims.");
    res.status(401).json({ message: "Unauthorized. Student credentials unrecognized." });
    return;
  }

  try {
    const company = await db.findCompany(companyId);
    if (!company) {
      console.warn("[SERVER POST /api/applications] Not Found: Company ID can't be resolved:", companyId);
      res.status(404).json({ message: "Recruitment drive company files do not exist." });
      return;
    }

    // Validate corporate eligibility criteria
    console.log("[SERVER POST /api/applications] Resolving student academic profile with ID:", studentId);
    const eligibilityData = await db.getStudentEligibilityData(studentId);
    console.log("[SERVER POST /api/applications] Resolved student credentials:", eligibilityData);
    
    const gpaPassed = eligibilityData.cgpa >= company.minCgpa;
    const deptPassed = checkBranchEligibility(eligibilityData.branch, company.eligibleBranches);

    console.log("[SERVER POST /api/applications] Checking parameters against drive targets:", {
      companyName: company.name,
      minRequiredCGPA: company.minCgpa,
      studentCGPA: eligibilityData.cgpa,
      gpaPassed,
      eligibleBranches: company.eligibleBranches,
      studentBranch: eligibilityData.branch,
      deptPassed
    });

    if (!gpaPassed || !deptPassed) {
      console.warn("[SERVER POST /api/applications] Pre-check failed: Academic eligibility mis-alignment.");
      res.status(400).json({
        message: `Eligibility Mismatch: Your profile does not meet the guidelines for ${company.name}. (Requires min ${company.minCgpa.toFixed(2)} CGPA, and matching branch).`
      });
      return;
    }

    console.log("[SERVER POST /api/applications] Persisting application record in database storage...");
    const newApp = await db.createApplication(studentId, companyId);
    console.log("[SERVER POST /api/applications] Application successfully created!:", newApp);

    res.status(201).json({
      message: `Successfully applied to ${company.name} for the ${company.jobRole} role!`,
      application: newApp
    });
  } catch (error: any) {
    console.error("[Post Application Error Exception]", error);
    if (error.message && error.message.includes("DuplicateError")) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "An unexpected database exception occurred submitting applications." });
    }
  }
});

// 2. GET /api/applications - Retrieve general/all applications
app.get("/api/applications", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apps = await db.findAllApplications();
    const populated = [];

    for (const app of apps) {
      const company = await db.findCompany(app.companyId);
      let studentInfo = null;

      if (isMongoConnected) {
        try {
          if (app.studentId.match(/^[0-9a-fA-F]{24}$/)) {
            const doc = await (MongoStudent as any).findById(app.studentId).lean() as any;
            if (doc) {
              studentInfo = {
                id: doc._id.toString(),
                name: doc.name,
                email: doc.email,
                studentId: doc.studentId,
                department: doc.department,
                enrollmentYear: doc.enrollmentYear,
                gpa: doc.gpa,
                role: doc.role
              };
            }
          }
        } catch (e) {}
      }

      if (!studentInfo) {
        const foundRec = (db as any).records.find((r: any) => r.id === app.studentId);
        if (foundRec) {
          studentInfo = {
            id: foundRec.id,
            name: foundRec.name,
            email: foundRec.email,
            studentId: foundRec.studentId,
            department: foundRec.department,
            enrollmentYear: foundRec.enrollmentYear,
            gpa: foundRec.gpa,
            role: foundRec.role
          };
        }
      }

      populated.push({
        ...app,
        companyInfo: company || null,
        studentInfo
      });
    }

    res.status(200).json(populated);
  } catch (error) {
    console.error("[Get All Applications Error]", error);
    res.status(500).json({ message: "An database fault occurred pulling application logs." });
  }
});

// 3. GET /api/applications/student - Retrieve current authed student application tracking records
app.get("/api/applications/student", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user?.id;

  if (!studentId) {
    res.status(401).json({ message: "Unauthorized credentials." });
    return;
  }

  try {
    const apps = await db.findApplicationsByStudent(studentId);
    res.status(200).json(apps);
  } catch (error) {
    console.error("[Get Student Apps Error]", error);
    res.status(500).json({ message: "Academic registry trace error returning candidate logs." });
  }
});

// 4. GET /api/applications/company/:id - View applicants registered for a specific company (Admin)
app.get("/api/applications/company/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const apps = await db.findApplicationsByCompany(id);
    res.status(200).json(apps);
  } catch (error) {
    console.error("[Get Company Applicants Error]", error);
    res.status(500).json({ message: "Coordinate search anomaly occurred returning candidate pool lists." });
  }
});

// 5. PUT /api/applications/:id/status - Update application verification milestone status (Admin)
app.put("/api/applications/:id/status", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ message: "Mandatory body field status is missing." });
    return;
  }

  try {
    const updated = await db.updateApplicationStatus(id, status);
    res.status(200).json({
      message: `Applicant profile status updated to ${status} successfully in the academic tracking rosters.`,
      application: updated
    });
  } catch (error: any) {
    console.error("[Update status error]", error);
    res.status(400).json({ message: error.message || "Credential status change request rejected." });
  }
});

// ==========================================================
// Placement Portal Analytics Endpoints
// ==========================================================

// 1. GET /api/analytics/admin - Retrieve comprehensive admin dashboard statistics
app.get("/api/analytics/admin", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await db.getAdminAnalytics();
    res.status(200).json(stats);
  } catch (err: any) {
    console.error("[Admin Analytics API Error]", err);
    res.status(500).json({ message: "An engine lookup error occurs compiling admin placement analytics data." });
  }
});

// GET /api/activities - Retrieve chronological placement timeline logs
app.get("/api/activities", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await db.findAllActivities();
    res.status(200).json(logs);
  } catch (err: any) {
    console.error("[Activities API Error]", err);
    res.status(500).json({ message: "An engine lookup error occurs compiling placement activities." });
  }
});

// 2. GET /api/analytics/student - Retrieve candidate placement eligibility metrics and track history
app.get("/api/analytics/student", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user?.id;
  if (!studentId) {
    res.status(401).json({ message: "Inaccessible endpoint, unauthorized student token." });
    return;
  }

  try {
    const analytics = await db.getStudentAnalytics(studentId);
    res.status(200).json(analytics);
  } catch (err: any) {
    console.error("[Student Analytics API Error]", err);
    res.status(500).json({ message: "An engine Lookup error occurred compiling student eligibility analytics data." });
  }
});

// ==========================================================
// Placement Coordinator / Admin Custom Management Endpoints
// ==========================================================

// 1. GET ALL STUDENTS AND PROFILES (Admin Protected)
app.get("/api/admin/students", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let students: any[] = [];
    if (isMongoConnected) {
      students = await (MongoStudent as any).find().lean() as any[];
      students = students.map(s => ({
        id: s._id.toString(),
        name: s.name,
        email: s.email,
        studentId: s.studentId,
        department: s.department,
        enrollmentYear: s.enrollmentYear,
        gpa: s.gpa || 8.85,
        role: s.role || "student",
        createdAt: s.createdAt
      }));
    } else {
      students = (db as any).records.map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        studentId: s.studentId,
        department: s.department,
        enrollmentYear: s.enrollmentYear,
        gpa: s.gpa || 8.85,
        role: s.role || "student",
        createdAt: s.createdAt
      }));
    }

    const studentsWithProfiles = [];
    for (const student of students) {
      const profile = await db.findProfile(student.studentId);
      studentsWithProfiles.push({
        ...student,
        profile: profile || null
      });
    }

    res.status(200).json(studentsWithProfiles);
  } catch (error) {
    console.error("[Admin Students Fetch Error]", error);
    res.status(500).json({ message: "Failed compiling university student list." });
  }
});

// 1.5 GET HIGH-FIDELITY EMAIL DIAGNOSTIC REPORT (Admin Protected)
app.get("/api/admin/diagnose-emails", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    let allUsers: any[] = [];
    if (isMongoConnected) {
      allUsers = await (MongoStudent as any).find().lean() as any[];
      allUsers = allUsers.map(s => ({
        id: s._id.toString(),
        name: s.name,
        email: s.email,
        studentId: s.studentId,
        role: s.role || "student"
      }));
    } else {
      allUsers = (db as any).records.map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        studentId: s.studentId,
        role: s.role || "student"
      }));
    }

    const totalUsers = allUsers.length;
    const emailCounts: Record<string, number> = {};
    allUsers.forEach((user: any) => {
      const email = (user.email || "").trim().toLowerCase();
      emailCounts[email] = (emailCounts[email] || 0) + 1;
    });

    let invalidLegacyCount = 0;
    let duplicateEmailsCount = 0;
    let usersWithDuplicateEmails = 0;
    let validEmailsCount = 0;

    const details: any[] = [];

    allUsers.forEach((user: any) => {
      const email = (user.email || "").trim().toLowerCase();
      const isValidFormat = emailRegex.test(email);
      const isDuplicate = emailCounts[email] > 1;

      if (!isValidFormat) {
        invalidLegacyCount++;
      } else {
        if (!isDuplicate) {
          validEmailsCount++;
        }
      }

      if (isDuplicate) {
        usersWithDuplicateEmails++;
      }

      details.push({
        id: user.id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role,
        isValidFormat,
        isDuplicate
      });
    });

    Object.keys(emailCounts).forEach(email => {
      if (emailCounts[email] > 1) {
        duplicateEmailsCount++;
      }
    });

    res.status(200).json({
      totalUsers,
      invalidLegacyCount,
      duplicateEmailsCount,
      usersWithDuplicateEmails,
      validEmailsCount,
      users: details
    });
  } catch (error) {
    console.error("[Email Diagnosis Error]", error);
    res.status(500).json({ message: "Failed compiling database email diagnostic report." });
  }
});

// 2. PUT UPDATE STUDENT RECORD (Admin Protected)
app.put("/api/admin/students/:id", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, department, enrollmentYear, gpa, role } = req.body;

  try {
    let studentToUpdate: any = null;

    if (isMongoConnected) {
      const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { studentId: id };
      studentToUpdate = await MongoStudent.findOne(filter as any);
      if (!studentToUpdate) {
        res.status(404).json({ message: "Student record not found." });
        return;
      }

      // Check if email is updated and validate
      if (email !== undefined) {
        const emailStr = email.trim().toLowerCase();
        const currentEmail = studentToUpdate.email || "";
        if (emailStr !== currentEmail.toLowerCase()) {
          // Format validation
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(emailStr)) {
            res.status(400).json({ message: "Please enter a valid email address." });
            return;
          }

          // Duplicate validation
          const existingEmail = await MongoStudent.findOne({ email: emailStr, _id: { $ne: studentToUpdate._id } } as any);
          if (existingEmail) {
            res.status(409).json({ message: "This email is already registered." });
            return;
          }
        }
      }

      if (name !== undefined) studentToUpdate.name = name;
      if (email !== undefined) studentToUpdate.email = email.trim().toLowerCase();
      if (department !== undefined) studentToUpdate.department = department;
      if (enrollmentYear !== undefined) studentToUpdate.enrollmentYear = Number(enrollmentYear);
      if (gpa !== undefined) studentToUpdate.gpa = Number(gpa);
      if (role !== undefined) studentToUpdate.role = role;

      await studentToUpdate.save();
    } else {
      const index = (db as any).records.findIndex((r: any) => r.id === id || r.studentId === id);
      if (index === -1) {
        res.status(404).json({ message: "Student record not found." });
        return;
      }
      const s = (db as any).records[index];

      // Check if email is updated and validate
      if (email !== undefined) {
        const emailStr = email.trim().toLowerCase();
        const currentEmail = s.email || "";
        if (emailStr !== currentEmail.toLowerCase()) {
          // Format validation
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(emailStr)) {
            res.status(400).json({ message: "Please enter a valid email address." });
            return;
          }

          // Duplicate validation
          const existingEmail = (db as any).records.find((r: any) => 
            r.email.toLowerCase() === emailStr && 
            r.id !== s.id && 
            r.studentId !== s.studentId
          );
          if (existingEmail) {
            res.status(409).json({ message: "This email is already registered." });
            return;
          }
        }
      }

      if (name !== undefined) s.name = name;
      if (email !== undefined) s.email = email.trim().toLowerCase();
      if (department !== undefined) s.department = department;
      if (enrollmentYear !== undefined) s.enrollmentYear = Number(enrollmentYear);
      if (gpa !== undefined) s.gpa = Number(gpa);
      if (role !== undefined) s.role = role;

      (db as any).writeLocalDiskCache();
      studentToUpdate = s;
    }

    // Also sync the Profile model if they changed name, department, or gpa
    const profile = await db.findProfile(studentToUpdate.studentId);
    if (profile) {
      const updateData: any = {};
      if (name !== undefined) updateData.fullName = name;
      if (department !== undefined) updateData.branch = department;
      if (gpa !== undefined) updateData.cgpa = Number(gpa);
      await db.updateProfile(studentToUpdate.studentId, updateData);
    }

    res.status(200).json({
      message: "Student record has been updated successfully in university registers.",
      student: studentToUpdate
    });
  } catch (error) {
    console.error("[Admin Student Edit Error]", error);
    res.status(500).json({ message: "Failed updating student registry records." });
  }
});

// 3. POST ANNOUNCEMENT (Admin Protected)
app.post("/api/announcements", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { title, content, tag } = req.body;
  if (!title || !content || !tag) {
    res.status(400).json({ message: "Please provide a title, content, and category tag for the announcement." });
    return;
  }

  try {
    const newAnnouncement = {
      id: "ann_" + Date.now(),
      title,
      content,
      tag,
      date: new Date().toISOString().split('T')[0]
    };
    liveAnnouncements.unshift(newAnnouncement);
    await db.logActivity(
      "announcement_published",
      `Announcement Published: ${title}`,
      `New broadcast posted: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" under ${tag}.`
    );
    res.status(201).json({
      message: "Announcement posted successfully to campus portals.",
      announcement: newAnnouncement
    });
  } catch (error) {
    console.error("[Post Announcement Error]", error);
    res.status(500).json({ message: "Failed uploading announcement details." });
  }
});

// ==========================================================
// Vite Dev & Production Client Delivery
// ==========================================
async function runServer() {
  if (process.env.NODE_ENV !== "production") {
    // Initialize development mode: Mount Hot Vite dev server middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Vite Engine] Mounted Development middleware server (Active Port: 3000)");
  } else {
    // Serve static files from production compilation bundle
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Production Server] Serving production static files from dist/");
  }

  // Set default fallback router for non-matched routing patterns
  app.use((req, res) => {
    res.status(404).json({ error: "API Route Not Found" });
  });

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Launch Success] Student Auth Server running at http://0.0.0.0:${PORT}`);
    });
  } else {
    console.log("[Vite Engine] Serverless Mode: Vercel detected. Bypassing port listening.");
  }
}

runServer().catch((error) => {
  console.error("[Startup Failure] Express Node cluster crashed:", error);
});

export default app;
