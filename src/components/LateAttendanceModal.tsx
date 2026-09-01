import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, CompanySettings } from '../types';
import { formatSYP, formatArabicDate, getCurrentTimeString } from '../utils/formatters';
import { calculateDailyRate, calculateHourlyRate, calculateLateDeduction } from '../utils/payrollMath';
import { X, Clock, AlertCircle, Check, DollarSign, Calculator } from 'lucide-react';

interface LateAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  record: AttendanceRecord | null;
  date: string;
  settings: CompanySettings;
  onConfirm: (record: AttendanceRecord) => Promise<AttendanceRecord>;
}

const PRESET_MINUTES = [15, 30, 45, 60, 90, 120];

export const LateAttendanceModal: React.FC<LateAttendanceModalProps> = ({
  isOpen,
  onClose,
  employee,
  record,
  date,
  settings,
  onConfirm,
}) => {
  const [minutes, setMinutes] = useState<number>(record?.lateMinutes || 30);
  const [deductionType, setDeductionType] = useState<'auto' | 'custom_rate' | 'direct_amount'>('auto');
  const [customRatePerHour, setCustomRatePerHour] = useState<string>('');
  const [customRatePerMinute, setCustomRatePerMinute] = useState<string>('');
  const [directAmount, setDirectAmount] = useState<string>(
    record?.customDeduction ? String(record.customDeduction) : ''
  );
  const [checkInTime, setCheckInTime] = useState<string>(record?.checkInTime || getCurrentTimeString());
  const [note, setNote] = useState<string>(record?.note || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMinutes(record?.lateMinutes || 30);
      setCheckInTime(record?.checkInTime || getCurrentTimeString());
      setNote(record?.note || '');
      if (record?.customDeduction) {
        setDeductionType('direct_amount');
        setDirectAmount(String(record.customDeduction));
      } else {
        setDeductionType('auto');
        setDirectAmount('');
      }
    }
  }, [isOpen, record]);

  if (!isOpen || !employee) return null;

  const workDays = employee.monthlyWorkDays || settings.defaultWorkDays || 26;
  const workHours = employee.dailyWorkHours || settings.defaultWorkHours || 8;
  const dailyRate = calculateDailyRate(employee.baseSalary, workDays);
  const standardHourlyRate = calculateHourlyRate(dailyRate, workHours);

  // Calculate effective deduction based on chosen mode
  let computedDeduction = 0;
  if (deductionType === 'direct_amount') {
    computedDeduction = directAmount ? Number(directAmount) : 0;
  } else if (deductionType === 'custom_rate') {
    if (customRatePerHour) {
      computedDeduction = Math.round(Number(customRatePerHour) * (minutes / 60));
    } else if (customRatePerMinute) {
      computedDeduction = Math.round(Number(customRatePerMinute) * minutes);
    } else {
      computedDeduction = calculateLateDeduction(minutes, standardHourlyRate, settings, employee);
    }
  } else {
    computedDeduction = calculateLateDeduction(minutes, standardHourlyRate, settings, employee);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updated: AttendanceRecord = {
        id: `${employee.id}_${date}`,
        employeeId: employee.id,
        date,
        status: 'late',
        checkInTime: checkInTime || getCurrentTimeString(),
        lateMinutes: Number(minutes),
        customDeduction: (deductionType === 'direct_amount' || deductionType === 'custom_rate') && computedDeduction !== calculateLateDeduction(minutes, standardHourlyRate, settings, employee)
          ? computedDeduction
          : undefined,
        note: note.trim() || undefined,
        updatedAt: Date.now(),
      };

      await onConfirm(updated);
      onClose();
    } catch (err) {
      alert('فشل حفظ تسجيل التأخير');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">تحديد دقائق وخصم التأخير</h3>
              <p className="text-[11px] text-slate-500">{employee.name} — {formatArabicDate(date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="إغلاق"
            className="flex items-center justify-center p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg transition-all shadow-2xs cursor-pointer group"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          
          {/* Preset Minute Buttons */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">مدة التأخير بالدقائق / الساعات</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {PRESET_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                    minutes === m
                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                      : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m >= 60 ? `${m / 60} س` : `${m} د`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700">تخصيص الدقائق يدوياً</label>
              <input
                type="number"
                min="1"
                max="480"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700">وقت الحضور الفعلي</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Mode Selector for Deduction */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800">طريقة تحديد مبلغ الخصم على التأخير</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setDeductionType('auto')}
                className={`py-2 px-2 text-[11px] font-bold rounded-lg border text-center transition-all ${
                  deductionType === 'auto'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                تلقائي من الراتب
              </button>

              <button
                type="button"
                onClick={() => setDeductionType('custom_rate')}
                className={`py-2 px-2 text-[11px] font-bold rounded-lg border text-center transition-all ${
                  deductionType === 'custom_rate'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                تحديد سعر الساعة/الدقيقة
              </button>

              <button
                type="button"
                onClick={() => setDeductionType('direct_amount')}
                className={`py-2 px-2 text-[11px] font-bold rounded-lg border text-center transition-all ${
                  deductionType === 'direct_amount'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                مبلغ خصم مباشر (SYP)
              </button>
            </div>
          </div>

          {/* Custom Rate Inputs */}
          {deductionType === 'custom_rate' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-xl animate-fadeIn">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-amber-900">سعر ساعة التأخير (SYP)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder={`الافتراضي: ${standardHourlyRate}`}
                    value={customRatePerHour}
                    onChange={(e) => {
                      setCustomRatePerHour(e.target.value);
                      if (e.target.value) setCustomRatePerMinute('');
                    }}
                    className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">ل.س/س</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-amber-900">أو سعر دقيقة التأخير (SYP)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder={`الافتراضي: ${Math.round(standardHourlyRate / 60)}`}
                    value={customRatePerMinute}
                    onChange={(e) => {
                      setCustomRatePerMinute(e.target.value);
                      if (e.target.value) setCustomRatePerHour('');
                    }}
                    className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">ل.س/د</span>
                </div>
              </div>
            </div>
          )}

          {/* Direct Amount Input */}
          {deductionType === 'direct_amount' && (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl animate-fadeIn flex flex-col gap-1">
              <label className="text-xs font-bold text-amber-900">أدخل مبلغ الخصم المباشر (SYP)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="مثال: 50000"
                  value={directAmount}
                  onChange={(e) => setDirectAmount(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ل.س</span>
              </div>
            </div>
          )}

          {/* Calculation Display Feedback */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-amber-800">مبلغ الخصم النهائي المعتمد</div>
              <div className="text-[11px] text-amber-700 mt-0.5">
                سعر الساعة القياسي: <strong className="font-mono">{formatSYP(standardHourlyRate)}</strong>
              </div>
            </div>
            <div className="text-lg font-bold font-mono text-amber-950">
              {formatSYP(computedDeduction)}
            </div>
          </div>

          {/* Optional Note */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700">سبب التأخير (اختياري)</label>
            <input
              type="text"
              placeholder="مثال: عطل في وسيلة النقل / مراجعة رسمية"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'تأكيد وحفظ التأخير والخصم'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

