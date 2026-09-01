import React, { useState, useEffect } from 'react';
import { AppData, SalaryAdvance, AttendanceRecord, Employee, CompanySettings, EmployeeMonthlySummary } from './types';
import { syncService } from './services/syncService';
import { Header } from './components/Header';
import { SalaryAdvanceSection } from './components/SalaryAdvanceSection';
import { AttendanceSection } from './components/AttendanceSection';
import { MonthlyPayrollModal } from './components/MonthlyPayrollModal';
import { SettingsModal } from './components/SettingsModal';
import { LateAttendanceModal } from './components/LateAttendanceModal';
import { DepartureModal } from './components/DepartureModal';
import { AdvanceReceiptModal } from './components/AdvanceReceiptModal';
import { EmployeePayslipModal } from './components/EmployeePayslipModal';
import { AdvancesLedgerModal } from './components/AdvancesLedgerModal';
import { AttendanceLedgerModal } from './components/AttendanceLedgerModal';
import { getTodayDateString } from './utils/formatters';
import { ShieldCheck, Database, RefreshCw, Smartphone, Laptop, Sparkles } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<AppData>(syncService.getData());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>(
    syncService.getConnectionStatus()
  );

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPayrollOpen, setIsPayrollOpen] = useState<boolean>(false);
  const [isAdvancesLedgerOpen, setIsAdvancesLedgerOpen] = useState<boolean>(false);
  const [isAttendanceLedgerOpen, setIsAttendanceLedgerOpen] = useState<boolean>(false);
  const [isDetailedStatementOpen, setIsDetailedStatementOpen] = useState<boolean>(false);
  
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

  // Subscribe to real-time sync service
  useEffect(() => {
    const unsubData = syncService.subscribe((newData) => {
      setData(newData);
    });

    const unsubConn = syncService.subscribeConnection((newStatus) => {
      setConnectionStatus(newStatus);
    });

    return () => {
      unsubData();
      unsubConn();
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

  // View receipt from any section
  const handleViewReceipt = (advance: SalaryAdvance) => {
    setSelectedAdvanceForReceipt(advance);
  };

  // View payslip from payroll modal
  const handleViewEmployeeSlip = (summary: EmployeeMonthlySummary) => {
    setSelectedEmployeeForPayslip(summary);
  };

  // Count of current month advances
  const currentMonthPrefix = getTodayDateString().slice(0, 7);
  const activeMonthAdvancesCount = data.advances.filter((a) => a.date.startsWith(currentMonthPrefix)).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-slate-900 selection:text-white">
      
      {/* Sticky Top Header */}
      <Header
        settings={data.settings}
        connectionStatus={connectionStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPayroll={() => setIsPayrollOpen(true)}
        onOpenDetailedStatement={() => setIsDetailedStatementOpen(true)}
        onOpenAdvancesList={() => setIsAdvancesLedgerOpen(true)}
        onOpenAttendanceLedger={() => setIsAttendanceLedgerOpen(true)}
        activeAdvancesCount={activeMonthAdvancesCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Clean System Notification Banner */}
        {data.employees.length === 0 && (
          <div className="mb-4 sm:mb-5 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl shadow-xs border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>السستم نظيف ومفرغ كلياً 100%</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium">
                    جاهز للبدء
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  تم تصفير كافة البيانات والبدء من الصفر. يمكنك الآن تسجيل موظفيك الحقيقيين وتحديد رواتبهم وشفتاتهم.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <span>➕ إضافة أول موظف الآن</span>
            </button>
          </div>
        )}

        {/* Top Section: Attendance & Daily Operations Section (تسجيل الحضور الفوري واليومي والشفتات والمغادرات) */}
        <AttendanceSection
          employees={data.employees}
          attendance={data.attendance}
          settings={data.settings}
          onUpdateAttendance={handleUpdateAttendance}
          onBulkUpdateAttendance={handleBulkUpdateAttendance}
          onOpenLateModal={handleOpenLateModal}
          onOpenDepartureModal={handleOpenDepartureModal}
          onOpenLedger={() => setIsAttendanceLedgerOpen(true)}
        />

        {/* Bottom Section: Quick Salary Advance Entry (السلف المالية) */}
        <SalaryAdvanceSection
          employees={data.employees}
          advances={data.advances}
          settings={data.settings}
          onAddAdvance={handleAddAdvance}
          onDeleteAdvance={handleDeleteAdvance}
          onViewReceipt={handleViewReceipt}
        />

      </main>

      {/* Footer & Real-Time Sync Device Notice */}
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

      {/* Monthly Attendance & Absence Ledger Modal (كشف الحضور والتأخيرات الشهري) */}
      <AttendanceLedgerModal
        isOpen={isAttendanceLedgerOpen}
        onClose={() => setIsAttendanceLedgerOpen(false)}
        employees={data.employees}
        attendance={data.attendance}
        settings={data.settings}
      />

      {/* Monthly Payroll Modal */}
      <MonthlyPayrollModal
        isOpen={isPayrollOpen}
        onClose={() => setIsPayrollOpen(false)}
        employees={data.employees}
        attendance={data.attendance}
        advances={data.advances}
        settings={data.settings}
        onViewEmployeeSlip={handleViewEmployeeSlip}
      />

      {/* Settings, Shifts & Employee Management Modal */}
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

      {/* Salary Advance Receipt Voucher Modal */}
      <AdvanceReceiptModal
        isOpen={!!selectedAdvanceForReceipt}
        onClose={() => setSelectedAdvanceForReceipt(null)}
        advance={selectedAdvanceForReceipt}
        settings={data.settings}
      />

      {/* Individual Employee Detailed Statement & Payslip Modal (PDF Download) */}
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
