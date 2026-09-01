import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CompanySettings } from '../types';
import { generateDailyQrString } from '../utils/qrUtils';
import { formatArabicDate, getTodayDateString, getCurrentTimeString } from '../utils/formatters';
import { 
  QrCode, 
  Maximize2, 
  Printer, 
  RefreshCw, 
  Clock, 
  Building2, 
  CheckCircle2, 
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface SupervisorQrDisplayProps {
  settings: CompanySettings;
  presentCount?: number;
  totalEmployeesCount?: number;
}

export const SupervisorQrDisplay: React.FC<SupervisorQrDisplayProps> = ({
  settings,
  presentCount = 0,
  totalEmployeesCount = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const printCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>(getCurrentTimeString());
  const [tokenCounter, setTokenCounter] = useState<number>(0);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const todayStr = getTodayDateString();
  const arabicDate = formatArabicDate(todayStr);

  // Dynamic daily QR payload
  const qrDataString = generateDailyQrString(
    settings.companyName || 'مؤسسة كورتادو',
    `${settings.qrSecretSalt || 'syp'}_${tokenCounter}`
  );

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Draw QR code onto canvas
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrDataString, {
        width: 190,
        margin: 1.5,
        color: {
          dark: '#0F172A', // slate-900
          light: '#FFFFFF',
        },
      }).catch((err) => console.error('QR Render Error:', err));
    }

    if (isFullscreen && fullscreenCanvasRef.current) {
      QRCode.toCanvas(fullscreenCanvasRef.current, qrDataString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      }).catch((err) => console.error('Fullscreen QR Render Error:', err));
    }
  }, [qrDataString, isFullscreen]);

  const handlePrintDailyQr = () => {
    window.print();
  };

  const handleManualRefresh = () => {
    setTokenCounter((prev) => prev + 1);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <>
      {/* Supervisor Top QR Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-5 no-print">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
          
          {/* Right Info & Instructions */}
          <div className="flex-1 w-full text-right">
            
            {/* Badge & Status */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>رمز الحضور الذاتي الفعال لليوم</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentTime}</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>باركود تسجيل الحضور اليومي للمشرف</span>
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl">
              اعرض هذا الرمز على شاشة جوالك أو التابلت عند مدخل المنشأة. يقوم الموظف بفتح حسابه والضغط على <strong className="text-slate-900 font-bold">"مسح باركود الحضور"</strong> لتسجيل دخوله فورياً ومطابقة وقت الدوام والشفت لحظة بلحظة.
            </p>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3.5">
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-500 block font-medium">تاريخ صلاحية الرمز</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5 block">{todayStr}</span>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-500 block font-medium">إجمالي الحضور اليوم</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono mt-0.5 block">
                  {presentCount} / {totalEmployeesCount} موظف
                </span>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 block font-medium">التحديث التلقائي</span>
                <span className="text-xs font-bold text-slate-700 mt-0.5 block">يتجدد يومياً عند 12:00 ليلاً</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                id="btn-fullscreen-qr"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="عرض الرمز بحجم كبير على كامل الشاشة لاستقبال الموظفين"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>تكبير الرمز للشاشة الكاملة</span>
              </button>

              <button
                type="button"
                onClick={handlePrintDailyQr}
                id="btn-print-daily-qr"
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="طباعة بوستر رمز الحضور لتعليقه في مدخل العمل"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>طباعة بوستر الحضور اليومي</span>
              </button>

              <button
                type="button"
                onClick={handleManualRefresh}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                title="إعادة توليد توكن الأمان للرمز"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث الرمز</span>
              </button>

              {copiedNotification && (
                <span className="text-xs font-bold text-emerald-700 animate-fadeIn">
                  ✓ تم تحديث الرمز
                </span>
              )}
            </div>

          </div>

          {/* Left Canvas Preview Box */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center p-3 sm:p-4 bg-[#F8FAFC] border-2 border-dashed border-slate-300 rounded-2xl">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
              <canvas ref={canvasRef} className="rounded-lg max-w-full block" />
            </div>
            <span className="text-[11px] font-bold text-slate-600 mt-2 font-mono">
              {arabicDate}
            </span>
          </div>

        </div>
      </section>

      {/* Fullscreen Kiosk Mode Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 no-print animate-fadeIn">
          
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col items-center text-center relative">
            
            {/* Close button */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 left-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors cursor-pointer"
              title="إغلاق وضع الشاشة الكاملة"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-base font-extrabold text-slate-900">
                {settings.companyName || 'منظومة الحضور الذكي'}
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              امسح الرمز لتسجيل حضورك
            </h3>
            
            <p className="text-xs text-slate-500 mt-1 mb-4">
              وجه كاميرا تطبيق الموظف نحو الرمز أدناه ليتم تثبيت الحضور فورياً
            </p>

            {/* QR Big Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-900 shadow-md mb-4">
              <canvas ref={fullscreenCanvasRef} className="block rounded-lg" />
            </div>

            {/* Realtime Footer */}
            <div className="flex items-center justify-between w-full text-xs font-mono font-bold text-slate-700 px-2 py-2 bg-slate-100 rounded-xl">
              <span>📅 {arabicDate}</span>
              <span className="text-emerald-700">⏰ {currentTime}</span>
            </div>

            <button
              onClick={() => setIsFullscreen(false)}
              className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              العودة للوحة المشرف
            </button>

          </div>

        </div>
      )}

      {/* Hidden Printable A4 Daily QR Poster */}
      <div id="daily-qr-poster-printable" className="hidden print:block p-8 text-center bg-white">
        <div className="border-4 border-slate-900 rounded-3xl p-8 max-w-xl mx-auto flex flex-col items-center">
          
          {settings.logoUrl && (
            <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain mb-3" />
          )}

          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
            {settings.companyName || 'مؤسسة كورتادو'}
          </h1>
          <h2 className="text-lg font-bold text-slate-700 mb-4">
            نظام تسجيل الحضور الذاتي اليومي بالباركود
          </h2>

          <div className="p-6 bg-white border-2 border-slate-900 rounded-2xl my-4">
            <canvas ref={printCanvasRef} className="block" />
          </div>

          <div className="text-sm font-bold font-mono text-slate-800 mt-2">
            تاريخ اليوم: {arabicDate} ({todayStr})
          </div>

          <p className="text-xs text-slate-600 mt-4 leading-relaxed max-w-md">
            تعليمات للموظف: افتح هاتفك وسجل الدخول لحسابك، ثم اضغط على زر "مسح باركود الحضور" ووجه الكاميرا نحو هذا الرمز ليتم تسجيل الحضور بدقة واحتساب وقت الدوام.
          </p>

          <div className="mt-8 pt-4 border-t border-slate-300 w-full text-xs text-slate-500 font-bold flex justify-between">
            <span>إدارة الموارد البشرية والشؤون الإدارية</span>
            <span>SYP Payroll & Attendance System</span>
          </div>

        </div>
      </div>
    </>
  );
};
