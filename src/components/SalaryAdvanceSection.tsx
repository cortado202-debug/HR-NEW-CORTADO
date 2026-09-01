import React, { useState } from 'react';
import { Employee, SalaryAdvance, CompanySettings } from '../types';
import { 
  formatSYP, 
  parseSYPInput, 
  getTodayDateString, 
  getCurrentTimeString,
  formatArabicDate 
} from '../utils/formatters';
import { 
  Banknote, 
  Send, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  TrendingUp, 
  FileText, 
  ChevronDown, 
  Receipt,
  User,
  Trash2,
  Printer,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface SalaryAdvanceSectionProps {
  employees: Employee[];
  advances: SalaryAdvance[];
  settings?: CompanySettings;
  hideSalaryInfo?: boolean;
  onAddAdvance: (advance: Omit<SalaryAdvance, 'id' | 'createdAt' | 'approved'>) => Promise<SalaryAdvance>;
  onDeleteAdvance: (id: string) => Promise<boolean>;
  onViewReceipt: (advance: SalaryAdvance) => void;
}


const QUICK_AMOUNTS = [
  { label: '+100 ألف', value: 100000 },
  { label: '+250 ألف', value: 250000 },
  { label: '+500 ألف', value: 500000 },
  { label: '+1 مليون', value: 1000000 },
  { label: '+2 مليون', value: 2000000 },
];

export const SalaryAdvanceSection: React.FC<SalaryAdvanceSectionProps> = ({
  employees,
  advances,
  settings,
  hideSalaryInfo = false,
  onAddAdvance,
  onDeleteAdvance,
  onViewReceipt,
}) => {

  const todayStr = getTodayDateString();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRecentDrawer, setShowRecentDrawer] = useState<boolean>(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'emerald';
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Active employees
  const activeEmployees = employees.filter((e) => e.active);
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Math for summary cards
  const [currentYear, currentMonth] = todayStr.split('-');
  const currentMonthPrefix = `${currentYear}-${currentMonth}`;

  const todayAdvances = advances.filter((a) => a.date === todayStr);
  const todayTotalSYP = todayAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

  const monthAdvances = advances.filter((a) => a.date.startsWith(currentMonthPrefix));
  const monthTotalSYP = monthAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const monthCount = monthAdvances.length;

  // Selected Employee's month advances & Limit calculation
  const employeeMonthAdvances = selectedEmployee
    ? advances.filter((a) => a.employeeId === selectedEmployee.id && a.date.startsWith(currentMonthPrefix))
    : [];
  const employeeMonthTotalSYP = employeeMonthAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

  const employeeMaxLimit = selectedEmployee?.maxMonthlyAdvance || settings?.maxAdvancePerMonth || 2000000;
  const requestedAmount = parseSYPInput(amountRaw);
  const willExceedLimit = selectedEmployee && requestedAmount > 0 && (employeeMonthTotalSYP + requestedAmount > employeeMaxLimit);
  const remainingAllowance = Math.max(0, employeeMaxLimit - employeeMonthTotalSYP);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numeric = parseSYPInput(e.target.value);
    if (numeric === 0 && e.target.value === '') {
      setAmountRaw('');
    } else {
      setAmountRaw(new Intl.NumberFormat('en-US').format(numeric));
    }
  };

  const handleAddQuickAmount = (val: number) => {
    const current = parseSYPInput(amountRaw);
    const updated = current + val;
    setAmountRaw(new Intl.NumberFormat('en-US').format(updated));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNumber = parseSYPInput(amountRaw);

    if (!selectedEmployeeId) {
      alert('يرجى اختيار الموظف أولاً');
      return;
    }

    if (!amountNumber || amountNumber <= 0) {
      alert('يرجى إدخال مبلغ السلفة بشكل صحيح');
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    const executeSaveAdvance = async () => {
      setIsSubmitting(true);
      try {
        await onAddAdvance({
          employeeId: emp.id,
          employeeName: emp.name,
          amount: amountNumber,
          date: date || todayStr,
          time: time || getCurrentTimeString(),
          note: note.trim() || undefined,
        });

        // Show success feedback
        setSuccessMessage(`تم تسجيل سلفة بقيمة ${formatSYP(amountNumber)} للموظف ${emp.name} بنجاح`);
        setTimeout(() => setSuccessMessage(null), 5000);

        // Reset form
        setAmountRaw('');
        setNote('');
        setTime(getCurrentTimeString());
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
        setConfirmModalConfig(null);
      }
    };

    if (willExceedLimit) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'تنبيه: تجاوز سقف السلف الشهري',
        message: `هذه السلفة ستتجاوز الحد الأقصى الشهري المحدد للموظف (${formatSYP(employeeMaxLimit)}).\n\n` +
          `• المسحوب سابقاً هذا الشهر: ${formatSYP(employeeMonthTotalSYP)}\n` +
          `• المبلغ الجديد المطلوب: ${formatSYP(amountNumber)}\n` +
          `• المجموع الكلي الجديد: ${formatSYP(employeeMonthTotalSYP + amountNumber)}\n\n` +
          `هل تريد المتابعة واعتماد السلفة استثنائياً؟`,
        confirmText: 'اعتماد السلفة استثنائياً',
        variant: 'warning',
        onConfirm: executeSaveAdvance,
      });
      return;
    }

    await executeSaveAdvance();
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 shadow-2xs mb-4 sm:mb-5 no-print">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-900 text-white rounded-lg flex-shrink-0 shadow-2xs">
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              تسجيل سلفة مالية سريعة
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                بالليرة السورية (SYP)
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              تسجيل ومزامنة فورية لسلف الموظفين مع الخصم التلقائي من كشف الراتب الشهري
            </p>
          </div>
        </div>

        {/* Toggle Recent Advances */}
        <button
          type="button"
          onClick={() => setShowRecentDrawer(!showRecentDrawer)}
          id="btn-toggle-recent-advances"
          className="self-start sm:self-auto text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Receipt className="w-3.5 h-3.5 text-slate-500" />
          <span>آخر السلف ({advances.length})</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showRecentDrawer ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1.5 py-0.5"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Form & Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left/Main: Advance Form (8 cols on desktop) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 flex flex-col gap-3.5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Employee Selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="advance-employee-select" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                الموظف المستفيد <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="advance-employee-select"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-lg px-3 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none"
                >
                  <option value="">
                    {activeEmployees.length === 0 
                      ? '-- لا يوجد موظفون مسجلون بعد (يرجى الإضافة من الإعدادات) --' 
                      : '-- اختر الموظف المستفيد --'}
                  </option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.jobTitle} {!hideSalaryInfo ? `(الراتب: ${formatSYP(emp.baseSalary)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedEmployee && (
                <div className="flex flex-col gap-1 text-[11px] text-slate-600 px-1 pt-1 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    {!hideSalaryInfo && (
                      <span>الراتب: <strong className="text-slate-800">{formatSYP(selectedEmployee.baseSalary)}</strong></span>
                    )}
                    <span>المسحوب هذا الشهر: <strong className="font-mono text-amber-800 font-bold">{formatSYP(employeeMonthTotalSYP)}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/50">
                    <span className="flex items-center gap-1 text-slate-500">
                      <ShieldAlert className="w-3 h-3 text-slate-400" />
                      سقف السلف الشهري: <strong className="font-mono text-slate-700">{formatSYP(employeeMaxLimit)}</strong>
                    </span>
                    <span className={`font-semibold font-mono ${remainingAllowance <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      المتبقي: {formatSYP(remainingAllowance)}
                    </span>
                  </div>
                  {willExceedLimit && (
                    <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 p-1.5 rounded text-[11px] font-bold mt-0.5 animate-fadeIn">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>المبلغ المدخل سيتجاوز الحد الأقصى الشهري المسموح به للموظف!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount Field (in SYP) */}
            <div className="flex flex-col gap-1">
              <label htmlFor="advance-amount-input" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-slate-500" />
                  مبلغ السلفة (ل.س) <span className="text-rose-500">*</span>
                </span>
                {amountRaw && (
                  <span className="text-emerald-700 font-mono text-xs font-bold">
                    {amountRaw} ل.س
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  id="advance-amount-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="مثال: 250,000"
                  value={amountRaw}
                  onChange={handleAmountChange}
                  required
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-sm sm:text-base font-semibold font-mono rounded-lg px-3 py-2 pl-14 focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  ل.س
                </span>
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => handleAddQuickAmount(q.value)}
                    className="text-[11px] font-semibold bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Date */}
            <div className="flex flex-col gap-1">
              <label htmlFor="advance-date-input" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                التاريخ
              </label>
              <input
                id="advance-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

            {/* Time */}
            <div className="flex flex-col gap-1">
              <label htmlFor="advance-time-input" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                الوقت
              </label>
              <input
                id="advance-time-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label htmlFor="advance-note-input" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                البيان / ملاحظة (اختياري)
              </label>
              <input
                id="advance-note-input"
                type="text"
                placeholder="مثال: سلفة طارئة / صيانة"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !selectedEmployeeId || !amountRaw}
              id="btn-submit-salary-advance"
              className="w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-lg shadow-2xs transition-all"
            >
              {isSubmitting ? (
                <span>جاري الحفظ والتسجيل...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-400 rotate-180" />
                  <span>اعتماد وتسجيل السلفة</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* Right: Summary Cards (4 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          
          {/* Today Advances Card */}
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500">إجمالي سلف اليوم</span>
              <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                {todayAdvances.length} سلفة
              </span>
            </div>
            <div className="text-lg md:text-xl font-bold font-mono text-slate-900">
              {formatSYP(todayTotalSYP)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              مجموع المبالغ المصروفة اليوم
            </p>
          </div>

          {/* This Month Total Card */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-300">إجمالي سلف هذا الشهر</span>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                <TrendingUp className="w-3 h-3" />
                <span>{monthCount} عمليات</span>
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold font-mono text-emerald-400">
              {formatSYP(monthTotalSYP)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
              <span>تخصم تلقائياً عند إعداد جدول الرواتب</span>
            </div>
          </div>

        </div>

      </div>

      {/* Collapsible / Recent Advances Drawer */}
      {showRecentDrawer && (
        <div className="mt-4 pt-4 border-t border-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5 text-slate-600" />
              سجل أحدث السلف المصروفة مؤخراً
            </h3>
            <span className="text-xs text-slate-500">
              المجموع: {advances.length} سلفة
            </span>
          </div>

          {advances.length === 0 ? (
            <div className="text-center py-5 text-slate-400 text-xs bg-[#F8FAFC] border border-slate-200 rounded-lg">
              لا توجد سلف مسجلة حالياً
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-right border-collapse bg-white">
                <thead>
                  <tr className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2">الموظف</th>
                    <th className="p-2">المبلغ</th>
                    <th className="p-2">التاريخ والوقت</th>
                    <th className="p-2">البيان</th>
                    <th className="p-2 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advances.slice(0, 10).map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-bold text-slate-900">
                        {adv.employeeName}
                      </td>
                      <td className="p-2 font-bold font-mono text-emerald-800">
                        {formatSYP(adv.amount)}
                      </td>
                      <td className="p-2 text-slate-600">
                        <span>{formatArabicDate(adv.date)}</span>
                        {adv.time && <span className="text-slate-400 text-[10px] mr-1 font-mono">({adv.time})</span>}
                      </td>
                      <td className="p-2 text-slate-500 max-w-[180px] truncate">
                        {adv.note || '—'}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewReceipt(adv)}
                            title="طباعة إيصال السلفة"
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModalConfig({
                                isOpen: true,
                                title: `تأكيد حذف السلفة`,
                                message: `هل أنت متأكد من حذف سلفة الموظف "${adv.employeeName}" بقيمة ${formatSYP(adv.amount)}؟`,
                                confirmText: 'نعم، حذف السلفة',
                                variant: 'danger',
                                onConfirm: async () => {
                                  await onDeleteAdvance(adv.id);
                                  setConfirmModalConfig(null);
                                },
                              });
                            }}
                            title="حذف السلفة"
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          onClose={() => setConfirmModalConfig(null)}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          variant={confirmModalConfig.variant}
        />
      )}

    </section>
  );
};
