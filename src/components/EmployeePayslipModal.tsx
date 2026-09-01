import React, { useState, useMemo, useRef } from 'react';
import { Employee, AttendanceRecord, SalaryAdvance, CompanySettings, EmployeeMonthlySummary } from '../types';
import { 
  formatSYP, 
  getDayOfWeekArabic,
  getTodayDateString 
} from '../utils/formatters';
import { computeEmployeeMonthlySummary, calculateDayDeduction, matchShiftForTime } from '../utils/payrollMath';
import { 
  X, 
  Printer, 
  Download, 
  Building2, 
  User, 
  Calendar, 
  DollarSign, 
  Clock, 
  DoorOpen, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText,
  Receipt
} from 'lucide-react';
import { downloadPdfFromElement, triggerPrint } from '../utils/printPdfUtils';

interface EmployeePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: EmployeeMonthlySummary | null;
  settings: CompanySettings;
  employees: Employee[];
  attendance: Record<string, AttendanceRecord>;
  advances: SalaryAdvance[];
  initialMonth?: string;
  initialEmployeeId?: string;
}

export const EmployeePayslipModal: React.FC<EmployeePayslipModalProps> = ({
  isOpen,
  onClose,
  summary: propSummary,
  settings,
  employees,
  attendance,
  advances,
  initialMonth,
  initialEmployeeId,
}) => {
  const todayStr = getTodayDateString();
  const defaultMonth = initialMonth || propSummary?.month || todayStr.slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  // Active employees list
  const activeEmployees = useMemo(() => {
    return employees.length > 0 ? employees : (propSummary?.employee ? [propSummary.employee] : []);
  }, [employees, propSummary]);

  const defaultEmpId = initialEmployeeId || propSummary?.employee.id || activeEmployees[0]?.id || '';
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(defaultEmpId);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Selected employee object
  const currentEmployee = useMemo(() => {
    return activeEmployees.find(e => e.id === selectedEmployeeId) || propSummary?.employee || activeEmployees[0];
  }, [activeEmployees, selectedEmployeeId, propSummary]);

  // Compute live summary for the selected employee & month
  const currentSummary: EmployeeMonthlySummary | null = useMemo(() => {
    if (!currentEmployee) return propSummary || null;
    return computeEmployeeMonthlySummary(currentEmployee, selectedMonth, attendance, advances, settings);
  }, [currentEmployee, selectedMonth, attendance, advances, settings, propSummary]);

  // Filter advances for this employee in this month
  const employeeMonthAdvances = useMemo(() => {
    if (!currentEmployee) return [];
    return advances
      .filter(adv => adv.employeeId === currentEmployee.id && adv.date.startsWith(selectedMonth))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [advances, currentEmployee, selectedMonth]);

  // Filter attendance records for this employee in this month
  const employeeMonthAttendance = useMemo(() => {
    if (!currentEmployee) return [];
    const list: AttendanceRecord[] = [];
    (Object.values(attendance) as AttendanceRecord[]).forEach(rec => {
      if (rec && rec.employeeId === currentEmployee.id && rec.date.startsWith(selectedMonth)) {
        list.push(rec);
      }
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [attendance, currentEmployee, selectedMonth]);

  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !currentEmployee || !currentSummary) return null;

  // Print function
  const handlePrint = () => {
    triggerPrint(printableRef.current, `كشف حساب - ${currentEmployee.name} - ${selectedMonth}`);
  };

  // High-Resolution PDF Download Function
  const handleDownloadPdf = async () => {
    const element = printableRef.current;
    if (!element) return;

    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      const safeEmployeeName = currentEmployee.name.replace(/[^\u0600-\u06FFa-zA-Z0-9_-]/g, '_');
      const filename = `كشف_تفصيلي_${safeEmployeeName}_${selectedMonth}.pdf`;
      await downloadPdfFromElement(element, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Fallback: trigger print dialog directly for save as PDF
      triggerPrint(element, `كشف حساب - ${currentEmployee.name} - ${selectedMonth}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const matchedShift = matchShiftForTime('08:00', settings.shifts, currentEmployee.assignedShiftId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] relative">
        
        {/* Top Controls Toolbar (Hidden in Print & PDF) */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print relative">
          
          {/* Title & Quick Info */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-2xs">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>الكشف الشهري التفصيلي للموظف</span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
                  {selectedMonth}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                يتضمن سجل الغيابات، التأخيرات، المغادرات، والسلف المسحوبة
              </p>
            </div>
          </div>

          {/* Month & Employee Selectors + Export Action Buttons + Close X */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Employee Selector Dropdown */}
            {activeEmployees.length > 1 && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 shadow-2xs">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="bg-transparent font-bold outline-none cursor-pointer text-slate-900 text-xs"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.jobTitle})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Month Picker */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold outline-none cursor-pointer text-slate-900 text-xs font-mono"
              />
            </div>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              id="btn-download-employee-pdf"
              title="تحميل كشف الحساب كملف PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري إنشاء PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>تم التنزيل بنجاح</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>تحميل كـ PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              id="btn-print-employee-statement"
              title="طباعة الكشف / حفظ كـ PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>طباعة</span>
            </button>

            {/* Prominent Red Close X Button in Corner */}
            <button
              onClick={onClose}
              id="btn-close-employee-modal"
              title="إغلاق النافذة (X)"
              aria-label="إغلاق"
              className="flex items-center justify-center w-8 h-8 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white border border-red-300 hover:border-red-600 rounded-lg transition-all shadow-sm cursor-pointer ml-1"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>

          </div>
        </div>

        {/* Scrollable Container for Preview & Print */}
        <div className="overflow-y-auto p-3 sm:p-6 bg-slate-100/70 flex-1">
          
          {/* Printable Statement Document (A4 Styled Container) */}
          <div 
            ref={printableRef}
            id="employee-monthly-statement-printable"
            className="bg-white border border-slate-300 rounded-xl shadow-xs p-6 sm:p-8 max-w-3xl mx-auto text-slate-900 text-xs"
            dir="rtl"
          >
            
            {/* Header / Company Branding */}
            <div className="flex items-start justify-between pb-3 mb-3 border-b-2 border-slate-900">
              <div className="space-y-0.5">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {settings.companyName || 'المنشأة التجارية'}
                </h1>
                <p className="text-[11px] font-semibold text-slate-600">
                  إدارة الموارد البشرية والشؤون المالية والمحاسبية
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                  <span>الرقم المرجعي: <strong className="font-mono text-slate-700 font-bold">STMT-{currentEmployee.id.slice(0, 5).toUpperCase()}-{selectedMonth.replace('-', '')}</strong></span>
                  <span>•</span>
                  <span>تاريخ الطباعة: <strong className="font-mono text-slate-700 font-bold">{todayStr}</strong></span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain border border-slate-200 rounded-lg p-0.5 bg-white" />
                ) : (
                  <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-sm shadow-2xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                )}
                <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase font-mono tracking-widest">
                  OFFICIAL PAYSLIP & AUDIT
                </span>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="py-1.5 px-3 mb-3 bg-slate-900 text-white rounded-lg flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-xs">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>كشف حساب شهري تفصيلي للموظف (مستحقات وسلف وغيابات)</span>
              </div>
              <div className="font-bold text-[11px] font-mono text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                الشهر: {selectedMonth}
              </div>
            </div>

            {/* Employee Identification Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-[#F8FAFC] rounded-lg border border-slate-200 mb-3">
              <div>
                <span className="text-slate-400 text-[9px] block font-semibold">اسم الموظف:</span>
                <strong className="text-slate-900 text-xs font-bold block">{currentEmployee.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block font-semibold">المسمى الوظيفي:</span>
                <strong className="text-slate-800 text-xs font-bold block">{currentEmployee.jobTitle}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block font-semibold">الراتب الأساسي التعاقدي:</span>
                <strong className="text-slate-900 font-mono font-bold block text-[11px]">{formatSYP(currentSummary.baseSalary)}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block font-semibold">أجر اليوم / الساعة المحتسب:</span>
                <strong className="text-slate-700 font-mono text-[11px] block">
                  {formatSYP(currentSummary.dailyRate, false)} / {formatSYP(currentSummary.hourlyRate, false)} ل.س
                </strong>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block font-semibold">رقم الهاتف:</span>
                <span className="text-slate-700 font-mono text-[11px] font-semibold block">{currentEmployee.phone || 'غير مسجل'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block font-semibold">تاريخ المباشرة:</span>
                <span className="text-slate-700 font-mono text-[11px] block">{currentEmployee.joinedDate || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block font-semibold">شفت الدوام المعتمد:</span>
                <span className="text-slate-800 font-bold text-[11px] block">{matchedShift.name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block font-semibold">ساعات الدوام اليومي:</span>
                <span className="text-slate-800 font-semibold text-[11px] block">{currentEmployee.dailyWorkHours || 8}س ({currentEmployee.monthlyWorkDays || 26} يوم)</span>
              </div>
            </div>

            {/* Financial Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              
              <div className="p-2 rounded-lg border border-slate-200 bg-white shadow-2xs">
                <div className="text-[9px] font-bold text-slate-500 flex items-center justify-between">
                  <span>الراتب الأساسي</span>
                  <DollarSign className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">
                  {formatSYP(currentSummary.baseSalary)}
                </div>
              </div>

              <div className="p-2 rounded-lg border border-rose-200 bg-rose-50/50 shadow-2xs">
                <div className="text-[9px] font-bold text-rose-800 flex items-center justify-between">
                  <span>خصومات الدوام والغياب</span>
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                </div>
                <div className="text-xs font-bold font-mono text-rose-700 mt-0.5">
                  -{formatSYP(currentSummary.totalDeductions)}
                </div>
                <div className="text-[8.5px] text-rose-600 font-semibold">
                  ({currentSummary.daysAbsent} غياب | {currentSummary.daysLate} تأخير | {currentSummary.totalDepartureHours}س مغادرة)
                </div>
              </div>

              <div className="p-2 rounded-lg border border-amber-200 bg-amber-50/50 shadow-2xs">
                <div className="text-[9px] font-bold text-amber-800 flex items-center justify-between">
                  <span>إجمالي السلف المقتطعة</span>
                  <Receipt className="w-3 h-3 text-amber-600" />
                </div>
                <div className="text-xs font-bold font-mono text-amber-800 mt-0.5">
                  -{formatSYP(currentSummary.totalAdvances)}
                </div>
                <div className="text-[8.5px] text-amber-700 font-semibold">
                  ({currentSummary.advancesCount} سلفة مسحوبة)
                </div>
              </div>

              <div className="p-2 rounded-lg border border-emerald-300 bg-emerald-50 shadow-2xs">
                <div className="text-[9px] font-bold text-emerald-900 flex items-center justify-between">
                  <span>صافي الراتب المستحق</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-sm font-black font-mono text-emerald-950 mt-0.5">
                  {formatSYP(currentSummary.netSalary)}
                </div>
                <div className="text-[8.5px] text-emerald-700 font-semibold">
                  جاهز للصرف النهائي
                </div>
              </div>

            </div>

            {/* SECTION 1: DETAILED SALARY ADVANCES LOG (كشف السلف المسحوبة بالتفصيل) */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-extrabold text-[11px] sm:text-xs text-slate-900 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  <span>أولاً: كشف السلف المالية المسحوبة خلال الشهر ({employeeMonthAdvances.length} سلفة)</span>
                </h3>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded font-mono">
                  إجمالي السلف: {formatSYP(currentSummary.totalAdvances)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-right border-collapse text-[10px]">
                  <thead className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-1.5 w-8 text-center">#</th>
                      <th className="p-1.5">تاريخ السلفة</th>
                      <th className="p-1.5">الوقت</th>
                      <th className="p-1.5">البيان وملاحظات السلفة</th>
                      <th className="p-1.5 text-center">حالة الصرف</th>
                      <th className="p-1.5 text-left">مبلغ السلفة (ل.س)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeMonthAdvances.length > 0 ? (
                      employeeMonthAdvances.map((adv, idx) => (
                        <tr key={adv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/50'}>
                          <td className="p-1.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-1.5 font-mono font-bold text-slate-800">
                            {adv.date} <span className="text-[9px] text-slate-500 font-normal">({getDayOfWeekArabic(adv.date)})</span>
                          </td>
                          <td className="p-1.5 font-mono text-slate-600">{adv.time || '—'}</td>
                          <td className="p-1.5 text-slate-700">{adv.note || <span className="text-slate-400 italic">سلفة نقدية على الراتب</span>}</td>
                          <td className="p-1.5 text-center">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>تم الصرف</span>
                            </span>
                          </td>
                          <td className="p-1.5 font-mono font-bold text-amber-900 text-left text-xs">
                            {formatSYP(adv.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-2 text-center text-slate-400 text-[10px] italic bg-[#F8FAFC]/30">
                          لا توجد أي سلف مالية مسحوبة لهذا الموظف خلال شهر {selectedMonth}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {employeeMonthAdvances.length > 0 && (
                    <tfoot className="bg-[#FFFBEB] font-bold border-t border-amber-200 text-[10px]">
                      <tr>
                        <td colSpan={5} className="p-1.5 text-slate-800">
                          مجموع السلف المستقطعة من الراتب:
                        </td>
                        <td className="p-1.5 font-mono font-bold text-amber-950 text-left text-xs">
                          {formatSYP(currentSummary.totalAdvances)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* SECTION 2: DETAILED ATTENDANCE, ABSENCES, DELAYS & DEPARTURES LOG (سجل الحضور والغياب والمغادرات) */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-extrabold text-[11px] sm:text-xs text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-800" />
                  <span>ثانياً: سجل الدوام والغياب والمغادرات والتأخيرات اليومية</span>
                </h3>
                <div className="flex items-center gap-1 text-[9px] font-bold">
                  <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
                    حضور: {currentSummary.daysPresent} يوم
                  </span>
                  <span className="text-rose-800 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded">
                    غياب: {currentSummary.daysAbsent} يوم
                  </span>
                  <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded">
                    تأخير: {currentSummary.daysLate} ({currentSummary.totalLateMinutes}د)
                  </span>
                  {currentSummary.totalDepartureHours > 0 && (
                    <span className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">
                      مغادرات: {currentSummary.totalDepartureHours}س
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-right border-collapse text-[10px]">
                  <thead className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-1.5 w-8 text-center">#</th>
                      <th className="p-1.5">التاريخ واليوم</th>
                      <th className="p-1.5 text-center">حالة الدوام</th>
                      <th className="p-1.5 text-center">وقت الحضور</th>
                      <th className="p-1.5 text-center">المغادرة / إذن</th>
                      <th className="p-1.5 text-center">التأخير</th>
                      <th className="p-1.5 text-left">الخصم المحتسب</th>
                      <th className="p-1.5">البيان والملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeMonthAttendance.length > 0 ? (
                      employeeMonthAttendance.map((rec, idx) => {
                        const { deduction, lateDeduction, departureDeduction, reason } = calculateDayDeduction(currentEmployee, rec, settings);
                        return (
                          <tr key={rec.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/50'}>
                            <td className="p-1.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-1.5 font-mono font-bold text-slate-900">
                              {rec.date} <span className="text-[9px] text-slate-500 font-normal">({getDayOfWeekArabic(rec.date)})</span>
                            </td>

                            {/* Status */}
                            <td className="p-1.5 text-center">
                              {rec.status === 'present' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded border border-emerald-200">
                                  <CheckCircle2 className="w-2 h-2 text-emerald-600" />
                                  <span>حاضر</span>
                                </span>
                              )}
                              {rec.status === 'absent' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-800 text-[9px] font-bold rounded border border-rose-200">
                                  <XCircle className="w-2 h-2 text-rose-600" />
                                  <span>غائب</span>
                                </span>
                              )}
                              {rec.status === 'late' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[9px] font-bold rounded border border-amber-200">
                                  <Clock className="w-2 h-2 text-amber-600" />
                                  <span>متأخر</span>
                                </span>
                              )}
                              {rec.status === 'half_day' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-50 text-sky-800 text-[9px] font-bold rounded border border-sky-200">
                                  <span>نصف يوم</span>
                                </span>
                              )}
                            </td>

                            {/* Check In */}
                            <td className="p-1.5 text-center font-mono text-slate-700">
                              {rec.checkInTime || '—'}
                            </td>

                            {/* Departure */}
                            <td className="p-1.5 text-center">
                              {rec.departureHours && rec.departureHours > 0 ? (
                                <span className="inline-flex items-center gap-0.5 font-bold text-[9px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">
                                  <DoorOpen className="w-2 h-2 text-indigo-600" />
                                  <span>{rec.departureHours}س</span>
                                  {rec.departureTime && <span className="font-mono">({rec.departureTime})</span>}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Late minutes */}
                            <td className="p-1.5 text-center font-mono font-bold text-amber-700">
                              {rec.lateMinutes && rec.lateMinutes > 0 ? `${rec.lateMinutes}د` : <span className="text-slate-300 font-normal">—</span>}
                            </td>

                            {/* Deduction Amount */}
                            <td className="p-1.5 font-mono font-bold text-rose-700 text-left">
                              {deduction > 0 ? (
                                <span>-{formatSYP(deduction)}</span>
                              ) : (
                                <span className="text-emerald-700 font-normal">0 ل.س</span>
                              )}
                            </td>

                            {/* Reason / Notes */}
                            <td className="p-1.5 text-[9.5px] text-slate-600">
                              {rec.note || rec.departureReason || reason || <span className="text-slate-400">—</span>}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-2 text-center text-slate-400 text-[10px] italic bg-[#F8FAFC]/30">
                          لم تسجل أي حركات حضور وغياب لهذا الموظف في هذا الشهر.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {employeeMonthAttendance.length > 0 && (
                    <tfoot className="bg-[#FEF2F2]/60 font-bold border-t border-rose-200 text-[10px]">
                      <tr>
                        <td colSpan={6} className="p-1.5 text-slate-800">
                          مجموع استقطاعات الغياب والتأخير والمغادرات:
                        </td>
                        <td className="p-1.5 font-mono font-bold text-rose-800 text-left text-xs" colSpan={2}>
                          -{formatSYP(currentSummary.totalDeductions)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Official Signatures & Stamp Block */}
            <div className="pt-2 border-t-2 border-slate-300 grid grid-cols-3 gap-2.5 text-center text-[10px]">
              <div className="p-2 bg-[#F8FAFC] rounded-lg border border-slate-200 flex flex-col justify-between h-20">
                <div>
                  <p className="font-bold text-slate-900">توقيع المستلم (الموظف)</p>
                  <p className="text-[8.5px] text-slate-500">أقر باستلام كامل مستحقاتي الموضحة أعلاه</p>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-0.5">
                  <p className="text-slate-400 font-mono text-[9px]">توقيع: ...........................</p>
                </div>
              </div>

              <div className="p-2 bg-[#F8FAFC] rounded-lg border border-slate-200 flex flex-col justify-between h-20">
                <div>
                  <p className="font-bold text-slate-900">تدقيق المحاسب المالي</p>
                  <p className="text-[8.5px] text-slate-500">تمت مطابقة السلف والدوام والاستقطاع</p>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-0.5">
                  <p className="text-slate-400 font-mono text-[9px]">توقيع: ...........................</p>
                </div>
              </div>

              <div className="p-2 bg-[#F8FAFC] rounded-lg border border-slate-200 flex flex-col justify-between h-20">
                <div>
                  <p className="font-bold text-slate-900">اعتماد المدير العام</p>
                  <p className="text-[8.5px] text-slate-700 font-bold">{settings.directorName || 'الإدارة العامة'}</p>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-0.5">
                  <p className="text-slate-400 font-mono text-[9px]">الختم والتوقيع: ....................</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
