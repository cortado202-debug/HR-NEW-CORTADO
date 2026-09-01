import React, { useState } from 'react';
import { Employee, CompanySettings, AppData, WorkShift, LateDeductionMode, UserAccount, UserRole } from '../types';
import { formatSYP, parseSYPInput, getTodayDateString } from '../utils/formatters';
import { DEFAULT_ACCOUNTS } from '../utils/initialData';
import { 
  X, 
  Building2, 
  Users, 
  Sliders, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Save, 
  RotateCcw, 
  Download,
  AlertCircle,
  Banknote,
  Briefcase,
  Clock,
  DoorOpen,
  ShieldAlert,
  Sparkles,
  CalendarCheck2,
  ShieldCheck,
  KeyRound,
  Lock,
  UserCheck
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  employees: Employee[];
  onUpdateSettings: (settings: Partial<CompanySettings>) => Promise<CompanySettings>;
  onSaveEmployee: (employee: Partial<Employee> & { name: string; baseSalary: number }) => Promise<Employee>;
  onDeleteEmployee: (id: string) => Promise<boolean>;
  onResetNewMonth: () => Promise<boolean>;
  onResetData: () => Promise<boolean>;
  appData: AppData;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  employees,
  onUpdateSettings,
  onSaveEmployee,
  onDeleteEmployee,
  onResetNewMonth,
  onResetData,
  appData,
}) => {
  const [activeTab, setActiveTab] = useState<'shifts' | 'employees' | 'users' | 'branding' | 'deductions' | 'backup'>('shifts');
  
  // Settings Form State
  const [companyName, setCompanyName] = useState<string>(settings.companyName);
  const [directorName, setDirectorName] = useState<string>(settings.directorName);
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const [defaultWorkDays, setDefaultWorkDays] = useState<number>(settings.defaultWorkDays || 26);
  const [defaultWorkHours, setDefaultWorkHours] = useState<number>(settings.defaultWorkHours || 8);
  const [absentMultiplier, setAbsentMultiplier] = useState<number>(settings.defaultAbsentDeductionMultiplier || 1.0);
  const [lateDeductionMode, setLateDeductionMode] = useState<LateDeductionMode>(settings.lateDeductionMode || 'proportional_salary');
  const [lateDeductionAmountRaw, setLateDeductionAmountRaw] = useState<string>(
    settings.lateDeductionAmount ? String(settings.lateDeductionAmount) : ''
  );
  const [departureDeductionMode, setDepartureDeductionMode] = useState<'proportional_salary' | 'fixed_hour' | 'none'>(
    settings.departureDeductionMode || 'proportional_salary'
  );
  const [departureDeductionAmountRaw, setDepartureDeductionAmountRaw] = useState<string>(
    settings.departureDeductionAmount ? String(settings.departureDeductionAmount) : ''
  );
  const [maxAdvancePerMonthRaw, setMaxAdvancePerMonthRaw] = useState<string>(
    new Intl.NumberFormat('en-US').format(settings.maxAdvancePerMonth || 2000000)
  );

  // Users / RBAC state
  const [usersList, setUsersList] = useState<UserAccount[]>(
    settings.users && settings.users.length > 0 ? settings.users : DEFAULT_ACCOUNTS
  );
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [showUserForm, setShowUserForm] = useState<boolean>(false);
  const [uUsername, setUUsername] = useState<string>('');
  const [uPassword, setUPassword] = useState<string>('');
  const [uPin, setUPin] = useState<string>('');
  const [uDisplayName, setUDisplayName] = useState<string>('');
  const [uRole, setURole] = useState<UserRole>('supervisor');
  const [uEmployeeId, setUEmployeeId] = useState<string>('');

  // Shifts state

  const defaultShifts: WorkShift[] = [
    {
      id: 'shift-1',
      name: 'الشفت الصباحي',
      startTime: '08:00',
      endTime: '17:00',
      graceMinutes: 0,
      active: true,
    },
    {
      id: 'shift-2',
      name: 'الشفت المسائي',
      startTime: '17:00',
      endTime: '02:00',
      graceMinutes: 0,
      active: true,
    }
  ];
  const [shifts, setShifts] = useState<WorkShift[]>(settings.shifts && settings.shifts.length > 0 ? settings.shifts : defaultShifts);

  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState<boolean>(false);

  // Employee Add / Edit State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState<string>('');
  const [empJobTitle, setEmpJobTitle] = useState<string>('');
  const [empPhone, setEmpPhone] = useState<string>('');
  const [empSalaryRaw, setEmpSalaryRaw] = useState<string>('');
  const [empWorkDays, setEmpWorkDays] = useState<number>(26);
  const [empWorkHours, setEmpWorkHours] = useState<number>(8);
  const [empAbsentMultiplier, setEmpAbsentMultiplier] = useState<number>(1.0);
  const [empLateRatePerHourRaw, setEmpLateRatePerHourRaw] = useState<string>('');
  const [empAssignedShiftId, setEmpAssignedShiftId] = useState<string>('');
  const [empMaxAdvanceRaw, setEmpMaxAdvanceRaw] = useState<string>('');
  const [isSavingEmployee, setIsSavingEmployee] = useState<boolean>(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState<boolean>(false);

  // In-app Confirmation Modal & Toast State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'emerald';
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  if (!isOpen) return null;

  // Handle Logo Upload (file or base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة يجب أن لا يتجاوز 2 ميغابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCompanySettings = async (e?: React.FormEvent, customUsers?: UserAccount[]) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      await onUpdateSettings({
        companyName,
        directorName,
        logoUrl,
        defaultWorkDays: Number(defaultWorkDays),
        defaultWorkHours: Number(defaultWorkHours),
        defaultAbsentDeductionMultiplier: Number(absentMultiplier),
        lateDeductionMode,
        lateDeductionAmount: lateDeductionAmountRaw ? Number(lateDeductionAmountRaw) : undefined,
        departureDeductionMode,
        departureDeductionAmount: departureDeductionAmountRaw ? Number(departureDeductionAmountRaw) : undefined,
        maxAdvancePerMonth: parseSYPInput(maxAdvancePerMonthRaw) || 2000000,
        shifts,
        users: customUsers || usersList,
      });
      setSettingsSavedSuccess(true);
      triggerToast('✅ تم حفظ كافة الإعدادات وسقف السلف بنجاح ومزامنتها مباشرة!');
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      triggerToast('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // User Accounts RBAC Management Handlers
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUUsername('');
    setUPassword('123');
    setUPin('1234');
    setUDisplayName('');
    setURole('supervisor');
    setUEmployeeId('');
    setShowUserForm(true);
  };

  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setUUsername(user.username);
    setUPassword(user.password || '');
    setUPin(user.pin || '');
    setUDisplayName(user.displayName);
    setURole(user.role);
    setUEmployeeId(user.employeeId || '');
    setShowUserForm(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uUsername.trim() || !uDisplayName.trim()) {
      alert('يرجى إدخال اسم المستخدم والاسم المعروض');
      return;
    }

    let updatedList: UserAccount[];
    if (editingUser) {
      updatedList = usersList.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              username: uUsername.trim(),
              password: uPassword.trim() || undefined,
              pin: uPin.trim() || undefined,
              displayName: uDisplayName.trim(),
              role: uRole,
              employeeId: uRole === 'employee' ? uEmployeeId : undefined,
            }
          : u
      );
    } else {
      const newUser: UserAccount = {
        id: `user-${Date.now()}`,
        username: uUsername.trim(),
        password: uPassword.trim() || undefined,
        pin: uPin.trim() || undefined,
        displayName: uDisplayName.trim(),
        role: uRole,
        employeeId: uRole === 'employee' ? uEmployeeId : undefined,
        active: true,
        createdAt: Date.now(),
      };
      updatedList = [...usersList, newUser];
    }

    setUsersList(updatedList);
    setShowUserForm(false);
    await handleSaveCompanySettings(undefined, updatedList);
  };

  const handleDeleteUser = async (userId: string) => {
    if (usersList.length <= 1) {
      alert('يجب الإبقاء على حساب مدير واحد على الأقل في النظام');
      return;
    }
    const updatedList = usersList.filter((u) => u.id !== userId);
    setUsersList(updatedList);
    await handleSaveCompanySettings(undefined, updatedList);
  };

  const handleToggleUserActive = async (userId: string) => {
    const updatedList = usersList.map((u) => (u.id === userId ? { ...u, active: !u.active } : u));
    setUsersList(updatedList);
    await handleSaveCompanySettings(undefined, updatedList);
  };


  // Shift Management Helpers
  const handleAddShift = () => {
    const newShift: WorkShift = {
      id: `shift-${Date.now()}`,
      name: `شفت عمل جديد ${shifts.length + 1}`,
      startTime: '08:00',
      endTime: '17:00',
      graceMinutes: 0,
      active: true,
    };
    setShifts([...shifts, newShift]);
  };

  const handleUpdateShift = (id: string, updates: Partial<WorkShift>) => {
    setShifts(shifts.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleDeleteShift = (id: string) => {
    if (shifts.length <= 1) {
      alert('يجب الإبقاء على شفت واحد على الأقل في النظام');
      return;
    }
    setShifts(shifts.filter((s) => s.id !== id));
  };

  // Open Add Employee Form
  const handleStartAddEmployee = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpJobTitle('');
    setEmpPhone('');
    setEmpSalaryRaw('');
    setEmpWorkDays(defaultWorkDays);
    setEmpWorkHours(defaultWorkHours);
    setEmpAbsentMultiplier(absentMultiplier);
    setEmpAssignedShiftId('');
    setEmpMaxAdvanceRaw('');
    setShowEmployeeForm(true);
  };

  // Open Edit Employee Form
  const handleStartEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpJobTitle(emp.jobTitle);
    setEmpPhone(emp.phone || '');
    setEmpSalaryRaw(new Intl.NumberFormat('en-US').format(emp.baseSalary));
    setEmpWorkDays(emp.monthlyWorkDays || defaultWorkDays);
    setEmpWorkHours(emp.dailyWorkHours || defaultWorkHours);
    setEmpAbsentMultiplier(emp.absentDeductionRate || absentMultiplier);
    setEmpAssignedShiftId(emp.assignedShiftId || '');
    setEmpMaxAdvanceRaw(emp.maxMonthlyAdvance ? new Intl.NumberFormat('en-US').format(emp.maxMonthlyAdvance) : '');
    setShowEmployeeForm(true);
  };

  // Submit Employee
  const handleSaveEmployeeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const salary = parseSYPInput(empSalaryRaw);
    if (!empName.trim()) {
      alert('يرجى كتابة اسم الموظف');
      return;
    }
    if (!salary || salary <= 0) {
      alert('يرجى تحديد الراتب الأساسي بالليرة السورية');
      return;
    }

    setIsSavingEmployee(true);
    try {
      await onSaveEmployee({
        id: editingEmployee?.id,
        name: empName.trim(),
        jobTitle: empJobTitle.trim() || 'موظف',
        phone: empPhone.trim() || undefined,
        baseSalary: salary,
        monthlyWorkDays: Number(empWorkDays),
        dailyWorkHours: Number(empWorkHours),
        absentDeductionRate: Number(empAbsentMultiplier),
        assignedShiftId: empAssignedShiftId || undefined,
        maxMonthlyAdvance: empMaxAdvanceRaw ? parseSYPInput(empMaxAdvanceRaw) : undefined,
        active: editingEmployee ? editingEmployee.active : true,
        joinedDate: editingEmployee?.joinedDate || getTodayDateString(),
        avatarColor: editingEmployee?.avatarColor || 'bg-slate-700',
      });
      setShowEmployeeForm(false);
    } catch (err) {
      alert('حدث خطأ أثناء حفظ بيانات الموظف');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // Handle Export Backup JSON
  const handleDownloadBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `syp_attendance_backup_${getTodayDateString()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-2xs">
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                لوحة الإعدادات وأوقات الدوام والشفتات
              </h2>
              <p className="text-[11px] text-slate-500">
                تحديد مواعيد الشفتات الصباحية والمسائية، سقف السلف، وهوية المنشأة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="إغلاق"
            className="flex items-center justify-center p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg transition-all shadow-2xs cursor-pointer group"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-white px-3 sm:px-4 overflow-x-auto">
          
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'shifts'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>أوقات الدوام والشفتات وسقف السلف ({shifts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'employees'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>إدارة الموظفين والرواتب ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'users'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>حسابات المستخدمين والصلاحيات ({usersList.length})</span>
          </button>


          <button
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'branding'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>هوية الشركة واللوغو</span>
          </button>

          <button
            onClick={() => setActiveTab('deductions')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'deductions'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>قواعد الخصم والغياب</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'backup'
                ? 'border-rose-600 text-rose-700 bg-rose-50/50'
                : 'border-transparent text-rose-600 hover:text-rose-800 hover:bg-rose-50/30'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>تصفير البيانات والنسخ الاحتياطي</span>
          </button>

        </div>

        {/* Tab Content Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 bg-[#F8FAFC]">
          
          {/* TAB 0: SHIFTS & ADVANCE LIMITS */}
          {activeTab === 'shifts' && (
            <div className="flex flex-col gap-4">
              
              {settingsSavedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تم حفظ وتحديث إعدادات الشفتات وأوقات الدوام بنجاح</span>
                </div>
              )}

              {/* Instructions banner */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-900">
                <h4 className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                  <Clock className="w-4 h-4 text-sky-700" />
                  نظام احتساب أوقات الدوام والشفتات والتأخير الفوري
                </h4>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  عند تسجيل حضور الموظف بضغطة زر، يقارن النظام التوقيت الحي للجهاز مع وقت بداية الشفت المحدد (مثلاً 08:00 صباحاً أو 05:00 عصراً)، ويحتسب فوراً وبدقة دقائق وساعات التأخير والخصم دون أي فترة سماح.
                </p>
              </div>

              {/* Monthly Advance Ceiling Setting */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  سقف السلف المالية العام لكل موظف خلال الشهر (SYP)
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  الحد الأقصى الافتراضي المسموح به للموظف لسحب سلف مالية خلال الشهر (مثلاً 2,000,000 ل.س). يُنبه النظام المدير فوراً عند محاولة تجاوز هذا السقف.
                </p>
                <div className="flex items-center gap-2 max-w-xs">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={maxAdvancePerMonthRaw}
                      onChange={(e) => {
                        const num = parseSYPInput(e.target.value);
                        setMaxAdvancePerMonthRaw(num ? new Intl.NumberFormat('en-US').format(num) : '');
                      }}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ل.س</span>
                  </div>
                </div>
              </div>

              {/* Shifts List Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">شفتات ومواعيد الدوام المعتمدة</h4>
                  <p className="text-xs text-slate-500">حدد مواعيد بدء وانتهاء كل شفت (صباحي / مسائي / إضافي)</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddShift}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>إضافة شفت جديد</span>
                </button>
              </div>

              {/* Shift Cards */}
              <div className="flex flex-col gap-3">
                {shifts.map((shift, idx) => (
                  <div key={shift.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-3">
                    
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={shift.name}
                          onChange={(e) => handleUpdateShift(shift.id, { name: e.target.value })}
                          className="font-bold text-slate-900 text-xs sm:text-sm bg-transparent border-b border-dashed border-slate-300 focus:border-slate-900 outline-none px-1"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shift.active}
                            onChange={(e) => handleUpdateShift(shift.id, { active: e.target.checked })}
                            className="rounded text-slate-900 focus:ring-0"
                          />
                          <span>مفعل</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(shift.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="حذف الشفت"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-700">وقت بدء الشفت (بداية احتساب الحضور)</label>
                        <input
                          type="time"
                          value={shift.startTime}
                          onChange={(e) => handleUpdateShift(shift.id, { startTime: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-700">وقت نهاية الشفت (الانصراف التلقائي)</label>
                        <input
                          type="time"
                          value={shift.endTime}
                          onChange={(e) => handleUpdateShift(shift.id, { endTime: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                    </div>

                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={() => handleSaveCompanySettings()}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingSettings ? 'جاري الحفظ...' : 'حفظ إعدادات الشفتات وسقف السلف'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 1: EMPLOYEE MANAGEMENT */}
          {activeTab === 'employees' && (
            <div className="flex flex-col gap-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">سجل الموظفين والرواتب والشفتات</h3>
                  <p className="text-xs text-slate-500">
                    يمكنك تعديل الراتب الأساسي (SYP)، تعيين الشفت المفضل، وتحديد سقف سلف مخصص
                  </p>
                </div>
                <button
                  onClick={handleStartAddEmployee}
                  id="btn-add-employee"
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>إضافة موظف جديد</span>
                </button>
              </div>

              {/* Employee Add / Edit Modal Overlay */}
              {showEmployeeForm && (
                <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-slate-900 shadow-md animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      {editingEmployee ? `تعديل بيانات: ${editingEmployee.name}` : 'إضافة موظف جديد'}
                    </h4>
                    <button
                      onClick={() => setShowEmployeeForm(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEmployeeForm} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">اسم الموظف الثلاثي <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: أحمد محمد الأحمد"
                          value={empName}
                          onChange={(e) => setEmpName(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">المسمى الوظيفي والصفة</label>
                        <input
                          type="text"
                          placeholder="مثال: محاسب عام / أمين مستودع"
                          value={empJobTitle}
                          onChange={(e) => setEmpJobTitle(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">الراتب الأساسي (ل.س) <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: 4,500,000"
                          value={empSalaryRaw}
                          onChange={(e) => {
                            const val = parseSYPInput(e.target.value);
                            setEmpSalaryRaw(val ? new Intl.NumberFormat('en-US').format(val) : '');
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">رقم الهاتف والتواصل</label>
                        <input
                          type="tel"
                          placeholder="09XXXXXXXX"
                          value={empPhone}
                          onChange={(e) => setEmpPhone(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">الشفت الافتراضي للموظف</label>
                        <select
                          value={empAssignedShiftId}
                          onChange={(e) => setEmpAssignedShiftId(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="">تحديد تلقائي لأقرب شفت</option>
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.startTime} - {s.endTime})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">سقف السلف الشهري المخصص (ل.س)</label>
                        <input
                          type="text"
                          placeholder="اتركه فارغاً للاعتماد على السقف العام"
                          value={empMaxAdvanceRaw}
                          onChange={(e) => {
                            const val = parseSYPInput(e.target.value);
                            setEmpMaxAdvanceRaw(val ? new Intl.NumberFormat('en-US').format(val) : '');
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowEmployeeForm(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingEmployee}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isSavingEmployee ? 'جاري الحفظ...' : 'حفظ الموظف'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Employee List Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                {employees.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">لا يوجد موظفون مسجلون حالياً</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ابدأ بإضافة موظفيك وتحديد رواتبهم وشفتاتهم لبدء تسجيل الحضور والسلف
                      </p>
                    </div>
                    <button
                      onClick={handleStartAddEmployee}
                      className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>إضافة أول موظف الآن</span>
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <th className="p-3">الموظف</th>
                        <th className="p-3">المسمى الوظيفي</th>
                        <th className="p-3">الراتب الأساسي</th>
                        <th className="p-3">الشفت المخصص</th>
                        <th className="p-3">سقف السلف الشهري</th>
                        <th className="p-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.map((emp) => {
                        const shift = shifts.find((s) => s.id === emp.assignedShiftId);
                        const limit = emp.maxMonthlyAdvance || settings.maxAdvancePerMonth || 2000000;
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">
                              {emp.name}
                              {emp.phone && <div className="text-[10px] text-slate-400 font-mono">{emp.phone}</div>}
                            </td>
                            <td className="p-3 text-slate-600">{emp.jobTitle}</td>
                            <td className="p-3 font-mono font-bold text-emerald-800">{formatSYP(emp.baseSalary)}</td>
                            <td className="p-3 text-slate-700">{shift ? shift.name : 'تلقائي حسب الوقت'}</td>
                            <td className="p-3 font-mono font-bold text-slate-700">{formatSYP(limit)}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleStartEditEmployee(emp)}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                  title="تعديل الموظف"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmModalConfig({
                                      isOpen: true,
                                      title: `تأكيد حذف الموظف "${emp.name}"`,
                                      message: `هل أنت متأكد من رغبتك في حذف سجل الموظف "${emp.name}"؟`,
                                      confirmText: 'نعم، حذف الموظف',
                                      variant: 'danger',
                                      onConfirm: async () => {
                                        setIsActionLoading(true);
                                        try {
                                          await onDeleteEmployee(emp.id);
                                          triggerToast(`تم حذف الموظف "${emp.name}" بنجاح`);
                                        } finally {
                                          setIsActionLoading(false);
                                          setConfirmModalConfig(null);
                                        }
                                      },
                                    });
                                  }}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                  title="حذف الموظف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}

          {/* TAB: USER ACCOUNTS & RBAC */}
          {activeTab === 'users' && (
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 flex flex-col gap-5">
              
              {/* Header & Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>إدارة حسابات المستخدمين وصلاحيات الدخول (RBAC)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تحديد حسابات المدير، المشرف الميداني (حجب الرواتب)، وبوابات الموظفين مع رموز PIN للدخول السريع
                  </p>
                </div>

                {!showUserForm && (
                  <button
                    type="button"
                    onClick={handleOpenAddUser}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>إضافة مستخدم جديد</span>
                  </button>
                )}
              </div>

              {/* User Add / Edit Form Modal/Drawer */}
              {showUserForm && (
                <form onSubmit={handleSaveUserSubmit} className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col gap-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-slate-600" />
                      <span>{editingUser ? 'تعديل بيانات الحساب' : 'إنشاء حساب مستخدم جديد'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Display Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700">الاسم المعروض <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="مثال: أحمد المحمود (مشرف الفترة الصباحية)"
                        value={uDisplayName}
                        onChange={(e) => setUDisplayName(e.target.value)}
                        required
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    {/* Role */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700">نوع الصلاحية (الدور) <span className="text-rose-500">*</span></label>
                      <select
                        value={uRole}
                        onChange={(e) => setURole(e.target.value as UserRole)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="admin">المدير العام (Admin) — كامل الصلاحيات والرواتب والإعدادات</option>
                        <option value="supervisor">المشرف الميداني (Supervisor) — حضور وباركود وسلف (حجب الرواتب)</option>
                        <option value="employee">الموظف (Employee) — مسح الباركود والاطلاع على السجل الشخصي</option>
                      </select>
                    </div>

                    {/* Linked Employee (if role is employee) */}
                    {uRole === 'employee' && (
                      <div className="flex flex-col gap-1 sm:col-span-2 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200/60">
                        <label className="text-xs font-bold text-emerald-900">ربط الحساب بسجل الموظف</label>
                        <select
                          value={uEmployeeId}
                          onChange={(e) => {
                            setUEmployeeId(e.target.value);
                            const emp = employees.find((empItem) => empItem.id === e.target.value);
                            if (emp && !uDisplayName) setUDisplayName(emp.name);
                            if (emp && !uUsername) setUUsername(emp.phone || emp.name);
                          }}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                          <option value="">-- اختر الموظف --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.jobTitle})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Username */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700">اسم المستخدم (للدخول) <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="مثال: supervisor1 أو 0987654321"
                        value={uUsername}
                        onChange={(e) => setUUsername(e.target.value)}
                        required
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700">كلمة المرور</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={uPassword}
                        onChange={(e) => setUPassword(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    {/* 4-Digit Quick PIN */}
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>رمز PIN السريع (4 أرقام للموبايل والتابلت)</span>
                        <span className="text-[10px] text-slate-400 font-mono">اختياري</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="مثال: 1234"
                        value={uPin}
                        onChange={(e) => setUPin(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-slate-900 max-w-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                      <span>حفظ بيانات الحساب</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Users List Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-right border-collapse bg-white">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-3">الاسم المعروض</th>
                      <th className="p-3">اسم المستخدم</th>
                      <th className="p-3">نوع الصلاحية</th>
                      <th className="p-3">رمز PIN</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          {usr.displayName}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {usr.username}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            usr.role === 'admin'
                              ? 'bg-slate-900 text-emerald-400'
                              : usr.role === 'supervisor'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}>
                            {usr.role === 'admin' ? 'المدير العام' : usr.role === 'supervisor' ? 'المشرف الميداني' : 'بوابة موظف'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-600">
                          {usr.pin || '—'}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(usr.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              usr.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {usr.active ? 'مفعل' : 'معطل'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(usr)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                              title="تعديل الحساب"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(usr.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="حذف الحساب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'branding' && (
            <form onSubmit={handleSaveCompanySettings} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 flex flex-col gap-5">
              
              {settingsSavedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تم حفظ وتحديث إعدادات وهوية الشركة بنجاح</span>
                </div>
              )}

              {/* Logo Upload */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="h-16 w-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">شعار الشركة (Company Logo)</h4>
                  <p className="text-[11px] text-slate-500 mb-2">
                    يظهر الشعار في الترويسة الرئيسية وأعلى إيصالات السلف وكشوفات الرواتب المطبوعة
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع صورة الشعار</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="text-rose-600 hover:text-rose-800 text-xs font-semibold px-2 py-1"
                      >
                        إزالة الشعار
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Company & Director Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم المنشأة / الشركة</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم المدير العام / المسؤول</label>
                  <input
                    type="text"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingSettings ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: DEDUCTIONS */}
          {activeTab === 'deductions' && (
            <form onSubmit={handleSaveCompanySettings} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 flex flex-col gap-5">
              
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-900">
                <h4 className="font-bold flex items-center gap-1.5 mb-1">
                  <Sliders className="w-4 h-4 text-sky-700" />
                  قواعد احتساب الخصومات التلقائية
                </h4>
                <p className="text-[11px] text-sky-800">
                  تُحسب اليومية تلقائياً بقسمة الراتب الأساسي على عدد أيام العمل الشهرية، وتُحسب ساعة العمل بقسمة اليومية على ساعات العمل اليومية.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">أيام العمل في الشهر</label>
                  <input
                    type="number"
                    min="20"
                    max="31"
                    value={defaultWorkDays}
                    onChange={(e) => setDefaultWorkDays(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">الشائع في سوريا: 26 أو 30 يوم</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">ساعات العمل اليومية</label>
                  <input
                    type="number"
                    min="4"
                    max="14"
                    value={defaultWorkHours}
                    onChange={(e) => setDefaultWorkHours(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">لحساب معدل خصم الساعة بدقة</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">مضاعف خصم يوم الغياب</label>
                  <select
                    value={absentMultiplier}
                    onChange={(e) => setAbsentMultiplier(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  >
                    <option value={1.0}>خصم يوم واحد (1.0x)</option>
                    <option value={1.5}>خصم يوم ونصف (1.5x)</option>
                    <option value={2.0}>خصم يومين (2.0x)</option>
                  </select>
                  <span className="text-[10px] text-slate-400">حسب لائحة الجزاءات الداخلية</span>
                </div>

              </div>

              {/* Late Deduction Rules Section */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">قاعدة احتساب الخصم على التأخير (دقائق وساعات)</h4>
                </div>
                <p className="text-[11px] text-amber-800">
                  حدد كيف يخصم النظام قيمة التأخيرات عند تسجيل حضور الموظف متأخراً عن موعد الشفت:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">طريقة احتساب خصم التأخير</label>
                    <select
                      value={lateDeductionMode}
                      onChange={(e) => setLateDeductionMode(e.target.value as LateDeductionMode)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="proportional_salary">تلقائي بحسب راتب الموظف وسعر الساعة (تناسبي)</option>
                      <option value="fixed_hour">مبلغ محدد وثابت لكل ساعة تأخير (SYP)</option>
                      <option value="fixed_minute">مبلغ محدد وثابت لكل دقيقة تأخير (SYP)</option>
                      <option value="multiplier">مضاعف جزائي لسعر الساعة (مثلاً 1.5x أو 2.0x)</option>
                    </select>
                  </div>

                  {lateDeductionMode !== 'proportional_salary' && (
                    <div className="flex flex-col gap-1.5 animate-fadeIn">
                      <label className="text-xs font-bold text-slate-700">
                        {lateDeductionMode === 'fixed_hour' && 'مبلغ الخصم لكل 1 ساعة تأخير (ل.س)'}
                        {lateDeductionMode === 'fixed_minute' && 'مبلغ الخصم لكل 1 دقيقة تأخير (ل.س)'}
                        {lateDeductionMode === 'multiplier' && 'معامل المضاعف (مثال: 1.5 أو 2.0)'}
                      </label>
                      <input
                        type="number"
                        step={lateDeductionMode === 'multiplier' ? '0.1' : '1000'}
                        placeholder={
                          lateDeductionMode === 'fixed_hour'
                            ? 'مثال: 25000'
                            : lateDeductionMode === 'fixed_minute'
                            ? 'مثال: 500'
                            : 'مثال: 1.5'
                        }
                        value={lateDeductionAmountRaw}
                        onChange={(e) => setLateDeductionAmountRaw(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Departure Deduction Rules Section */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-indigo-700" />
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-950">قاعدة احتساب الخصم على ساعات المغادرة (أذونات الخروج)</h4>
                </div>
                <p className="text-[11px] text-indigo-800">
                  عند تسجيل مغادرة موظف خلال الدوام وتحديد عدد ساعات المغادرة:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">طريقة خصم المغادرة</label>
                    <select
                      value={departureDeductionMode}
                      onChange={(e) => setDepartureDeductionMode(e.target.value as any)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="proportional_salary">تلقائي بحسب راتب الموظف وسعر الساعة</option>
                      <option value="fixed_hour">مبلغ محدد وثابت لكل ساعة مغادرة (SYP)</option>
                      <option value="none">بدون خصم مالي (تسجيل الساعات والإذن فقط)</option>
                    </select>
                  </div>

                  {departureDeductionMode === 'fixed_hour' && (
                    <div className="flex flex-col gap-1.5 animate-fadeIn">
                      <label className="text-xs font-bold text-slate-700">سعر ساعة المغادرة (ل.س)</label>
                      <input
                        type="number"
                        step="1000"
                        placeholder="مثال: 20000"
                        value={departureDeductionAmountRaw}
                        onChange={(e) => setDepartureDeductionAmountRaw(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingSettings ? 'جاري الحفظ...' : 'حفظ القواعد'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 4: BACKUP & DATA RESET / FACTORY RESET */}
          {activeTab === 'backup' && (
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 flex flex-col gap-6">
              
              {/* Reset Type 1: Start New Month (Keeps Employees) */}
              <div className="p-4 sm:p-5 bg-emerald-50/80 border-2 border-emerald-300 rounded-xl flex flex-col gap-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl flex-shrink-0 shadow-2xs">
                    <CalendarCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <span>تصفير السلف والدوامات (بدء شهر جديد)</span>
                      <span className="text-[10px] bg-emerald-200/70 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        يحتفظ بأسماء الموظفين
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-900/90 mt-1 leading-relaxed">
                      • <strong>ما الذي سيتم مسحه:</strong> كافة السلف المالية وسجلات الحضور والغياب والتأخيرات للشهر الحالي.<br />
                      • <strong>ما الذي سيبقى محفوظاً:</strong> أسماء كافة الموظفين، رواتبهم، شفتاتهم المعينة، وإعدادات المنشأة بالكامل دون مساس.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/60">
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => {
                      setConfirmModalConfig({
                        isOpen: true,
                        title: 'تأكيد: تصفير السلف والدوامات لبدء شهر جديد',
                        message: 'هل تريد بالتأكيد تصفير السلف والدوام للشهر الجديد؟\n\n• سيتم مسح كافة السلف والدوامات.\n• ستبقى أسماء كافة الموظفين ورواتبهم وشفتاتهم محفوظة بالكامل.',
                        confirmText: 'نعم، تصفير وبدء شهر جديد',
                        variant: 'emerald',
                        onConfirm: async () => {
                          setIsActionLoading(true);
                          try {
                            await onResetNewMonth();
                            triggerToast('✅ تم تصفير السلف والدوامات وبدء شهر جديد بنجاح (مع الاحتفاظ بالموظفين)!');
                          } catch (e) {
                            console.error(e);
                            triggerToast('حدث خطأ أثناء التصفير، يرجى المحاولة ثانية');
                          } finally {
                            setIsActionLoading(false);
                            setConfirmModalConfig(null);
                          }
                        },
                      });
                    }}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>تصفير وبدء شهر جديد (حفظ الموظفين)</span>
                  </button>
                </div>
              </div>

              {/* Reset Type 2: Factory Reset (Deletes Everything including employees) */}
              <div className="p-4 sm:p-5 bg-rose-50/80 border-2 border-rose-300 rounded-xl flex flex-col gap-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-600 text-white rounded-xl flex-shrink-0 shadow-2xs">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                      <span>إعادة ضبط المصنع (تصفير شامل وكامل)</span>
                      <span className="text-[10px] bg-rose-200/70 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full font-bold">
                        يحذف كل شيء
                      </span>
                    </h4>
                    <p className="text-xs text-rose-900/90 mt-1 leading-relaxed">
                      • <strong>ما الذي سيتم حذفه:</strong> كافة أسماء الموظفين المسجلين، كافة السلف المالية، وسجلات الحضور والغياب بالكامل.<br />
                      • <strong>النتيجة:</strong> تفريغ السستم بالكامل ليعود نظيفاً وفارغاً 100% من الصفر كأنه تطبيق جديد تماماً.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/60">
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => {
                      setConfirmModalConfig({
                        isOpen: true,
                        title: 'تأكيد: إعادة ضبط المصنع وتصفير شامل لكل شيء',
                        message: 'تحذير هام:\n• سيتم حذف كافة أسماء الموظفين بالكامل.\n• سيتم مسح كافة السلف وسجلات الدوام والتأخيرات.\n• سيعود السستم نظيفاً وفارغاً 100% للبدء من الصفر.\n\nهل أنت متأكد من تنفيذ إعادة ضبط المصنع؟',
                        confirmText: 'نعم، إعادة ضبط المصنع وحذف كل شيء',
                        variant: 'danger',
                        onConfirm: async () => {
                          setIsActionLoading(true);
                          try {
                            await onResetData();
                            triggerToast('✅ تم تنفيذ إعادة ضبط المصنع وتفريغ النظام بالكامل بنجاح!');
                          } catch (e) {
                            console.error(e);
                            triggerToast('حدث خطأ أثناء التصفير، يرجى المحاولة ثانية');
                          } finally {
                            setIsActionLoading(false);
                            setConfirmModalConfig(null);
                          }
                        },
                      });
                    }}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>إعادة ضبط المصنع (تصفير كل شيء حتى الموظفين)</span>
                  </button>
                </div>
              </div>

              {/* Download Backup JSON */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">تنزيل نسخة احتياطية كاملة (JSON)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تتضمن ملفاً كاملاً يحتوي على سجلات الموظفين، السلف، وبيانات الحضور والغياب والشفتات
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex-shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تصدير النسخة الاحتياطية</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* In-App Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          onClose={() => setConfirmModalConfig(null)}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          variant={confirmModalConfig.variant}
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
};
