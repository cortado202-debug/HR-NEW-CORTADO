import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, CompanySettings } from '../types';
import { formatSYP, formatArabicDate, getCurrentTimeString } from '../utils/formatters';
import { calculateDailyRate, calculateHourlyRate } from '../utils/payrollMath';
import { X, DoorOpen, Clock, AlertCircle, Check, Sparkles } from 'lucide-react';

interface DepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  record: AttendanceRecord | null;
  date: string;
  settings: CompanySettings;
  onConfirm: (record: AttendanceRecord) => Promise<AttendanceRecord>;
}

const PRESET_HOURS = [0.5, 1, 1.5, 2, 3, 4];

export const DepartureModal: React.FC<DepartureModalProps> = ({
  isOpen,
  onClose,
  employee,
  record,
  date,
  settings,
  onConfirm,
}) => {
  const [departureTime, setDepartureTime] = useState<string>(
    record?.departureTime || getCurrentTimeString()
  );
  const [departureHours, setDepartureHours] = useState<number>(
    record?.departureHours || 1
  );
  const [customDeduction, setCustomDeduction] = useState<string>(
    record?.departureDeduction !== undefined ? String(record.departureDeduction) : ''
  );
  const [reason, setReason] = useState<string>(
    record?.departureReason || 'إذن مغادرة شخصية'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Update time when opening
  useEffect(() => {
    if (isOpen) {
      if (!record?.departureTime) {
        setDepartureTime(getCurrentTimeString());
      } else {
        setDepartureTime(record.departureTime);
      }
      setDepartureHours(record?.departureHours || 1);
      setCustomDeduction(record?.departureDeduction !== undefined ? String(record.departureDeduction) : '');
      setReason(record?.departureReason || 'إذن مغادرة');
    }
  }, [isOpen, record]);

  if (!isOpen || !employee) return null;

  const workDays = employee.monthlyWorkDays || settings.defaultWorkDays || 26;
  const workHours = employee.dailyWorkHours || settings.defaultWorkHours || 8;
  const dailyRate = calculateDailyRate(employee.baseSalary, workDays);
  const hourlyRate = calculateHourlyRate(dailyRate, workHours);

  // Calculated deduction based on departure rate or hourly rate
  const depRate = settings.departureDeductionAmount && settings.departureDeductionAmount > 0
    ? settings.departureDeductionAmount
    : hourlyRate;

  const autoCalculatedDeduction = Math.round(depRate * departureHours);
  const effectiveDeduction = customDeduction !== '' ? Number(customDeduction) : autoCalculatedDeduction;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const existing = record;
      const updated: AttendanceRecord = {
        id: `${employee.id}_${date}`,
        employeeId: employee.id,
        date,
        status: existing?.status || 'present',
        checkInTime: existing?.checkInTime || '08:00',
        checkOutTime: existing?.checkOutTime,
        lateMinutes: existing?.lateMinutes,
        departureTime: departureTime || getCurrentTimeString(),
        departureHours: Number(departureHours),
        departureMinutes: Math.round(Number(departureHours) * 60),
        departureReason: reason.trim() || undefined,
        departureDeduction: customDeduction !== '' ? Number(customDeduction) : autoCalculatedDeduction,
        shiftId: existing?.shiftId,
        shiftName: existing?.shiftName,
        note: existing?.note,
        updatedAt: Date.now(),
      };

      await onConfirm(updated);
      onClose();
    } catch (err) {
      alert('فشل حفظ تسجيل المغادرة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">تسجيل مغادرة موظف</h3>
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
        <form onSubmit={handleSave} className="p-4 sm:p-5 flex flex-col gap-4">
          
          {/* Real-time capture alert */}
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>توقيت المغادرة الحي المأخوذ من الجهاز:</span>
            </div>
            <span className="font-mono font-bold text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-200">
              {departureTime}
            </span>
          </div>

          {/* Preset Hour Buttons */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">تحديد عدد ساعات المغادرة</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDepartureHours(h)}
                  className={`py-2 px-2.5 text-xs font-bold rounded-lg border transition-all ${
                    departureHours === h
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                      : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {h === 0.5 ? 'نصف ساعة (30د)' : `${h} ${h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : 'ساعات'}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700">ساعات المغادرة (مخصص)</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="12"
                value={departureHours}
                onChange={(e) => setDepartureHours(Number(e.target.value))}
                className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700">وقت تسجيل المغادرة</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Deduction Feedback */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-amber-800">مبلغ خصم المغادرة (SYP)</div>
              <div className="text-[11px] text-amber-700 mt-0.5">
                سعر الساعة: <strong className="font-mono">{formatSYP(depRate)}</strong>
              </div>
            </div>
            <div className="text-base font-bold font-mono text-amber-950">
              {formatSYP(effectiveDeduction)}
            </div>
          </div>

          {/* Custom Deduction Override (Optional) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700">تخصيص مبلغ الخصم يدوياً (اختياري)</label>
              {customDeduction !== '' && (
                <button
                  type="button"
                  onClick={() => setCustomDeduction('')}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                >
                  استعادة الحساب التلقائي
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder={`تلقائي: ${autoCalculatedDeduction}`}
                value={customDeduction}
                onChange={(e) => setCustomDeduction(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ل.س</span>
            </div>
          </div>

          {/* Reason / Note */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700">سبب المغادرة (اختياري)</label>
            <input
              type="text"
              placeholder="مثال: إذن شخصي / مراجعة طبيب / ظرف طارئ"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Action Buttons */}
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'تأكيد وحفظ المغادرة'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
