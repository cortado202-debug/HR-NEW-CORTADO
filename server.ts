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
];

// String & Digit Normalization for resilient login & matching
function toAscii(str?: string | null): string {
  if (!str) return '';
  return String(str)
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

function normalizeText(str?: string | null): string {
  if (!str) return '';
  return toAscii(str)
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
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
  const digits = toAscii(str).replace(/\D/g, '');
  if (digits.startsWith('00963')) return '0' + digits.slice(5);
  if (digits.startsWith('963')) return '0' + digits.slice(3);
  return digits;
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

function saveStore(data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
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

        return {
          ...DEFAULT_DATA,
          ...parsed,
          employees,
          settings: mergedSettings,
        };
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

  const rawUser = String(username).trim();
  const rawPass = String(password).trim();
  const normUser = normalizeText(rawUser);
  const phoneUser = normalizePhone(rawUser);
  const asciiPass = toAscii(rawPass);

  const users: any[] = Array.isArray(memoryStore.settings?.users) ? memoryStore.settings.users : [];
  const employees: any[] = Array.isArray(memoryStore.employees) ? memoryStore.employees : [];

  let matchedUser: any = null;

  if (role === 'employee') {
    // 1. Check in configured user accounts
    matchedUser = users.find((u) => {
      if (u.role !== 'employee' || u.active === false) return false;
      if (normalizeText(u.username) === normUser || normalizeText(u.displayName) === normUser) return true;
      if (u.employeeId && normalizeText(u.employeeId) === normUser) return true;
      if (u.employeeId) {
        const emp = employees.find((e) => e.id === u.employeeId);
        if (emp) {
          if (normalizeText(emp.name) === normUser) return true;
          if (emp.phone && (normalizePhone(emp.phone) === phoneUser || normalizeText(emp.phone) === normUser)) return true;
        }
      }
      return false;
    });

    // 2. Check in employees list directly
    if (!matchedUser) {
      const emp = employees.find((e) => {
        if (e.active === false) return false;
        if (e.username && normalizeText(e.username) === normUser) return true;
        if (normalizeText(e.name) === normUser) return true;
        if (e.phone && (normalizePhone(e.phone) === phoneUser || normalizeText(e.phone) === normUser)) return true;
        if (e.id && (normalizeText(e.id) === normUser || e.id === rawUser)) return true;
        // First name match if at least 3 characters
        const empFirstWord = normalizeText(e.name).split(' ')[0];
        const userFirstWord = normUser.split(' ')[0];
        if (empFirstWord && userFirstWord && empFirstWord.length >= 3 && empFirstWord === userFirstWord) return true;
        return false;
      });

      if (emp) {
        matchedUser = {
          id: `emp-auto-${emp.id}`,
          username: emp.username || emp.phone || emp.name,
          displayName: emp.name,
          role: 'employee',
          employeeId: emp.id,
          password: emp.password || '123',
          pin: emp.pin || '1234',
          active: emp.active !== false,
          createdAt: Date.now(),
        };
      }
    }
  } else if (role === 'supervisor') {
    matchedUser = users.find((u) => {
      if (u.role !== 'supervisor' || u.active === false) return false;
      return normalizeText(u.username) === normUser || normalizeText(u.displayName) === normUser;
    });
    if (!matchedUser) {
      const supKeywords = ['supervisor', 'مشرف', 'المشرف', 'المشرف الميداني'];
      if (supKeywords.some((k) => normalizeText(k) === normUser)) {
        matchedUser = users.find((u) => u.role === 'supervisor') || {
          id: 'user-supervisor',
          username: 'supervisor',
          displayName: 'المشرف الميداني',
          role: 'supervisor',
          password: '123',
          pin: '5678',
          active: true,
        };
      }
    }
  } else {
    // Admin role
    matchedUser = users.find((u) => {
      if (u.role !== 'admin' || u.active === false) return false;
      return normalizeText(u.username) === normUser || normalizeText(u.displayName) === normUser;
    });
    if (!matchedUser) {
      const adminKeywords = ['admin', 'مدير', 'المدير', 'المدير العام', 'zead', 'ziad', 'زياد', 'director', 'cortado', 'كورتادو'];
      if (adminKeywords.some((k) => normalizeText(k) === normUser) || normalizeText(memoryStore.settings?.directorName) === normUser) {
        matchedUser = users.find((u) => u.role === 'admin') || {
          id: 'user-admin',
          username: 'admin',
          displayName: memoryStore.settings?.directorName || 'المدير العام',
          role: 'admin',
          password: '123',
          pin: '1234',
          active: true,
        };
      }
    }
  }

  if (!matchedUser) {
    return res.status(401).json({
      success: false,
      message: 'لم يتم العثور على الحساب، يرجى التأكد من كتابة الاسم أو رقم الهاتف المسجل بشكل صحيح',
    });
  }

  // Password & PIN evaluation
  const validPasswords: string[] = [];
  if (matchedUser.password && String(matchedUser.password).trim()) {
    validPasswords.push(String(matchedUser.password).trim());
  }
  if (matchedUser.pin && String(matchedUser.pin).trim()) {
    validPasswords.push(String(matchedUser.pin).trim());
  }

  if (matchedUser.employeeId) {
    const emp = employees.find((e) => e.id === matchedUser.employeeId);
    if (emp) {
      if (emp.password && String(emp.password).trim()) {
        validPasswords.push(String(emp.password).trim());
      }
      if (emp.pin && String(emp.pin).trim()) {
        validPasswords.push(String(emp.pin).trim());
      }
    }
  }

  if (validPasswords.length === 0) {
    validPasswords.push('123');
  }

  const isPasswordMatch = validPasswords.some((p) => {
    const pTrim = p.trim();
    const asciiP = toAscii(pTrim);
    if (pTrim === rawPass) return true;
    if (asciiP === asciiPass) return true;
    if (pTrim.toLowerCase() === rawPass.toLowerCase()) return true;
    if (asciiP.toLowerCase() === asciiPass.toLowerCase()) return true;
    return false;
  });

  if (!isPasswordMatch) {
    return res.status(401).json({
      success: false,
      message: 'كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة',
    });
  }

  // Return authenticated user along with current state
  return res.json({
    success: true,
    user: matchedUser,
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
  broadcast('BRANDING_UPDATED', {
    companyName: memoryStore.settings.companyName,
    directorName: memoryStore.settings.directorName,
    logoUrl: memoryStore.settings.logoUrl,
    lastUpdated: memoryStore.lastUpdated,
  }, clientId);
  res.json({ success: true, settings: memoryStore.settings });
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
