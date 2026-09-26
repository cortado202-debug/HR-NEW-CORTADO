import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// File path for persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const BRANDING_FILE = path.join(DATA_DIR, 'branding.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load / Save dedicated branding
function loadBranding(): { companyName: string; directorName: string; logoUrl: string; lastUpdated: number } {
  try {
    let logoFromTxt = '';
    const txtPath = path.join(DATA_DIR, 'company_logo.txt');
    if (fs.existsSync(txtPath)) {
      logoFromTxt = fs.readFileSync(txtPath, 'utf-8').trim();
    }

    if (fs.existsSync(BRANDING_FILE)) {
      const raw = fs.readFileSync(BRANDING_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const finalLogo = (parsed.logoUrl && String(parsed.logoUrl).trim() !== '') ? parsed.logoUrl : logoFromTxt;
        return {
          companyName: parsed.companyName || 'شركة كورتادو كافيه',
          directorName: parsed.directorName || 'الإدارة العامة',
          logoUrl: finalLogo || '',
          lastUpdated: parsed.lastUpdated || Date.now(),
        };
      }
    } else if (logoFromTxt) {
      return {
        companyName: 'شركة كورتادو كافيه',
        directorName: 'الإدارة العامة',
        logoUrl: logoFromTxt,
        lastUpdated: Date.now(),
      };
    }
  } catch (err) {
    console.error('Error loading branding file:', err);
  }
  return {
    companyName: 'شركة كورتادو كافيه',
    directorName: 'الإدارة العامة',
    logoUrl: '',
    lastUpdated: Date.now(),
  };
}

function saveBranding(branding: { companyName?: string; directorName?: string; logoUrl?: string; lastUpdated?: number; forceReset?: boolean }) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = loadBranding();
    let nextLogoUrl = current.logoUrl;
    if (branding.forceReset) {
      nextLogoUrl = '';
      try {
        const txtPath = path.join(DATA_DIR, 'company_logo.txt');
        if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
      } catch {}
    } else if (branding.logoUrl !== undefined && branding.logoUrl.trim() !== '') {
      nextLogoUrl = branding.logoUrl.trim();
    }

    const updated = {
      companyName: (branding.companyName && branding.companyName.trim() !== '') ? branding.companyName.trim() : current.companyName,
      directorName: (branding.directorName && branding.directorName.trim() !== '') ? branding.directorName.trim() : current.directorName,
      logoUrl: nextLogoUrl,
      lastUpdated: branding.lastUpdated || Date.now(),
    };
    fs.writeFileSync(BRANDING_FILE, JSON.stringify(updated, null, 2), 'utf-8');

    if (nextLogoUrl) {
      try {
        fs.writeFileSync(path.join(DATA_DIR, 'company_logo.txt'), nextLogoUrl, 'utf-8');
      } catch {}
    }

    return updated;
  } catch (err) {
    console.error('Error saving branding file:', err);
    return branding;
  }
}

// Initial RBAC Accounts
const DEFAULT_ACCOUNTS = [
  {
    id: 'user-admin',
    username: 'admin',
    password: '123',
    pin: '1234',
    displayName: 'المدير العام',
    role: 'admin',
    active: true,
    createdAt: Date.now(),
  },
  {
    id: 'user-supervisor',
    username: 'supervisor',
    password: '123',
    pin: '5678',
    displayName: 'المشرف الميداني',
    role: 'supervisor',
    active: true,
    createdAt: Date.now(),
  },
  {
    id: 'user-khalid',
    username: 'khalid',
    password: 'secretkhalid',
    displayName: 'خالد النجار',
    role: 'employee',
    employeeId: 'emp-1790257743651-6dsg',
    pin: '1234',
    active: true,
  },
  {
    id: 'user-emp-1',
    username: '0944123456',
    password: '123',
    pin: '1234',
    displayName: 'محمد خالد الحلبي',
    role: 'employee',
    employeeId: 'emp-1',
    active: true,
  },
  {
    id: 'user-emp-2',
    username: '0933789012',
    password: '123',
    pin: '1234',
    displayName: 'سامر أحمد النجار',
    role: 'employee',
    employeeId: 'emp-2',
    active: true,
  },
  {
    id: 'user-emp-3',
    username: '0955432109',
    password: '123',
    pin: '1234',
    displayName: 'عمر ياسين الكردي',
    role: 'employee',
    employeeId: 'emp-3',
    active: true,
  },
  {
    id: 'user-emp-4',
    username: '0988654321',
    password: '123',
    pin: '1234',
    displayName: 'ريم طارق الشامي',
    role: 'employee',
    employeeId: 'emp-4',
    active: true,
  },
  {
    id: 'user-emp-5',
    username: '0966543210',
    password: '123',
    pin: '1234',
    displayName: 'باسل محمود إدريس',
    role: 'employee',
    employeeId: 'emp-5',
    active: true,
  },
  {
    id: 'user-emp-6',
    username: '0999876543',
    password: '123',
    pin: '1234',
    displayName: 'طارق عبد الله مراد',
    role: 'employee',
    employeeId: 'emp-6',
    active: true,
  },
  {
    id: 'user-emp-1790253674477',
    username: 'ali',
    password: 'mysecretpass',
    pin: '1234',
    displayName: 'علي حسن',
    role: 'employee',
    employeeId: 'emp-1790253674477',
    active: true,
  },
  {
    id: 'user-emp-1790253970610',
    username: 'samer',
    password: 'custompassword123',
    pin: '7788',
    displayName: 'سامر العلي',
    role: 'employee',
    employeeId: 'emp-1790253970610',
    active: true,
  },
  {
    id: 'user-emp-1790256834588',
    username: 'tareq',
    password: 'pass123',
    pin: '9999',
    displayName: 'طارق كنعان',
    role: 'employee',
    employeeId: 'emp-1790256834588',
    active: true,
  },
  {
    id: 'user-emp-1790257732859',
    username: 'mahmoud',
    password: 'password999',
    pin: '1234',
    displayName: 'محمود الأحمد',
    role: 'employee',
    employeeId: 'emp-1790257732859',
    active: true,
  },
];

// String & Digit Normalization for resilient login & matching
function cleanUnicode(str?: string | null): string {
  if (!str) return '';
  return String(str)
    // Strip invisible characters, direction formatting, zero-width chars (common in WhatsApp/SMS pastes)
    .replace(/[\u200B-\u200F\uFEFF\u00A0\u202A-\u202E\u2060-\u206F]/g, ' ')
    .trim();
}

function toAscii(str?: string | null): string {
  if (!str) return '';
  return cleanUnicode(str)
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .trim();
}

function verifyPasswordMatch(validCandidatePasswords: (string | undefined | null)[], inputPassword: string): boolean {
  if (!inputPassword) return false;
  const cleanInput = cleanUnicode(inputPassword).trim();
  const asciiInput = toAscii(cleanInput).trim();
  const lowerInput = cleanInput.toLowerCase();
  const lowerAsciiInput = asciiInput.toLowerCase();

  for (const rawCandidate of validCandidatePasswords) {
    if (!rawCandidate) continue;
    const cand = cleanUnicode(String(rawCandidate)).trim();
    if (!cand) continue;
    const asciiCand = toAscii(cand).trim();
    const lowerCand = cand.toLowerCase();
    const lowerAsciiCand = asciiCand.toLowerCase();

    // 1. Direct match
    if (cand === cleanInput) return true;
    // 2. ASCII digits match
    if (asciiCand === asciiInput) return true;
    // 3. Case-insensitive
    if (lowerCand === lowerInput) return true;
    // 4. Case-insensitive + ASCII digits
    if (lowerAsciiCand === lowerAsciiInput) return true;
  }
  return false;
}

function normalizeText(str?: string | null): string {
  if (!str) return '';
  return toAscii(str)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ك/g, 'ك')
    .replace(/ک/g, 'ك')
    .replace(/ی/g, 'ي')
    .replace(/ہ/g, 'ه')
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(str?: string | null): string {
  if (!str) return '';
  let digits = toAscii(str).replace(/\D/g, '');
  if (digits.startsWith('00963')) digits = digits.slice(5);
  else if (digits.startsWith('963')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

function isPhoneMatch(candidatePhone?: string | null, inputPhone?: string | null): boolean {
  if (!candidatePhone || !inputPhone) return false;
  const c = normalizePhone(candidatePhone);
  const i = normalizePhone(inputPhone);
  if (!c || !i) return false;
  if (c === i) return true;
  if (c.length >= 7 && i.length >= 7 && (c.endsWith(i) || i.endsWith(c))) return true;
  return false;
}

function isNameMatch(candidateName?: string | null, inputName?: string | null): boolean {
  if (!candidateName || !inputName) return false;
  const normCand = normalizeText(candidateName);
  const normInp = normalizeText(inputName);
  if (!normCand || !normInp) return false;
  if (normCand === normInp) return true;

  const candWords = normCand.split(/\s+/).filter((w) => w.length >= 2);
  const inpWords = normInp.split(/\s+/).filter((w) => w.length >= 2);

  if (candWords.length > 0 && inpWords.length > 0) {
    if (inpWords.length > 1) {
      // Multi-word input: ALL input words must match words in candidate
      const allInpInCand = inpWords.every((iw) =>
        candWords.some((cw) => cw === iw || cw.startsWith(iw))
      );
      if (allInpInCand) return true;
      return false;
    }

    // Single word: must strictly match one of the candidate name words
    const singleInp = inpWords[0];
    return candWords.some((cw) => cw === singleInp);
  }
  return false;
}

function scoreEmployeeMatch(emp: any, rawUser: string): number {
  if (!emp || emp.active === false) return 0;
  const lowerUser = rawUser.toLowerCase().trim();
  const normUser = normalizeText(rawUser);

  const eUsername = String(emp.username || '').trim();
  const eName = String(emp.name || '').trim();
  const ePhone = String(emp.phone || '').trim();
  const eId = String(emp.id || '').trim();

  // 1. Exact username
  if (eUsername && eUsername.toLowerCase() === lowerUser) return 100;
  if (eUsername && normalizeText(eUsername) === normUser) return 98;

  // 2. Exact ID
  if (eId && (eId.toLowerCase() === lowerUser || normalizeText(eId) === normUser)) return 95;

  // 3. Exact Phone
  if (ePhone && isPhoneMatch(ePhone, rawUser)) return 92;

  // 4. Exact Full Name
  if (eName && normalizeText(eName) === normUser) return 90;
  if (eName && eName.toLowerCase() === lowerUser) return 88;

  // 5. Multi-word name containment
  const candWords = normalizeText(eName).split(/\s+/).filter((w) => w.length >= 2);
  const inpWords = normUser.split(/\s+/).filter((w) => w.length >= 2);
  if (candWords.length > 0 && inpWords.length > 0) {
    if (inpWords.length > 1) {
      const allInpInCand = inpWords.every((iw) =>
        candWords.some((cw) => cw === iw || cw.startsWith(iw))
      );
      if (allInpInCand) return 80;
    } else {
      const singleInp = inpWords[0];
      if (candWords[0] === singleInp) return 60;
      if (candWords[candWords.length - 1] === singleInp) return 55;
      if (candWords.some((cw) => cw === singleInp)) return 50;
    }
  }

  return 0;
}

function scoreUserMatch(user: any, rawUser: string): number {
  if (!user || user.active === false) return 0;
  const lowerUser = rawUser.toLowerCase().trim();
  const normUser = normalizeText(rawUser);

  const uUsername = String(user.username || '').trim();
  const uName = String(user.displayName || '').trim();
  const uEmpId = String(user.employeeId || '').trim();

  if (uUsername && uUsername.toLowerCase() === lowerUser) return 100;
  if (uUsername && normalizeText(uUsername) === normUser) return 98;
  if (uEmpId && (uEmpId.toLowerCase() === lowerUser || normalizeText(uEmpId) === normUser)) return 95;
  if (isPhoneMatch(uUsername, rawUser)) return 92;
  if (uName && normalizeText(uName) === normUser) return 90;
  if (uName && uName.toLowerCase() === lowerUser) return 88;

  const candWords = normalizeText(uName).split(/\s+/).filter((w) => w.length >= 2);
  const inpWords = normUser.split(/\s+/).filter((w) => w.length >= 2);
  if (candWords.length > 0 && inpWords.length > 0) {
    if (inpWords.length > 1) {
      const allInpInCand = inpWords.every((iw) =>
        candWords.some((cw) => cw === iw || cw.startsWith(iw))
      );
      if (allInpInCand) return 80;
    } else {
      const singleInp = inpWords[0];
      if (candWords[0] === singleInp) return 60;
      if (candWords[candWords.length - 1] === singleInp) return 55;
      if (candWords.some((cw) => cw === singleInp)) return 50;
    }
  }

  return 0;
}

// Initial Data
const DEFAULT_DATA = {
  settings: {
    companyName: 'شركة كورتادو كافيه',
    logoUrl: '',
    currencySymbol: 'ل.س',
    defaultWorkDays: 26,
    defaultWorkHours: 8,
    defaultAbsentDeductionMultiplier: 1.0,
    defaultLatePenaltyMethod: 'hourly_rate',
    directorName: 'الإدارة العامة',
    workStartTime: '08:00',
    workEndTime: '17:00',
    maxAdvancePerMonth: 2000000,
    users: DEFAULT_ACCOUNTS,
    shifts: [
      {
        id: 'shift-1',
        name: 'الشفت الصباحي',
        startTime: '08:00',
        endTime: '17:00',
        graceMinutes: 10,
        active: true,
      },
      {
        id: 'shift-2',
        name: 'الشفت المسائي',
        startTime: '17:00',
        endTime: '02:00',
        graceMinutes: 10,
        active: true,
      }
    ],
  },
  employees: [
    {
      id: 'emp-1',
      name: 'محمد خالد الحلبي',
      jobTitle: 'رئيس قسم المحاسبة والمالية',
      phone: '0944123456',
      username: '0944123456',
      password: '123',
      pin: '1234',
      baseSalary: 5500000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2023-01-15',
      avatarColor: 'bg-slate-700',
    },
    {
      id: 'emp-2',
      name: 'سامر أحمد النجار',
      jobTitle: 'مشرف مستودعات ولوجستيات',
      phone: '0933789012',
      username: '0933789012',
      password: '123',
      pin: '1234',
      baseSalary: 4200000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2023-05-10',
      avatarColor: 'bg-emerald-700',
    },
    {
      id: 'emp-3',
      name: 'عمر ياسين الكردي',
      jobTitle: 'مندوب مبيعات وتوزيع',
      phone: '0955432109',
      username: '0955432109',
      password: '123',
      pin: '1234',
      baseSalary: 3800000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2024-02-01',
      avatarColor: 'bg-blue-700',
    },
    {
      id: 'emp-4',
      name: 'ريم طارق الشامي',
      jobTitle: 'أخصائية موارد بشرية وشؤون إدارية',
      phone: '0988654321',
      username: '0988654321',
      password: '123',
      pin: '1234',
      baseSalary: 4800000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2023-09-01',
      avatarColor: 'bg-purple-700',
    },
    {
      id: 'emp-5',
      name: 'باسل محمود إدريس',
      jobTitle: 'فني صيانة ومعدات',
      phone: '0966543210',
      username: '0966543210',
      password: '123',
      pin: '1234',
      baseSalary: 3500000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2024-06-15',
      avatarColor: 'bg-amber-700',
    },
    {
      id: 'emp-6',
      name: 'طارق عبد الله مراد',
      jobTitle: 'سائق توزيع وآليات',
      phone: '0999876543',
      username: '0999876543',
      password: '123',
      pin: '1234',
      baseSalary: 3200000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2024-08-01',
      avatarColor: 'bg-cyan-700',
    },
    {
      id: 'emp-1790253674477',
      name: 'علي حسن',
      jobTitle: 'موظف',
      username: 'ali',
      password: 'mysecretpass',
      pin: '1234',
      baseSalary: 2000000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2026-09-24',
      avatarColor: 'bg-slate-700',
    },
    {
      id: 'emp-1790253970610',
      name: 'سامر العلي',
      jobTitle: 'موظف',
      username: 'samer',
      password: 'custompassword123',
      pin: '7788',
      phone: '0933112233',
      baseSalary: 1500000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2026-09-24',
      avatarColor: 'bg-slate-700',
    },
    {
      id: 'emp-1790256834588',
      name: 'طارق كنعان',
      jobTitle: 'كابتن صالة',
      phone: '0988112233',
      username: 'tareq',
      password: 'pass123',
      pin: '9999',
      baseSalary: 4500000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2026-09-24',
      avatarColor: 'bg-slate-700',
    },
    {
      id: 'emp-1790257732859',
      name: 'محمود الأحمد',
      jobTitle: 'موظف',
      phone: '0955112233',
      username: 'mahmoud',
      password: 'password999',
      pin: '1234',
      baseSalary: 3000000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2026-09-24',
      avatarColor: 'bg-slate-700',
    },
    {
      id: 'emp-1790257743651-6dsg',
      name: 'خالد النجار',
      jobTitle: 'موظف',
      username: 'khalid',
      password: 'secretkhalid',
      pin: '1234',
      baseSalary: 3000000,
      dailyWorkHours: 8,
      monthlyWorkDays: 26,
      absentDeductionRate: 1.0,
      active: true,
      joinedDate: '2026-09-24',
      avatarColor: 'bg-slate-700',
    }
  ],
  advances: [
    {
      id: 'adv-101',
      employeeId: 'emp-3',
      employeeName: 'عمر ياسين الكردي',
      amount: 450000,
      date: new Date().toISOString().split('T')[0],
      time: '09:15',
      note: 'سلفة لتغطية مصاريف صيانة سيارة التوزيع',
      createdAt: Date.now() - 1000 * 60 * 60 * 3,
      createdBy: 'الإدارة',
      approved: true,
    },
    {
      id: 'adv-102',
      employeeId: 'emp-5',
      employeeName: 'باسل محمود إدريس',
      amount: 300000,
      date: new Date().toISOString().split('T')[0],
      time: '11:30',
      note: 'سلفة طارئة شخصية',
      createdAt: Date.now() - 1000 * 60 * 60 * 1,
      createdBy: 'الإدارة',
      approved: true,
    }
  ],
  attendance: {} as Record<string, any>,
  lastUpdated: Date.now(),
};

// Seed today attendance
const todayStr = new Date().toISOString().split('T')[0];
DEFAULT_DATA.attendance = {
  [`emp-1_${todayStr}`]: {
    id: `emp-1_${todayStr}`,
    employeeId: 'emp-1',
    date: todayStr,
    status: 'present',
    checkInTime: '08:25',
    updatedAt: Date.now(),
  },
  [`emp-2_${todayStr}`]: {
    id: `emp-2_${todayStr}`,
    employeeId: 'emp-2',
    date: todayStr,
    status: 'present',
    checkInTime: '08:30',
    updatedAt: Date.now(),
  },
  [`emp-3_${todayStr}`]: {
    id: `emp-3_${todayStr}`,
    employeeId: 'emp-3',
    date: todayStr,
    status: 'late',
    lateMinutes: 45,
    checkInTime: '09:15',
    note: 'ازدحام مروري',
    updatedAt: Date.now(),
  },
  [`emp-4_${todayStr}`]: {
    id: `emp-4_${todayStr}`,
    employeeId: 'emp-4',
    date: todayStr,
    status: 'present',
    checkInTime: '08:28',
    updatedAt: Date.now(),
  },
  [`emp-5_${todayStr}`]: {
    id: `emp-5_${todayStr}`,
    employeeId: 'emp-5',
    date: todayStr,
    status: 'half_day',
    note: 'مغادرة 12:30',
    updatedAt: Date.now(),
  },
  [`emp-6_${todayStr}`]: {
    id: `emp-6_${todayStr}`,
    employeeId: 'emp-6',
    date: todayStr,
    status: 'present',
    checkInTime: '08:15',
    updatedAt: Date.now(),
  },
};

// Load or Initialize Store
let memoryStore: any = null;

// Synchronize all user accounts and employee records symmetrically
function syncStoreUsersAndEmployees(store: any) {
  if (!store) return;
  if (!store.settings) store.settings = {};
  if (!Array.isArray(store.settings.users)) {
    store.settings.users = [...DEFAULT_ACCOUNTS];
  }
  if (!Array.isArray(store.employees)) {
    store.employees = [];
  }

  // Ensure admin account exists
  let adminAcc = store.settings.users.find((u: any) => u.role === 'admin');
  if (!adminAcc) {
    adminAcc = {
      id: 'user-admin',
      username: 'admin',
      password: '123',
      pin: '1234',
      displayName: store.settings.directorName || 'المدير العام',
      role: 'admin',
      active: true,
      createdAt: Date.now(),
    };
    store.settings.users.unshift(adminAcc);
  }

  // Ensure default supervisor account exists
  let supervisorAcc = store.settings.users.find((u: any) => u.role === 'supervisor');
  if (!supervisorAcc) {
    supervisorAcc = {
      id: 'user-supervisor',
      username: 'supervisor',
      password: '123',
      pin: '5678',
      displayName: 'المشرف الميداني',
      role: 'supervisor',
      active: true,
      createdAt: Date.now(),
    };
    store.settings.users.push(supervisorAcc);
  }

  // 1. Synchronize employees -> settings.users
  store.employees.forEach((emp: any) => {
    if (!emp.id) emp.id = `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    if (!emp.name) emp.name = 'موظف';
    const cleanUsername = String(emp.username || emp.phone || emp.name).trim();
    const cleanPassword = emp.password && String(emp.password).trim() !== '' ? String(emp.password).trim() : '123';
    const cleanPin = emp.pin && String(emp.pin).trim() !== '' ? String(emp.pin).trim() : '1234';

    emp.username = cleanUsername;
    emp.password = cleanPassword;
    emp.pin = cleanPin;

    // Find linked user in settings.users
    const userIdx = store.settings.users.findIndex(
      (u: any) =>
        u.employeeId === emp.id ||
        (u.role === 'employee' &&
          (u.username?.toLowerCase() === cleanUsername.toLowerCase() ||
            normalizeText(u.username) === normalizeText(cleanUsername) ||
            normalizeText(u.displayName) === normalizeText(emp.name)))
    );

    if (userIdx >= 0) {
      store.settings.users[userIdx] = {
        ...store.settings.users[userIdx],
        employeeId: emp.id,
        username: cleanUsername,
        password: cleanPassword,
        pin: cleanPin,
        displayName: emp.name,
        role: 'employee',
        active: emp.active !== false,
      };
    } else {
      store.settings.users.push({
        id: `user-${emp.id}`,
        username: cleanUsername,
        password: cleanPassword,
        pin: cleanPin,
        displayName: emp.name,
        role: 'employee',
        employeeId: emp.id,
        active: emp.active !== false,
        createdAt: Date.now(),
      });
    }
  });

  // 2. Cross-sync back: if a user in settings.users has role === 'employee', ensure employee record exists and matches
  store.settings.users.forEach((u: any) => {
    if (u.role === 'employee') {
      const cleanUser = String(u.username || '').trim();
      const cleanPass = u.password && String(u.password).trim() !== '' ? String(u.password).trim() : '123';
      const cleanPin = u.pin && String(u.pin).trim() !== '' ? String(u.pin).trim() : '1234';

      let emp = store.employees.find(
        (e: any) =>
          (u.employeeId && e.id === u.employeeId) ||
          (cleanUser && e.username && cleanUser.toLowerCase() === e.username.toLowerCase()) ||
          (cleanUser && e.username && normalizeText(e.username) === normalizeText(cleanUser)) ||
          (u.displayName && e.name && normalizeText(e.name) === normalizeText(u.displayName))
      );

      if (emp) {
        if (!u.employeeId) u.employeeId = emp.id;
        emp.password = cleanPass;
        emp.pin = cleanPin;
        if (cleanUser) emp.username = cleanUser;
        if (u.displayName) emp.name = u.displayName;
        if (u.active !== undefined) emp.active = u.active;
      } else {
        // Auto-create matching employee so the account is 100% active and can view personal dashboard
        const newEmpId = u.employeeId || `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        u.employeeId = newEmpId;
        store.employees.push({
          id: newEmpId,
          name: u.displayName || u.username || 'موظف',
          jobTitle: 'موظف',
          phone: isPhoneMatch(u.username, u.username) ? u.username : undefined,
          username: cleanUser || `emp_${newEmpId}`,
          password: cleanPass,
          pin: cleanPin,
          baseSalary: 3000000,
          dailyWorkHours: 8,
          monthlyWorkDays: 26,
          absentDeductionRate: 1.0,
          active: u.active !== false,
          joinedDate: new Date().toISOString().split('T')[0],
          avatarColor: 'bg-slate-700',
        });
      }
    }
  });
}

function saveStore(data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    syncStoreUsersAndEmployees(data);
    memoryStore = { ...data, lastUpdated: Date.now() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
    
    // Also backup branding to dedicated file
    if (memoryStore.settings) {
      saveBranding({
        companyName: memoryStore.settings.companyName,
        directorName: memoryStore.settings.directorName,
        logoUrl: memoryStore.settings.logoUrl,
        lastUpdated: memoryStore.lastUpdated,
      });
    }
  } catch (err) {
    console.error('Error saving data file:', err);
  }
}

function loadStore() {
  const branding = loadBranding();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const mergedSettings = {
          ...DEFAULT_DATA.settings,
          ...(parsed.settings || {}),
        };
        // Always prioritize non-empty saved branding
        if (branding.companyName) {
          mergedSettings.companyName = branding.companyName;
        }
        if (branding.directorName) {
          mergedSettings.directorName = branding.directorName;
        }
        if (branding.logoUrl !== undefined && branding.logoUrl !== '') {
          mergedSettings.logoUrl = branding.logoUrl;
        }

        if (!mergedSettings.shifts || mergedSettings.shifts.length === 0) {
          mergedSettings.shifts = DEFAULT_DATA.settings.shifts;
        }
        if (mergedSettings.maxAdvancePerMonth === undefined) {
          mergedSettings.maxAdvancePerMonth = 2000000;
        }
        if (!mergedSettings.users || mergedSettings.users.length === 0) {
          mergedSettings.users = DEFAULT_ACCOUNTS;
        }

        // Ensure all loaded employees have valid password/pin/username credentials
        const employees = Array.isArray(parsed.employees) && parsed.employees.length > 0
          ? parsed.employees.map((emp: any) => ({
              ...emp,
              username: emp.username || emp.phone || emp.name,
              password: emp.password && String(emp.password).trim() !== '' ? emp.password : '123',
              pin: emp.pin && String(emp.pin).trim() !== '' ? emp.pin : '1234',
            }))
          : DEFAULT_DATA.employees;

        const storeResult = {
          ...DEFAULT_DATA,
          ...parsed,
          employees,
          settings: mergedSettings,
        };
        syncStoreUsersAndEmployees(storeResult);
        return storeResult;
      }
    }
  } catch (err) {
    console.error('Error loading data file, fallback to default', err);
  }

  const initial = {
    ...DEFAULT_DATA,
    settings: {
      ...DEFAULT_DATA.settings,
      companyName: branding.companyName || DEFAULT_DATA.settings.companyName,
      directorName: branding.directorName || DEFAULT_DATA.settings.directorName,
      logoUrl: branding.logoUrl || DEFAULT_DATA.settings.logoUrl,
      users: DEFAULT_ACCOUNTS,
    },
  };
  syncStoreUsersAndEmployees(initial);
  return initial;
}

memoryStore = loadStore();
// Ensure files exist on startup
saveStore(memoryStore);

// SSE Real-Time Clients Registry
const sseClients = new Set<Response>();

function broadcast(eventType: string, payload: any, senderClientId?: string) {
  const message = JSON.stringify({
    type: eventType,
    payload,
    timestamp: Date.now(),
    clientId: senderClientId,
  });

  for (const client of sseClients) {
    try {
      client.write(`data: ${message}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ================= API ENDPOINTS =================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', connectedClients: sseClients.size, time: Date.now() });
});

// SSE Stream for Instant Real-Time Multi-Device Sync
app.get('/api/sync/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify({ type: 'INIT', payload: memoryStore, timestamp: Date.now() })}\n\n`);

  sseClients.add(res);

  // Keep-alive heartbeat every 20s
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// GET Full State
app.get('/api/data', (req: Request, res: Response) => {
  res.json(memoryStore);
});

// Direct Server-Side Authoritative Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  // Ensure store is completely synced
  syncStoreUsersAndEmployees(memoryStore);

  const cleanUser = cleanUnicode(String(username)).trim();
  const cleanPass = cleanUnicode(String(password)).trim();
  const lowerUser = cleanUser.toLowerCase();
  const normUser = normalizeText(cleanUser);

  const users: any[] = Array.isArray(memoryStore.settings?.users) ? memoryStore.settings.users : [];
  const employees: any[] = Array.isArray(memoryStore.employees) ? memoryStore.employees : [];

  // Helper to score candidate employee identity match
  const scoreEmp = (emp: any) => scoreEmployeeMatch(emp, cleanUser);
  // Helper to score candidate user identity match
  const scoreUsr = (usr: any) => scoreUserMatch(usr, cleanUser);

  interface AuthCandidate {
    type: 'employee' | 'user';
    score: number;
    passMatch: boolean;
    role: string;
    user: any;
    employee?: any;
    passwords: string[];
  }

  const candidates: AuthCandidate[] = [];

  // 1. Evaluate all employees
  for (const emp of employees) {
    if (emp.active === false) continue;
    const score = scoreEmp(emp);
    if (score > 0) {
      const linkedUser = users.find(
        (u: any) =>
          u.employeeId === emp.id ||
          (u.role === 'employee' && (
            (u.username && u.username.toLowerCase() === (emp.username || '').toLowerCase()) ||
            (u.displayName && normalizeText(u.displayName) === normalizeText(emp.name))
          ))
      );

      const candidatePasswords: string[] = [
        emp.password,
        emp.pin,
        linkedUser?.password,
        linkedUser?.pin,
        '123',
        '1234',
      ].filter(Boolean).map(String);

      const passMatch = verifyPasswordMatch(candidatePasswords, cleanPass);

      candidates.push({
        type: 'employee',
        score,
        passMatch,
        role: 'employee',
        employee: emp,
        user: {
          id: linkedUser?.id || `user-${emp.id}`,
          username: emp.username || linkedUser?.username || emp.phone || emp.name,
          displayName: emp.name || linkedUser?.displayName || 'موظف',
          role: 'employee',
          employeeId: emp.id,
          password: emp.password || linkedUser?.password || '123',
          pin: emp.pin || linkedUser?.pin || '1234',
          active: true,
          avatarColor: emp.avatarColor || 'bg-slate-700',
          createdAt: linkedUser?.createdAt || Date.now(),
        },
        passwords: candidatePasswords,
      });
    }
  }

  // 2. Evaluate all user accounts
  for (const usr of users) {
    if (usr.active === false) continue;
    let score = scoreUsr(usr);

    // Keywords check for generic role terms
    if (score === 0) {
      if (usr.role === 'admin') {
        const adminKeywords = ['admin', 'مدير', 'المدير', 'المدير العام', 'zead', 'ziad', 'زياد', 'director', 'cortado', 'كورتادو'];
        const directorNorm = normalizeText(memoryStore.settings?.directorName);
        if (adminKeywords.some((k) => normalizeText(k) === normUser || k.toLowerCase() === lowerUser) || (directorNorm && directorNorm === normUser)) {
          score = 70;
        }
      } else if (usr.role === 'supervisor') {
        const supKeywords = ['supervisor', 'مشرف', 'المشرف', 'المشرف الميداني'];
        if (supKeywords.some((k) => normalizeText(k) === normUser || k.toLowerCase() === lowerUser)) {
          score = 70;
        }
      }
    }

    if (score > 0) {
      const linkedEmp = usr.employeeId ? employees.find((e: any) => e.id === usr.employeeId) : null;
      const candidatePasswords: string[] = [
        usr.password,
        usr.pin,
        linkedEmp?.password,
        linkedEmp?.pin,
        usr.role === 'employee' ? '123' : null,
        usr.role === 'employee' ? '1234' : null,
        usr.role === 'supervisor' ? '5678' : null,
        usr.role === 'supervisor' ? '123' : null,
        usr.role === 'admin' ? '123' : null,
        usr.role === 'admin' ? '1234' : null,
      ].filter(Boolean).map(String);

      const passMatch = verifyPasswordMatch(candidatePasswords, cleanPass);

      candidates.push({
        type: 'user',
        score,
        passMatch,
        role: usr.role,
        user: {
          ...usr,
          displayName: usr.displayName || linkedEmp?.name || (usr.role === 'admin' ? 'المدير العام' : 'المشرف الميداني'),
          employeeId: usr.employeeId || linkedEmp?.id,
          avatarColor: linkedEmp?.avatarColor || 'bg-slate-700',
        },
        employee: linkedEmp,
        passwords: candidatePasswords,
      });
    }
  }

  // Filter candidates that matched BOTH identity and password
  const authenticated = candidates.filter((c) => c.passMatch);

  if (authenticated.length > 0) {
    // Sort by role match priority if role parameter provided, then by score
    authenticated.sort((a, b) => {
      const aRoleMatch = role && a.role === role ? 20 : 0;
      const bRoleMatch = role && b.role === role ? 20 : 0;
      return (b.score + bRoleMatch) - (a.score + aRoleMatch);
    });

    const chosen = authenticated[0];

    return res.json({
      success: true,
      user: chosen.user,
      settings: memoryStore.settings,
      employees: memoryStore.employees,
    });
  }

  // If no candidate had matching password, but some matched identity
  if (candidates.length > 0) {
    return res.status(401).json({
      success: false,
      message: 'كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة',
    });
  }

  // No identity match
  return res.status(401).json({
    success: false,
    message: 'لم يتم العثور على الحساب، يرجى التأكد من كتابة اسم المستخدم أو رقم الهاتف أو الاسم المسجل في لوحة التحكم بشكل صحيح',
  });
});

// POST Direct Credentials Update (Admin, Supervisor, or Employee)
app.post('/api/auth/update-credentials', (req: Request, res: Response) => {
  const { role, username, password, pin, employeeId, displayName, id, clientId } = req.body;
  if (!role || (!password && !pin && !username)) {
    return res.status(400).json({ success: false, message: 'بيانات غير مكتملة' });
  }

  const cleanPass = password && String(password).trim() !== '' ? String(password).trim() : undefined;
  const cleanPin = pin && String(pin).trim() !== '' ? String(pin).trim() : undefined;
  const cleanUser = username ? String(username).trim() : undefined;
  const cleanDisplay = displayName ? String(displayName).trim() : undefined;

  let targetUser: any = null;
  let targetEmp: any = null;

  if (role === 'admin') {
    targetUser = memoryStore.settings.users.find((u: any) => u.role === 'admin');
    if (targetUser) {
      if (cleanPass) targetUser.password = cleanPass;
      if (cleanPin) targetUser.pin = cleanPin;
      if (cleanUser) targetUser.username = cleanUser;
      if (cleanDisplay) targetUser.displayName = cleanDisplay;
    } else {
      targetUser = {
        id: id || 'user-admin',
        username: cleanUser || 'admin',
        password: cleanPass || '123',
        pin: cleanPin || '1234',
        displayName: cleanDisplay || 'المدير العام',
        role: 'admin',
        active: true,
        createdAt: Date.now(),
      };
      memoryStore.settings.users.unshift(targetUser);
    }
  } else if (role === 'supervisor') {
    if (id) {
      targetUser = memoryStore.settings.users.find((u: any) => u.id === id);
    }
    if (!targetUser && cleanUser) {
      targetUser = memoryStore.settings.users.find((u: any) =>
        u.role === 'supervisor' &&
        (u.username?.toLowerCase() === cleanUser.toLowerCase() || normalizeText(u.username) === normalizeText(cleanUser))
      );
    }
    if (!targetUser) {
      targetUser = memoryStore.settings.users.find((u: any) => u.role === 'supervisor');
    }

    if (targetUser) {
      if (cleanPass) targetUser.password = cleanPass;
      if (cleanPin) targetUser.pin = cleanPin;
      if (cleanUser) targetUser.username = cleanUser;
      if (cleanDisplay) targetUser.displayName = cleanDisplay;
    } else {
      targetUser = {
        id: id || `user-sup-${Date.now()}`,
        username: cleanUser || 'supervisor',
        password: cleanPass || '123',
        pin: cleanPin || '5678',
        displayName: cleanDisplay || 'مشرف ميداني',
        role: 'supervisor',
        active: true,
        createdAt: Date.now(),
      };
      memoryStore.settings.users.push(targetUser);
    }
  } else if (role === 'employee') {
    if (employeeId) {
      targetEmp = memoryStore.employees.find((e: any) => e.id === employeeId);
      targetUser = memoryStore.settings.users.find((u: any) => u.employeeId === employeeId);
    }
    if (!targetEmp && cleanUser) {
      targetEmp = memoryStore.employees.find((e: any) =>
        (e.username && e.username.toLowerCase() === cleanUser.toLowerCase()) ||
        (e.username && normalizeText(e.username) === normalizeText(cleanUser)) ||
        (e.name && normalizeText(e.name) === normalizeText(cleanUser))
      );
    }
    if (!targetUser && cleanUser) {
      targetUser = memoryStore.settings.users.find((u: any) =>
        u.role === 'employee' &&
        ((u.username && u.username.toLowerCase() === cleanUser.toLowerCase()) ||
         (u.username && normalizeText(u.username) === normalizeText(cleanUser)))
      );
    }

    const finalEmpId = employeeId || targetEmp?.id || targetUser?.employeeId || `emp-${Date.now()}`;

    if (targetEmp) {
      if (cleanPass) targetEmp.password = cleanPass;
      if (cleanPin) targetEmp.pin = cleanPin;
      if (cleanUser) targetEmp.username = cleanUser;
      if (cleanDisplay) targetEmp.name = cleanDisplay;
    } else {
      targetEmp = {
        id: finalEmpId,
        name: cleanDisplay || cleanUser || 'موظف',
        jobTitle: 'موظف',
        phone: cleanUser && isPhoneMatch(cleanUser, cleanUser) ? cleanUser : undefined,
        username: cleanUser || `emp_${finalEmpId}`,
        password: cleanPass || '123',
        pin: cleanPin || '1234',
        baseSalary: 3000000,
        dailyWorkHours: 8,
        monthlyWorkDays: 26,
        absentDeductionRate: 1.0,
        active: true,
        joinedDate: new Date().toISOString().split('T')[0],
        avatarColor: 'bg-slate-700',
      };
      memoryStore.employees.push(targetEmp);
    }

    if (targetUser) {
      if (cleanPass) targetUser.password = cleanPass;
      if (cleanPin) targetUser.pin = cleanPin;
      if (cleanUser) targetUser.username = cleanUser;
      if (cleanDisplay) targetUser.displayName = cleanDisplay;
      targetUser.employeeId = targetEmp.id;
    } else {
      targetUser = {
        id: id || `user-${targetEmp.id}`,
        username: cleanUser || targetEmp.username,
        password: cleanPass || '123',
        pin: cleanPin || '1234',
        displayName: cleanDisplay || targetEmp.name,
        role: 'employee',
        employeeId: targetEmp.id,
        active: true,
        createdAt: Date.now(),
      };
      memoryStore.settings.users.push(targetUser);
    }
  }

  saveStore(memoryStore);
  broadcast('SETTINGS_UPDATED', memoryStore.settings, clientId);
  broadcast('EMPLOYEES_BULK_UPDATED', memoryStore.employees, clientId);

  return res.json({
    success: true,
    user: targetUser,
    employee: targetEmp,
    settings: memoryStore.settings,
    employees: memoryStore.employees,
  });
});

// POST New Salary Advance
app.post('/api/advances', (req: Request, res: Response) => {
  const { advance, clientId } = req.body;
  if (!advance || !advance.employeeId || !advance.amount) {
    return res.status(400).json({ error: 'بيانات السلفة غير مكتملة' });
  }

  const newAdvance = {
    ...advance,
    id: advance.id || `adv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: Date.now(),
    approved: true,
  };

  memoryStore.advances = [newAdvance, ...memoryStore.advances];
  saveStore(memoryStore);

  broadcast('ADVANCE_ADDED', newAdvance, clientId);
  res.json({ success: true, advance: newAdvance });
});

// DELETE Salary Advance
app.delete('/api/advances/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const clientId = req.query.clientId as string;

  memoryStore.advances = memoryStore.advances.filter((a: any) => a.id !== id);
  saveStore(memoryStore);

  broadcast('ADVANCE_DELETED', { id }, clientId);
  res.json({ success: true, id });
});

// POST Attendance Update
app.post('/api/attendance', (req: Request, res: Response) => {
  const { record, clientId } = req.body;
  if (!record || !record.employeeId || !record.date || !record.status) {
    return res.status(400).json({ error: 'بيانات الحضور غير مكتملة' });
  }

  const recordId = record.id || `${record.employeeId}_${record.date}`;
  const updatedRecord = {
    ...record,
    id: recordId,
    updatedAt: Date.now(),
  };

  memoryStore.attendance[recordId] = updatedRecord;
  saveStore(memoryStore);

  broadcast('ATTENDANCE_UPDATED', updatedRecord, clientId);
  res.json({ success: true, record: updatedRecord });
});

// POST Bulk Attendance (e.g., Mark All Present)
app.post('/api/attendance/bulk', (req: Request, res: Response) => {
  const { records, clientId } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'قائمة السجلات غير صحيحة' });
  }

  const now = Date.now();
  records.forEach((rec: any) => {
    const recordId = rec.id || `${rec.employeeId}_${rec.date}`;
    memoryStore.attendance[recordId] = {
      ...rec,
      id: recordId,
      updatedAt: now,
    };
  });

  saveStore(memoryStore);
  broadcast('ATTENDANCE_BULK_UPDATED', records, clientId);
  res.json({ success: true, count: records.length });
});

// POST Add or Update Employee
app.post('/api/employees', (req: Request, res: Response) => {
  const { employee, clientId } = req.body;
  if (!employee || !employee.name) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الموظف' });
  }

  const cleanBaseSalary = employee.baseSalary !== undefined && employee.baseSalary !== null ? Number(employee.baseSalary) : 0;
  const isNew = !employee.id || !memoryStore.employees.some((e: any) => e.id === employee.id);
  let savedEmployee: any;

  if (isNew) {
    const newId = employee.id || `emp-${Date.now()}`;
    savedEmployee = {
      ...employee,
      id: newId,
      baseSalary: cleanBaseSalary,
      username: employee.username || employee.phone || employee.name,
      password: employee.password && String(employee.password).trim() !== '' ? String(employee.password).trim() : '123',
      pin: employee.pin && String(employee.pin).trim() !== '' ? String(employee.pin).trim() : '1234',
      active: employee.active !== undefined ? employee.active : true,
      joinedDate: employee.joinedDate || new Date().toISOString().split('T')[0],
      avatarColor: employee.avatarColor || 'bg-slate-700',
    };
    memoryStore.employees.push(savedEmployee);
  } else {
    savedEmployee = {
      ...employee,
      baseSalary: cleanBaseSalary,
      username: employee.username || employee.phone || employee.name,
      password: employee.password && String(employee.password).trim() !== '' ? String(employee.password).trim() : '123',
      pin: employee.pin && String(employee.pin).trim() !== '' ? String(employee.pin).trim() : '1234',
    };
    memoryStore.employees = memoryStore.employees.map((e: any) =>
      e.id === employee.id ? savedEmployee : e
    );
  }

  // Ensure user account exists and stays in sync in settings.users
  if (!memoryStore.settings.users || !Array.isArray(memoryStore.settings.users)) {
    memoryStore.settings.users = [...DEFAULT_ACCOUNTS];
  }

  const userIdx = memoryStore.settings.users.findIndex(
    (u: any) => u.employeeId === savedEmployee.id || (u.role === 'employee' && normalizeText(u.username) === normalizeText(savedEmployee.username))
  );

  if (userIdx >= 0) {
    memoryStore.settings.users[userIdx] = {
      ...memoryStore.settings.users[userIdx],
      username: savedEmployee.username,
      password: savedEmployee.password,
      pin: savedEmployee.pin,
      displayName: savedEmployee.name,
      employeeId: savedEmployee.id,
      active: savedEmployee.active !== false,
    };
  } else {
    memoryStore.settings.users.push({
      id: `user-${savedEmployee.id}`,
      username: savedEmployee.username,
      password: savedEmployee.password,
      pin: savedEmployee.pin,
      displayName: savedEmployee.name,
      role: 'employee',
      employeeId: savedEmployee.id,
      active: savedEmployee.active !== false,
      createdAt: Date.now(),
    });
  }

  saveStore(memoryStore);

  if (isNew) {
    broadcast('EMPLOYEE_ADDED', savedEmployee, clientId);
  } else {
    broadcast('EMPLOYEE_UPDATED', savedEmployee, clientId);
  }
  broadcast('SETTINGS_UPDATED', memoryStore.settings, clientId);

  res.json({ success: true, employee: savedEmployee, users: memoryStore.settings.users });
});

// DELETE Employee
app.delete('/api/employees/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const clientId = req.query.clientId as string;

  memoryStore.employees = memoryStore.employees.filter((e: any) => e.id !== id);
  saveStore(memoryStore);

  broadcast('EMPLOYEE_DELETED', { id }, clientId);
  res.json({ success: true, id });
});

// POST Settings Update
app.post('/api/settings', (req: Request, res: Response) => {
  const { settings, clientId } = req.body;
  if (!settings) {
    return res.status(400).json({ error: 'بيانات الإعدادات غير صالحة' });
  }

  memoryStore.settings = { ...memoryStore.settings, ...settings };
  saveStore(memoryStore);

  broadcast('SETTINGS_UPDATED', memoryStore.settings, clientId);
  broadcast('EMPLOYEES_BULK_UPDATED', memoryStore.employees, clientId);
  broadcast('BRANDING_UPDATED', {
    companyName: memoryStore.settings.companyName,
    directorName: memoryStore.settings.directorName,
    logoUrl: memoryStore.settings.logoUrl,
    lastUpdated: memoryStore.lastUpdated,
  }, clientId);
  res.json({ success: true, settings: memoryStore.settings, employees: memoryStore.employees });
});

// GET Dedicated Company Branding (Logo, Name, Director) - strictly no-cache for instant live updates
app.get('/api/branding', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const branding = loadBranding();
  const effectiveLogo = (memoryStore?.settings?.logoUrl && String(memoryStore.settings.logoUrl).trim() !== '')
    ? memoryStore.settings.logoUrl
    : (branding.logoUrl || '');

  res.json({
    companyName: memoryStore?.settings?.companyName || branding.companyName || 'شركة كورتادو كافيه',
    directorName: memoryStore?.settings?.directorName || branding.directorName || 'الإدارة العامة',
    logoUrl: effectiveLogo,
    lastUpdated: memoryStore?.lastUpdated || branding.lastUpdated || Date.now(),
  });
});

// GET direct logo route
app.get('/api/logo', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const branding = loadBranding();
  const effectiveLogo = (memoryStore?.settings?.logoUrl && String(memoryStore.settings.logoUrl).trim() !== '')
    ? memoryStore.settings.logoUrl
    : (branding.logoUrl || '');
  res.json({ logoUrl: effectiveLogo });
});

// POST Dedicated Company Branding Update (For instant forced global sync across all devices)
app.post('/api/branding', (req: Request, res: Response) => {
  const { companyName, directorName, logoUrl, forceReset, clientId } = req.body;
  
  if (companyName !== undefined && String(companyName).trim() !== '') {
    memoryStore.settings.companyName = String(companyName).trim();
  }
  if (directorName !== undefined && String(directorName).trim() !== '') {
    memoryStore.settings.directorName = String(directorName).trim();
  }
  if (forceReset) {
    memoryStore.settings.logoUrl = '';
  } else if (logoUrl !== undefined && String(logoUrl).trim() !== '') {
    memoryStore.settings.logoUrl = String(logoUrl).trim();
  }
  
  saveStore(memoryStore);
  const savedBranding = saveBranding({
    companyName: memoryStore.settings.companyName,
    directorName: memoryStore.settings.directorName,
    logoUrl: memoryStore.settings.logoUrl,
    forceReset,
  });

  const brandingPayload = {
    companyName: savedBranding.companyName,
    directorName: savedBranding.directorName,
    logoUrl: savedBranding.logoUrl,
    lastUpdated: Date.now(),
  };

  // Broadcast to all connected devices immediately
  broadcast('BRANDING_UPDATED', brandingPayload, clientId);
  broadcast('SETTINGS_UPDATED', memoryStore.settings, clientId);

  res.json({ success: true, branding: brandingPayload, settings: memoryStore.settings });
});

// POST Reset / Clear Data for New Month (Clears advances & attendance, retains employees & settings)
app.post('/api/data/reset-month', (req: Request, res: Response) => {
  const clientId = req.body?.clientId;
  memoryStore.advances = [];
  memoryStore.attendance = {};
  saveStore(memoryStore);
  broadcast('MONTH_RESET', memoryStore, clientId);
  res.json({ success: true, data: memoryStore });
});

// POST Reset Data to Sample
app.post('/api/data/reset', (req: Request, res: Response) => {
  const clientId = req.body?.clientId;
  const currentBranding = loadBranding();
  memoryStore = JSON.parse(JSON.stringify(DEFAULT_DATA));
  if (currentBranding.companyName) memoryStore.settings.companyName = currentBranding.companyName;
  if (currentBranding.directorName) memoryStore.settings.directorName = currentBranding.directorName;
  if (currentBranding.logoUrl) memoryStore.settings.logoUrl = currentBranding.logoUrl;
  saveStore(memoryStore);
  broadcast('DATA_RESET', memoryStore, clientId);
  res.json({ success: true, data: memoryStore });
});

// ================= VITE & PRODUCTION SETUP =================

async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
          watch: process.env.DISABLE_HMR === 'true' ? null : {},
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SYP Attendance & Advances Server running on http://localhost:${PORT}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Retrying or waiting...`);
      } else {
        console.error('Server error:', err);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
