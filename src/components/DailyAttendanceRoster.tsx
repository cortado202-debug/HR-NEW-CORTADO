import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, AttendanceStatus, CompanySettings, WorkShift } from '../types';
import { 
  formatSYP, 
  getTodayDateString, 
  getCurrentTimeString, 
  formatArabicDate 
} from '../utils/formatters';
import { 
  matchShiftForTime, 
  evaluateLateForShift, 
  calculateDayDeduction, 
  calculateDailyRate, 
  calculateHourlyRate 
} from '../utils/payrollMath';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DoorOpen, 
  X, 
  SunMedium, 
  Check, 
  UserCheck, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  Zap,
  Edit2
} from 'lucide-react';

interface DailyAttendanceRosterProps {
  employees: Employee[];
  attendance: Record<string, AttendanceRecord>;
  settings: CompanySettings;
  onUpdateAttendance: (record: AttendanceRecord) => Promise<AttendanceRecord>;
  onBulkUpdateAttendance: (records: AttendanceRecord[]) => Promise<boolean>;
  onOpenLateModal: (employee: Employee, record: AttendanceRecord | null, date: string) => void;
  onOpenDepartureModal: (employee: Employee, record: AttendanceRecord | null, date: string) => void;
  onOpenLedger?: () => void;
}

export const DailyAttendanceRoster: React.FC<DailyAttendanceRosterProps> = ({
  employees,
  attendance,
  settings,
  onUpdateAttendance,
  onBulkUpdateAttendance,
  onOpenLateModal,
  onOpenDepartureModal,
  onOpenLedger,
}) => {
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [liveTime, setLiveTime] = useState<string>(getCurrentTimeString());

  // Update live clock and auto rollover day when midnight passes
  useEffect(() => {
    const timer = setInterval(() => {
      const now = getCurrentTimeString();
      setLiveTime(now);
      const currentDay = getTodayDateString();
      if (selectedDate !== currentDay && selectedDate === todayStr) {
        setSelectedDate(currentDay);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedDate, todayStr]);

  const activeEmployees = employees.filter((e) => e.active);
  const isToday = selectedDate === todayStr;

  // Filter employees
  const filteredEmployees = activeEmployees.filter((emp) => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    const rec = attendance[`${emp.id}_${selectedDate}`];
    if (statusFilter === 'unmarked') return !rec;
    return rec?.status === statusFilter;
  });

  // Calculate day summary metrics
  let dayPresent = 0;
  let dayAbsent = 0;
  let dayLate = 0;
  let dayHalfDay = 0;
  let dayDepartures = 0;
  let dayTotalDepartureHours = 0;
  let dayTotalLateMins = 0;
  let dayTotalDeductions = 0;

  activeEmployees.forEach((emp) => {
    const rec = attendance[`${emp.id}_${selectedDate}`];
    if (rec) {
      if (rec.status === 'present') dayPresent++;
      else if (rec.status === 'absent') dayAbsent++;
      else if (rec.status === 'late') {
        dayLate++;
        dayTotalLateMins += rec.lateMinutes || 0;
      } else if (rec.status === 'half_day') dayHalfDay++;

      if (rec.departureHours && rec.departureHours > 0) {
        dayDepartures++;
        dayTotalDepartureHours += rec.departureHours;
      }

      const { deduction } = calculateDayDeduction(emp, rec, settings);
      dayTotalDeductions += deduction;
    }
  });

  const totalMarked = dayPresent + dayAbsent + dayLate + dayHalfDay;

  // 1-Click fast punch for a specific row
  const handleQuickRowPunch = async (employee: Employee, status: AttendanceStatus) => {
    const punchTime = isToday ? getCurrentTimeString() : '08:00';
    const shift = matchShiftForTime(punchTime, settings.shifts, employee.assignedShiftId);
    const evaluation = evaluateLateForShift(punchTime, shift);

    let finalStatus: AttendanceStatus = status;
    let lateMins: number | undefined = undefined;

    if (status === 'present' && isToday) {
      if (evaluation.isLate) {
        finalStatus = 'late';
        lateMins = evaluation.lateMinutes;
      }
    } else if (status === 'late') {
      lateMins = evaluation.isLate ? evaluation.lateMinutes : 45;
    }

    const existing = attendance[`${employee.id}_${selectedDate}`];
    const newRecord: AttendanceRecord = {
      id: `${employee.id}_${selectedDate}`,
      employeeId: employee.id,
      date: selectedDate,
      status: finalStatus,
      checkInTime: status === 'absent' ? undefined : (existing?.checkInTime || punchTime),
      checkOutTime: existing?.checkOutTime,
      departureTime: existing?.departureTime,
      departureHours: existing?.departureHours,
      departureReason: existing?.departureReason,
      departureDeduction: existing?.departureDeduction,
      lateMinutes: lateMins,
      shiftId: shift.id,
      shiftName: shift.name,
      note: existing?.note || (finalStatus === 'late' && evaluation.isLate ? evaluation.reason : undefined),
      updatedAt: Date.now(),
    };

    await onUpdateAttendance(newRecord);
  };

  // Quick mark all present
  const handleMarkAllPresent = async () => {
    const punchTime = '08:00';
    const updates: AttendanceRecord[] = activeEmployees.map((emp) => {
      const shift = matchShiftForTime(punchTime, settings.shifts, emp.assignedShiftId);
      const existing = attendance[`${emp.id}_${selectedDate}`];
      return {
        id: `${emp.id}_${selectedDate}`,
        employeeId: emp.id,
        date: selectedDate,
        status: 'present',
        checkInTime: existing?.checkInTime || punchTime,
        checkOutTime: existing?.checkOutTime,
        departureTime: existing?.departureTime,
        departureHours: existing?.departureHours,
        departureReason: existing?.departureReason,
        departureDeduction: existing?.departureDeduction,
        shiftId: shift.id,
        shiftName: shift.name,
        note: existing?.note,
        updatedAt: Date.now(),
      };
    });

    await onBulkUpdateAttendance(updates);
  };

  // Change date by offset
  const changeDateBy = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden mb-5">
      
      {/* Header Bar */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Title & Live Status */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg flex-shrink-0">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  سجل الدوام والحضور اليومي المباشر
                </h3>
                {isToday ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    مباشر: {liveTime}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                    أرشيف تاريخ سابق
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                يتجدد تلقائياً كل يوم مع تاريخ الجهاز، وتُحفظ السجلات شهرياً لاحتساب دقائق التأخير والغياب
              </p>
            </div>
          </div>

          {/* Date Selector & Navigation */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={() => changeDateBy(1)}
              title="اليوم التالي"
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-bold font-mono px-3 py-1.5 rounded-lg focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

            <button
              onClick={() => changeDateBy(-1)}
              title="اليوم السابق"
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>العودة لليوم</span>
              </button>
            )}

            {/* Quick Button to Open Full Ledger Modal */}
            <button
              onClick={onOpenLedger}
              className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>كشف الحضور الشهري الشامل</span>
            </button>
          </div>

        </div>

        {/* Day Metric Pills Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">حاضر:</span>
            <span className="font-bold font-mono text-emerald-700 text-sm">{dayPresent}</span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">متأخر:</span>
            <span className="font-bold font-mono text-amber-700 text-sm">{dayLate} ({dayTotalLateMins} د)</span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">مغادرات:</span>
            <span className="font-bold font-mono text-indigo-700 text-sm">{dayDepartures} ({dayTotalDepartureHours} س)</span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">غائب:</span>
            <span className="font-bold font-mono text-rose-700 text-sm">{dayAbsent}</span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">نصف يوم:</span>
            <span className="font-bold font-mono text-sky-700 text-sm">{dayHalfDay}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-slate-900 text-white p-2 rounded-lg flex items-center justify-between shadow-2xs">
            <span className="text-slate-300 text-[11px] font-semibold">خصومات اليوم:</span>
            <span className="font-bold font-mono text-rose-400 text-xs sm:text-sm">{formatSYP(dayTotalDeductions)}</span>
          </div>
        </div>

        {/* Search, Filter & Bulk Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث عن موظف أو مسمى..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 text-xs rounded-lg pr-8 pl-3 py-1.5 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:bg-white outline-none"
            >
              <option value="all">كل الحالات ({activeEmployees.length})</option>
              <option value="present">حاضر فقط</option>
              <option value="late">متأخر فقط</option>
              <option value="absent">غائب فقط</option>
              <option value="unmarked">غير مسجل</option>
            </select>
          </div>

          {/* Bulk Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleMarkAllPresent}
              className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تحضير الكل كحاضرين بالموعد</span>
            </button>
          </div>

        </div>

      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px]">
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3">الموظف</th>
              <th className="p-3">الشفت المعتمد</th>
              <th className="p-3">وقت الحضور</th>
              <th className="p-3">مغادرة / إذن</th>
              <th className="p-3">حالة اليوم</th>
              <th className="p-3">دقائق التأخير</th>
              <th className="p-3">خصم اليوم (SYP)</th>
              <th className="p-3">البيان / ملاحظة</th>
              <th className="p-3 text-center">إجراء سريع بضغطة زر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <UserCheck className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-bold text-slate-700">لا يوجد موظفون مسجلون حالياً</p>
                    <p className="text-[11px] text-slate-400">
                      يمكنك البدء بإضافة الموظفين وتحديد رواتبهم وشفتاتهم من زر الإعدادات في أعلى الشاشة
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp, idx) => {
              const rec = attendance[`${emp.id}_${selectedDate}`];
              const shift = matchShiftForTime(rec?.checkInTime || '08:00', settings.shifts, emp.assignedShiftId);
              const { deduction, lateDeduction, departureDeduction } = calculateDayDeduction(emp, rec, settings);

              return (
                <tr 
                  key={emp.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    rec?.status === 'late' 
                      ? 'bg-amber-50/30' 
                      : rec?.status === 'absent' 
                      ? 'bg-rose-50/30' 
                      : ''
                  }`}
                >
                  {/* Row index */}
                  <td className="p-3 text-center font-mono text-slate-400 font-semibold">
                    {idx + 1}
                  </td>

                  {/* Employee Name & Title */}
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{emp.name}</div>
                    <div className="text-[10px] text-slate-500">{emp.jobTitle} • {formatSYP(emp.baseSalary)}</div>
                  </td>

                  {/* Shift */}
                  <td className="p-3">
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {shift.name} ({shift.startTime})
                    </span>
                  </td>

                  {/* Check In Time */}
                  <td className="p-3 font-mono font-bold text-slate-800">
                    {rec?.checkInTime || <span className="text-slate-300 font-normal">--:--</span>}
                  </td>

                  {/* Departure (مغادرة / إذن) */}
                  <td className="p-3">
                    {rec?.departureHours && rec.departureHours > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          <DoorOpen className="w-3 h-3 text-indigo-600" />
                          <span>{rec.departureHours} ساعة</span>
                          {rec.departureTime && <span className="font-mono">({rec.departureTime})</span>}
                        </span>
                        {departureDeduction > 0 && (
                          <span className="text-[10px] font-mono text-rose-600">
                            خصم: {formatSYP(departureDeduction)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300 font-normal">—</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="p-3">
                    {rec ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        rec.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'late'
                          ? 'bg-amber-100 text-amber-900'
                          : rec.status === 'absent'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {rec.status === 'present' && '🟢 حاضر'}
                        {rec.status === 'late' && '🟠 متأخر'}
                        {rec.status === 'absent' && '🔴 غائب'}
                        {rec.status === 'half_day' && '🔵 نصف يوم'}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium text-[11px]">لم يُسجل بعد</span>
                    )}
                  </td>

                  {/* Late Minutes */}
                  <td className="p-3 font-mono font-bold">
                    {rec?.lateMinutes && rec.lateMinutes > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                          {rec.lateMinutes} دقيقة
                        </span>
                        {lateDeduction > 0 && (
                          <span className="text-[10px] font-mono text-rose-600">
                            خصم: {formatSYP(lateDeduction)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Daily Deduction (SYP) */}
                  <td className="p-3 font-mono font-bold">
                    {deduction > 0 ? (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {formatSYP(deduction)}
                      </span>
                    ) : (
                      <span className="text-slate-400">0 ل.س</span>
                    )}
                  </td>

                  {/* Note */}
                  <td className="p-3 text-slate-600 max-w-[160px] truncate text-[11px]">
                    {rec?.note || <span className="text-slate-300">—</span>}
                  </td>

                  {/* Fast Punch Action Buttons */}
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      
                      {/* Mark Present */}
                      <button
                        onClick={() => handleQuickRowPunch(emp, 'present')}
                        title="حضور الآن بضغطة زر"
                        className={`p-1.5 rounded-lg border transition-all ${
                          rec?.status === 'present'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      {/* Custom Late Modal */}
                      <button
                        onClick={() => onOpenLateModal(emp, rec, selectedDate)}
                        title="تعديل التأخير بدقة والخصم"
                        className={`p-1.5 rounded-lg border transition-all ${
                          rec?.status === 'late'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                            : 'bg-white hover:bg-amber-50 text-amber-700 border-slate-200'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>

                      {/* Departure Modal */}
                      <button
                        onClick={() => onOpenDepartureModal(emp, rec, selectedDate)}
                        title="تسجيل مغادرة / إذن خروج وتحديد الساعات"
                        className={`p-1.5 rounded-lg border transition-all ${
                          rec?.departureHours && rec.departureHours > 0
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white hover:bg-indigo-50 text-indigo-700 border-slate-200'
                        }`}
                      >
                        <DoorOpen className="w-3.5 h-3.5" />
                      </button>

                      {/* Mark Absent */}
                      <button
                        onClick={() => handleQuickRowPunch(emp, 'absent')}
                        title="تسجيل غياب اليوم"
                        className={`p-1.5 rounded-lg border transition-all ${
                          rec?.status === 'absent'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border-slate-200'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </td>

                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

    </section>
  );
};
