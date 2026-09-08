import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface EnglishDatePickerProps {
  id?: string;
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  className?: string;
  placeholder?: string;
}

const WEEKDAY_NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export const EnglishDatePicker: React.FC<EnglishDatePickerProps> = ({
  id,
  value,
  onChange,
  className = '',
  placeholder = 'YYYY/MM/DD',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parsedDate = React.useMemo(() => {
    if (!value) return new Date();
    const parts = value.split('-');
    if (parts.length < 3) return new Date();
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsedDate.getMonth()); // 0-11

  // Update view month/year when external value changes
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length >= 2) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setViewYear(y);
          setViewMonth(m);
        }
      }
    }
  }, [value]);

  // Close when clicking outside
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

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setViewYear(yyyy);
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  // Format value for display: YYYY/MM/DD
  const displayValue = React.useMemo(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return value;
  }, [value]);

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDay = today.getDate();

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {/* Input container */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer transition-colors ${
          className || 'bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-2 hover:bg-slate-100'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-slate-500 shrink-0 select-none" />
        <span className="font-mono text-center flex-1 font-bold text-slate-900 tracking-wide select-none" dir="ltr">
          {displayValue || placeholder}
        </span>
      </div>

      {/* Popup Calendar Dropdown */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute z-50 mt-1 top-full right-0 min-w-[260px] bg-white rounded-xl shadow-xl border border-slate-200 p-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Calendar Header: Month/Year navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5" dir="ltr">
              <span>{viewYear}</span>
              <span>/</span>
              <span>{String(viewMonth + 1).padStart(2, '0')}</span>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="الشهر القادم"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((name, i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 py-0.5">
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for first day offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="w-7 h-7" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const formattedDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === formattedDateStr;
              const isToday = isCurrentMonthToday && day === todayDay;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`w-7 h-7 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-400 hover:bg-emerald-100'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline px-1 py-0.5"
            >
              تحديد اليوم
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 px-1 py-0.5"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
