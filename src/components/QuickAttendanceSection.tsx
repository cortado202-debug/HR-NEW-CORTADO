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
  UserCheck, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  DoorOpen, 
  XCircle, 
  SunMedium, 
  ChevronDown, 
  User, 
  Briefcase, 
  Sparkles,
  Zap,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

interface QuickAttendanceSectionProps {
  employees: Employee[];
  attendance: Record<string, AttendanceRecord>;
  settings: CompanySettings;
  onUpdateAttendance: (record: AttendanceRecord) => Promise<AttendanceRecord>;
  onBulkUpdateAttendance?: (records: AttendanceRecord[]) => Promise<boolean>;
  onOpenLateModal?: (employee: Employee, record: AttendanceRecord | null, date: string) => void;
  onOpenDepartureModal?: (employee: Employee, record: AttendanceRecord | null, date: string) => void;
  onOpenLedger?: () => void;
}

export const QuickAttendanceSection: React.FC<QuickAttendanceSectionProps> = ({
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<{ text: string; type: 'present' | 'late' | 'absent' | 'half_day' | 'checkout' } | null>(null);
  const [showRecentDrawer, setShowRecentDrawer] = useState<boolean>(false);

  // Live timer clock
  const [liveTimeString, setLiveTimeString] = useState<string>(getCurrentTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      const nowTime = getCurrentTimeString();
      setLiveTimeString(nowTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync date if day rolled over
  useEffect(() => {
    const currentDay = getTodayDateString();
    if (date !== currentDay && date === todayStr) {
      setDate(currentDay);
    }
  }, [liveTimeString]);

  const activeEmployees = employees.filter((e) => e.active);
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Selected or auto-matched shift
  const currentShifts = settings.shifts && settings.shifts.length > 0 ? settings.shifts : [
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
  ];

  const matchedShift: WorkShift = selectedShiftId
    ? currentShifts.find((s) => s.id === selectedShiftId) || currentShifts[0]
    : matchShiftForTime(time || liveTimeString, currentShifts, selectedEmployee?.assignedShiftId);

  // Existing record for selected employee on chosen date
  const existingRecord: AttendanceRecord | null = selectedEmployeeId
    ? attendance[`${selectedEmployeeId}_${date}`] || null
    : null;

  // Real-time calculation preview when punching in now
  const lateEvaluation = evaluateLateForShift(time || liveTimeString, matchedShift);

  // Summary Metrics for chosen date
  let todayPresent = 0;
  let todayAbsent = 0;
  let todayLate = 0;
  let todayHalfDay = 0;
  let todayTotalDeductions = 0;
  let todayTotalLateMinutes = 0;

  activeEmployees.forEach((emp) => {
    const rec = attendance[`${emp.id}_${date}`];
    if (rec) {
      if (rec.status === 'present') todayPresent++;
      else if (rec.status === 'absent') todayAbsent++;
      else if (rec.status === 'late') {
        todayLate++;
        todayTotalLateMinutes += rec.lateMinutes || 0;
      } else if (rec.status === 'half_day') todayHalfDay++;

      const { deduction } = calculateDayDeduction(emp, rec, settings);
      todayTotalDeductions += deduction;
    }
  });

  const totalCheckedIn = todayPresent + todayLate + todayHalfDay;
  const attendanceRate = activeEmployees.length > 0 
    ? Math.round((totalCheckedIn / activeEmployees.length) * 100) 
    : 0;

  // 1-Click Fast Punch In (حضور ذكي وسريع)
  const handleQuickCheckIn = async () => {
    if (!selectedEmployeeId || !selectedEmployee) {
      alert('يرجى اختيار الموظف أولاً من القائمة');
      return;
    }

    const punchTime = time || getCurrentTimeString();
    const evaluation = evaluateLateForShift(punchTime, matchedShift);
    const punchDate = date || todayStr;

    setIsSubmitting(true);
    try {
      const isLate = evaluation.isLate;
      const status: AttendanceStatus = isLate ? 'late' : 'present';
      const lateMins = isLate ? evaluation.lateMinutes : undefined;

      const newRecord: AttendanceRecord = {
        id: `${selectedEmployee.id}_${punchDate}`,
        employeeId: selectedEmployee.id,
        date: punchDate,
        status,
        checkInTime: punchTime,
        checkOutTime: existingRecord?.checkOutTime,
        lateMinutes: lateMins,
        shiftId: matchedShift.id,
        shiftName: matchedShift.name,
        note: note.trim() || existingRecord?.note || (isLate ? evaluation.reason : undefined),
        updatedAt: Date.now(),
      };

      await onUpdateAttendance(newRecord);

      if (isLate) {
        const dailyRate = calculateDailyRate(selectedEmployee.baseSalary, selectedEmployee.monthlyWorkDays || settings.defaultWorkDays);
        const hourlyRate = calculateHourlyRate(dailyRate, selectedEmployee.dailyWorkHours || settings.defaultWorkHours);
        const lateDeduction = Math.round(hourlyRate * (lateMins! / 60));

        setSuccessMessage({
          text: `تم تسجيل حضور "${selectedEmployee.name}" الساعة (${punchTime}) - متأخر ${lateMins} دقيقة (خصم تلقائي: ${formatSYP(lateDeduction)})`,
          type: 'late',
        });
      } else {
        setSuccessMessage({
          text: `تم تسجيل حضور "${selectedEmployee.name}" الساعة (${punchTime}) - حاضر بالموعد المحدد (${matchedShift.name})`,
          type: 'present',
        });
      }

      setTimeout(() => setSuccessMessage(null), 6000);
      setNote('');
    } catch (err) {
      alert('حدث خطأ أثناء تسجيل الحضور');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Departure modal for selected employee
  const handleOpenDeparture = () => {
    if (!selectedEmployeeId || !selectedEmployee) {
      alert('يرجى اختيار الموظف أولاً من القائمة');
      return;
    }
    if (onOpenDepartureModal) {
      onOpenDepartureModal(selectedEmployee, existingRecord, date);
    }
  };

  // 1-Click Mark Absent
  const handleMarkAbsent = async () => {
    if (!selectedEmployeeId || !selectedEmployee) {
      alert('يرجى اختيار الموظف أولاً');
      return;
    }

    const punchDate = date || todayStr;
    const dailyRate = calculateDailyRate(selectedEmployee.baseSalary, selectedEmployee.monthlyWorkDays || settings.defaultWorkDays);
    const absentDeduction = Math.round(dailyRate * (selectedEmployee.absentDeductionRate || settings.defaultAbsentDeductionMultiplier || 1.0));

    setIsSubmitting(true);
    try {
      const rec: AttendanceRecord = {
        id: `${selectedEmployee.id}_${punchDate}`,
        employeeId: selectedEmployee.id,
        date: punchDate,
        status: 'absent',
        shiftId: matchedShift.id,
        shiftName: matchedShift.name,
        note: note.trim() || 'غياب كامل اليوم',
        updatedAt: Date.now(),
      };

      await onUpdateAttendance(rec);

      setSuccessMessage({
        text: `تم تسجيل غياب "${selectedEmployee.name}" اليوم (خصم اليومية: ${formatSYP(absentDeduction)})`,
        type: 'absent',
      });
      setTimeout(() => setSuccessMessage(null), 5000);
      setNote('');
    } catch (err) {
      alert('حدث خطأ أثناء تسجيل الغياب');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Mark Half Day
  const handleMarkHalfDay = async () => {
    if (!selectedEmployeeId || !selectedEmployee) {
      alert('يرجى اختيار الموظف أولاً');
      return;
    }

    const punchDate = date || todayStr;
    const punchTime = time || getCurrentTimeString();

    setIsSubmitting(true);
    try {
      const rec: AttendanceRecord = {
        id: `${selectedEmployee.id}_${punchDate}`,
        employeeId: selectedEmployee.id,
        date: punchDate,
        status: 'half_day',
        checkInTime: existingRecord?.checkInTime || punchTime,
        shiftId: matchedShift.id,
        shiftName: matchedShift.name,
        note: note.trim() || 'دوام نصف يوم',
        updatedAt: Date.now(),
      };

      await onUpdateAttendance(rec);

      setSuccessMessage({
        text: `تم تسجيل نصف يوم عمل للموظف "${selectedEmployee.name}"`,
        type: 'half_day',
      });
      setTimeout(() => setSuccessMessage(null), 5000);
      setNote('');
    } catch (err) {
      alert('حدث خطأ أثناء تسجيل نصف اليوم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to live system time
  const handleSetToLiveTime = () => {
    setTime(getCurrentTimeString());
    setDate(getTodayDateString());
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 shadow-2xs mb-4 sm:mb-5 no-print">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-900 text-white rounded-lg flex-shrink-0 shadow-2xs">
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              تسجيل حضور وانصراف سريع
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                توقيت وتاريخ الجهاز الحي: {liveTimeString}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              اختر اسم الموظف وبضغطة زر يسجل النظام الحضور ويحسب مدة التأخير والخصم تلقائياً حسب الشفت
            </p>
          </div>
        </div>

        {/* Toggle Recent Activity Drawer */}
        <button
          type="button"
          onClick={() => setShowRecentDrawer(!showRecentDrawer)}
          id="btn-toggle-recent-attendance"
          className="self-start sm:self-auto text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>حركات اليوم ({totalCheckedIn}/{activeEmployees.length})</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showRecentDrawer ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className={`mb-4 p-3 border rounded-lg flex items-center justify-between gap-3 text-xs animate-fadeIn ${
          successMessage.type === 'present'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : successMessage.type === 'late'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : successMessage.type === 'absent'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-sky-50 border-sky-200 text-sky-900'
        }`}>
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage.text}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-bold px-1.5 py-0.5 opacity-80 hover:opacity-100"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Grid: Form (8 cols) + Summary Cards (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Form: One-click actions */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Employee Selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="quick-attendance-employee-select" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                الموظف <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="quick-attendance-employee-select"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-lg px-3 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none"
                >
                  <option value="">
                    {activeEmployees.length === 0 
                      ? '-- لا يوجد موظفون مسجلون بعد (أضف من الإعدادات) --' 
                      : '-- اضغط لاختيار الموظف --'}
                  </option>
                  {activeEmployees.map((emp) => {
                    const empRec = attendance[`${emp.id}_${date}`];
                    const statusLabel = !empRec 
                      ? '⚪ لم يسجل' 
                      : empRec.status === 'present' 
                      ? `🟢 حاضر (${empRec.checkInTime || '—'})` 
                      : empRec.status === 'late' 
                      ? `🟠 متأخر ${empRec.lateMinutes}د (${empRec.checkInTime})` 
                      : empRec.status === 'absent' 
                      ? '🔴 غائب' 
                      : '🔵 نصف يوم';
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.jobTitle} [{statusLabel}]
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Selected Employee Live Today Status Feedback */}
              {selectedEmployee && (
                <div className="flex flex-col gap-1 text-[11px] text-slate-600 px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200/80 mt-0.5">
                  <div className="flex items-center justify-between">
                    <span>المسمى: <strong className="text-slate-800">{selectedEmployee.jobTitle}</strong></span>
                    <span>
                      حالة اليوم: {' '}
                      {existingRecord ? (
                        <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                          existingRecord.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : existingRecord.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : existingRecord.status === 'absent'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {existingRecord.status === 'present' && `حاضر (${existingRecord.checkInTime})`}
                          {existingRecord.status === 'late' && `متأخر ${existingRecord.lateMinutes} دقيقة (${existingRecord.checkInTime})`}
                          {existingRecord.status === 'absent' && 'غائب اليوم'}
                          {existingRecord.status === 'half_day' && 'نصف يوم'}
                          {existingRecord.checkOutTime && ` • انصراف: ${existingRecord.checkOutTime}`}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">غير مسجل بعد لهذا اليوم</span>
                      )}
                    </span>
                  </div>
                  {lateEvaluation.isLate && (
                    <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1 bg-amber-50 p-1 rounded border border-amber-200">
                      <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                      <span>تنبيه نظام: التوقيت الحالي ({time || liveTimeString}) يتجاوز بداية {matchedShift.name} ({matchedShift.startTime}) بمقدار {lateEvaluation.lateMinutes} دقيقة. سيتم تسجيل التأخير تلقائياً.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shift Selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="quick-attendance-shift-select" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  توقيت الشفت / الدوام
                </span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">
                  بداية: {matchedShift.startTime}
                </span>
              </label>
              <div className="relative">
                <select
                  id="quick-attendance-shift-select"
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg px-3 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
                >
                  <option value="">تحديد تلقائي للشفت حسب الوقت ({matchedShift.name})</option>
                  {currentShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} إلى {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
                <span>بداية الدوام: <strong className="text-slate-800 font-mono">{matchedShift.startTime}</strong></span>
                <span>نهاية الدوام: <strong className="text-slate-800 font-mono">{matchedShift.endTime}</strong></span>
              </div>
            </div>

          </div>

          {/* Date, Time & Note Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Live Date Input */}
            <div className="flex flex-col gap-1">
              <label htmlFor="quick-attendance-date" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                التاريخ
              </label>
              <input
                id="quick-attendance-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none font-mono"
              />
            </div>

            {/* Live Device Time Input with sync button */}
            <div className="flex flex-col gap-1">
              <label htmlFor="quick-attendance-time" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  الوقت (تلقائي من الجهاز)
                </span>
                <button
                  type="button"
                  onClick={handleSetToLiveTime}
                  title="تحديث الوقت للحظة الحالية"
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 font-bold"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>الآن</span>
                </button>
              </label>
              <div className="relative">
                <input
                  id="quick-attendance-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-bold font-mono rounded-lg px-2.5 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            {/* Note / Statement */}
            <div className="flex flex-col gap-1">
              <label htmlFor="quick-attendance-note" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                البيان / ملاحظة (اختياري)
              </label>
              <input
                id="quick-attendance-note"
                type="text"
                placeholder="مثال: إذن رسمي / صيانة خارجية"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

          </div>

          {/* Action Buttons: 1-Click Fast Punch Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            
            {/* Primary Action: Instant Punch In */}
            <button
              type="button"
              disabled={isSubmitting || !selectedEmployeeId}
              onClick={handleQuickCheckIn}
              id="btn-quick-punch-in"
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-lg shadow-2xs transition-all"
            >
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>
                {lateEvaluation.isLate 
                  ? `تسجيل حضور (متأخر ${lateEvaluation.lateMinutes} دقيقة)` 
                  : 'تسجيل حضور الآن (في الموعد)'}
              </span>
            </button>

            {/* Secondary Actions */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              
              {/* Departure (مغادرة / إذن خروج) */}
              <button
                type="button"
                disabled={isSubmitting || !selectedEmployeeId}
                onClick={handleOpenDeparture}
                id="btn-quick-departure"
                title="تسجيل مغادرة وتحديد كم ساعة مع الخصم"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                <DoorOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>مغادرة</span>
              </button>

              {/* Mark Absent (غياب) */}
              <button
                type="button"
                disabled={isSubmitting || !selectedEmployeeId}
                onClick={handleMarkAbsent}
                id="btn-quick-mark-absent"
                title="تسجيل غياب كامل اليوم"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5 text-rose-500" />
                <span>غياب</span>
              </button>

              {/* Mark Half-day (نصف يوم) */}
              <button
                type="button"
                disabled={isSubmitting || !selectedEmployeeId}
                onClick={handleMarkHalfDay}
                id="btn-quick-mark-halfday"
                title="تسجيل نصف يوم عمل"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                <SunMedium className="w-3.5 h-3.5 text-sky-500" />
                <span>نصف يوم</span>
              </button>

            </div>

          </div>

        </div>

        {/* Right Summary Cards (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          
          {/* Today Attendance Count Card */}
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500">حضور اليوم المسجل</span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                نسبة {attendanceRate}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-bold font-mono text-slate-900">
                {totalCheckedIn}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                من أصل {activeEmployees.length} موظف
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-200/60">
              <span className="text-emerald-700 font-semibold">حاضر بالموعد: {todayPresent}</span>
              <span className="text-amber-700 font-semibold">متأخر: {todayLate}</span>
              <span className="text-rose-700 font-semibold">غائب: {todayAbsent}</span>
            </div>
          </div>

          {/* Today Delays & Automatic Deductions Card */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-300">خصومات وتأخيرات اليوم</span>
              <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                <Clock className="w-3 h-3" />
                <span>{todayTotalLateMinutes} دقيقة تأخير</span>
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold font-mono text-rose-400">
              {formatSYP(todayTotalDeductions)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
              <span>تخصم تلقائياً عند إعداد الرواتب</span>
              <span className="text-slate-300 font-bold">{formatArabicDate(date)}</span>
            </div>
          </div>

        </div>

      </div>

      {/* Collapsible Drawer for Today's Activity Log */}
      {showRecentDrawer && (
        <div className="mt-4 pt-4 border-t border-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-slate-600" />
              سجل حركات الحضور المسجلة لتاريخ {formatArabicDate(date)}
            </h3>
            <span className="text-xs text-slate-500">
              المسجلين: {totalCheckedIn} موظف
            </span>
          </div>

          {totalCheckedIn === 0 && todayAbsent === 0 ? (
            <div className="text-center py-5 text-slate-400 text-xs bg-[#F8FAFC] border border-slate-200 rounded-lg">
              لم يتم تسجيل أي حضور حتى الآن لهذا اليوم
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-right border-collapse bg-white">
                <thead>
                  <tr className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2">الموظف</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2">وقت الحضور</th>
                    <th className="p-2">وقت الانصراف</th>
                    <th className="p-2">الشفت / مدة التأخير</th>
                    <th className="p-2">خصم اليوم (SYP)</th>
                    <th className="p-2">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeEmployees.map((emp) => {
                    const rec = attendance[`${emp.id}_${date}`];
                    if (!rec) return null;
                    const { deduction } = calculateDayDeduction(emp, rec, settings);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-bold text-slate-900">
                          {emp.name}
                          <span className="text-slate-400 font-normal text-[10px] mr-1">({emp.jobTitle})</span>
                        </td>
                        <td className="p-2 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'late'
                              ? 'bg-amber-100 text-amber-800'
                              : rec.status === 'absent'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {rec.status === 'present' && 'حاضر'}
                            {rec.status === 'late' && 'متأخر'}
                            {rec.status === 'absent' && 'غائب'}
                            {rec.status === 'half_day' && 'نصف يوم'}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-slate-700">
                          {rec.checkInTime || '—'}
                        </td>
                        <td className="p-2 font-mono text-slate-700">
                          {rec.checkOutTime || '—'}
                        </td>
                        <td className="p-2 text-slate-600">
                          <span>{rec.shiftName || 'الشفت الصباحي'}</span>
                          {rec.lateMinutes && rec.lateMinutes > 0 && (
                            <span className="text-rose-600 font-bold font-mono text-[10px] mr-1">
                              (تأخير {rec.lateMinutes} دقيقة)
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-mono font-bold text-rose-700">
                          {deduction > 0 ? formatSYP(deduction) : '0 ل.س'}
                        </td>
                        <td className="p-2 text-slate-500 max-w-[150px] truncate">
                          {rec.note || '—'}
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

    </section>
  );
};
