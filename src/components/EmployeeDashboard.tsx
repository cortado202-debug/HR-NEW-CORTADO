import React, { useState } from 'react';
import { Employee, AttendanceRecord, SalaryAdvance, CompanySettings, UserAccount } from '../types';
import { 
  formatSYP, 
  getTodayDateString, 
  getCurrentTimeString, 
  formatArabicDate, 
  getStatusBadge 
} from '../utils/formatters';
import { computeEmployeeMonthlySummary } from '../utils/payrollMath';
import { QrScannerModal } from './QrScannerModal';

import { 
  Camera, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Banknote, 
  Receipt, 
  LogOut, 
  AlertCircle, 
  User, 
  TrendingUp, 
  ClockPlus,
  ShieldCheck,
  Printer,
  Building2
} from 'lucide-react';

interface EmployeeDashboardProps {
  employee: Employee;
  userAccount: UserAccount;
  settings: CompanySettings;
  attendance: Record<string, AttendanceRecord>;
  advances: SalaryAdvance[];
  onRecordSelfAttendance: (record: AttendanceRecord) => Promise<AttendanceRecord>;
  onViewReceipt: (advance: SalaryAdvance) => void;
  onLogout: () => void;
  onSwitchRole?: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  employee,
  userAccount,
  settings,
  attendance,
  advances,
  onRecordSelfAttendance,
  onViewReceipt,
  onLogout,
  onSwitchRole,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<'attendance' | 'advances'>('attendance');

  const todayStr = getTodayDateString();
  const todayRecordKey = `${employee.id}_${todayStr}`;
  const todayAttendance = attendance[todayRecordKey];
  const isPresentToday = todayAttendance && todayAttendance.status === 'present';

  // Calculate personal monthly metrics
  const [currentYear, currentMonth] = todayStr.split('-');
  const currentMonthStr = `${currentYear}-${currentMonth}`;

  const summary = computeEmployeeMonthlySummary(
    employee,
    currentMonthStr,
    attendance,
    advances,
    settings
  );

  // Personal advances
  const employeeAdvances = advances.filter((a) => a.employeeId === employee.id);
  const thisMonthAdvances = employeeAdvances.filter((a) => a.date.startsWith(currentMonthStr));

  // Personal attendance records for current month
  const thisMonthAttendanceRecords = (Object.values(attendance) as AttendanceRecord[])
    .filter((r) => r.employeeId === employee.id && r.date.startsWith(currentMonthStr))
    .sort((a, b) => b.date.localeCompare(a.date));


  const handleScanSuccess = async (checkInTime: string, note?: string) => {
    const record: AttendanceRecord = {
      id: todayRecordKey,
      employeeId: employee.id,
      date: todayStr,
      status: 'present',
      checkInTime: checkInTime,
      shiftId: employee.assignedShiftId || settings.shifts[0]?.id,
      shiftName: settings.shifts.find((s) => s.id === employee.assignedShiftId)?.name || settings.shifts[0]?.name,
      note: note || 'حضور ذاتي عبر مسح باركود QR',
      updatedAt: Date.now(),
      updatedBy: employee.name,
    };

    await onRecordSelfAttendance(record);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 animate-fadeIn">
      
      {/* 1. TOP COMPANY BRANDING HEADER (مطابق لترويسة الموقع والشعار) */}
      <header className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.companyName || 'شعار الشركة'}
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-contain border border-slate-200 bg-slate-50 p-1 flex-shrink-0 shadow-2xs"
            />
          ) : (
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-lg sm:text-xl flex-shrink-0 shadow-2xs">
              {settings.companyName ? settings.companyName.charAt(0) : <Building2 className="w-5 h-5" />}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 truncate leading-tight">
                {settings.companyName || 'منظومة سلف وحضور الموظفين'}
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex-shrink-0">
                <User className="w-3 h-3 text-emerald-600" />
                <span>بوابة الموظف الذاتية</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {formatArabicDate(todayStr)} • {settings.directorName ? `إدارة: ${settings.directorName}` : 'نظام الحضور والرواتب السحابي'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onSwitchRole && (
            <button
              onClick={onSwitchRole}
              className="hidden sm:inline-flex px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              تبديل الحساب
            </button>
          )}
          <button
            onClick={onLogout}
            id="btn-employee-logout"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </header>

      {/* 2. Employee Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 font-extrabold flex items-center justify-center text-lg shadow-2xs">
            {employee.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {employee.name}
              </h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md">
                {employee.jobTitle || 'موظف'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {employee.phone ? `هاتف: ${employee.phone} • ` : ''}الدوام اليومي: {employee.dailyWorkHours || 8} ساعات • {employee.monthlyWorkDays || 26} يوم عمل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>الشفت: {settings.shifts.find(s => s.id === employee.assignedShiftId)?.name || 'الشفت الصباحي'}</span>
        </div>
      </div>

      {/* Main Action Banner: QR Scan / Today Status */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-md mb-5 relative overflow-hidden">
        
        {/* Subtle accent backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 text-emerald-400 rounded-lg text-xs font-bold mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatArabicDate(todayStr)}</span>
            </div>

            <h2 className="text-lg sm:text-xl font-black">
              {isPresentToday ? 'تم تسجيل حضورك اليوم بنجاح' : 'تسجيل حضور اليوم عبر باركود المشرف'}
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
              {isPresentToday
                ? `وقت تسجيل الدخول: ${todayAttendance.checkInTime || '—'} (${todayAttendance.shiftName || 'الشفت المعتمد'})`
                : 'اضغط على الزر لمسح رمز الباركود المعروض على شاشة المشرف أو التابلت لتثبيت حضورك.'}
            </p>
          </div>

          <div className="flex-shrink-0 w-full sm:w-auto">
            {isPresentToday ? (
              <div className="flex items-center gap-2 px-5 py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>حاضر اليوم ({todayAttendance.checkInTime})</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                id="btn-open-qr-scanner"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
              >
                <Camera className="w-5 h-5" />
                <span>مسح باركود الحضور (QR Check-In)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Personal Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        
        {/* Days Present */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">أيام الحضور</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900">
            {summary.daysPresent} <span className="text-xs font-normal text-slate-500">يوم</span>
          </div>
        </div>

        {/* Overtime */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-semibold">العمل الإضافي</span>
            <ClockPlus className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-700 truncate">
            {summary.totalOvertimeHours > 0 ? (
              <span>+{formatSYP(summary.totalOvertimePay)}</span>
            ) : (
              <span className="text-emerald-600/70 font-normal">0 ل.س</span>
            )}
          </div>
          <span className="text-[10px] text-emerald-600 font-mono block">
            {summary.totalOvertimeHours || 0} ساعة إضافية
          </span>
        </div>

        {/* Days Absent */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">أيام الغياب</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-700">
            {summary.daysAbsent} <span className="text-xs font-normal text-slate-500">يوم</span>
          </div>
        </div>

        {/* Total Advances */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">سلف هذا الشهر</span>
            <Banknote className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-amber-900 truncate">
            {formatSYP(summary.totalAdvances)}
          </div>
        </div>

        {/* Estimated Net Salary */}
        <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-xs font-semibold">صافي الراتب المتوقع</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 truncate">
            {formatSYP(summary.netSalary)}
          </div>
        </div>

      </div>

      {/* Tabs: Attendance History vs Advances History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
          <button
            onClick={() => setSelectedTab('attendance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedTab === 'attendance'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            سجل دوامي هذا الشهر ({thisMonthAttendanceRecords.length})
          </button>
          <button
            onClick={() => setSelectedTab('advances')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedTab === 'advances'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            سجل السلف الشخصية ({thisMonthAdvances.length})
          </button>
        </div>

        {/* Tab 1: Attendance Log */}
        {selectedTab === 'attendance' && (
          <div>
            {thisMonthAttendanceRecords.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                لا توجد سجلات حضور مسجلة لهذا الشهر بعد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5">وقت الدخول</th>
                      <th className="p-2.5">وقت الخروج</th>
                      <th className="p-2.5 text-emerald-800">العمل الإضافي</th>
                      <th className="p-2.5">الشفت / ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {thisMonthAttendanceRecords.map((rec) => {
                      const badge = getStatusBadge(rec.status);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold font-mono text-slate-900">
                            {formatArabicDate(rec.date)}
                          </td>
                          <td className="p-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">
                            {rec.checkInTime || '—'}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">
                            {rec.checkOutTime || (rec.departureHours ? `${rec.departureHours}س مغادرة` : '—')}
                          </td>
                          <td className="p-2.5 font-mono text-emerald-700 font-bold">
                            {rec.overtimeHours && rec.overtimeHours > 0 ? (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
                                +{rec.overtimeHours} ساعة
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-2.5 text-slate-500 text-[11px]">
                            {rec.overtimeReason || rec.departureReason || rec.shiftName || rec.note || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Advances Log */}
        {selectedTab === 'advances' && (
          <div>
            {thisMonthAdvances.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                لا توجد سلف مسحوبة خلال هذا الشهر.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-2.5">المبلغ</th>
                      <th className="p-2.5">التاريخ والوقت</th>
                      <th className="p-2.5">البيان</th>
                      <th className="p-2.5 text-center">الإيصال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {thisMonthAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-bold font-mono text-emerald-800">
                          {formatSYP(adv.amount)}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          <span>{formatArabicDate(adv.date)}</span>
                          {adv.time && <span className="text-slate-400 text-[10px] mr-1">({adv.time})</span>}
                        </td>
                        <td className="p-2.5 text-slate-500">
                          {adv.note || '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => onViewReceipt(adv)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>عرض الإيصال</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* QR Camera Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        employeeName={employee.name}
        companyName={settings.companyName}
        onScanSuccess={handleScanSuccess}
      />

    </div>
  );
};
