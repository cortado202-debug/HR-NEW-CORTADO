import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface EnglishMonthPickerProps {
  id?: string;
  value: string; // 'YYYY-MM' e.g. '2026-09'
  onChange: (month: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  { num: '01', name: 'كانون الثاني' },
  { num: '02', name: 'شباط' },
  { num: '03', name: 'آذار' },
  { num: '04', name: 'نيسان' },
  { num: '05', name: 'أيار' },
  { num: '06', name: 'حزيران' },
  { num: '07', name: 'تموز' },
  { num: '08', name: 'آب' },
  { num: '09', name: 'أيلول' },
  { num: '10', name: 'تشرين الأول' },
  { num: '11', name: 'تشرين الثاني' },
  { num: '12', name: 'كانون الأول' },
];

export const EnglishMonthPicker: React.FC<EnglishMonthPickerProps> = ({
  id,
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentYear, currentMonth] = React.useMemo(() => {
    if (!value) {
      const now = new Date();
      return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0')];
    }
    const parts = value.split('-');
    return [parseInt(parts[0], 10) || new Date().getFullYear(), parts[1] || '01'];
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(currentYear);

  useEffect(() => {
    if (currentYear) setViewYear(currentYear);
  }, [currentYear]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectMonth = (num: string) => {
    onChange(`${viewYear}-${num}`);
    setIsOpen(false);
  };

  const selectedMonthObj = MONTH_NAMES.find((m) => m.num === currentMonth);

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 cursor-pointer transition-colors ${
          className || 'bg-transparent text-slate-900 text-xs font-bold'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-slate-500 shrink-0 select-none" />
        <span className="font-mono font-bold tracking-wide select-none" dir="ltr">
          {viewYear}-{currentMonth}
        </span>
        {selectedMonthObj && (
          <span className="text-[11px] text-slate-600 font-medium select-none">
            ({selectedMonthObj.name})
          </span>
        )}
      </div>

      {/* Dropdown Popup */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute z-50 mt-1 top-full right-0 min-w-[260px] bg-white rounded-xl shadow-xl border border-slate-200 p-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Year Navigation */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setViewYear(viewYear - 1)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
              title="السنة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="font-mono text-sm font-bold text-slate-800" dir="ltr">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear(viewYear + 1)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
              title="السنة القادمة"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Months Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((m) => {
              const isSelected = viewYear === currentYear && m.num === currentMonth;
              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => handleSelectMonth(m.num)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="font-mono font-bold text-xs" dir="ltr">
                    {m.num}
                  </span>
                  <span className="text-[10px] font-normal truncate max-w-full">
                    {m.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Month Quick Button */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                setViewYear(yyyy);
                onChange(`${yyyy}-${mm}`);
                setIsOpen(false);
              }}
              className="font-bold text-emerald-700 hover:text-emerald-900"
            >
              الشهر الحالي
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
