import { AppData, UserAccount } from '../types';

export const DEFAULT_ACCOUNTS: UserAccount[] = [
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

export const INITIAL_APP_DATA: AppData = {
  settings: {
    companyName: 'مؤسسة كورتادو للتجارة',
    logoUrl: '',
    currencySymbol: 'ل.س',
    defaultWorkDays: 26,
    defaultWorkHours: 8,
    defaultAbsentDeductionMultiplier: 1.0,
    defaultLatePenaltyMethod: 'hourly_rate',
    directorName: 'الإدارة العامة',
    workStartTime: '08:00',
    workEndTime: '17:00',
    maxAdvancePerMonth: 2000000, // 2,000,000 SYP default max monthly advance per employee
    users: DEFAULT_ACCOUNTS,
    qrSecretSalt: 'syp_salt_' + Math.random().toString(36).substring(2, 8),
    shifts: [
      {
        id: 'shift-1',
        name: 'الشفت الصباحي',
        startTime: '08:00',
        endTime: '17:00',
        graceMinutes: 0,
        active: true,
      },
      {
        id: 'shift-2',
        name: 'الشفت المسائي',
        startTime: '17:00',
        endTime: '02:00',
        graceMinutes: 0,
        active: true,
      }
    ],
  },
  employees: [],
  advances: [],
  attendance: {},
  lastUpdated: Date.now(),
};

