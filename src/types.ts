export interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string; // Unique Roll Number or University ID
  department: string;
  enrollmentYear: number;
  gpa: number;
  avatarUrl?: string;
  createdAt: string;
  role?: "student" | "admin";
}

export interface StudentProfile {
  studentId: string;
  fullName: string;
  branch: string;
  cgpa: number;
  skills: string[];
  graduationYear: number;
  resumeLink: string;
  phoneNumber: string;
  githubUrl?: string;
  linkedinUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  semesterCgpas?: { [key: string]: number };
  desiredRole?: string;
  targetPackage?: string;
  preferredIndustry?: string;
  preferredLocation?: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl: string;
  jobRole: string;
  packageLpa: number;
  minCgpa: number;
  eligibleBranches: string[];
  requiredSkills: string[];
  applicationDeadline: string;
  jobDescription: string;
  openPositions: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  code: string;
  name: string;
  credits: number;
  grade: string;
  semester: string;
}

export interface StudentDashboardData {
  student: Student;
  courses: Course[];
  gpaProgress: { semester: string; gpa: number }[];
  announcements: { id: string; title: string; date: string; content: string; tag: string }[];
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  student: Student | null;
  loading: boolean;
  error: string | null;
}
