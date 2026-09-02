import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, CompanySettings } from '../types';
import { formatSYP, parseSYPInput, formatNumberWithCommas } from '../utils/formatters';
import { 
  calculateHourlyRate, 
  calculateDailyRate, 
  calculateOvertimePay,
  calculateOvertimeDuration
} from '../utils/payrollMath';
import { 
  Clock, 
  ClockPlus, 
  Save, 
  X, 
  DollarSign, 
  Briefcase, 
  CheckCircle2, 
  Calendar, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  record: AttendanceRecord | null;
  date: string;
  settings: CompanySettings;
  onSave: (record: AttendanceRecord) => Promise<AttendanceRecord>;
}

export const OvertimeModal: React.FC<OvertimeModalProps> = ({
  isOpen,
  onClose,
  employee,
  record,
  date,
  settings,
  onSave,
}) => {
  const [checkOutTime, setCheckOutTime] = useState<string>('');
  const [overtimeHours, setOvertimeHours] = useState<number>(1);
  const [customPayRaw, setCustomPayRaw] = useState<string>('');
  const [isCustomPay, setIsCustomPay] = useState<boolean>(false);
  const [overtimeReason, setOvertimeReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Initialize or reset form state when modal opens or props change
  useEffect(() => {
    if (isOpen && employee) {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const liveTime = `${currentHours}:${currentMins}`;

      const existingCheckOut = record?.checkOutTime || liveTime;
      setCheckOutTime(existingCheckOut);

      if (record?.overtimeHours !== undefined && record.overtimeHours > 0) {
        setOvertimeHours(record.overtimeHours);
      } else {
        // Estimate overtime from check-in and check-out if available
        const shift = settings.shifts?.find(s => s.id === employee.assignedShiftId) || settings.shifts?.[0];
        const checkIn = record?.checkInTime || shift?.startTime || '08:00';
        const calc = calculateOvertimeDuration(checkIn, existingCheckOut, shift, employee.dailyWorkHours || 8);
        setOvertimeHours(calc.overtimeHours > 0 ? calc.overtimeHours : 1);
      }

      if (record?.overtimePay !== undefined && record.overtimePay > 0) {
        setIsCustomPay(true);
        setCustomPayRaw(formatNumberWithCommas(record.overtimePay));
      } else {
        setIsCustomPay(false);
        setCustomPayRaw('');
      }

      setOvertimeReason(record?.overtimeReason || record?.note || '');
    }
  }, [isOpen, employee, record, settings]);

  if (!isOpen || !employee) return null;

  const workDays = employee.monthlyWorkDays || settings.defaultWorkDays || 26;
  const workHours = employee.dailyWorkHours || settings.defaultWorkHours || 8;
  const dailyRate = calculateDailyRate(employee.baseSalary, workDays);
  const hourlyRate = calculateHourlyRate(dailyRate, workHours);

  const calculatedPay = calculateOvertimePay(overtimeHours, hourlyRate, settings);
  const finalPay = isCustomPay && customPayRaw ? parseSYPInput(customPayRaw) : calculatedPay;

  const handleQuickHourSelect = (hrs: number) => {
    setOvertimeHours(hrs);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedRecord: AttendanceRecord = {
        id: record?.id || `${employee.id}_${date}`,
        employeeId: employee.id,
        date: date,
        status: (record?.status && record.status !== 'absent') ? record.status : 'present',
        checkInTime: record?.checkInTime || '08:00',
        checkOutTime: checkOutTime || undefined,
        lateMinutes: record?.lateMinutes,
        departureTime: record?.departureTime,
        departureHours: record?.departureHours,
        departureMinutes: record?.departureMinutes,
        departureReason: record?.departureReason,
        departureDeduction: record?.departureDeduction,
        overtimeHours: Number(overtimeHours) || 0,
        overtimeMinutes: Math.round((Number(overtimeHours) || 0) * 60),
        overtimePay: finalPay > 0 ? finalPay : undefined,
        overtimeReason: overtimeReason.trim() || undefined,
        shiftId: employee.assignedShiftId || record?.shiftId,
        shiftName: record?.shiftName,
        customDeduction: record?.customDeduction,
        note: record?.note,
        updatedAt: Date.now(),
        updatedBy: 'admin',
      };

      await onSave(updatedRecord);
      onClose();
    } catch (err) {
      console.error('Error saving overtime:', err);
      alert('حدث خطأ أثناء حفظ بيانات العمل الإضافي');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveOvertime = async () => {
    if (!record) {
      onClose();
      return;
    }
    setIsSaving(true);
    try {
      const updatedRecord: AttendanceRecord = {
        ...record,
        overtimeHours: 0,
        overtimeMinutes: 0,
        overtimePay: 0,
        overtimeReason: undefined,
        updatedAt: Date.now(),
      };
      await onSave(updatedRecord);
      onClose();
    } catch (err) {
      console.error('Error removing overtime:', err);
      alert('حدث خطأ أثناء إلغاء الإضافي');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
              <ClockPlus className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>تسجيل الانصراف والعمل الإضافي</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/30 text-emerald-200 rounded-md border border-emerald-400/40">
                  +مستحقات
                </span>
              </h3>
              <p className="text-xs text-emerald-200/80">
                توثيق وقت الخروج واحتساب الساعات الإضافية المضافة للراتب
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleFormSubmit} className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 bg-[#F8FAFC]">
          
          {/* Employee Card Info */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm ${employee.avatarColor || 'bg-slate-800'}`}>
                {employee.name.slice(0, 2)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{employee.name}</h4>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>{employee.jobTitle}</span>
                  <span>•</span>
                  <span className="font-mono font-semibold text-slate-700">{formatSYP(employee.baseSalary)}</span>
                </p>
              </div>
            </div>

            <div className="text-left">
              <span className="text-[10px] text-slate-400 block font-medium">سعر ساعة الموظف</span>
              <span className="text-xs font-mono font-bold text-emerald-700">{formatSYP(hourlyRate)}/س</span>
            </div>
          </div>

          {/* Date & Shift Times Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                تاريخ اليوم
              </label>
              <div className="text-xs font-bold font-mono text-slate-800">{date}</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                وقت الانصراف / الخروج
              </label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Overtime Hours Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                عدد ساعات العمل الإضافي (Overtime Hours)
              </label>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {overtimeHours} ساعة
              </span>
            </div>

            {/* Quick Hour Preset Pills */}
            <div className="grid grid-cols-6 gap-1.5">
              {[0.5, 1, 1.5, 2, 3, 4].map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => handleQuickHourSelect(hrs)}
                  className={`py-1.5 text-xs font-bold font-mono rounded-lg transition-all border ${
                    overtimeHours === hrs
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  +{hrs} س
                </button>
              ))}
            </div>

            {/* Custom Range Slider / Manual Input */}
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-600 cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="12"
                step="0.25"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Overtime Pay Calculation Breakdown Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 rounded-xl border border-emerald-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">المبلغ المالي المضاف لراتب الموظف</span>
              </div>
              
              <button
                type="button"
                onClick={() => setIsCustomPay(!isCustomPay)}
                className="text-[11px] text-emerald-800 font-bold hover:underline"
              >
                {isCustomPay ? 'العودة للاحتساب التلقائي' : 'تعديل المبلغ يدوياً'}
              </button>
            </div>

            {!isCustomPay ? (
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-xl font-bold font-mono text-emerald-900">
                    +{formatSYP(calculatedPay)}
                  </div>
                  <p className="text-[10px] text-emerald-800 mt-0.5">
                    {settings.overtimeMode === 'fixed_hour' && settings.overtimeAmountPerHour
                      ? `معدل ثابت: ${formatSYP(settings.overtimeAmountPerHour)} لكل ساعة × ${overtimeHours} س`
                      : settings.overtimeMode === 'hourly_multiplier'
                      ? `مضاعف (${settings.overtimeRateMultiplier || 1.25}x) من أجر الساعة (${formatSYP(hourlyRate)}) × ${overtimeHours} س`
                      : `أجر الساعة الأساسي (${formatSYP(hourlyRate)}) × ${overtimeHours} س`}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-1 rounded-md border border-emerald-200 shadow-2xs">
                  حساب تلقائي
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 pt-1 animate-fadeIn">
                <label className="text-[11px] font-bold text-emerald-900">المبلغ المخصص للإضافي بالليرة السورية:</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={customPayRaw}
                    onChange={(e) => setCustomPayRaw(e.target.value)}
                    placeholder="مثال: 50,000"
                    className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 pl-12 text-sm font-mono font-bold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute left-3 text-xs font-bold text-emerald-700">ل.س</span>
                </div>
              </div>
            )}
          </div>

          {/* Reason / Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">بيان / سبب العمل الإضافي (اختياري)</label>
            <input
              type="text"
              value={overtimeReason}
              onChange={(e) => setOvertimeReason(e.target.value)}
              placeholder="مثال: إنجاز طلبيات الزبائن / تمديد ساعات الوردية المسائية"
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            {record?.overtimeHours && record.overtimeHours > 0 ? (
              <button
                type="button"
                onClick={handleRemoveOvertime}
                disabled={isSaving}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                إلغاء الإضافي لهذا اليوم
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'جاري الحفظ...' : 'اعتماد الإضافي والانصراف'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
