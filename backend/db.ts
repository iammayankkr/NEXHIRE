import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose, { Schema } from 'mongoose';
import { Student, StudentProfile } from '../src/types';
import { checkBranchEligibility } from '../src/branchUtils';

// Disk-file database path for standard sandbox fallback
const DB_FILE = path.join(process.cwd(), 'students_db.json');
const PROFILES_FILE = path.join(process.cwd(), 'profiles_db.json');
const COMPANIES_FILE = path.join(process.cwd(), 'companies_db.json');
const APPLICATIONS_FILE = path.join(process.cwd(), 'applications_db.json');
const ACTIVITIES_FILE = path.join(process.cwd(), 'activities_db.json');

export interface StudentRecord extends Student {
  passwordHash: string;
}

// ==========================================
// Mongoose MongoDB Schema Description
// ==========================================
const StudentSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  studentId: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  enrollmentYear: { type: Number, required: true },
  gpa: { type: Number, default: 8.85 },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "student", enum: ["student", "admin"] },
  createdAt: { type: Date, default: Date.now }
});

const StudentProfileSchema = new Schema({
  studentId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  branch: { type: String, required: true },
  cgpa: { type: Number, required: true },
  skills: { type: [String], default: [] },
  graduationYear: { type: Number, required: true },
  resumeLink: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  githubUrl: { type: String, default: "" },
  linkedinUrl: { type: String, default: "" },
  semesterCgpas: { type: Map, of: Number, default: {} },
  desiredRole: { type: String, default: "" },
  targetPackage: { type: String, default: "" },
  preferredIndustry: { type: String, default: "" },
  preferredLocation: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CompanySchema = new Schema({
  name: { type: String, required: true },
  logoUrl: { type: String, default: "" },
  jobRole: { type: String, required: true },
  packageLpa: { type: Number, required: true },
  minCgpa: { type: Number, required: true },
  eligibleBranches: { type: [String], default: [] },
  requiredSkills: { type: [String], default: [] },
  applicationDeadline: { type: String, required: true },
  jobDescription: { type: String, required: true },
  openPositions: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ApplicationSchema = new Schema({
  studentId: { type: String, required: true },
  companyId: { type: String, required: true },
  status: { type: String, required: true, default: "Applied", enum: ["Applied", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"] },
  applicationDate: { type: Date, default: Date.now }
});

const ActivitySchema = new Schema({
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Access existing models or register new ones
export const MongoStudent = mongoose.models.Student || mongoose.model('Student', StudentSchema);
export const MongoStudentProfile = mongoose.models.StudentProfile || mongoose.model('StudentProfile', StudentProfileSchema);
export const MongoCompany = mongoose.models.Company || mongoose.model('Company', CompanySchema);
export const MongoApplication = mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
export const MongoActivity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);

export let isMongoConnected = false;
export let mongoErrorMsg: string | null = null;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  console.log(`[Database] Attempting connection to MongoDB Cluster...`);
  mongoose.connect(MONGODB_URI)
    .then(() => {
      isMongoConnected = true;
      mongoErrorMsg = null;
      console.log("🎒 [Database] Connected successfully to MONGODB Database Cluster.");
      // Fire MongoDB automatic data validation & migration seeding asynchronously
      setTimeout(() => {
        if (typeof db !== "undefined" && db) {
          db.seedMongoIfEmpty();
        }
      }, 500);
    })
    .catch((err) => {
      isMongoConnected = false;
      mongoErrorMsg = err.message || "Unknown Connection Error";
      console.error("❌ [Database] MongoDB connection error, falling back to local JSON database:", err.message);
    });
} else {
  console.log("⚠️ [Database] MONGODB_URI is not set. Operating on cloud container fallback: students_db.json files.");
}

export function getDbStatus() {
  return {
    connected: isMongoConnected,
    configured: !!process.env.MONGODB_URI,
    error: mongoErrorMsg,
    type: isMongoConnected ? "MongoDB Atlas Cloud" : "Local Disk Storage Fallback (students_db.json)"
  };
}

// Default Seed Data for the disk-based fallback
const DEFAULT_STUDENTS: StudentRecord[] = [
  {
    id: "stu_1",
    name: "Ashish Jha",
    email: "ashish.jha@university.edu",
    studentId: "STU2026001",
    department: "Computer Science & Engineering",
    enrollmentYear: 2024,
    gpa: 8.85,
    createdAt: new Date().toISOString(),
    passwordHash: bcrypt.hashSync("password123", 10),
  },
  {
    id: "stu_2",
    name: "Sarah Chen",
    email: "schen@university.edu",
    studentId: "STU2026002",
    department: "Data Science & AI",
    enrollmentYear: 2024,
    gpa: 9.10,
    createdAt: new Date().toISOString(),
    passwordHash: bcrypt.hashSync("password123", 10),
  }
];

const DEFAULT_COMPANIES: any[] = [
  {
    id: "comp_google",
    name: "Google",
    logoUrl: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop&crop=faces",
    jobRole: "Software Engineer",
    packageLpa: 45,
    minCgpa: 8.00,
    eligibleBranches: ["Computer Science & Engineering", "Data Science & AI", "Mathematical Physics"],
    requiredSkills: ["Algorithms", "Data Structures", "Go", "Distributed Systems"],
    applicationDeadline: "2026-09-30",
    jobDescription: "Google is seeking Software Engineers to work on challenging problems in areas like distributed systems, machine learning, and scalable backend platforms.",
    openPositions: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "comp_microsoft",
    name: "Microsoft",
    logoUrl: "https://images.unsplash.com/photo-1625014020903-e329f586c990?w=100&h=100&fit=crop&crop=faces",
    jobRole: "Software Developer",
    packageLpa: 42,
    minCgpa: 7.50,
    eligibleBranches: ["Computer Science & Engineering", "Data Science & AI", "Electronic Engineering"],
    requiredSkills: ["OS Dev", "C++", "C#", "Azure Cloud"],
    applicationDeadline: "2026-10-15",
    jobDescription: "Join Microsoft to build innovative software solutions. Focus on core cloud engineering, operating system internals, and developer tools.",
    openPositions: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "comp_amazon",
    name: "Amazon",
    logoUrl: "https://images.unsplash.com/photo-1606761568772-2e11914f110e?w=100&h=100&fit=crop&crop=faces",
    jobRole: "Software Development Engineer (SDE)",
    packageLpa: 38,
    minCgpa: 7.00,
    eligibleBranches: ["Computer Science & Engineering", "Data Science & AI", "Information Technology"],
    requiredSkills: ["Java", "Python", "Data Structures", "Algorithms"],
    applicationDeadline: "2026-11-01",
    jobDescription: "Amazon SDIs and SDEs design and build scalable services that satisfy millions of active customers. Tackle machine learning and distributed systems problems.",
    openPositions: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "comp_adobe",
    name: "Adobe",
    logoUrl: "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=100&h=100&fit=crop&crop=faces",
    jobRole: "Software Engineer (Creative Cloud)",
    packageLpa: 35,
    minCgpa: 8.00,
    eligibleBranches: ["Computer Science & Engineering", "Data Science & AI", "Information Technology"],
    requiredSkills: ["C++", "JavaScript", "UI/UX Principles", "Creative Tools"],
    applicationDeadline: "2026-11-20",
    jobDescription: "Adobe is hiring software engineers to design, build, and optimize the next generation of creative and document solutions on desktop and web.",
    openPositions: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class Database {
  private records: StudentRecord[] = [];
  private profiles: StudentProfile[] = [];
  private companies: any[] = [];
  private applications: any[] = [];
  private activities: any[] = [];

  constructor() {
    this.readLocalDiskCache();
    this.readLocalProfilesCache();
    this.readLocalCompaniesCache();
    this.readLocalApplicationsCache();
    this.readLocalActivitiesCache();

    // Trigger Mongo seeding immediately on boot if already connected
    if (isMongoConnected) {
      this.seedMongoIfEmpty();
    }
  }

  private readLocalActivitiesCache() {
    try {
      if (fs.existsSync(ACTIVITIES_FILE)) {
        const raw = fs.readFileSync(ACTIVITIES_FILE, 'utf8');
        this.activities = JSON.parse(raw);
        console.log(`[Disk Cache] Loaded ${this.activities.length} activities from activities_db.json successfully.`);
      } else {
        const initialActivities: any[] = [];
        
        for (const company of this.companies) {
          const createdAt = company.createdAt || new Date().toISOString();
          
          initialActivities.push({
            id: "act_init_" + Math.random().toString(36).substr(2, 9),
            type: "company_created",
            title: `Company Registered: ${company.name}`,
            description: `Registered corporate recruiter for job role ${company.jobRole}.`,
            timestamp: createdAt
          });

          initialActivities.push({
            id: "act_init_" + Math.random().toString(36).substr(2, 9),
            type: "drive_created",
            title: `Drive Scheduled: ${company.name} – ${company.jobRole}`,
            description: `New recruitment drive programmed with CGPA criteria ${Number(company.minCgpa || 7.5).toFixed(2)}+.`,
            timestamp: createdAt
          });
        }

        for (const app of this.applications) {
          const matchedCompany = this.companies.find(c => c.id === app.companyId);
          const companyName = matchedCompany ? matchedCompany.name : "Recruiter";
          const matchedStudent = this.records.find(r => r.id === app.studentId || r.studentId === app.studentId);
          const studentName = matchedStudent ? matchedStudent.name : "Candidate";
          const appDate = app.applicationDate || new Date().toISOString();

          const isSelection = app.status === "Selected";
          initialActivities.push({
            id: "act_init_" + Math.random().toString(36).substr(2, 9),
            type: isSelection ? "selection_published" : "application_status_changed",
            title: isSelection ? `Selection Published: ${studentName}` : `Status Updated: ${studentName}`,
            description: isSelection 
              ? `Candidate selected for employment by ${companyName} recruitments.`
              : `Candidate status progressed to "${app.status}" for ${companyName} drive.`,
            timestamp: appDate
          });
        }

        for (const student of this.records) {
          if (student.role !== "admin") {
            const createdAt = student.createdAt || new Date().toISOString();
            initialActivities.push({
              id: "act_init_" + Math.random().toString(36).substr(2, 9),
              type: "student_registered",
              title: `Student Registered: ${student.name}`,
              description: `Registered in the portals under B.Tech ID: ${student.studentId}.`,
              timestamp: createdAt
            });
          }
        }

        initialActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        this.activities = initialActivities;
        this.writeLocalActivitiesCache();
        console.log(`[Disk Cache] Initialized new database file for activities with ${this.activities.length} database-driven events.`);
      }
    } catch (e) {
      console.error("[Database Cache] Error reading activities cache, using empty array:", e);
      this.activities = [];
    }
  }

  private writeLocalActivitiesCache() {
    try {
      fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(this.activities, null, 2), 'utf8');
    } catch (e) {
      console.error("[Database Cache] Error saving activities cache to disk:", e);
    }
  }

  public async seedMongoIfEmpty(): Promise<void> {
    if (!isMongoConnected) return;
    try {
      // 1. Seed Students
      const studentCount = await MongoStudent.countDocuments();
      if (studentCount === 0 && this.records.length > 0) {
        console.log(`[Database Seeding] Seeding ${this.records.length} students into MongoDB...`);
        const studentDocs = this.records.map(r => ({
          name: r.name,
          email: r.email.toLowerCase(),
          studentId: r.studentId,
          department: r.department,
          enrollmentYear: r.enrollmentYear,
          gpa: r.gpa || 8.85,
          role: r.role || "student",
          passwordHash: r.passwordHash,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
        }));
        await MongoStudent.insertMany(studentDocs);
        console.log(`[Database Seeding] Standard student seeds successfully synchronized with MongoDB.`);
      }

      // 2. Seed Companies and map companyId
      const companyCount = await MongoCompany.countDocuments();
      const companyMap = new Map<string, string>();

      if (companyCount === 0 && this.companies.length > 0) {
        console.log(`[Database Seeding] Seeding ${this.companies.length} companies into MongoDB...`);
        for (const c of this.companies) {
          const newDoc = new MongoCompany({
            name: c.name,
            logoUrl: c.logoUrl || "",
            jobRole: c.jobRole,
            packageLpa: Number(c.packageLpa),
            minCgpa: Number(c.minCgpa),
            eligibleBranches: c.eligibleBranches || [],
            requiredSkills: c.requiredSkills || [],
            applicationDeadline: c.applicationDeadline,
            jobDescription: c.jobDescription,
            openPositions: Number(c.openPositions || 1),
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
            updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date()
          });
          const saved = await newDoc.save();
          companyMap.set(c.id, saved._id.toString());
        }
        console.log(`[Database Seeding] Standard recruiter profiles seeded into MongoDB.`);
      } else {
        const existingComps = await MongoCompany.find().lean() as any[];
        existingComps.forEach(ec => {
          const match = this.companies.find(c => c.name === ec.name && c.jobRole === ec.jobRole);
          if (match) {
            companyMap.set(match.id, ec._id.toString());
          }
        });
      }

      // 3. Seed Applications
      const appCount = await MongoApplication.countDocuments();
      if (appCount === 0 && this.applications.length > 0) {
        console.log(`[Database Seeding] Seeding ${this.applications.length} applications into MongoDB...`);
        const appDocs = [];
        for (const app of this.applications) {
          let studentIdToUse = app.studentId;
          const matchedStudent = this.records.find(r => r.id === app.studentId || r.studentId === app.studentId);
          if (matchedStudent) {
            const mongoStud = await (MongoStudent as any).findOne({ studentId: matchedStudent.studentId });
            if (mongoStud) {
              studentIdToUse = mongoStud._id.toString();
            }
          }

          const mappedCompanyId = companyMap.get(app.companyId) || app.companyId;

          appDocs.push({
            studentId: studentIdToUse,
            companyId: mappedCompanyId,
            status: app.status || "Applied",
            applicationDate: app.applicationDate ? new Date(app.applicationDate) : new Date()
          });
        }
        if (appDocs.length > 0) {
          await MongoApplication.insertMany(appDocs);
        }
        console.log(`[Database Seeding] Standard application tracking entries populated.`);
      }

      // 4. Seed Activities
      const activityCount = await MongoActivity.countDocuments();
      if (activityCount === 0 && this.activities.length > 0) {
        console.log(`[Database Seeding] Seeding ${this.activities.length} activity occurrences into MongoDB...`);
        const actDocs = this.activities.map(a => ({
          type: a.type,
          title: a.title,
          description: a.description,
          timestamp: a.timestamp ? new Date(a.timestamp) : new Date()
        }));
        await MongoActivity.insertMany(actDocs);
        console.log(`[Database Seeding] Historical events timelines populated.`);
      }

      // 5. Seed Profiles
      const profileCount = await MongoStudentProfile.countDocuments();
      if (profileCount === 0 && this.profiles.length > 0) {
        console.log(`[Database Seeding] Seeding ${this.profiles.length} student placement profiles...`);
        const profDocs = this.profiles.map(p => ({
          studentId: p.studentId.toUpperCase(),
          fullName: p.fullName,
          branch: p.branch,
          cgpa: Number(p.cgpa),
          skills: p.skills || [],
          graduationYear: Number(p.graduationYear),
          resumeLink: p.resumeLink || "",
          phoneNumber: p.phoneNumber || "",
          githubUrl: p.githubUrl || "",
          linkedinUrl: p.linkedinUrl || "",
          semesterCgpas: p.semesterCgpas || {},
          desiredRole: p.desiredRole || "",
          targetPackage: p.targetPackage || "",
          preferredIndustry: p.preferredIndustry || "",
          preferredLocation: p.preferredLocation || "",
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
        }));
        await (MongoStudentProfile as any).insertMany(profDocs);
        console.log(`[Database Seeding] Student profiles successfully configured.`);
      }

    } catch (err: any) {
      console.error("[Database Seeding Exception] Failed to execute mongo preseed migration routine:", err.message);
    }
  }

  public async logActivity(type: string, title: string, description: string): Promise<any> {
    const timestamp = new Date().toISOString();
    const id = "act_" + Math.random().toString(36).substr(2, 9);
    const newAct = { id, type, title, description, timestamp };

    if (isMongoConnected) {
      try {
        const doc = new MongoActivity({
          type,
          title,
          description,
          timestamp: new Date()
        });
        const saved = await doc.save();
        return {
          id: saved._id.toString(),
          type: saved.type,
          title: saved.title,
          description: saved.description,
          timestamp: saved.timestamp.toISOString()
        };
      } catch (err: any) {
        console.error("[MongoDB LogActivity Error] Fallback triggered:", err.message);
      }
    }

    this.activities.unshift(newAct);
    this.writeLocalActivitiesCache();
    return newAct;
  }

  public async findAllActivities(): Promise<any[]> {
    if (isMongoConnected) {
      try {
        const docs = await (MongoActivity as any).find({}).sort({ timestamp: -1 }).lean() as any[];
        return docs.map(doc => ({
          id: doc._id.toString(),
          type: doc.type,
          title: doc.title,
          description: doc.description,
          timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp
        }));
      } catch (err: any) {
        console.error("[MongoDB Activity FindAll Error] Falling back to disk search:", err.message);
      }
    }

    return [...this.activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private readLocalApplicationsCache() {
    try {
      if (fs.existsSync(APPLICATIONS_FILE)) {
        const raw = fs.readFileSync(APPLICATIONS_FILE, 'utf8');
        this.applications = JSON.parse(raw);
        console.log(`[Disk Cache] Loaded ${this.applications.length} applications from applications_db.json successfully.`);
      } else {
        this.applications = [
          {
            id: "app_1",
            studentId: "stu_1",
            companyId: "comp_google",
            status: "Applied",
            applicationDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
          },
          {
            id: "app_2",
            studentId: "stu_1",
            companyId: "comp_microsoft",
            status: "Shortlisted",
            applicationDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
          }
        ];
        this.writeLocalApplicationsCache();
        console.log(`[Disk Cache] Initialized new database file for applications with ${this.applications.length} seeds.`);
      }
    } catch (e) {
      console.error("[Database Cache] Error reading applications cache, using empty array:", e);
      this.applications = [];
    }
  }

  private writeLocalApplicationsCache() {
    try {
      fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(this.applications, null, 2), 'utf8');
    } catch (e) {
      console.error("[Database Cache] Error saving applications cache to disk:", e);
    }
  }

  private readLocalCompaniesCache() {
    try {
      if (fs.existsSync(COMPANIES_FILE)) {
        const raw = fs.readFileSync(COMPANIES_FILE, 'utf8');
        this.companies = JSON.parse(raw);
        console.log(`[Disk Cache] Loaded ${this.companies.length} placement companies from companies_db.json successfully.`);
      } else {
        this.companies = [...DEFAULT_COMPANIES];
        this.writeLocalCompaniesCache();
        console.log(`[Disk Cache] Initialized new database file for placement companies with ${this.companies.length} seeds.`);
      }
    } catch (e) {
      console.error("[Database Cache] Error reading companies cache, using seeds in memory:", e);
      this.companies = [...DEFAULT_COMPANIES];
    }
  }

  private writeLocalCompaniesCache() {
    try {
      fs.writeFileSync(COMPANIES_FILE, JSON.stringify(this.companies, null, 2), 'utf8');
    } catch (e) {
      console.error("[Database Cache] Error saving companies cache to disk:", e);
    }
  }

  private readLocalProfilesCache() {
    try {
      if (fs.existsSync(PROFILES_FILE)) {
        const raw = fs.readFileSync(PROFILES_FILE, 'utf8');
        this.profiles = JSON.parse(raw);
        console.log(`[Disk Cache] Loaded ${this.profiles.length} placement profiles from profiles_db.json successfully.`);
      } else {
        this.profiles = [];
        this.writeLocalProfilesCache();
        console.log(`[Disk Cache] Initialized new database file for placement profiles.`);
      }
    } catch (e) {
      console.error("[Database Cache] Error reading profiles cache, using empty array:", e);
      this.profiles = [];
    }
  }

  private writeLocalProfilesCache() {
    try {
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(this.profiles, null, 2), 'utf8');
    } catch (e) {
      console.error("[Database Cache] Error saving profiles cache to disk:", e);
    }
  }

  private readLocalDiskCache() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.records = JSON.parse(raw);
        console.log(`[Disk Cache] Loaded ${this.records.length} records from students_db.json successfully.`);
      } else {
        this.records = [...DEFAULT_STUDENTS];
        this.writeLocalDiskCache();
        console.log(`[Disk Cache] Initialized new database file with ${this.records.length} seed students.`);
      }
    } catch (e) {
      console.error("[Database Cache] Error reading file, using seeds in memory:", e);
      this.records = [...DEFAULT_STUDENTS];
    }
  }

  private writeLocalDiskCache() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.records, null, 2), 'utf8');
    } catch (e) {
      console.error("[Database Cache] Error saving file:", e);
    }
  }

  // Find a student by unique criteria
  public async findOne(query: { email?: string; studentId?: string; id?: string }): Promise<StudentRecord | null> {
    if (isMongoConnected) {
      try {
        const filter: any = {};
        if (query.email) filter.email = query.email.toLowerCase();
        if (query.studentId) filter.studentId = query.studentId.toUpperCase();
        if (query.id) {
          // If length fits standard MongoDB ObjectId validation, filter by ID
          if (query.id.match(/^[0-9a-fA-F]{24}$/)) {
            filter._id = query.id;
          } else {
            filter.studentId = query.id; // Treat custom formatted IDs as secondary fields
          }
        }

        const doc = await MongoStudent.findOne(filter).lean() as any;
        if (doc) {
          return {
            id: doc._id.toString(),
            name: doc.name as string,
            email: doc.email as string,
            studentId: doc.studentId as string,
            department: doc.department as string,
            enrollmentYear: doc.enrollmentYear as number,
            gpa: doc.gpa as number,
            role: (doc.role as any) || "student",
            createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
            passwordHash: doc.passwordHash as string
          };
        }
        return null;
      } catch (err: any) {
        console.error("[MongoDB Query Error] Falling back to disk database search:", err.message);
      }
    }

    // Disk DB Search Fallback
    const found = this.records.find(r => {
      if (query.email && r.email.toLowerCase() === query.email.toLowerCase()) return true;
      if (query.studentId && r.studentId.toUpperCase() === query.studentId.toUpperCase()) return true;
      if (query.id && r.id === query.id) return true;
      return false;
    });

    return found ? { ...found } : null;
  }

  // Generate next sequential Student ID
  public async generateNextStudentId(enrollmentYear: number): Promise<string> {
    let ids: string[] = [];
    if (isMongoConnected) {
      try {
        const allMongoStudents = await (MongoStudent as any).find({}, { studentId: 1 }).lean() as any[];
        ids = allMongoStudents.map(s => s.studentId || "");
      } catch (err) {
        console.error("Error reading Mongo student IDs, falling back:", err);
        ids = this.records.map(r => r.studentId || "");
      }
    } else {
      ids = this.records.map(r => r.studentId || "");
    }

    const yearStr = String(enrollmentYear);
    const prefix = `STU${yearStr}`; // e.g., STU2026
    
    let maxNum = 0;
    for (const studentId of ids) {
      if (!studentId) continue;
      const upperId = studentId.toUpperCase();
      if (upperId.startsWith(prefix)) {
        const numPart = upperId.substring(prefix.length);
        if (/^\d+$/.test(numPart)) {
          const num = parseInt(numPart, 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    const nextNum = maxNum + 1;
    const nextNumStr = String(nextNum).padStart(3, '0');
    const finalId = `${prefix}${nextNumStr}`;

    // Safeguard duplicate prevention loop
    let finalUniqueParts = nextNum;
    let safeguardId = finalId;
    const allSet = new Set(ids.map(id => id.toUpperCase()));
    while (allSet.has(safeguardId.toUpperCase())) {
      finalUniqueParts++;
      safeguardId = `${prefix}${String(finalUniqueParts).padStart(3, '0')}`;
    }

    return safeguardId;
  }

  // Create a new student (MongoDB writes or Local JSON persistent sync)
  public async create(data: Omit<StudentRecord, 'id' | 'createdAt' | 'gpa'>): Promise<StudentRecord> {
    // Determine target Student ID. Default to AUTO-GENERATED if not specified or specified as custom keyword.
    let activeStudentId = data.studentId ? data.studentId.trim().toUpperCase() : "AUTO-GENERATED";
    
    /* 
       Legacy Student ID support: Preserve all existing student records
       with varying Student ID formats (e.g., STU2024018, BTECH24021, STU24056).
       New Student IDs follow the STRICT format of STUYYYYNNN and are auto-sequenced.
    */
    if (activeStudentId === "AUTO-GENERATED" || activeStudentId === "") {
      activeStudentId = await this.generateNextStudentId(Number(data.enrollmentYear));
      console.log(`[Auto-ID Generation] Assigned unique sequenced ID: ${activeStudentId} for Year: ${data.enrollmentYear}`);
    }

    if (isMongoConnected) {
      try {
        // Query duplicate check in MongoDB
        const existingEmail = await MongoStudent.findOne({ email: data.email.toLowerCase() } as any);
        if (existingEmail) {
          throw new Error("DuplicateError: This email is already registered.");
        }

        const existingId = await MongoStudent.findOne({ studentId: activeStudentId } as any);
        if (existingId) {
          throw new Error("DuplicateError: A student with this Student ID already exists.");
        }

        const newDoc = new MongoStudent({
          name: data.name,
          email: data.email.toLowerCase(),
          studentId: activeStudentId,
          department: data.department,
          enrollmentYear: Number(data.enrollmentYear),
          passwordHash: data.passwordHash,
          role: (data as any).role || "student",
          gpa: 8.85,
          createdAt: new Date()
        });

        const saved = await newDoc.save();

        const savedStudent = {
          id: saved._id.toString(),
          name: saved.name,
          email: saved.email,
          studentId: saved.studentId,
          department: saved.department,
          enrollmentYear: saved.enrollmentYear,
          gpa: saved.gpa,
          role: (saved as any).role || "student",
          createdAt: saved.createdAt.toISOString(),
          passwordHash: saved.passwordHash
        };

        if (savedStudent.role !== "admin") {
          await this.logActivity(
            "student_registered",
            `Student Registered: ${savedStudent.name}`,
            `Registered in the portals under B.Tech ID: ${savedStudent.studentId}.`
          );
        }

        return savedStudent;
      } catch (error: any) {
        if (error.message && error.message.includes("DuplicateError")) {
          throw error;
        }
        console.error("[MongoDB Create Error] Failed, attempting fallback storage:", error.message);
      }
    }

    // Disk DB Creation Fallback
    const existingEmail = await this.findOne({ email: data.email });
    if (existingEmail) {
      throw new Error("DuplicateError: This email is already registered.");
    }

    const existingId = await this.findOne({ studentId: activeStudentId });
    if (existingId) {
      throw new Error("DuplicateError: A student with this Student ID already exists.");
    }

    const newRecord: StudentRecord = {
      ...data,
      studentId: activeStudentId,
      role: (data as any).role || "student",
      id: "stu_" + Math.random().toString(36).substr(2, 9),
      gpa: 8.85, // New student records start at CGPA 8.85
      createdAt: new Date().toISOString()
    };

    this.records.push(newRecord);
    this.writeLocalDiskCache();

    if (newRecord.role !== "admin") {
      await this.logActivity(
        "student_registered",
        `Student Registered: ${newRecord.name}`,
        `Registered in the portals under B.Tech ID: ${newRecord.studentId}.`
      );
    }

    return { ...newRecord };
  }

  // Update a student's password representation in DB
  public async updatePassword(studentId: string, newPasswordHash: string): Promise<boolean> {
    if (isMongoConnected) {
      try {
        const filter = studentId.match(/^[0-9a-fA-F]{24}$/) ? { _id: studentId } : { studentId: studentId };
        const result = await MongoStudent.updateOne(filter, { $set: { passwordHash: newPasswordHash } });
        return result.modifiedCount > 0;
      } catch (err: any) {
        console.error("[MongoDB Update Password Error] Failed, attempting fallback:", err.message);
      }
    }

    const idx = this.records.findIndex(r => r.id === studentId || r.studentId === studentId);
    if (idx !== -1) {
      this.records[idx].passwordHash = newPasswordHash;
      this.writeLocalDiskCache();
      return true;
    }
    return false;
  }

  // ==========================================
  // Placement Profile CRUD Operations
  // ==========================================

  public async findProfile(studentId: string): Promise<StudentProfile | null> {
    const cleanStudentId = studentId.toUpperCase();
    if (isMongoConnected) {
      try {
        const doc = await MongoStudentProfile.findOne({ studentId: cleanStudentId } as any).lean() as any;
        if (doc) {
          return {
            studentId: doc.studentId,
            fullName: doc.fullName,
            branch: doc.branch,
            cgpa: doc.cgpa,
            skills: doc.skills,
            graduationYear: doc.graduationYear,
            resumeLink: doc.resumeLink,
            phoneNumber: doc.phoneNumber,
            githubUrl: doc.githubUrl || "",
            linkedinUrl: doc.linkedinUrl || "",
            semesterCgpas: doc.semesterCgpas ? (doc.semesterCgpas instanceof Map ? Object.fromEntries(doc.semesterCgpas) : doc.semesterCgpas) : {},
            desiredRole: doc.desiredRole || "",
            targetPackage: doc.targetPackage || "",
            preferredIndustry: doc.preferredIndustry || "",
            preferredLocation: doc.preferredLocation || "",
            createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : undefined,
            updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined
          };
        }
        return null;
      } catch (err: any) {
        console.error("[MongoDB Profile Query Error] Falling back to disk database search:", err.message);
      }
    }

    // Disk DB Search Fallback
    const found = this.profiles.find(p => p.studentId.toUpperCase() === cleanStudentId);
    return found ? { ...found } : null;
  }

  public async createProfile(data: StudentProfile): Promise<StudentProfile> {
    const cleanStudentId = data.studentId.toUpperCase();
    if (isMongoConnected) {
      try {
        // Prevent duplicate profiles
        const existing = await MongoStudentProfile.findOne({ studentId: cleanStudentId } as any);
        if (existing) {
          throw new Error("DuplicateError: A placement profile for this student already exists.");
        }

        const newDoc = new MongoStudentProfile({
          studentId: cleanStudentId,
          fullName: data.fullName,
          branch: data.branch,
          cgpa: Number(data.cgpa),
          skills: data.skills,
          graduationYear: Number(data.graduationYear),
          resumeLink: data.resumeLink,
          phoneNumber: data.phoneNumber,
          githubUrl: data.githubUrl || "",
          linkedinUrl: data.linkedinUrl || "",
          semesterCgpas: data.semesterCgpas || {},
          desiredRole: data.desiredRole || "",
          targetPackage: data.targetPackage || "",
          preferredIndustry: data.preferredIndustry || "",
          preferredLocation: data.preferredLocation || "",
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const saved = await newDoc.save();
        return {
          studentId: saved.studentId,
          fullName: saved.fullName,
          branch: saved.branch,
          cgpa: saved.cgpa,
          skills: saved.skills,
          graduationYear: saved.graduationYear,
          resumeLink: saved.resumeLink,
          phoneNumber: saved.phoneNumber,
          githubUrl: saved.githubUrl || "",
          linkedinUrl: saved.linkedinUrl || "",
          semesterCgpas: saved.semesterCgpas ? (saved.semesterCgpas instanceof Map ? Object.fromEntries(saved.semesterCgpas) : saved.semesterCgpas) : {},
          desiredRole: saved.desiredRole || "",
          targetPackage: saved.targetPackage || "",
          preferredIndustry: saved.preferredIndustry || "",
          preferredLocation: saved.preferredLocation || "",
          createdAt: saved.createdAt.toISOString(),
          updatedAt: saved.updatedAt.toISOString()
        };
      } catch (error: any) {
        if (error.message && error.message.includes("DuplicateError")) {
          throw error;
        }
        console.error("[MongoDB Profile Create Error] Failed, attempting fallback storage:", error.message);
      }
    }

    // Disk DB Fallback
    const existingIdx = this.profiles.findIndex(p => p.studentId.toUpperCase() === cleanStudentId);
    if (existingIdx !== -1) {
      throw new Error("DuplicateError: A placement profile for this student already exists.");
    }

    const newProfile: StudentProfile = {
      ...data,
      studentId: cleanStudentId,
      cgpa: Number(data.cgpa),
      graduationYear: Number(data.graduationYear),
      semesterCgpas: data.semesterCgpas || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.profiles.push(newProfile);
    this.writeLocalProfilesCache();
    return { ...newProfile };
  }

  public async updateProfile(studentId: string, data: Partial<StudentProfile>): Promise<{ profile: StudentProfile; diagnostics: any }> {
    const cleanStudentId = studentId.toUpperCase();
    const existing = await this.findProfile(cleanStudentId);
    if (!existing) {
      throw new Error("NotFoundError: Profile not found.");
    }

    const isEmptyValue = (val: any): boolean => {
      if (val === undefined || val === null) return true;
      if (typeof val === 'string') return val.trim() === '';
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === 'object') return Object.keys(val).length === 0;
      return false;
    };

    const PROFILE_KEYS: (keyof StudentProfile)[] = [
      "fullName",
      "branch",
      "cgpa",
      "skills",
      "graduationYear",
      "resumeLink",
      "phoneNumber",
      "githubUrl",
      "linkedinUrl",
      "semesterCgpas",
      "desiredRole",
      "targetPackage",
      "preferredIndustry",
      "preferredLocation"
    ];

    const merged: any = { ...existing };
    const fieldsUpdated: string[] = [];
    const fieldsPreserved: string[] = [];
    const fieldsIntentionallyCleared: string[] = [];

    for (const key of PROFILE_KEYS) {
      const incoming = data[key];
      const current = existing[key];

      if (incoming === undefined) {
        fieldsPreserved.push(key);
        continue;
      }

      const incomingEmpty = isEmptyValue(incoming);
      const currentEmpty = isEmptyValue(current);

      if (incomingEmpty) {
        if (!currentEmpty) {
          // Defensive logging
          console.warn(`[Profile Defensive Audit] CRITICAL: Field '${key}' for student ${cleanStudentId} is being cleared from a populated state to empty!`);
          console.warn(`Previous populated value: ${JSON.stringify(current)} | Incoming value: ${JSON.stringify(incoming)}`);
          
          merged[key] = incoming;
          fieldsIntentionallyCleared.push(key);
        } else {
          merged[key] = incoming;
          fieldsPreserved.push(key);
        }
      } else {
        let isChanged = false;
        if (key === 'skills' && Array.isArray(incoming) && Array.isArray(current)) {
          isChanged = incoming.length !== current.length || !incoming.every((s, i) => s === current[i]);
        } else if (key === 'semesterCgpas' && typeof incoming === 'object' && typeof current === 'object') {
          const incomingKeys = Object.keys(incoming);
          const currentKeys = Object.keys(current);
          isChanged = incomingKeys.length !== currentKeys.length || incomingKeys.some(k => incoming[k] !== current[k]);
        } else {
          isChanged = incoming !== current;
        }

        if (isChanged) {
          merged[key] = incoming;
          fieldsUpdated.push(key);
        } else {
          fieldsPreserved.push(key);
        }
      }
    }

    const diagnostics = {
      fieldsUpdated,
      fieldsPreserved,
      fieldsIntentionallyCleared
    };

    console.log(`[Profile Safe Merge Report - Student ${cleanStudentId}]`);
    console.log(`- Fields Updated: ${fieldsUpdated.join(", ") || "None"}`);
    console.log(`- Fields Preserved: ${fieldsPreserved.join(", ") || "None"}`);
    console.log(`- Fields Intentionally Cleared: ${fieldsIntentionallyCleared.join(", ") || "None"}`);

    if (isMongoConnected) {
      try {
        const updatedDoc = await MongoStudentProfile.findOneAndUpdate(
          { studentId: cleanStudentId } as any,
          {
            $set: {
              ...merged,
              cgpa: merged.cgpa ? Number(merged.cgpa) : undefined,
              graduationYear: merged.graduationYear ? Number(merged.graduationYear) : undefined,
              semesterCgpas: merged.semesterCgpas || {},
              updatedAt: new Date()
            }
          },
          { new: true } as any
        ) as any;

        if (!updatedDoc) {
          throw new Error("NotFoundError: Profile not found.");
        }

        const updatedProfile: StudentProfile = {
          studentId: updatedDoc.studentId,
          fullName: updatedDoc.fullName,
          branch: updatedDoc.branch,
          cgpa: updatedDoc.cgpa,
          skills: updatedDoc.skills,
          graduationYear: updatedDoc.graduationYear,
          resumeLink: updatedDoc.resumeLink,
          phoneNumber: updatedDoc.phoneNumber,
          githubUrl: updatedDoc.githubUrl || "",
          linkedinUrl: updatedDoc.linkedinUrl || "",
          semesterCgpas: updatedDoc.semesterCgpas ? (updatedDoc.semesterCgpas instanceof Map ? Object.fromEntries(updatedDoc.semesterCgpas) : updatedDoc.semesterCgpas) : {},
          desiredRole: updatedDoc.desiredRole || "",
          targetPackage: updatedDoc.targetPackage || "",
          preferredIndustry: updatedDoc.preferredIndustry || "",
          preferredLocation: updatedDoc.preferredLocation || "",
          createdAt: updatedDoc.createdAt?.toISOString(),
          updatedAt: updatedDoc.updatedAt?.toISOString()
        };

        return { profile: updatedProfile, diagnostics };
      } catch (error: any) {
        if (error.message && error.message.includes("NotFoundError")) {
          throw error;
        }
        console.error("[MongoDB Profile Update Error] Failed, attempting fallback storage:", error.message);
      }
    }

    // Disk DB Fallback
    const idx = this.profiles.findIndex(p => p.studentId.toUpperCase() === cleanStudentId);
    if (idx === -1) {
      throw new Error("NotFoundError: Profile not found.");
    }

    const updatedProfile: StudentProfile = {
      ...merged,
      studentId: cleanStudentId,
      cgpa: Number(merged.cgpa),
      graduationYear: Number(merged.graduationYear),
      semesterCgpas: merged.semesterCgpas || {},
      updatedAt: new Date().toISOString()
    };

    this.profiles[idx] = updatedProfile;
    this.writeLocalProfilesCache();
    return { profile: { ...updatedProfile }, diagnostics };
  }

  public async deleteProfile(studentId: string): Promise<boolean> {
    const cleanStudentId = studentId.toUpperCase();
    if (isMongoConnected) {
      try {
        const result = await MongoStudentProfile.deleteOne({ studentId: cleanStudentId } as any);
        if (result.deletedCount === 0) {
          throw new Error("NotFoundError: Profile not found.");
        }
        return true;
      } catch (error: any) {
        if (error.message && error.message.includes("NotFoundError")) {
          throw error;
        }
        console.error("[MongoDB Profile Delete Error] Failed, attempting fallback storage:", error.message);
      }
    }

    // Disk DB Fallback
    const idx = this.profiles.findIndex(p => p.studentId.toUpperCase() === cleanStudentId);
    if (idx === -1) {
      throw new Error("NotFoundError: Profile not found.");
    }

    this.profiles.splice(idx, 1);
    this.writeLocalProfilesCache();
    return true;
  }

  // ==========================================
  // Company CRUD Operations
  // ==========================================

  public async findCompany(id: string): Promise<any | null> {
    if (isMongoConnected) {
      try {
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
          const doc = await (MongoCompany as any).findById(id).lean() as any;
          if (doc) {
            return {
              id: doc._id.toString(),
              name: doc.name,
              logoUrl: doc.logoUrl,
              jobRole: doc.jobRole,
              packageLpa: doc.packageLpa,
              minCgpa: doc.minCgpa,
              eligibleBranches: doc.eligibleBranches,
              requiredSkills: doc.requiredSkills,
              applicationDeadline: doc.applicationDeadline,
              jobDescription: doc.jobDescription,
              openPositions: doc.openPositions,
              createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : undefined,
              updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined
            };
          }
        }
      } catch (err: any) {
        console.error("[MongoDB Company Query Error] Falling back to disk database search:", err.message);
      }
    }

    const found = this.companies.find(c => c.id === id);
    return found ? { ...found } : null;
  }

  public async findAllCompanies(): Promise<any[]> {
    if (isMongoConnected) {
      try {
        const docs = await (MongoCompany as any).find({}).lean() as any[];
        return docs.map(doc => ({
          id: doc._id.toString(),
          name: doc.name,
          logoUrl: doc.logoUrl,
          jobRole: doc.jobRole,
          packageLpa: doc.packageLpa,
          minCgpa: doc.minCgpa,
          eligibleBranches: doc.eligibleBranches,
          requiredSkills: doc.requiredSkills,
          applicationDeadline: doc.applicationDeadline,
          jobDescription: doc.jobDescription,
          openPositions: doc.openPositions,
          createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : undefined,
          updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined
        }));
      } catch (err: any) {
        console.error("[MongoDB Company FindAll Error] Falling back to disk search:", err.message);
      }
    }

    return this.companies.map(c => ({ ...c }));
  }

  public async createCompany(data: any): Promise<any> {
    if (isMongoConnected) {
      try {
        const newDoc = new MongoCompany({
          name: data.name,
          logoUrl: data.logoUrl || "",
          jobRole: data.jobRole,
          packageLpa: Number(data.packageLpa),
          minCgpa: Number(data.minCgpa),
          eligibleBranches: data.eligibleBranches || [],
          requiredSkills: data.requiredSkills || [],
          applicationDeadline: data.applicationDeadline,
          jobDescription: data.jobDescription,
          openPositions: Number(data.openPositions || 1),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const saved = await newDoc.save();
        const savedCompany = {
          id: saved._id.toString(),
          name: saved.name,
          logoUrl: saved.logoUrl,
          jobRole: saved.jobRole,
          packageLpa: saved.packageLpa,
          minCgpa: saved.minCgpa,
          eligibleBranches: saved.eligibleBranches,
          requiredSkills: saved.requiredSkills,
          applicationDeadline: saved.applicationDeadline,
          jobDescription: saved.jobDescription,
          openPositions: saved.openPositions,
          createdAt: saved.createdAt.toISOString(),
          updatedAt: saved.updatedAt.toISOString()
        };

        await this.logActivity(
          "company_created",
          `Company Registered: ${savedCompany.name}`,
          `Registered corporate recruiter for job role ${savedCompany.jobRole}.`
        );

        await this.logActivity(
          "drive_created",
          `Drive Scheduled: ${savedCompany.name} – ${savedCompany.jobRole}`,
          `New recruitment drive programmed with CGPA criteria ${Number(savedCompany.minCgpa || 7.5).toFixed(2)}+.`
        );

        return savedCompany;
      } catch (err: any) {
        console.error("[MongoDB Company Create Error] Failed, attempting fallback storage:", err.message);
      }
    }

    const newComp = {
      ...data,
      id: "comp_" + Math.random().toString(36).substr(2, 9),
      packageLpa: Number(data.packageLpa),
      minCgpa: Number(data.minCgpa),
      openPositions: Number(data.openPositions || 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.companies.push(newComp);
    this.writeLocalCompaniesCache();

    await this.logActivity(
      "company_created",
      `Company Registered: ${newComp.name}`,
      `Registered corporate recruiter for job role ${newComp.jobRole}.`
    );

    await this.logActivity(
      "drive_created",
      `Drive Scheduled: ${newComp.name} – ${newComp.jobRole}`,
      `New recruitment drive programmed with CGPA criteria ${Number(newComp.minCgpa || 7.5).toFixed(2)}+.`
    );

    return newComp;
  }

  public async updateCompany(id: string, data: any): Promise<any> {
    if (isMongoConnected) {
      try {
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
          const updatedDoc = await (MongoCompany as any).findByIdAndUpdate(
            id,
            {
              $set: {
                ...data,
                packageLpa: data.packageLpa !== undefined ? Number(data.packageLpa) : undefined,
                minCgpa: data.minCgpa !== undefined ? Number(data.minCgpa) : undefined,
                openPositions: data.openPositions !== undefined ? Number(data.openPositions) : undefined,
                updatedAt: new Date()
              }
            },
            { new: true } as any
          ) as any;

          if (!updatedDoc) {
            throw new Error("NotFoundError: Company not found.");
          }

          const updatedComp = {
            id: updatedDoc._id.toString(),
            name: updatedDoc.name,
            logoUrl: updatedDoc.logoUrl,
            jobRole: updatedDoc.jobRole,
            packageLpa: updatedDoc.packageLpa,
            minCgpa: updatedDoc.minCgpa,
            eligibleBranches: updatedDoc.eligibleBranches,
            requiredSkills: updatedDoc.requiredSkills,
            applicationDeadline: updatedDoc.applicationDeadline,
            jobDescription: updatedDoc.jobDescription,
            openPositions: updatedDoc.openPositions,
            createdAt: updatedDoc.createdAt?.toISOString(),
            updatedAt: updatedDoc.updatedAt?.toISOString()
          };

          await this.logActivity(
            "company_edited",
            `Drive Updated: ${updatedComp.name}`,
            `Recruitment standards and package specifications refreshed for ${updatedComp.jobRole}.`
          );

          return updatedComp;
        }
      } catch (err: any) {
        if (err.message && err.message.includes("NotFoundError")) {
          throw err;
        }
        console.error("[MongoDB Company Update Error] Failed, attempting fallback storage:", err.message);
      }
    }

    const idx = this.companies.findIndex(c => c.id === id);
    if (idx === -1) {
      throw new Error("NotFoundError: Company not found.");
    }

    const updatedComp = {
      ...this.companies[idx],
      ...data,
      packageLpa: data.packageLpa !== undefined ? Number(data.packageLpa) : this.companies[idx].packageLpa,
      minCgpa: data.minCgpa !== undefined ? Number(data.minCgpa) : this.companies[idx].minCgpa,
      openPositions: data.openPositions !== undefined ? Number(data.openPositions) : this.companies[idx].openPositions,
      updatedAt: new Date().toISOString()
    };

    this.companies[idx] = updatedComp;
    this.writeLocalCompaniesCache();

    await this.logActivity(
      "company_edited",
      `Drive Updated: ${updatedComp.name}`,
      `Recruitment standards and package specifications refreshed for ${updatedComp.jobRole}.`
    );

    return updatedComp;
  }

  public async deleteCompany(id: string): Promise<boolean> {
    console.log(`[Database Delete Log] Initiating deleteCompany sequence for ID: ${id}`);
    
    let deletedFromMongo = false;
    let deletedFromLocal = false;

    // 1. Handle MongoDB Deletion if connected
    if (isMongoConnected) {
      try {
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
          const result = await (MongoCompany as any).deleteOne({ _id: id });
          console.log(`[Database Delete Log] MongoDB deletedCompany count: ${result.deletedCount}`);
          if (result.deletedCount > 0) {
            deletedFromMongo = true;
          }
          
          // Delete associated application records in MongoDB
          const appResult = await (MongoApplication as any).deleteMany({ companyId: id });
          console.log(`[Database Delete Log] MongoDB deletedApplications count: ${appResult.deletedCount}`);
        }
      } catch (err: any) {
        console.error("[Database Delete Log] MongoDB Company Delete Error:", err.message);
      }
    }

    // 2. Handle Local / Fallback Cache Deletion (Both memory and JSON files)
    const idx = this.companies.findIndex(c => c.id === id);
    if (idx !== -1) {
      const removedCompany = this.companies[idx];
      this.companies.splice(idx, 1);
      this.writeLocalCompaniesCache();
      deletedFromLocal = true;
      console.log(`[Database Delete Log] Local cached company deleted: ${removedCompany.name} (id: ${id})`);

      await this.logActivity(
        "company_deleted",
        `Drive Purged: ${removedCompany.name}`,
        `Placement coordinator purged the recruitment pipeline drive for ${removedCompany.jobRole}.`
      );
    } else {
      console.log(`[Database Delete Log] Company ID: ${id} not found in local companies cache array.`);
    }

    // 3. Delete associated applications from local cache
    const initialAppsCount = this.applications.length;
    this.applications = this.applications.filter(a => a.companyId !== id);
    const deletedAppsCount = initialAppsCount - this.applications.length;
    if (deletedAppsCount > 0) {
      this.writeLocalApplicationsCache();
      console.log(`[Database Delete Log] Cleaned up ${deletedAppsCount} associated application records from local cache.`);
    }

    // If it was found nowhere, throw NotFoundError
    if (!deletedFromMongo && !deletedFromLocal) {
      throw new Error(`NotFoundError: Company record not found for ID ${id}.`);
    }

    return true;
  }

  // ==========================================
  // Application Tracking operations
  // ==========================================

  public async createApplication(studentId: string, companyId: string): Promise<any> {
    if (isMongoConnected) {
      try {
        // Prevent duplicates
        const existing = await (MongoApplication as any).findOne({ studentId, companyId }).lean();
        if (existing) {
          throw new Error("DuplicateError: Application already submitted for this placement drive.");
        }

        const newDoc = new MongoApplication({
          studentId,
          companyId,
          status: "Applied",
          applicationDate: new Date()
        });

        const saved = await newDoc.save();
        return {
          id: saved._id.toString(),
          studentId: saved.studentId,
          companyId: saved.companyId,
          status: saved.status,
          applicationDate: saved.applicationDate.toISOString()
        };
      } catch (err: any) {
        if (err.message && err.message.includes("DuplicateError")) {
          throw err;
        }
        console.error("[MongoDB App Create Error] Fallback triggered:", err.message);
      }
    }

    const existingIdx = this.applications.findIndex(a => a.studentId === studentId && a.companyId === companyId);
    if (existingIdx !== -1) {
      throw new Error("DuplicateError: Application already submitted for this placement drive.");
    }

    const newApp = {
      id: "app_" + Math.random().toString(36).substr(2, 9),
      studentId,
      companyId,
      status: "Applied",
      applicationDate: new Date().toISOString()
    };

    this.applications.push(newApp);
    this.writeLocalApplicationsCache();
    return newApp;
  }

  public async findAllApplications(): Promise<any[]> {
    if (isMongoConnected) {
      try {
        const docs = await (MongoApplication as any).find({}).lean() as any[];
        return docs.map(doc => ({
          id: doc._id.toString(),
          studentId: doc.studentId,
          companyId: doc.companyId,
          status: doc.status,
          applicationDate: doc.applicationDate instanceof Date ? doc.applicationDate.toISOString() : doc.applicationDate
        }));
      } catch (err: any) {
        console.error("[MongoDB FindAll Apps Error] Falling back to file:", err.message);
      }
    }

    return this.applications.map(a => ({ ...a }));
  }

  public async findApplicationsByStudent(studentId: string): Promise<any[]> {
    const apps = await this.findAllApplications();
    const studentApps = apps.filter(a => a.studentId === studentId);
    
    // Let's populate the company information! This is brilliant for the student dashboard tracker.
    const resolved = [];
    for (const app of studentApps) {
      const company = await this.findCompany(app.companyId);
      resolved.push({
        ...app,
        companyInfo: company || null
      });
    }
    return resolved;
  }

  public async findApplicationsByCompany(companyId: string): Promise<any[]> {
    const apps = await this.findAllApplications();
    const companyApps = apps.filter(a => a.companyId === companyId);

    // Let's populate the student details (and placement profile details if available)!
    const resolved = [];
    for (const app of companyApps) {
      // Find candidate Student account Info
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
        // Fallback to disk records search
        const foundRec = this.records.find(r => r.id === app.studentId || r.studentId === app.studentId);
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

      // Check if they have built a Placement profile (cgpa, branch, resume link, contact phone)
      let profileInfo = null;
      if (studentInfo) {
        const prof = await this.findProfile(studentInfo.studentId);
        if (prof) {
          profileInfo = prof;
        }
      }

      resolved.push({
        ...app,
        studentInfo,
        profileInfo
      });
    }
    return resolved;
  }

  public async updateApplicationStatus(id: string, status: string): Promise<any> {
    const validStatuses = ["Applied", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];
    if (!validStatuses.includes(status)) {
      throw new Error("ValidationError: Invalid status specified.");
    }

    if (isMongoConnected) {
      try {
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
          const updatedDoc = await (MongoApplication as any).findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true }
          ).lean() as any;

          if (!updatedDoc) {
            throw new Error("NotFoundError: Application not found.");
          }

          const updated = {
            id: updatedDoc._id.toString(),
            studentId: updatedDoc.studentId,
            companyId: updatedDoc.companyId,
            status: updatedDoc.status,
            applicationDate: updatedDoc.applicationDate instanceof Date ? updatedDoc.applicationDate.toISOString() : updatedDoc.applicationDate
          };

          let studentName = "Candidate";
          let companyName = "Recruiter";
          try {
            const student = await (MongoStudent as any).findOne({ $or: [{ _id: updated.studentId }, { studentId: updated.studentId }] }).lean();
            if (student) studentName = student.name;
            const company = await (MongoCompany as any).findById(updated.companyId).lean();
            if (company) companyName = company.name;
          } catch {}

          const isSelection = status === "Selected";
          await this.logActivity(
            isSelection ? "selection_published" : "application_status_changed",
            isSelection ? `Selection Published: ${studentName}` : `Status Updated: ${studentName}`,
            isSelection 
              ? `Candidate selected for employment by ${companyName} recruitments.`
              : `Candidate status progressed to "${status}" for ${companyName} drive.`
          );

          return updated;
        }
      } catch (err: any) {
        if (err.message && (err.message.includes("NotFoundError") || err.message.includes("ValidationError"))) {
          throw err;
        }
        console.error("[MongoDB App Update Error] Fallback triggered:", err.message);
      }
    }

    const idx = this.applications.findIndex(a => a.id === id);
    if (idx === -1) {
      throw new Error("NotFoundError: Application not found.");
    }

    this.applications[idx].status = status;
    this.writeLocalApplicationsCache();
    const updated = { ...this.applications[idx] };

    let studentName = "Candidate";
    let companyName = "Recruiter";
    try {
      const student = this.records.find(r => r.id === updated.studentId || r.studentId === updated.studentId);
      if (student) studentName = student.name;
      const company = this.companies.find(c => c.id === updated.companyId);
      if (company) companyName = company.name;
    } catch {}

    const isSelection = status === "Selected";
    await this.logActivity(
      isSelection ? "selection_published" : "application_status_changed",
      isSelection ? `Selection Published: ${studentName}` : `Status Updated: ${studentName}`,
      isSelection 
        ? `Candidate selected for employment by ${companyName} recruitments.`
        : `Candidate status progressed to "${status}" for ${companyName} drive.`
    );

    return updated;
  }

  // ==========================================
  // Placement Analytics Dashboard queries
  // ==========================================

  public async getStudentEligibilityData(studentId: string): Promise<{ cgpa: number, branch: string }> {
    let cgpa = 8.85;
    let branch = "Other";

    if (isMongoConnected) {
      try {
        const studentDoc = await (MongoStudent as any).findById(studentId).lean() as any;
        if (studentDoc) {
          cgpa = studentDoc.gpa || 8.85;
          branch = studentDoc.department || "Other";
        }
      } catch (e) {}
    } else {
      const studentRec = this.records.find(r => r.id === studentId);
      if (studentRec) {
        cgpa = studentRec.gpa || 8.85;
        branch = studentRec.department || "Other";
      }
    }

    const profile = await this.findProfile(studentId);
    if (profile) {
      cgpa = profile.cgpa;
      branch = profile.branch;
    } else {
      if (isMongoConnected) {
        try {
          const studentDoc = await (MongoStudent as any).findById(studentId).lean() as any;
          if (studentDoc && studentDoc.studentId) {
            const prof = await this.findProfile(studentDoc.studentId);
            if (prof) {
              cgpa = prof.cgpa;
              branch = prof.branch;
            }
          }
        } catch (e) {}
      } else {
        const studentRec = this.records.find(r => r.id === studentId);
        if (studentRec && studentRec.studentId) {
          const prof = await this.findProfile(studentRec.studentId);
          if (prof) {
            cgpa = prof.cgpa;
            branch = prof.branch;
          }
        }
      }
    }

    return { cgpa, branch };
  }

  public async getAdminAnalytics(): Promise<any> {
    let totalStudents = 0;
    let totalCompanies = 0;
    let totalApplications = 0;
    let totalSelectedStudents = 0;

    let applicationsPerCompany: { companyName: string, count: number }[] = [];
    let branchWiseApplications: { branch: string, count: number }[] = [];
    let selectionStatistics: { status: string, count: number }[] = [];
    let companyWiseHiring: { companyName: string, hiredCount: number }[] = [];

    const statusList = ["Applied", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];

    const initialStatusMap: { [key: string]: number } = {};
    statusList.forEach(s => { initialStatusMap[s] = 0; });

    if (isMongoConnected) {
      try {
        totalStudents = await (MongoStudent as any).countDocuments({ role: "student" });
        totalCompanies = await (MongoCompany as any).countDocuments({});
        totalApplications = await (MongoApplication as any).countDocuments({});
        totalSelectedStudents = await (MongoApplication as any).countDocuments({ status: "Selected" });

        // A. MongoDB Aggregation Pipeline for Applications Per Company
        const appCompanyAgg = await (MongoApplication as any).aggregate([
          { $group: { _id: "$companyId", count: { $sum: 1 } } }
        ]);

        // B. MongoDB Aggregation Pipeline for Branch Wise Applications
        const branchWiseAgg = await (MongoApplication as any).aggregate([
          {
            $addFields: {
              studentObjId: {
                $cond: {
                  if: { $regexMatch: { input: "$studentId", regex: /^[0-9a-fA-F]{24}$/ } },
                  then: { $toObjectId: "$studentId" },
                  else: "$studentId"
                }
              }
            }
          },
          {
            $lookup: {
              from: "students",
              localField: "studentObjId",
              foreignField: "_id",
              as: "studentInfo"
            }
          },
          { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ["$studentInfo.department", "General/Other"] },
              count: { $sum: 1 }
            }
          }
        ]);

        // C. MongoDB Aggregation Pipeline for Selection Statistics
        const selectionAgg = await (MongoApplication as any).aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // D. MongoDB Aggregation Pipeline for Company Wise Hiring
        const hiringAgg = await (MongoApplication as any).aggregate([
          { $match: { status: "Selected" } },
          { $group: { _id: "$companyId", count: { $sum: 1 } } }
        ]);

        const companies = await this.findAllCompanies();
        const companyMap = new Map<string, string>();
        companies.forEach(c => { companyMap.set(c.id, c.name); });

        applicationsPerCompany = appCompanyAgg.map((item: any) => ({
          companyName: companyMap.get(item._id) || item._id,
          count: item.count
        }));

        branchWiseApplications = branchWiseAgg.map((item: any) => ({
          branch: item._id,
          count: item.count
        }));

        selectionAgg.forEach((item: any) => {
          if (item._id in initialStatusMap) {
            initialStatusMap[item._id] = item.count;
          }
        });

        companyWiseHiring = companies.map((c: any) => {
          const match = hiringAgg.find((item: any) => item._id === c.id);
          return {
            companyName: c.name,
            hiredCount: match ? match.count : 0
          };
        });

      } catch (err: any) {
        console.error("[MongoDB Aggregation Failure] Falling back to memory tracking calculations:", err.message);
      }
    }

    // Secondary / Fallback in-memory calculations if aggregation above is empty or disabled
    if (applicationsPerCompany.length === 0) {
      const companies = await this.findAllCompanies();
      const apps = await this.findAllApplications();
      const students = isMongoConnected 
        ? await (MongoStudent as any).find({ role: "student" }).lean() as any[]
        : this.records.filter(r => (r.role || "student") === "student");

      totalStudents = students.length;
      totalCompanies = companies.length;
      totalApplications = apps.length;
      totalSelectedStudents = apps.filter(a => a.status === "Selected").length;

      const companyMap = new Map<string, string>();
      companies.forEach(c => { companyMap.set(c.id, c.name); });

      const appCounts: { [key: string]: number } = {};
      const selectCounts: { [key: string]: number } = {};
      const deptCounts: { [key: string]: number } = {};

      const studentDeptMap = new Map<string, string>();
      students.forEach(s => {
        const key = s._id ? s._id.toString() : s.id;
        studentDeptMap.set(key, s.department);
        if (s.studentId) studentDeptMap.set(s.studentId, s.department);
      });

      apps.forEach(app => {
        appCounts[app.companyId] = (appCounts[app.companyId] || 0) + 1;

        if (app.status in initialStatusMap) {
          initialStatusMap[app.status]++;
        }

        const dept = studentDeptMap.get(app.studentId) || "General/Other";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;

        if (app.status === "Selected") {
          selectCounts[app.companyId] = (selectCounts[app.companyId] || 0) + 1;
        }
      });

      applicationsPerCompany = Object.entries(appCounts).map(([cid, count]) => ({
        companyName: companyMap.get(cid) || cid,
        count
      }));

      branchWiseApplications = Object.entries(deptCounts).map(([branch, count]) => ({
        branch,
        count
      }));

      companyWiseHiring = companies.map(c => ({
        companyName: c.name,
        hiredCount: selectCounts[c.id] || 0
      }));
    }

    selectionStatistics = Object.entries(initialStatusMap).map(([status, count]) => ({
      status,
      count
    }));

    const selectionRate = totalApplications > 0 ? parseFloat(((totalSelectedStudents / totalApplications) * 100).toFixed(1)) : 0;

    return {
      totalStudents,
      totalCompanies,
      totalApplications,
      totalSelectedStudents,
      selectionRate,
      applicationsPerCompany,
      branchWiseApplications,
      selectionStatistics,
      companyWiseHiring
    };
  }

  public async getStudentAnalytics(studentId: string): Promise<any> {
    const studentApps = await this.findApplicationsByStudent(studentId);
    const { cgpa, branch } = await this.getStudentEligibilityData(studentId);

    const companies = await this.findAllCompanies();
    let eligibleCompaniesCount = 0;

    // Filter matching eligibility criteria
    companies.forEach(c => {
      const gpaPassed = cgpa >= c.minCgpa;
      const deptPassed = checkBranchEligibility(branch, c.eligibleBranches);
      if (gpaPassed && deptPassed) {
        eligibleCompaniesCount++;
      }
    });

    // Detailed application milestone list with simplified selection tracking counts
    const selectionProgress = {
      Applied: 0,
      Shortlisted: 0,
      "Interview Scheduled": 0,
      Selected: 0,
      Rejected: 0
    };

    studentApps.forEach(app => {
      if (app.status in selectionProgress) {
        selectionProgress[app.status as keyof typeof selectionProgress]++;
      }
    });

    return {
      applicationsSubmitted: studentApps.length,
      eligibleCompanies: eligibleCompaniesCount,
      selectionStatus: selectionProgress,
      applications: studentApps
    };
  }
}

export const db = new Database();
