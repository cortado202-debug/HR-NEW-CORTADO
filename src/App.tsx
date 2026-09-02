import React, { useState, useEffect } from 'react';
import { AppData, SalaryAdvance, AttendanceRecord, Employee, CompanySettings, EmployeeMonthlySummary, UserAccount } from './types';
import { syncService } from './services/syncService';
import { authService } from './services/authService';
import { Header } from './components/Header';
import { SalaryAdvanceSection } from './components/SalaryAdvanceSection';
import { AttendanceSection } from './components/AttendanceSection';
import { MonthlyPayrollModal } from './components/MonthlyPayrollModal';
import { SettingsModal } from './components/SettingsModal';
import { LateAttendanceModal } from './components/LateAttendanceModal';
import { DepartureModal } from './components/DepartureModal';
import { OvertimeModal } from './components/OvertimeModal';
import { AdvanceReceiptModal } from './components/AdvanceReceiptModal';
import { EmployeePayslipModal } from './components/EmployeePayslipModal';
import { AdvancesLedgerModal } from './components/AdvancesLedgerModal';
import { AttendanceLedgerModal } from './components/AttendanceLedgerModal';
import { LoginScreen } from './components/LoginScreen';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { SupervisorQrDisplay } from './components/SupervisorQrDisplay';
import { getTodayDateString } from './utils/formatters';
import { ShieldCheck, Sparkles, Smartphone, Laptop, X, QrCode } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<AppData>(syncService.getData());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>(
    syncService.getConnectionStatus()
  );

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(authService.getCurrentUser());

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPayrollOpen, setIsPayrollOpen] = useState<boolean>(false);
  const [isAdvancesLedgerOpen, setIsAdvancesLedgerOpen] = useState<boolean>(false);
  const [isAttendanceLedgerOpen, setIsAttendanceLedgerOpen] = useState<boolean>(false);
  const [isDetailedStatementOpen, setIsDetailedStatementOpen] = useState<boolean>(false);
  const [isDailyQrModalOpen, setIsDailyQrModalOpen] = useState<boolean>(false);
  
  // Specific item modals
  const [selectedAdvanceForReceipt, setSelectedAdvanceForReceipt] = useState<SalaryAdvance | null>(null);
  const [selectedEmployeeForPayslip, setSelectedEmployeeForPayslip] = useState<EmployeeMonthlySummary | null>(null);
  const [lateModalData, setLateModalData] = useState<{
    employee: Employee;
    record: AttendanceRecord | null;
    date: string;
  } | null>(null);
  const [departureModalData, setDepartureModalData] = useState<{
    employee: Employee;
    record: AttendanceRecord | null;
    date: string;
  } | null>(null);
  const [overtimeModalData, setOvertimeModalData] = useState<{
    employee: Employee;
    record: AttendanceRecord | null;
    date: string;
  } | null>(null);

  // Subscribe to real-time sync service & auth service
  useEffect(() => {
    const unsubData = syncService.subscribe((newData) => {
      setData(newData);
    });

    const unsubConn = syncService.subscribeConnection((newStatus) => {
      setConnectionStatus(newStatus);
    });

    const unsubAuth = authService.subscribe((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubData();
      unsubConn();
      unsubAuth();
    };
  }, []);

  // Handlers for mutations
  const handleAddAdvance = async (advance: Omit<SalaryAdvance, 'id' | 'createdAt' | 'approved'>) => {
    return await syncService.addAdvance(advance);
  };

  const handleDeleteAdvance = async (id: string) => {
    return await syncService.deleteAdvance(id);
  };

  const handleUpdateAttendance = async (record: AttendanceRecord) => {
    return await syncService.updateAttendance(record);
  };

  const handleBulkUpdateAttendance = async (records: AttendanceRecord[]) => {
    return await syncService.bulkUpdateAttendance(records);
  };

  const handleSaveEmployee = async (employee: Partial<Employee> & { name: string; baseSalary: number }) => {
    return await syncService.saveEmployee(employee);
  };

  const handleDeleteEmployee = async (id: string) => {
    return await syncService.deleteEmployee(id);
  };

  const handleUpdateSettings = async (settings: Partial<CompanySettings>) => {
    return await syncService.updateSettings(settings);
  };

  const handleResetNewMonth = async () => {
    return await syncService.resetNewMonth();
  };

  const handleResetData = async () => {
    return await syncService.resetData();
  };

  // Open late attendance modal
  const handleOpenLateModal = (employee: Employee, record: AttendanceRecord | null, date: string) => {
    setLateModalData({ employee, record, date });
  };

  // Open departure modal (تسجيل مغادرة وإذن خروج)
  const handleOpenDepartureModal = (employee: Employee, record: AttendanceRecord | null, date: string) => {
    setDepartureModalData({ employee, record, date });
  };

  // Open overtime modal (تسجيل انصراف وعمل إضافي)
  const handleOpenOvertimeModal = (employee: Employee, record: AttendanceRecord | null, date: string) => {
    setOvertimeModalData({ employee, record, date });
  };

  // View receipt from any section
  const handleViewReceipt = (advance: SalaryAdvance) => {
    setSelectedAdvanceForReceipt(advance);
  };

  // View payslip from payroll modal
  const handleViewEmployeeSlip = (summary: EmployeeMonthlySummary) => {
    setSelectedEmployeeForPayslip(summary);
  };

  // Handle Logout
  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Metrics for Today
  const todayStr = getTodayDateString();
  const currentMonthPrefix = todayStr.slice(0, 7);
  const activeMonthAdvancesCount = data.advances.filter((a) => a.date.startsWith(currentMonthPrefix)).length;

  const activeEmployees = data.employees.filter((e) => e.active);
  const todayPresentCount = activeEmployees.filter((e) => {
    const rec = data.attendance[`${e.id}_${todayStr}`];
    return rec && rec.status === 'present';
  }).length;

  // 1. IF NOT LOGGED IN: SHOW VERTICALLY STACKED LOGIN SCREEN (EMPLOYEE -> SUPERVISOR -> ADMIN)
  if (!currentUser) {
    return (
      <LoginScreen
        settings={data.settings}
        employees={data.employees}
        onLoginSuccess={() => {
          setCurrentUser(authService.getCurrentUser());
        }}
      />
    );
  }

  // 2. IF EMPLOYEE: SHOW EMPLOYEE PORTAL ONLY (STRICT ACCESS PRIVACY - ONLY SEES OWN ACCOUNT)
  if (currentUser.role === 'employee') {
    const matchedEmployee = 
      data.employees.find((e) => e.id === currentUser.employeeId) ||
      data.employees.find((e) => e.name.toLowerCase() === currentUser.username.toLowerCase() || (e.phone && e.phone === currentUser.username)) ||
      {
        id: currentUser.employeeId || 'emp-active',
        name: currentUser.displayName || currentUser.username,
        jobTitle: 'موظف',
        baseSalary: 0,
        dailyWorkHours: data.settings.defaultWorkHours || 8,
        monthlyWorkDays: data.settings.defaultWorkDays || 26,
        absentDeductionRate: 1.0,
        active: true,
        joinedDate: todayStr,
      };

    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased" dir="rtl">
        <EmployeeDashboard
          employee={matchedEmployee}
          userAccount={currentUser}
          settings={data.settings}
          attendance={data.attendance}
          advances={data.advances}
          onRecordSelfAttendance={handleUpdateAttendance}
          onViewReceipt={handleViewReceipt}
          onLogout={handleLogout}
        />

        {/* Advance Receipt Modal for Employee */}
        {selectedAdvanceForReceipt && (
          <AdvanceReceiptModal
            isOpen={true}
            onClose={() => setSelectedAdvanceForReceipt(null)}
            advance={selectedAdvanceForReceipt}
            settings={data.settings}
          />
        )}
      </div>
    );
  }

  // 3. IF SUPERVISOR OR ADMIN: SHOW OPERATIONAL INTERFACE
  const isSupervisor = currentUser.role === 'supervisor';
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-slate-900 selection:text-white" dir="rtl">
      
      {/* Sticky Top Header with Prominent Logout in Top Corner */}
      <Header
        settings={data.settings}
        connectionStatus={connectionStatus}
        currentUser={currentUser}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPayroll={() => setIsPayrollOpen(true)}
        onOpenDetailedStatement={() => setIsDetailedStatementOpen(true)}
        onOpenAdvancesList={() => setIsAdvancesLedgerOpen(true)}
        onOpenAttendanceLedger={() => setIsAttendanceLedgerOpen(true)}
        onOpenDailyQr={() => setIsDailyQrModalOpen(true)}
        onLogout={handleLogout}
        activeAdvancesCount={activeMonthAdvancesCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* If Supervisor: Prominently display the Dynamic Daily QR Barcode right at the top for employee scanning */}
        {isSupervisor && (
          <SupervisorQrDisplay
            settings={data.settings}
            presentCount={todayPresentCount}
            totalEmployeesCount={activeEmployees.length}
          />
        )}

        {/* Clean System Notification Banner (if empty) */}
        {data.employees.length === 0 && isAdmin && (
          <div className="mb-4 sm:mb-5 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl shadow-xs border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>السستم جاهز للبدء</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium">
                    مزامنة Firebase نشطة
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  يمكنك تسجيل موظفيك وتحديد رواتبهم وشفتاتهم وإدارة حسابات المشرفين والموظفين.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <span>➕ إضافة موظف الآن</span>
            </button>
          </div>
        )}

        {/* Top Section: Daily Operations & Attendance (تسجيل الحضور والغياب والتأخيرات والمغادرات والعمل الإضافي) */}
        <AttendanceSection
          employees={data.employees}
          attendance={data.attendance}
          settings={data.settings}
          onUpdateAttendance={handleUpdateAttendance}
          onBulkUpdateAttendance={handleBulkUpdateAttendance}
          onOpenLateModal={handleOpenLateModal}
          onOpenDepartureModal={handleOpenDepartureModal}
          onOpenOvertimeModal={handleOpenOvertimeModal}
          onOpenLedger={() => setIsAttendanceLedgerOpen(true)}
        />

        {/* Bottom Section: Salary Advance Entry (السلف المالية - محجوبة الرواتب للمشرف) */}
        <SalaryAdvanceSection
          employees={data.employees}
          advances={data.advances}
          settings={data.settings}
          hideSalaryInfo={isSupervisor}
          onAddAdvance={handleAddAdvance}
          onDeleteAdvance={handleDeleteAdvance}
          onViewReceipt={handleViewReceipt}
        />

      </main>

      {/* Footer & Real-Time Sync Notice */}
      <footer className="bg-white border-t border-slate-200 py-5 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span className="font-semibold text-slate-700">{data.settings.companyName}</span>
            <span>• نظام الحضور والسلف بالليرة السورية (SYP)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              <Smartphone className="w-3.5 h-3.5" />
              <Laptop className="w-3.5 h-3.5" />
              <span>مزامنة تلقائية حية واحتساب التأخيرات عبر الشفتات</span>
            </div>
            <span>النسخة {new Date().getFullYear()}</span>
          </div>

        </div>
      </footer>

      {/* MODALS */}

      {/* Daily QR Code Modal for Admin */}
      {isDailyQrModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-4 sm:p-6 relative">
            <button
              onClick={() => setIsDailyQrModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <SupervisorQrDisplay
              settings={data.settings}
              presentCount={todayPresentCount}
              totalEmployeesCount={activeEmployees.length}
            />
          </div>
        </div>
      )}

      {/* Monthly Attendance & Absence Ledger Modal */}
      <AttendanceLedgerModal
        isOpen={isAttendanceLedgerOpen}
        onClose={() => setIsAttendanceLedgerOpen(false)}
        employees={data.employees}
        attendance={data.attendance}
        settings={data.settings}
      />

      {/* Monthly Payroll Modal (Admin Only) */}
      {isAdmin && (
        <MonthlyPayrollModal
          isOpen={isPayrollOpen}
          onClose={() => setIsPayrollOpen(false)}
          employees={data.employees}
          attendance={data.attendance}
          advances={data.advances}
          settings={data.settings}
          onViewEmployeeSlip={handleViewEmployeeSlip}
        />
      )}

      {/* Settings, Shifts & Employee Management Modal (Admin Only) */}
      {isAdmin && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={data.settings}
          employees={data.employees}
          onUpdateSettings={handleUpdateSettings}
          onSaveEmployee={handleSaveEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onResetNewMonth={handleResetNewMonth}
          onResetData={handleResetData}
          appData={data}
        />
      )}

      {/* Late Attendance Configuration Modal */}
      {lateModalData && (
        <LateAttendanceModal
          isOpen={true}
          onClose={() => setLateModalData(null)}
          employee={lateModalData.employee}
          record={lateModalData.record}
          date={lateModalData.date}
          settings={data.settings}
          onConfirm={handleUpdateAttendance}
        />
      )}

      {/* Departure (مغادرة / إذن خروج) Configuration Modal */}
      {departureModalData && (
        <DepartureModal
          isOpen={true}
          onClose={() => setDepartureModalData(null)}
          employee={departureModalData.employee}
          record={departureModalData.record}
          date={departureModalData.date}
          settings={data.settings}
          onConfirm={handleUpdateAttendance}
        />
      )}

      {/* Overtime (انصراف / عمل إضافي ومستحقات) Configuration Modal */}
      {overtimeModalData && (
        <OvertimeModal
          isOpen={true}
          onClose={() => setOvertimeModalData(null)}
          employee={overtimeModalData.employee}
          record={overtimeModalData.record}
          date={overtimeModalData.date}
          settings={data.settings}
          onSave={handleUpdateAttendance}
        />
      )}

      {/* Salary Advance Receipt Voucher Modal */}
      <AdvanceReceiptModal
        isOpen={!!selectedAdvanceForReceipt}
        onClose={() => setSelectedAdvanceForReceipt(null)}
        advance={selectedAdvanceForReceipt}
        settings={data.settings}
      />

      {/* Individual Employee Detailed Statement & Payslip Modal (PDF Download - Admin Only) */}
      {isAdmin && (
        <EmployeePayslipModal
          isOpen={isDetailedStatementOpen || !!selectedEmployeeForPayslip}
          onClose={() => {
            setIsDetailedStatementOpen(false);
            setSelectedEmployeeForPayslip(null);
          }}
          summary={selectedEmployeeForPayslip}
          settings={data.settings}
          employees={data.employees}
          attendance={data.attendance}
          advances={data.advances}
        />
      )}

      {/* Full Advances Ledger Modal */}
      <AdvancesLedgerModal
        isOpen={isAdvancesLedgerOpen}
        onClose={() => setIsAdvancesLedgerOpen(false)}
        advances={data.advances}
        employees={data.employees}
        settings={data.settings}
        onDeleteAdvance={handleDeleteAdvance}
        onViewReceipt={handleViewReceipt}
      />

    </div>
  );
}
