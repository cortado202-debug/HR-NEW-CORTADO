import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// File path for persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Data
const DEFAULT_DATA = {
  settings: {
    companyName: 'مجموعة بركات للتجارة والتوزيع',
    logoUrl: '',
    currencySymbol: 'ل.س',
    defaultWorkDays: 26,
    defaultWorkHours: 8,
    defaultAbsentDeductionMultiplier: 1.0,
    defaultLatePenaltyMethod: 'hourly_rate',
    directorName: 'أ. مروان بركات',
    workStartTime: '08:00',
    workEndTime: '17:00',
    maxAdvancePerMonth: 2000000,
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
function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const mergedSettings = {
          ...DEFAULT_DATA.settings,
          ...(parsed.settings || {}),
        };
        if (!mergedSettings.shifts || mergedSettings.shifts.length === 0) {
          mergedSettings.shifts = DEFAULT_DATA.settings.shifts;
        }
        if (mergedSettings.maxAdvancePerMonth === undefined) {
          mergedSettings.maxAdvancePerMonth = 2000000;
        }
        return {
          ...DEFAULT_DATA,
          ...parsed,
          settings: mergedSettings,
        };
      }
    }
  } catch (err) {
    console.error('Error loading data file, fallback to default', err);
  }
  saveStore(DEFAULT_DATA);
  return DEFAULT_DATA;
}

let memoryStore = loadStore();

function saveStore(data: any) {
  try {
    memoryStore = { ...data, lastUpdated: Date.now() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data file', err);
  }
}

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
  if (!employee || !employee.name || employee.baseSalary === undefined) {
    return res.status(400).json({ error: 'بيانات الموظف غير مكتملة' });
  }

  const isNew = !employee.id || !memoryStore.employees.some((e: any) => e.id === employee.id);
  let savedEmployee: any;

  if (isNew) {
    savedEmployee = {
      ...employee,
      id: employee.id || `emp-${Date.now()}`,
      active: employee.active !== undefined ? employee.active : true,
      joinedDate: employee.joinedDate || new Date().toISOString().split('T')[0],
      avatarColor: employee.avatarColor || 'bg-slate-700',
    };
    memoryStore.employees.push(savedEmployee);
    saveStore(memoryStore);
    broadcast('EMPLOYEE_ADDED', savedEmployee, clientId);
  } else {
    savedEmployee = { ...employee };
    memoryStore.employees = memoryStore.employees.map((e: any) =>
      e.id === employee.id ? savedEmployee : e
    );
    saveStore(memoryStore);
    broadcast('EMPLOYEE_UPDATED', savedEmployee, clientId);
  }

  res.json({ success: true, employee: savedEmployee });
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
  res.json({ success: true, settings: memoryStore.settings });
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
  memoryStore = JSON.parse(JSON.stringify(DEFAULT_DATA));
  saveStore(memoryStore);
  broadcast('DATA_RESET', memoryStore, clientId);
  res.json({ success: true, data: memoryStore });
});

// ================= VITE & PRODUCTION SETUP =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SYP Attendance & Advances Server running on http://localhost:${PORT}`);
  });
}

startServer();
