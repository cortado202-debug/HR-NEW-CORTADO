import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, CompanySettings, UserRole } from '../types';
import { authService } from '../services/authService';
import { DEFAULT_CORTADO_LOGO } from '../utils/brandLogo';
import { 
  Building2, 
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
  Sparkles,
  KeyRound
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

  const activeLogo = settings.logoUrl || DEFAULT_CORTADO_LOGO;

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
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl mb-3 shadow-md border-2 border-emerald-500/40 bg-white p-2 flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105">
            <img 
              src={activeLogo} 
              alt={settings.companyName || 'شعار الشركة'} 
              className="w-full h-full object-contain rounded-2xl drop-shadow-xs"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {settings.companyName || 'شركة كورتادو كافيه'}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>بوابة تسجيل الدخول الموحدة للمنشأة</span>
          </div>
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
                    {/* Helpful Tip */}
                    <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/50 text-[11px] text-emerald-900 font-medium flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>يمكنك الدخول باسم الموظف أو رمزه أو رقم هاتفه مع كلمة المرور (الافتراضية: 123)</span>
                    </div>

                    {/* Employee Username Input */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="username-employee" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span>اسم المستخدم أو الاسم أو رقم الجوال</span>
                        </span>
                      </label>
                      <input
                        id="username-employee"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder="مثال: أحمد أو AMD أو 0987654321"
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
                    {/* Helpful Tip */}
                    <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-200/50 text-[11px] text-indigo-900 font-medium flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      <span>اسم المستخدم الافتراضي: supervisor | كلمة المرور الافتراضية: 123</span>
                    </div>

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
                        placeholder="مثال: supervisor"
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
                    {/* Helpful Tip */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-medium flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>اسم المستخدم: {settings.directorName || 'admin'} | كلمة المرور الافتراضية: 123</span>
                    </div>

                    {/* Admin Username Input */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="username-admin" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-700" />
                          <span>اسم مستخدم المدير العام أو اسمه</span>
                        </span>
                      </label>
                      <input
                        id="username-admin"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder="اسم المستخدم أو admin"
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

    </div>
  );
};
