import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, CompanySettings, UserRole } from '../types';
import { authService } from '../services/authService';
import { syncService } from '../services/syncService';
import { DEFAULT_CORTADO_LOGO, LOGO_PRESETS } from '../utils/brandLogo';
import { optimizeImageFile } from '../utils/imageUtils';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Users, 
  Briefcase, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  LogIn, 
  CheckCircle2, 
  QrCode, 
  ChevronDown,
  Camera,
  Sparkles,
  Upload,
  X,
  Check,
  Building2,
  RefreshCw
} from 'lucide-react';

interface LoginScreenProps {
  settings: CompanySettings;
  employees: Employee[];
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  employees,
  onLoginSuccess,
}) => {
  // 1. Employee Form (Top)
  const [empUsername, setEmpUsername] = useState<string>('');
  const [empPassword, setEmpPassword] = useState<string>('');
  const [showEmpPassword, setShowEmpPassword] = useState<boolean>(false);
  const [empRemember, setEmpRemember] = useState<boolean>(true);

  // 2. Supervisor Form (Middle)
  const [supUsername, setSupUsername] = useState<string>('supervisor');
  const [supPassword, setSupPassword] = useState<string>('');
  const [showSupPassword, setShowSupPassword] = useState<boolean>(false);
  const [supRemember, setSupRemember] = useState<boolean>(true);

  // 3. Admin Form (Bottom)
  const [adminUsername, setAdminUsername] = useState<string>(settings.directorName || 'admin');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [adminRemember, setAdminRemember] = useState<boolean>(true);

  // Active expanded section (default to employee on top)
  const [activeRoleSection, setActiveRoleSection] = useState<UserRole>('employee');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [liveBranding, setLiveBranding] = useState<{ logoUrl?: string; companyName?: string }>({});

  // Quick Branding Live Manager Modal
  const [showLogoModal, setShowLogoModal] = useState<boolean>(false);
  const [modalLogoInput, setModalLogoInput] = useState<string>('');
  const [modalCompanyName, setModalCompanyName] = useState<string>('');
  const [modalAdminPin, setModalAdminPin] = useState<string>('123');
  const [modalSaving, setModalSaving] = useState<boolean>(false);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Fetch immediately on mount & refresh cache
    const loadBranding = async () => {
      try {
        const res = await fetch(`/api/branding?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.logoUrl || data.companyName)) {
            setLiveBranding({
              logoUrl: data.logoUrl || undefined,
              companyName: data.companyName || undefined,
            });
            if (data.logoUrl) {
              try { localStorage.setItem('cortado_company_logo', data.logoUrl); } catch {}
            }
            if (data.companyName) {
              try { localStorage.setItem('cortado_company_name', data.companyName); } catch {}
            }
          }
        }
      } catch {
        // ignore
      }
    };

    loadBranding();

    // 2. High-speed polling fallback (every 1.5s) to guarantee zero-latency updates on all mobile & desktop screens
    const pollInterval = setInterval(loadBranding, 1500);

    // 3. Listen to syncService state
    const unsubSync = syncService.subscribe((newData) => {
      if (newData?.settings) {
        setLiveBranding({
          logoUrl: newData.settings.logoUrl || undefined,
          companyName: newData.settings.companyName || undefined,
        });
      }
    });

    // 4. Listen to browser broadcast events
    const handleBrandingEvent = (e: any) => {
      if (e?.detail) {
        setLiveBranding({
          logoUrl: e.detail.logoUrl || undefined,
          companyName: e.detail.companyName || undefined,
        });
        if (e.detail.logoUrl) {
          try { localStorage.setItem('cortado_company_logo', e.detail.logoUrl); } catch {}
        }
        if (e.detail.companyName) {
          try { localStorage.setItem('cortado_company_name', e.detail.companyName); } catch {}
        }
      }
    };
    window.addEventListener('cortado_branding_updated', handleBrandingEvent);

    return () => {
      clearInterval(pollInterval);
      unsubSync();
      window.removeEventListener('cortado_branding_updated', handleBrandingEvent);
    };
  }, []);

  const handleToggleSection = (role: UserRole) => {
    setActiveRoleSection(role);
    setErrorMessage(null);
  };

  const handleLoginSubmit = (role: UserRole, e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    let username = '';
    let password = '';

    if (role === 'employee') {
      username = empUsername;
      password = empPassword;
    } else if (role === 'supervisor') {
      username = supUsername;
      password = supPassword;
    } else {
      username = adminUsername;
      password = adminPassword;
    }

    if (!username.trim()) {
      setErrorMessage('يرجى إدخال اسم المستخدم أو رقم الهاتف');
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      setIsLoading(false);
      return;
    }

    const res = authService.loginWithCredentials(username, password, role);

    if (res.success && res.user) {
      setSuccessMessage(`مرحباً بك، ${res.user.displayName}`);
      setTimeout(() => {
        onLoginSuccess();
      }, 300);
    } else {
      setErrorMessage(res.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      setIsLoading(false);
    }
  };

  const cachedLogo = typeof window !== 'undefined' ? localStorage.getItem('cortado_company_logo') : null;
  const cachedName = typeof window !== 'undefined' ? localStorage.getItem('cortado_company_name') : null;

  const activeLogo = (liveBranding.logoUrl && liveBranding.logoUrl.trim() !== '')
    ? liveBranding.logoUrl
    : (settings.logoUrl && settings.logoUrl.trim() !== '') 
      ? settings.logoUrl 
      : (cachedLogo && cachedLogo.trim() !== '') 
        ? cachedLogo 
        : DEFAULT_CORTADO_LOGO;

  const activeCompanyName = (liveBranding.companyName && liveBranding.companyName.trim() !== '')
    ? liveBranding.companyName
    : (settings.companyName && settings.companyName.trim() !== '')
      ? settings.companyName
      : (cachedName && cachedName.trim() !== '')
        ? cachedName
        : 'شركة كورتادو كافيه';

  const handleOpenLogoModal = () => {
    setModalLogoInput(activeLogo);
    setModalCompanyName(activeCompanyName);
    setModalAdminPin('123');
    setModalError(null);
    setModalSuccess(null);
    setShowLogoModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await optimizeImageFile(file, 320);
      setModalLogoInput(optimized);
      setModalError(null);
    } catch {
      setModalError('تعذر معالجة الصورة، يرجى اختيار صورة صالحة أخرى');
    }
  };

  const handleSaveModalBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    setModalSaving(true);
    try {
      const payload = {
        companyName: modalCompanyName.trim() || activeCompanyName,
        logoUrl: modalLogoInput || activeLogo,
      };

      // 1. Instant local state update
      setLiveBranding(payload);
      try {
        localStorage.setItem('cortado_company_logo', payload.logoUrl);
        localStorage.setItem('cortado_company_name', payload.companyName);
      } catch {
        // ignore
      }

      // 2. Global sync & multi-device broadcast via syncService
      await syncService.updateBranding(payload);

      // 3. Fallback direct POST to /api/branding
      await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setModalSuccess('✅ تم تحديث الشعار والاسم ونشره فورياً لكافة الأجهزة وشاشات تسجيل الدخول!');
      setTimeout(() => {
        setShowLogoModal(false);
        setModalSuccess(null);
      }, 1200);
    } catch {
      setModalError('حدث خطأ أثناء نشر الشعار، يرجى المحاولة ثانية');
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center items-center p-3 sm:p-6 font-sans antialiased text-slate-900 selection:bg-slate-900 selection:text-white" dir="rtl">
      
      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl shadow-xl p-5 sm:p-8 my-4 overflow-hidden"
      >
        
        {/* Header with Logo and Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl mb-3 shadow-md border-2 border-emerald-500/40 bg-white p-2 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105">
              <img 
                key={activeLogo}
                src={activeLogo} 
                alt={activeCompanyName} 
                className="w-full h-full object-contain rounded-2xl drop-shadow-xs transition-all duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== DEFAULT_CORTADO_LOGO) {
                    target.src = DEFAULT_CORTADO_LOGO;
                  }
                }}
              />
            </div>

            {/* Quick Logo Edit Button on the logo badge itself */}
            <button
              type="button"
              id="btn-quick-edit-logo"
              onClick={handleOpenLogoModal}
              title="تغيير وتحديث الشعار فورياً لكافة الشاشات"
              className="absolute -bottom-1 -left-1 p-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-full shadow-lg border-2 border-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center z-10"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          <h1 key={activeCompanyName} className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight transition-all duration-300">
            {activeCompanyName}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>بوابة تسجيل الدخول الموحدة للمنشأة</span>
          </div>

          {/* Direct Quick Branding Button for Instant Propagation */}
          <button
            type="button"
            id="btn-open-branding-modal"
            onClick={handleOpenLogoModal}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>تحديث شعار واسم المنشأة فورياً لجميع الأجهزة</span>
          </button>
        </div>

        {/* Global Error or Success Alert */}
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-bold">{errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-extrabold">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vertical Stack: 3 Portals Arranged One Below The Other with Slide-Down Animation */}
        <div className="flex flex-col gap-3.5">
          
          {/* ========================================================================= */}
          {/* 1. TOP PORTAL: EMPLOYEE LOGIN (دخول الموظف - أولاً في الأعلى) */}
          {/* ========================================================================= */}
          <div 
            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
              activeRoleSection === 'employee'
                ? 'border-emerald-600 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-[#F8FAFC] hover:border-slate-300 hover:bg-slate-100/60'
            }`}
          >
            {/* Clickable Header Accordion Button */}
            <button
              type="button"
              id="btn-role-employee"
              onClick={() => handleToggleSection('employee')}
              className="w-full p-4 flex items-center justify-between text-right cursor-pointer select-none transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                  activeRoleSection === 'employee'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      1. تسجيل دخول الموظف
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                      بوابة الحضور الذاتي
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                    مسح باركود الحضور بالكاميرا والاطلاع على السجل المالي والسلف الشخصية
                  </span>
                </div>
              </div>

              {/* Animated Chevron Indicator */}
              <motion.div
                animate={{ rotate: activeRoleSection === 'employee' ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-slate-400 p-1 flex-shrink-0"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </button>

            {/* Slide-Down Employee Login Form */}
            <AnimatePresence initial={false}>
              {activeRoleSection === 'employee' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <form 
                    onSubmit={(e) => handleLoginSubmit('employee', e)}
                    method="post"
                    autoComplete="on"
                    className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-emerald-100/80 bg-white flex flex-col gap-3.5"
                  >
                    {/* Employee Username Input */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="username-employee" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span>اسم الموظف أو رمزه أو رقم هاتفه</span>
                        </span>
                      </label>
                      <input
                        id="username-employee"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder="أدخل اسمك أو اسم المستخدم أو رقم هاتفك"
                        value={empUsername}
                        onChange={(e) => setEmpUsername(e.target.value)}
                        required
                        className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 outline-none transition-all"
                      />
                    </div>

                    {/* Employee Password Input with Eye Toggle */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="password-employee" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>كلمة المرور (أو رمز PIN)</span>
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="password-employee"
                          name="password"
                          type={showEmpPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={empPassword}
                          onChange={(e) => setEmpPassword(e.target.value)}
                          required
                          className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 pl-10 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 outline-none transition-all"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowEmpPassword(!showEmpPassword)}
                          id="btn-toggle-emp-pwd"
                          className="absolute left-2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title={showEmpPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        >
                          {showEmpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember and Submit */}
                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 font-medium">
                        <input
                          type="checkbox"
                          checked={empRemember}
                          onChange={(e) => setEmpRemember(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>حفظ بيانات تسجيل الدخول في هذا الجهاز</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      id="btn-submit-employee-login"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>دخول الموظف لمسح باركود الحضور</span>
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ========================================================================= */}
          {/* 2. MIDDLE PORTAL: SUPERVISOR LOGIN (دخول المشرف - في الوسط) */}
          {/* ========================================================================= */}
          <div 
            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
              activeRoleSection === 'supervisor'
                ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-[#F8FAFC] hover:border-slate-300 hover:bg-slate-100/60'
            }`}
          >
            {/* Clickable Header Accordion Button */}
            <button
              type="button"
              id="btn-role-supervisor"
              onClick={() => handleToggleSection('supervisor')}
              className="w-full p-4 flex items-center justify-between text-right cursor-pointer select-none transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                  activeRoleSection === 'supervisor'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      2. تسجيل دخول المشرف الميداني
                    </span>
                    <span className="bg-indigo-100 text-indigo-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
                      إدارة الحضور والسلف
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                    تسجيل الحضور والغياب وعرض باركود QR اليومي والسلف (حجب الرواتب)
                  </span>
                </div>
              </div>

              {/* Animated Chevron Indicator */}
              <motion.div
                animate={{ rotate: activeRoleSection === 'supervisor' ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-slate-400 p-1 flex-shrink-0"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </button>

            {/* Slide-Down Supervisor Login Form */}
            <AnimatePresence initial={false}>
              {activeRoleSection === 'supervisor' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <form 
                    onSubmit={(e) => handleLoginSubmit('supervisor', e)}
                    method="post"
                    autoComplete="on"
                    className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-indigo-100/80 bg-white flex flex-col gap-3.5"
                  >
                    {/* Supervisor Username Input */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="username-supervisor" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          <span>اسم مستخدم المشرف</span>
                        </span>
                      </label>
                      <input
                        id="username-supervisor"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder="أدخل اسم مستخدم المشرف"
                        value={supUsername}
                        onChange={(e) => setSupUsername(e.target.value)}
                        required
                        className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>

                    {/* Supervisor Password Input with Eye Toggle */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="password-supervisor" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>كلمة المرور</span>
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="password-supervisor"
                          name="password"
                          type={showSupPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={supPassword}
                          onChange={(e) => setSupPassword(e.target.value)}
                          required
                          className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 pl-10 focus:bg-white focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 outline-none transition-all"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowSupPassword(!showSupPassword)}
                          id="btn-toggle-sup-pwd"
                          className="absolute left-2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title={showSupPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        >
                          {showSupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 font-medium">
                        <input
                          type="checkbox"
                          checked={supRemember}
                          onChange={(e) => setSupRemember(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>حفظ بيانات تسجيل الدخول في هذا الجهاز</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      id="btn-submit-supervisor-login"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-white" />
                      <span>دخول المشرف الميداني</span>
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ========================================================================= */}
          {/* 3. BOTTOM PORTAL: ADMIN LOGIN (دخول المدير - أخيراً في الأسفل) */}
          {/* ========================================================================= */}
          <div 
            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
              activeRoleSection === 'admin'
                ? 'border-slate-900 bg-slate-900/5 shadow-md ring-2 ring-slate-900/20'
                : 'border-slate-200 bg-[#F8FAFC] hover:border-slate-300 hover:bg-slate-100/60'
            }`}
          >
            {/* Clickable Header Accordion Button */}
            <button
              type="button"
              id="btn-role-admin"
              onClick={() => handleToggleSection('admin')}
              className="w-full p-4 flex items-center justify-between text-right cursor-pointer select-none transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                  activeRoleSection === 'admin'
                    ? 'bg-slate-900 text-emerald-400 shadow-sm'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      3. تسجيل دخول المدير العام (Admin)
                    </span>
                    <span className="bg-slate-900 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-slate-700">
                      الإدارة الشاملة
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                    كامل الصلاحيات، كشوفات الرواتب الشهرية، تقارير PDF، والإعدادات
                  </span>
                </div>
              </div>

              {/* Animated Chevron Indicator */}
              <motion.div
                animate={{ rotate: activeRoleSection === 'admin' ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-slate-400 p-1 flex-shrink-0"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </button>

            {/* Slide-Down Admin Login Form */}
            <AnimatePresence initial={false}>
              {activeRoleSection === 'admin' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <form 
                    onSubmit={(e) => handleLoginSubmit('admin', e)}
                    method="post"
                    autoComplete="on"
                    className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-slate-200 bg-white flex flex-col gap-3.5"
                  >
                    {/* Admin Username Input */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="username-admin" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-700" />
                          <span>اسم مستخدم المدير العام</span>
                        </span>
                      </label>
                      <input
                        id="username-admin"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder="أدخل اسم مستخدم المدير العام"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        required
                        className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-slate-900/30 focus:border-slate-900 outline-none transition-all"
                      />
                    </div>

                    {/* Admin Password Input with Eye Toggle */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="password-admin" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-700" />
                          <span>كلمة المرور</span>
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="password-admin"
                          name="password"
                          type={showAdminPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          required
                          className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 pl-10 focus:bg-white focus:ring-2 focus:ring-slate-900/30 focus:border-slate-900 outline-none transition-all"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          id="btn-toggle-admin-pwd"
                          className="absolute left-2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title={showAdminPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        >
                          {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 font-medium">
                        <input
                          type="checkbox"
                          checked={adminRemember}
                          onChange={(e) => setAdminRemember(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                        <span>حفظ بيانات تسجيل الدخول في هذا الجهاز</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      id="btn-submit-admin-login"
                      className="w-full py-3 bg-slate-950 hover:bg-slate-900 active:bg-black text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>دخول المدير العام (لوحة التحكم الشاملة)</span>
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Bottom Security Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>قاعدة بيانات سحابية مشفرة ومتزامنة لحظياً (Firebase Firestore)</span>
        </div>

      </motion.div>

      {/* Instant Branding Manager Modal */}
      <AnimatePresence>
        {showLogoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">تحديث شعار واسم المنشأة فورياً</h3>
                    <p className="text-xs text-slate-500">يتغير مباشرة على كافة شاشات وأجهزة الموظفين والمشرفين</p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-close-logo-modal"
                  onClick={() => setShowLogoModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveModalBranding} className="space-y-4 pt-4 overflow-y-auto pr-1">
                {modalSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{modalSuccess}</span>
                  </div>
                )}

                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Current & Preview Logo */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden">
                    <img
                      src={modalLogoInput || activeLogo}
                      alt="معاينة الشعار"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 text-right">
                    <div className="text-xs font-bold text-slate-800 mb-1">معاينة الشعار المباشر</div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      يمكنك رفع صورة من جهازك أو اختيار أحد التصاميم المعتمدة أدناه.
                    </p>
                    <button
                      type="button"
                      id="btn-upload-logo-file"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع صورة الشعار من الجهاز</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Ready Presets Gallery */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    أو اختر شعاراً معتمداً فورياً لكورتادو كافيه:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {LOGO_PRESETS.map((preset) => {
                      const isSelected = modalLogoInput === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setModalLogoInput(preset.url);
                            setModalError(null);
                          }}
                          className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 truncate w-full">
                            {preset.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Company Name Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المنشأة / الشركة (يظهر في رأس كل الشاشات):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={modalCompanyName}
                      onChange={(e) => setModalCompanyName(e.target.value)}
                      placeholder="مثال: شركة كورتادو كافيه"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all pl-9"
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Save & Broadcast Button */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={modalSaving}
                    id="btn-save-modal-branding"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {modalSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ والتعميم...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-200" />
                        <span>حفظ وتعميم الشعار فورياً لكافة الأجهزة</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoModal(false)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
