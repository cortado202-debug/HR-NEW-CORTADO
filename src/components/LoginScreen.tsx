import React, { useState } from 'react';
import { Employee, CompanySettings, UserRole } from '../types';
import { authService } from '../services/authService';
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
  Sparkles,
  Phone
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
  // Form states for each vertical role section
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
  const [adminUsername, setAdminUsername] = useState<string>('admin');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [adminRemember, setAdminRemember] = useState<boolean>(true);

  // Active expanded section (default to employee on top, but all 3 accessible)
  const [activeRoleSection, setActiveRoleSection] = useState<UserRole>('employee');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = (role: UserRole, e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
      return;
    }

    if (!password.trim()) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      return;
    }

    const res = authService.loginWithCredentials(username, password, role);

    if (res.success && res.user) {
      setSuccessMessage(`مرحباً بك، ${res.user.displayName}`);
      setTimeout(() => {
        onLoginSuccess();
      }, 200);
    } else {
      setErrorMessage(res.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center items-center p-3 sm:p-6 font-sans antialiased text-slate-900 selection:bg-slate-900 selection:text-white" dir="rtl">
      
      {/* Main Container */}
      <div className="w-full max-w-xl bg-white border border-slate-200/80 rounded-3xl shadow-xl p-5 sm:p-8 animate-fadeIn my-4">
        
        {/* Header with Logo and Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-3 shadow-md border border-slate-800">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-9 h-9 object-contain" />
            ) : (
              <Building2 className="w-7 h-7 text-emerald-400" />
            )}
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {settings.companyName || 'منظومة سلف وحضور الموظفين'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            تسجيل الدخول الموحد عبر اسم المستخدم وكلمة المرور
          </p>
        </div>

        {/* Global Error or Success Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* Vertical Stack: 3 Portals Arranged One Below The Other */}
        <div className="flex flex-col gap-3.5">
          
          {/* ========================================================================= */}
          {/* 1. TOP PORTAL: EMPLOYEE LOGIN (دخول الموظف - أولاً في الأعلى) */}
          {/* ========================================================================= */}
          <div 
            className={`border rounded-2xl transition-all overflow-hidden ${
              activeRoleSection === 'employee'
                ? 'border-emerald-600 bg-white shadow-md ring-1 ring-emerald-500/30'
                : 'border-slate-200 bg-[#F8FAFC] hover:border-slate-300'
            }`}
          >
            {/* Clickable Header Accordion */}
            <button
              type="button"
              onClick={() => {
                setActiveRoleSection('employee');
                setErrorMessage(null);
              }}
              className="w-full p-4 flex items-center justify-between text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors ${
                  activeRoleSection === 'employee'
                    ? 'bg-emerald-600 text-white'
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
            </button>

            {/* Employee Login Form */}
            {activeRoleSection === 'employee' && (
              <form 
                onSubmit={(e) => handleLoginSubmit('employee', e)}
                method="post"
                autoComplete="on"
                className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100 flex flex-col gap-3.5 animate-fadeIn"
              >
                {/* Employee Username Input */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="username-employee" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>اسم المستخدم للموظف (أو رقم الجوال / الاسم)</span>
                    </span>
                  </label>
                  <input
                    id="username-employee"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="مثال: أحمد أو 0987654321"
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
                      <span>كلمة المرور</span>
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
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={empRemember}
                      onChange={(e) => setEmpRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>حفظ بيانات تسجيل الدخول في المتصفح</span>
                  </label>
                </div>

                <button
                  type="submit"
                  id="btn-submit-employee-login"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>دخول الموظف لمسح باركود الحضور</span>
                </button>
              </form>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. MIDDLE PORTAL: SUPERVISOR LOGIN (دخول المشرف - في الوسط) */}
          {/* ========================================================================= */}
          <div 
            className={`border rounded-2xl transition-all overflow-hidden ${
              activeRoleSection === 'supervisor'
                ? 'border-slate-900 bg-white shadow-md ring-1 ring-slate-900/30'
                : 'border-slate-200 bg-[#F8FAFC] hover:border-slate-300'
            }`}
          >
            {/* Clickable Header Accordion */}
            <button
              type="button"
              onClick={() => {
                setActiveRoleSection('supervisor');
                setErrorMessage(null);
              }}
              className="w-full p-4 flex items-center justify-between text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors ${
                  activeRoleSection === 'supervisor'
                    ? 'bg-slate-900 text-amber-400'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      2. تسجيل دخول المشرف الميداني
                    </span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                      المشرف
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                    تسجيل الحضور والغياب وعرض باركود QR اليومي والسلف (حجب الرواتب)
                  </span>
                </div>
              </div>
            </button>

            {/* Supervisor Login Form */}
            {activeRoleSection === 'supervisor' && (
              <form 
                onSubmit={(e) => handleLoginSubmit('supervisor', e)}
                method="post"
                autoComplete="on"
                className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100 flex flex-col gap-3.5 animate-fadeIn"
              >
                {/* Supervisor Username Input */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="username-supervisor" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-600" />
                      <span>اسم مستخدم المشرف</span>
                    </span>
                  </label>
                  <input
                    id="username-supervisor"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="supervisor"
                    value={supUsername}
                    onChange={(e) => setSupUsername(e.target.value)}
                    required
                    className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-slate-900/30 focus:border-slate-900 outline-none transition-all"
                  />
                </div>

                {/* Supervisor Password Input with Eye Toggle */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="password-supervisor" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
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
                      className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 pl-10 focus:bg-white focus:ring-2 focus:ring-slate-900/30 focus:border-slate-900 outline-none transition-all"
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

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={supRemember}
                      onChange={(e) => setSupRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <span>حفظ بيانات تسجيل الدخول في المتصفح</span>
                  </label>
                </div>

                <button
                  type="submit"
                  id="btn-submit-supervisor-login"
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>دخول المشرف الميداني</span>
                </button>
              </form>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. BOTTOM PORTAL: ADMIN LOGIN (دخول المدير - أخيراً في الأسفل) */}
          {/* ========================================================================= */}
          <div 
            className={`border rounded-2xl transition-all overflow-hidden ${
              activeRoleSection === 'admin'
                ? 'border-slate-950 bg-white shadow-md ring-1 ring-slate-900/40'
                : 'border-slate-200 bg-[#F8FAFC] hover:border-slate-300'
            }`}
          >
            {/* Clickable Header Accordion */}
            <button
              type="button"
              onClick={() => {
                setActiveRoleSection('admin');
                setErrorMessage(null);
              }}
              className="w-full p-4 flex items-center justify-between text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors ${
                  activeRoleSection === 'admin'
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      3. تسجيل دخول المدير العام
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
            </button>

            {/* Admin Login Form */}
            {activeRoleSection === 'admin' && (
              <form 
                onSubmit={(e) => handleLoginSubmit('admin', e)}
                method="post"
                autoComplete="on"
                className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100 flex flex-col gap-3.5 animate-fadeIn"
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
                    placeholder="اسم المستخدم"
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

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={adminRemember}
                      onChange={(e) => setAdminRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <span>حفظ بيانات تسجيل الدخول في المتصفح</span>
                  </label>
                </div>

                <button
                  type="submit"
                  id="btn-submit-admin-login"
                  className="w-full py-3 bg-slate-950 hover:bg-slate-900 active:bg-black text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>دخول المدير العام (لوحة التحكم الشاملة)</span>
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Security Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>قاعدة بيانات سحابية مشفرة ومتزامنة لحظياً (Firebase Firestore)</span>
        </div>

      </div>

    </div>
  );
};
