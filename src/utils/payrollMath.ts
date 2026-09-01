import { Employee, AttendanceRecord, SalaryAdvance, CompanySettings, EmployeeMonthlySummary, WorkShift } from '../types';

/**
 * Calculates daily rate in SYP based on base salary and monthly workdays.
 */
export function calculateDailyRate(baseSalary: number, monthlyWorkDays: number = 26): number {
  if (!baseSalary || baseSalary <= 0 || !monthlyWorkDays || monthlyWorkDays <= 0) return 0;
  return Math.round(baseSalary / monthlyWorkDays);
}

/**
 * Calculates hourly rate in SYP based on daily rate and daily work hours.
 */
export function calculateHourlyRate(dailyRate: number, dailyWorkHours: number = 8): number {
  if (!dailyRate || dailyRate <= 0 || !dailyWorkHours || dailyWorkHours <= 0) return 0;
  return Math.round(dailyRate / dailyWorkHours);
}

/**
 * Parses "HH:mm" time string into minutes from midnight (0 - 1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h * 60 + m;
}

/**
 * Matches an employee or current time to the most appropriate WorkShift.
 */
export function matchShiftForTime(
  timeStr: string,
  shifts?: WorkShift[],
  assignedShiftId?: string
): WorkShift {
  const defaultShifts: WorkShift[] = [
    {
      id: 'shift-morning',
      name: 'الشفت الصباحي (08:00 ص - 05:00 م)',
      startTime: '08:00',
      endTime: '17:00',
      graceMinutes: 10,
      active: true,
    },
    {
      id: 'shift-evening',
      name: 'الشفت المسائي (05:00 م - 02:00 ص)',
      startTime: '17:00',
      endTime: '02:00',
      graceMinutes: 10,
      active: true,
    }
  ];

  const available = (shifts && shifts.length > 0) ? shifts.filter(s => s.active) : defaultShifts;
  if (available.length === 0) return defaultShifts[0];

  // 1. If employee has an explicitly assigned shift, use it
  if (assignedShiftId) {
    const found = available.find(s => s.id === assignedShiftId);
    if (found) return found;
  }

  // 2. Otherwise auto-match to the closest shift start time
  const currentMins = timeToMinutes(timeStr);
  let bestShift = available[0];
  let minDiff = Infinity;

  for (const s of available) {
    const shiftStartMins = timeToMinutes(s.startTime);
    // Difference between punch time and shift start time
    let diff = Math.abs(currentMins - shiftStartMins);
    if (diff > 720) diff = 1440 - diff; // Circular day wrap
    if (diff < minDiff) {
      minDiff = diff;
      bestShift = s;
    }
  }

  return bestShift;
}

/**
 * Evaluates punch time against a shift to calculate late minutes (No grace period).
 */
export function evaluateLateForShift(
  checkInTime: string,
  shift: WorkShift
): { isLate: boolean; lateMinutes: number; reason: string } {
  if (!checkInTime) {
    return { isLate: false, lateMinutes: 0, reason: '' };
  }

  const checkInMins = timeToMinutes(checkInTime);
  const startMins = timeToMinutes(shift.startTime);

  // Check if punch is after shift start (No grace period)
  let diff = checkInMins - startMins;
  
  // Handle cross-midnight if applicable
  if (diff < -720) diff += 1440;
  if (diff > 720) diff -= 1440;

  if (diff > 0) {
    return {
      isLate: true,
      lateMinutes: diff,
      reason: `تأخير ${diff} دقيقة عن بداية ${shift.name} (${shift.startTime})`,
    };
  }

  return {
    isLate: false,
    lateMinutes: 0,
    reason: 'حاضر في الموعد المحدد',
  };
}

/**
 * Calculates late deduction in SYP based on settings and minutes.
 */
export function calculateLateDeduction(
  lateMinutes: number,
  hourlyRate: number,
  settings?: CompanySettings,
  employee?: Employee
): number {
  if (!lateMinutes || lateMinutes <= 0) return 0;
  
  // If employee has a specific late rate per hour
  if (employee?.lateDeductionPerHour && employee.lateDeductionPerHour > 0) {
    return Math.round(employee.lateDeductionPerHour * (lateMinutes / 60));
  }

  const mode = settings?.lateDeductionMode || 'proportional_salary';
  const customVal = settings?.lateDeductionAmount;

  switch (mode) {
    case 'fixed_hour': {
      const ratePerHour = customVal && customVal > 0 ? customVal : hourlyRate;
      return Math.round(ratePerHour * (lateMinutes / 60));
    }
    case 'fixed_minute': {
      const ratePerMin = customVal && customVal > 0 ? customVal : Math.round(hourlyRate / 60);
      return Math.round(ratePerMin * lateMinutes);
    }
    case 'multiplier': {
      const mult = customVal && customVal > 0 ? customVal : 1.5;
      return Math.round(hourlyRate * (lateMinutes / 60) * mult);
    }
    case 'proportional_salary':
    default:
      return Math.round(hourlyRate * (lateMinutes / 60));
  }
}

/**
 * Calculates departure deduction in SYP based on hours/minutes.
 */
export function calculateDepartureDeduction(
  record: AttendanceRecord,
  hourlyRate: number,
  settings?: CompanySettings
): number {
  if (record.departureDeduction !== undefined && record.departureDeduction >= 0) {
    return record.departureDeduction;
  }

  const hours = record.departureHours || (record.departureMinutes ? record.departureMinutes / 60 : 0);
  if (hours <= 0) return 0;

  const depRate = (settings?.departureDeductionAmount && settings.departureDeductionAmount > 0)
    ? settings.departureDeductionAmount
    : hourlyRate;

  return Math.round(hours * depRate);
}

/**
 * Calculates single attendance day deduction for an employee based on status and departure.
 */
export function calculateDayDeduction(
  employee: Employee,
  record?: AttendanceRecord,
  settings?: CompanySettings
): { deduction: number; lateDeduction: number; departureDeduction: number; reason: string } {
  if (!record) {
    return { deduction: 0, lateDeduction: 0, departureDeduction: 0, reason: '' };
  }

  const workDays = employee.monthlyWorkDays || settings?.defaultWorkDays || 26;
  const workHours = employee.dailyWorkHours || settings?.defaultWorkHours || 8;
  const dailyRate = calculateDailyRate(employee.baseSalary, workDays);
  const hourlyRate = calculateHourlyRate(dailyRate, workHours);

  const depDeduction = calculateDepartureDeduction(record, hourlyRate, settings);

  if (record.customDeduction && record.customDeduction > 0) {
    return { 
      deduction: record.customDeduction + depDeduction, 
      lateDeduction: record.customDeduction,
      departureDeduction: depDeduction,
      reason: 'خصم مخصص' + (depDeduction > 0 ? ` + خصم مغادرة (${record.departureHours || 0} س)` : '')
    };
  }

  switch (record.status) {
    case 'absent': {
      const multiplier = employee.absentDeductionRate || settings?.defaultAbsentDeductionMultiplier || 1.0;
      const deduction = Math.round(dailyRate * multiplier);
      return { deduction, lateDeduction: 0, departureDeduction: 0, reason: `غياب يوم (${multiplier} يوم)` };
    }
    case 'half_day': {
      const deduction = Math.round(dailyRate * 0.5) + depDeduction;
      return { deduction, lateDeduction: Math.round(dailyRate * 0.5), departureDeduction: depDeduction, reason: 'نصف يوم عمل' };
    }
    case 'late': {
      const lateMins = record.lateMinutes || 60;
      const lateDed = calculateLateDeduction(lateMins, hourlyRate, settings, employee);
      const totalDed = lateDed + depDeduction;
      const reason = `تأخير ${lateMins} دقيقة` + (depDeduction > 0 ? ` + مغادرة ${record.departureHours} س` : '');
      return { deduction: totalDed, lateDeduction: lateDed, departureDeduction: depDeduction, reason };
    }
    case 'present': {
      if (depDeduction > 0) {
        return { 
          deduction: depDeduction, 
          lateDeduction: 0, 
          departureDeduction: depDeduction, 
          reason: `مغادرة مبكرة ${record.departureHours || (record.departureMinutes ? (record.departureMinutes / 60).toFixed(1) : 0)} ساعة` 
        };
      }
      return { deduction: 0, lateDeduction: 0, departureDeduction: 0, reason: '' };
    }
    default:
      return { deduction: depDeduction, lateDeduction: 0, departureDeduction: depDeduction, reason: '' };
  }
}

/**
 * Computes monthly summary for an employee across attendance records and advances.
 */
export function computeEmployeeMonthlySummary(
  employee: Employee,
  yearMonth: string, // 'YYYY-MM'
  allAttendance: Record<string, AttendanceRecord>,
  allAdvances: SalaryAdvance[],
  settings?: CompanySettings
): EmployeeMonthlySummary {
  const workDays = employee.monthlyWorkDays || settings?.defaultWorkDays || 26;
  const workHours = employee.dailyWorkHours || settings?.defaultWorkHours || 8;
  const dailyRate = calculateDailyRate(employee.baseSalary, workDays);
  const hourlyRate = calculateHourlyRate(dailyRate, workHours);

  let daysPresent = 0;
  let daysAbsent = 0;
  let daysLate = 0;
  let daysHalfDay = 0;
  let totalLateMinutes = 0;
  let totalDepartureHours = 0;
  let absentDeductions = 0;
  let lateDeductions = 0;
  let departureDeductions = 0;
  let halfDayDeductions = 0;

  // Filter attendance for this employee in this month
  Object.values(allAttendance).forEach(record => {
    if (record.employeeId === employee.id && record.date.startsWith(yearMonth)) {
      // Track departure hours
      if (record.departureHours && record.departureHours > 0) {
        totalDepartureHours += record.departureHours;
      } else if (record.departureMinutes && record.departureMinutes > 0) {
        totalDepartureHours += record.departureMinutes / 60;
      }

      const depDed = calculateDepartureDeduction(record, hourlyRate, settings);
      departureDeductions += depDed;

      if (record.status === 'present') {
        daysPresent++;
      } else if (record.status === 'absent') {
        daysAbsent++;
        const multiplier = employee.absentDeductionRate || settings?.defaultAbsentDeductionMultiplier || 1.0;
        const ded = record.customDeduction !== undefined && record.customDeduction > 0 
          ? record.customDeduction 
          : Math.round(dailyRate * multiplier);
        absentDeductions += ded;
      } else if (record.status === 'half_day') {
        daysHalfDay++;
        const ded = record.customDeduction !== undefined && record.customDeduction > 0 
          ? record.customDeduction 
          : Math.round(dailyRate * 0.5);
        halfDayDeductions += ded;
      } else if (record.status === 'late') {
        daysLate++;
        const lateMins = record.lateMinutes || 60;
        totalLateMinutes += lateMins;
        const ded = record.customDeduction !== undefined && record.customDeduction > 0 
          ? record.customDeduction 
          : calculateLateDeduction(lateMins, hourlyRate, settings, employee);
        lateDeductions += ded;
      }
    }
  });

  // Filter advances for this employee in this month
  const empAdvances = allAdvances.filter(
    adv => adv.employeeId === employee.id && adv.date.startsWith(yearMonth)
  );

  const totalAdvances = empAdvances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
  const totalDeductions = absentDeductions + lateDeductions + halfDayDeductions + departureDeductions;
  const netSalary = Math.max(0, employee.baseSalary - totalAdvances - totalDeductions);

  return {
    employee,
    month: yearMonth,
    baseSalary: employee.baseSalary,
    dailyRate,
    hourlyRate,
    daysPresent,
    daysAbsent,
    daysLate,
    daysHalfDay,
    totalLateMinutes,
    totalDepartureHours: Math.round(totalDepartureHours * 10) / 10,
    totalAdvances,
    advancesCount: empAdvances.length,
    absentDeductions,
    lateDeductions,
    departureDeductions,
    halfDayDeductions,
    totalDeductions,
    netSalary,
  };
}
