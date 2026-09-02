export type UserRole = 'admin' | 'supervisor' | 'employee';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  pin?: string; // 4-digit PIN for quick mobile login
  displayName: string;
  role: UserRole;
  employeeId?: string; // Links to Employee.id if role is 'employee'
  active: boolean;
  createdAt?: number;
}

export interface QrAttendancePayload {
  type: 'SYP_ATTENDANCE_QR';
  company: string;
  date: string; // YYYY-MM-DD
  shiftId?: string;
  shiftName?: string;
  token: string;
  generatedAt: number;
}

export interface WorkShift {
  id: string;
  name: string; // e.g. "الشفت الصباحي", "الشفت المسائي"
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "17:00"
  graceMinutes?: number; // Optional / 0 (no grace period)
  active: boolean;
}

export interface Employee {
  id: string;
  name: string;
  jobTitle: string;
  phone?: string;
  baseSalary: number; // In Syrian Pounds (SYP)
  dailyWorkHours: number; // e.g. 8
  monthlyWorkDays: number; // e.g. 26 or 30
  absentDeductionRate: number; // Multiplier, default 1.0 (1 day salary)
  lateDeductionPerHour?: number; // Custom SYP or calculated
  active: boolean;
  joinedDate: string;
  avatarColor?: string;
  assignedShiftId?: string; // e.g. 'shift-morning' or 'shift-evening'
  maxMonthlyAdvance?: number; // Max SYP advance limit for this employee
  pin?: string; // Quick personal login PIN for employee self-service
  username?: string; // Custom login username for employee
  password?: string; // Custom login password for employee
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'excused';

export interface AttendanceRecord {
  id: string; // `${employeeId}_${date}`
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  lateMinutes?: number;
  departureTime?: string; // وقت المغادرة المسجل من توقيت الجهاز
  departureHours?: number; // عدد ساعات المغادرة (مثلاً 1, 2, 0.5)
  departureMinutes?: number; // عدد دقائق المغادرة
  departureReason?: string; // سبب المغادرة
  departureDeduction?: number; // مبلغ خصم المغادرة بالليرة السورية
  overtimeHours?: number; // عدد ساعات العمل الإضافي (مثلاً 1, 1.5, 2)
  overtimeMinutes?: number; // عدد دقائق العمل الإضافي
  overtimePay?: number; // مبلغ الإضافي المحتسب بالليرة السورية لهذا اليوم
  overtimeReason?: string; // بيان أو سبب العمل الإضافي
  shiftId?: string;
  shiftName?: string;
  customDeduction?: number; // SYP
  note?: string;
  updatedAt: number;
  updatedBy?: string;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number; // In SYP
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
  createdAt: number;
  createdBy?: string;
  approved?: boolean;
}

export type LateDeductionMode = 'proportional_salary' | 'fixed_hour' | 'fixed_minute' | 'multiplier';
export type OvertimeCalculationMode = 'hourly_multiplier' | 'fixed_hour' | 'proportional_salary';

export interface CompanySettings {
  companyName: string;
  logoUrl: string;
  currencySymbol: string; // 'ل.س'
  defaultWorkDays: number; // 26
  defaultWorkHours: number; // 8
  defaultAbsentDeductionMultiplier: number; // 1.0
  defaultLatePenaltyMethod: 'hourly_rate' | 'fixed' | 'none';
  lateDeductionMode?: LateDeductionMode; // 'proportional_salary' | 'fixed_hour' | 'fixed_minute' | 'multiplier'
  lateDeductionAmount?: number; // SYP amount per hour / minute or multiplier
  departureDeductionMode?: 'proportional_salary' | 'fixed_hour' | 'none';
  departureDeductionAmount?: number; // SYP per hour of departure
  // Overtime Calculation Rules (قواعد احتساب العمل الإضافي)
  overtimeMode?: OvertimeCalculationMode; // 'hourly_multiplier' | 'fixed_hour' | 'proportional_salary'
  overtimeRateMultiplier?: number; // e.g. 1.25, 1.5, 2.0 (default 1.25)
  overtimeAmountPerHour?: number; // Fixed SYP per hour (e.g. 15,000 SYP/hr)
  overtimeAutoCalculate?: boolean; // Automatically calculate overtime from checkout time
  directorName: string;
  workStartTime: string; // '08:00'
  workEndTime: string; // '17:00'
  shifts: WorkShift[];
  maxAdvancePerMonth?: number; // Default max monthly advance per employee in SYP (e.g. 2,000,000)
  users?: UserAccount[]; // Configured RBAC accounts
  qrSecretSalt?: string;
}

export interface AppData {
  employees: Employee[];
  advances: SalaryAdvance[];
  attendance: Record<string, AttendanceRecord>; // key: `${employeeId}_${date}`
  settings: CompanySettings;
  lastUpdated: number;
}


export interface EmployeeMonthlySummary {
  employee: Employee;
  month: string; // YYYY-MM
  baseSalary: number;
  dailyRate: number;
  hourlyRate: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  daysHalfDay: number;
  totalLateMinutes: number;
  totalDepartureHours: number;
  totalOvertimeHours: number;
  totalOvertimePay: number;
  totalAdvances: number;
  advancesCount: number;
  absentDeductions: number;
  lateDeductions: number;
  departureDeductions: number;
  halfDayDeductions: number;
  totalDeductions: number;
  netSalary: number;
}

export type SyncEventType = 
  | 'INIT'
  | 'ADVANCE_ADDED'
  | 'ADVANCE_DELETED'
  | 'ATTENDANCE_UPDATED'
  | 'ATTENDANCE_BULK_UPDATED'
  | 'EMPLOYEE_ADDED'
  | 'EMPLOYEE_UPDATED'
  | 'EMPLOYEE_DELETED'
  | 'SETTINGS_UPDATED'
  | 'MONTH_RESET'
  | 'DATA_RESET';

export interface SyncMessage {
  type: SyncEventType;
  payload: any;
  timestamp: number;
  clientId?: string;
}
