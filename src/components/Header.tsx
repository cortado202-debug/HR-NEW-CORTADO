import React from 'react';
import { CompanySettings, UserAccount } from '../types';
import { formatArabicDate, getTodayDateString } from '../utils/formatters';
import { DEFAULT_CORTADO_LOGO } from '../utils/brandLogo';
import { 
  Building2, 
  Settings, 
  FileSpreadsheet, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ReceiptText, 
  CalendarCheck, 
  FileText,
  QrCode,
  LogOut,
  User,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

interface HeaderProps {
  settings: CompanySettings;
  connectionStatus: 'connected' | 'reconnecting' | 'offline';
  currentUser?: UserAccount | null;
  onOpenSettings: () => void;
  onOpenPayroll: () => void;
  onOpenDetailedStatement?: () => void;
  onOpenAdvancesList: () => void;
  onOpenAttendanceLedger: () => void;
  onOpenDailyQr?: () => void;
  onLogout?: () => void;
  onSwitchRole?: () => void;
  activeAdvancesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  connectionStatus,
  currentUser,
  onOpenSettings,
  onOpenPayroll,
  onOpenDetailedStatement,
  onOpenAdvancesList,
  onOpenAttendanceLedger,
  onOpenDailyQr,
  onLogout,
  onSwitchRole,
  activeAdvancesCount,
}) => {
  const todayStr = getTodayDateString();
  const arabicDate = formatArabicDate(todayStr);

  const isAdmin = !currentUser || currentUser.role === 'admin';
  const isSupervisor = currentUser?.role === 'supervisor';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16 gap-3">
          
          {/* Right: Company Logo & Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            {(() => {
              const activeLogo = settings.logoUrl || DEFAULT_CORTADO_LOGO;
              return (
                <img
                  src={activeLogo}
                  alt={settings.companyName || 'Cortado'}
                  className="h-9 w-9 md:h-10 md:w-10 rounded-xl object-contain border border-slate-200 bg-white p-0.5 flex-shrink-0 shadow-2xs"
                />
              );
            })()}
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold text-slate-900 truncate leading-tight">
                  {settings.companyName || 'منظومة سلف وحضور الموظفين'}
                </h1>

                {/* Role Badge */}
                {currentUser && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isAdmin 
                      ? 'bg-slate-900 text-emerald-400 border-slate-700' 
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                    <span>{currentUser.displayName || (isAdmin ? 'المدير العام' : 'المشرف')}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate mt-0.5">
                <span className="font-semibold text-slate-700">{arabicDate}</span>
                <span className="hidden sm:inline-block text-slate-300">•</span>
                <span className="hidden sm:inline-block">
                  {isAdmin ? (settings.directorName || 'لوحة الإدارة الشاملة') : 'لوحة المشرف الميداني'}
                </span>
              </div>
            </div>
          </div>

          {/* Left: Sync Status & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            
            {/* Real-time sync badge */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[11px] font-medium border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={
                connectionStatus === 'connected'
                  ? 'متصل بقاعدة بيانات Firebase Firestore السحابية والمزامنة اللحظية مفعلة بين كافة الفروع والأجهزة'
                  : connectionStatus === 'reconnecting'
                  ? 'جاري الاتصال بـ Firebase...'
                  : 'يعمل في وضع عدم الاتصال المحلي'
              }
            >
              {connectionStatus === 'connected' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden xl:inline">مزامنة مباشرة</span>
                </>
              ) : connectionStatus === 'reconnecting' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                  <span className="hidden xl:inline">جاري المزامنة</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-slate-500" />
                  <span className="hidden xl:inline">حفظ محلي</span>
                </>
              )}
            </div>

            {/* Attendance & Delay Ledger Button */}
            <button
              onClick={onOpenAttendanceLedger}
              id="btn-open-attendance-ledger"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="كشف وسجل الحضور والغياب والتأخيرات"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">كشف الحضور</span>
            </button>

            {/* Quick Advances Ledger Button */}
            <button
              onClick={onOpenAdvancesList}
              id="btn-open-advances-ledger"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="سجل السلف المالية"
            >
              <ReceiptText className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">سجل السلف</span>
              {activeAdvancesCount > 0 && (
                <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  {activeAdvancesCount}
                </span>
              )}
            </button>

            {/* Daily QR Code Modal Trigger Button */}
            {onOpenDailyQr && (
              <button
                onClick={onOpenDailyQr}
                id="btn-open-daily-qr-modal"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="عرض باركود الحضور اليومي للطباعة أو العرض على شاشة المدخل"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">باركود اليوم</span>
              </button>
            )}

            {/* Admin-Only: Detailed Statement PDF */}
            {isAdmin && onOpenDetailedStatement && (
              <button
                onClick={onOpenDetailedStatement}
                id="btn-open-detailed-statement"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="كشف تفصيلي شهري لكل موظف مع الغيابات والسلف بصيغة PDF"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden md:inline">كشف تفصيلي (PDF)</span>
              </button>
            )}

            {/* Admin-Only: Monthly Payroll Report */}
            {isAdmin && (
              <button
                onClick={onOpenPayroll}
                id="btn-open-monthly-payroll"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>كشف الرواتب</span>
              </button>
            )}

            {/* Admin-Only: Settings & Admin Drawer */}
            {isAdmin && (
              <button
                onClick={onOpenSettings}
                id="btn-open-settings"
                aria-label="الإعدادات وتوقيت الدوام والشفتات وتصفير البيانات"
                className="flex items-center gap-1 px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg border border-slate-300 transition-colors cursor-pointer shadow-2xs font-semibold text-xs"
                title="الإعدادات، الشفتات، الموظفين، الحسابات، وتصفير البيانات"
              >
                <Settings className="w-4 h-4 text-slate-700" />
                <span className="hidden sm:inline">الإعدادات</span>
              </button>
            )}

            {/* User Role Switcher / Logout */}
            <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 mr-1">
              {onSwitchRole && (
                <button
                  onClick={onSwitchRole}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="تبديل الدور / الحساب"
                >
                  تبديل
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  id="btn-header-logout"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/80 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="تسجيل الخروج من الحساب"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تسجيل خروج</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

