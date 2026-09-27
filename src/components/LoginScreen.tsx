import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, CompanySettings, UserRole } from '../types';
import { authService } from '../services/authService';
import { syncService } from '../services/syncService';
import { DEFAULT_CORTADO_LOGO } from '../utils/brandLogo';
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
  CheckCircle2 
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
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Clean Role Tabs: employee | supervisor | admin (default to employee)
  const [activeTab, setActiveTab] = useState<'employee' | 'supervisor' | 'admin'>('employee');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [liveBranding, setLiveBranding] = useState<{ logoUrl?: string; companyName?: string }>({});

  useEffect(() => {
    // 1. Fetch live branding immediately
    const loadBranding = async () => {
      try {
        const res = await fetch(`/api/branding?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.logoUrl || data.companyName)) {
            setLiveBranding((prev) => ({
              logoUrl: data.logoUrl || prev.logoUrl,
              companyName: data.companyName || prev.companyName,
            }));
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

    // 2. Fetch fresh state from server so all credentials and employees are in sync
    const refreshData = async () => {
      try {
        const res = await fetch(`/api/data?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const freshData = await res.json();
          if (freshData) {
            syncService.applyServerFullState(freshData);
          }
        }
      } catch {
        // ignore
      }
    };

    loadBranding();
    refreshData();

    // 3. Periodic polling for branding updates
    const pollInterval = setInterval(() => {
      loadBranding();
      refreshData();
    }, 3000);

    // 4. Listen to syncService state updates
    const unsubSync = syncService.subscribe((newData) => {
      if (newData?.settings) {
        setLiveBranding({
          logoUrl: newData.settings.logoUrl || undefined,
          companyName: newData.settings.companyName || undefined,
        });
      }
    });

    return () => {
      clearInterval(pollInterval);
      unsubSync();
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMessage('يرجى إدخال اسم المستخدم');
      setIsLoading(false);
      return;
    }

    if (!cleanPass) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      setIsLoading(false);
      return;
    }

    try {
      const res = await authService.loginWithCredentials(cleanUser, cleanPass, activeTab as UserRole);

      if (res && res.success && res.user) {
        setSuccessMessage('تم التحقق بنجاح، جاري الدخول...');
        setTimeout(() => {
          onLoginSuccess();
        }, 200);
      } else {
        setErrorMessage(res?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('handleLoginSubmit error:', err);
      setErrorMessage(err?.message || 'تعذر التحقق من بيانات الدخول، يرجى إعادة المحاولة');
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

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center items-center p-3 sm:p-6 font-sans antialiased text-slate-900 selection:bg-slate-900 selection:text-white" dir="rtl">
      
      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8 my-4 overflow-hidden relative"
      >
        
        {/* Header with Logo and Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mb-3 shadow-sm border border-slate-200 bg-white p-2 flex items-center justify-center overflow-hidden">
            <img 
              key={activeLogo}
              src={activeLogo} 
              alt={activeCompanyName} 
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== DEFAULT_CORTADO_LOGO) {
                  target.src = DEFAULT_CORTADO_LOGO;
                }
              }}
            />
          </div>
          
          <h1 key={activeCompanyName} className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {activeCompanyName}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            تسجيل الدخول للنظام
          </p>
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 shadow-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-bold flex-1">{errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-extrabold flex-1">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Role Tabs */}
        <div className="flex items-center justify-between p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-bold border border-slate-200">
          <button
            type="button"
            onClick={() => { setActiveTab('employee'); setErrorMessage(null); }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'employee'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>بوابة الموظف</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('supervisor'); setErrorMessage(null); }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'supervisor'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
            <span>بوابة المشرف</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setErrorMessage(null); }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
            <span>لوحة الإدارة</span>
          </button>
        </div>

        {/* Clean Login Form */}
        <form onSubmit={handleLoginSubmit} method="post" autoComplete="on" className="flex flex-col gap-4">
          
          {/* Username Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-username-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>اسم المستخدم</span>
            </label>

            <input
              id="login-username-input"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-[#F8FAFC] border border-slate-300 text-slate-900 text-sm font-medium rounded-2xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span>كلمة المرور</span>
            </label>

            <div className="relative flex items-center">
              <input
                id="login-password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#F8FAFC] border border-slate-300 text-slate-900 text-sm font-medium rounded-2xl px-4 py-3 pl-11 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition-all placeholder:text-slate-400 font-mono"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-2.5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl transition-colors cursor-pointer"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-700 cursor-pointer"
              />
              <span>تذكر تسجيل الدخول</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            id="btn-login-submit"
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-2xl text-sm font-extrabold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>
                  {activeTab === 'employee' 
                    ? 'دخول الموظف' 
                    : activeTab === 'supervisor' 
                      ? 'دخول المشرف' 
                      : 'دخول المدير العام'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Bottom Security Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>منظومة كورتادو السحابية - نظام محمي ومشفر</span>
        </div>

      </motion.div>

    </div>
  );
};
