import React, { useState } from 'react';
import { Employee, CompanySettings, UserRole } from '../types';
import { authService } from '../services/authService';
import { 
  Building2, 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Briefcase,
  Sparkles
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
  const [activeTab, setActiveTab] = useState<'quick' | 'credentials' | 'pin'>('quick');
  
  // Credentials Form
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // PIN Form
  const [pin, setPin] = useState<string>('');
  
  // Quick Employee Selector
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeEmployees = employees.filter((e) => e.active);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = authService.loginWithCredentials(username, password);
    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMessage(res.message || 'بيانات الدخول غير صحيحة');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = authService.loginWithPin(pin);
    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMessage(res.message || 'رمز PIN غير صحيح');
    }
  };

  const handleQuickRole = (role: UserRole) => {
    setErrorMessage(null);
    if (role === 'employee') {
      const emp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];
      if (!emp) {
        setErrorMessage('يرجى اختيار موظف أولاً');
        return;
      }
      authService.loginAsRole('employee', emp);
    } else {
      authService.loginAsRole(role);
    }
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 font-sans antialiased text-slate-900" dir="rtl">
      
      {/* Container Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8 animate-fadeIn">
        
        {/* Company Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center mb-3 shadow-md">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-9 h-9 object-contain" />
            ) : (
              <Building2 className="w-7 h-7" />
            )}
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            {settings.companyName || 'مؤسسة كورتادو'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            نظام إدارة الحضور والرواتب والسلف • تسجيل الدخول
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-slate-200 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('quick'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'quick' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            دخول مباشر بالأدوار
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('pin'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'pin' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            رمز PIN
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('credentials'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'credentials' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            اسم المستخدم
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: Quick Role Selector */}
        {activeTab === 'quick' && (
          <div className="flex flex-col gap-3">
            
            {/* Admin Quick Button */}
            <button
              type="button"
              onClick={() => handleQuickRole('admin')}
              id="btn-login-admin"
              className="flex items-center justify-between p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 text-emerald-400 rounded-xl group-hover:bg-slate-700 transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold block">دخول كـ المدير العام</span>
                  <span className="text-[11px] text-slate-400">كامل الصلاحيات والإعدادات والرواتب</span>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* Supervisor Quick Button */}
            <button
              type="button"
              onClick={() => handleQuickRole('supervisor')}
              id="btn-login-supervisor"
              className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl transition-all shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold block">دخول كـ المشرف الميداني</span>
                  <span className="text-[11px] text-slate-500">حضور وباركود QR وسلف (حجب الرواتب)</span>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* Employee Quick Section */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5 mt-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">بوابة الموظف الذاتية:</span>
              </div>

              {activeEmployees.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-slate-900"
                  >
                    {activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.jobTitle})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleQuickRole('employee')}
                    id="btn-login-employee"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>دخول كـ موظف لمسح باركود الحضور</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 py-1">
                  لا يوجد موظفون مسجلون بعد. يمكنك الدخول كمدير لإضافة الموظفين.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: Quick PIN Form */}
        {activeTab === 'pin' && (
          <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="input-pin" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-slate-500" />
                <span>أدخل رمز PIN المكون من 4 أرقام</span>
              </label>
              <input
                id="input-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                required
                className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-center tracking-[1em] text-xl font-bold rounded-2xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
              <p className="text-[11px] text-slate-500 text-center mt-1">
                المدير الافتراضي: <strong className="font-mono">1234</strong> | المشرف: <strong className="font-mono">5678</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={!pin}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </form>
        )}

        {/* TAB 3: Credentials Form */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label htmlFor="input-username" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>اسم المستخدم</span>
              </label>
              <input
                id="input-username"
                type="text"
                placeholder="admin أو supervisor"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3 py-2.5 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="input-password" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>كلمة المرور</span>
              </label>
              <input
                id="input-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-xl px-3 py-2.5 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </form>
        )}

        {/* Bottom Security Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>قاعدة بيانات سحابية مشفرة ومتزامنة لحظياً (Firebase)</span>
        </div>

      </div>

    </div>
  );
};
