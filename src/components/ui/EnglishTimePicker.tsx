import React, { useState, useRef, useEffect } from 'react';
import { Clock, RotateCcw } from 'lucide-react';

interface EnglishTimePickerProps {
  id?: string;
  value: string; // 'HH:mm' e.g. '13:10'
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
  showNowButton?: boolean;
}

const COMMON_HOURS = [
  '07', '08', '09', '10', '11', '12',
  '13', '14', '15', '16', '17', '18',
  '19', '20', '21', '22', '23', '00', '01', '02'
];

const COMMON_MINUTES = [
  '00', '05', '10', '15', '20', '25',
  '30', '35', '40', '45', '50', '55'
];

export const EnglishTimePicker: React.FC<EnglishTimePickerProps> = ({
  id,
  value,
  onChange,
  className = '',
  placeholder = 'HH:mm',
  showNowButton = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Split hours and minutes
  const [currentH, currentM] = React.useMemo(() => {
    if (!value) return ['12', '00'];
    const parts = value.split(':');
    return [parts[0] || '12', parts[1] || '00'];
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

  const handleSelectHour = (h: string) => {
    onChange(`${h}:${currentM}`);
  };

  const handleSelectMinute = (m: string) => {
    onChange(`${currentH}:${m}`);
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  // Convert 24h to 12h label for extra clarity (English)
  const formatted12h = React.useMemo(() => {
    if (!value) return '';
    const h = parseInt(currentH, 10);
    if (isNaN(h)) return value;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${currentM} ${period}`;
  }, [value, currentH, currentM]);

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {/* Time Display Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer transition-colors ${
          className || 'bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-2 hover:bg-slate-100'
        }`}
      >
        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 select-none" />
        <div className="flex-1 flex items-center justify-center gap-1.5 font-mono select-none" dir="ltr">
          <span className="font-bold text-slate-900 tracking-wider">
            {value || placeholder}
          </span>
          {value && (
            <span className="text-[10px] text-slate-400 font-medium">
              ({formatted12h})
            </span>
          )}
        </div>
      </div>

      {/* Popup Time Dropdown */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute z-50 mt-1 top-full right-0 min-w-[280px] bg-white rounded-xl shadow-xl border border-slate-200 p-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">اختيار الوقت بالساعة والدقيقة</span>
            <button
              type="button"
              onClick={handleSetNow}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>الآن</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Hours Column */}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 mb-1.5 text-center">الساعة (HH)</span>
              <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-1 pr-0.5" dir="ltr">
                {COMMON_HOURS.map((h) => {
                  const isSelected = h === currentH;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`text-xs font-mono font-bold py-1 px-1.5 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 mb-1.5 text-center">الدقيقة (MM)</span>
              <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-1 pr-0.5" dir="ltr">
                {COMMON_MINUTES.map((m) => {
                  const isSelected = m === currentM;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`text-xs font-mono font-bold py-1 px-1.5 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-mono text-xs font-bold" dir="ltr">
              {value} ({formatted12h})
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-800 font-bold px-2 py-0.5"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
