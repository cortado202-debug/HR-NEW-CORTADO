import React, { useState, useMemo, useRef } from 'react';
import { Employee, AttendanceRecord, SalaryAdvance, CompanySettings, EmployeeMonthlySummary } from '../types';
import { formatSYP, formatArabicMonth, getTodayDateString } from '../utils/formatters';
import { computeEmployeeMonthlySummary } from '../utils/payrollMath';
import { triggerPrint } from '../utils/printPdfUtils';
import { 
  X, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  Calendar, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Receipt
} from 'lucide-react';

interface MonthlyPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  attendance: Record<string, AttendanceRecord>;
  advances: SalaryAdvance[];
  settings: CompanySettings;
  onViewEmployeeSlip: (summary: EmployeeMonthlySummary) => void;
}

export const MonthlyPayrollModal: React.FC<MonthlyPayrollModalProps> = ({
  isOpen,
  onClose,
  employees,
  attendance,
  advances,
  settings,
  onViewEmployeeSlip,
}) => {
  const todayStr = getTodayDateString();
  const [currentYear, currentMonth] = todayStr.split('-');
  const [selectedMonth, setSelectedMonth] = useState<string>(`${currentYear}-${currentMonth}`);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active employees
  const activeEmployees = useMemo(() => {
    return employees.filter((e) => e.active);
  }, [employees]);

  // Compute summary for all employees
  const summaries: EmployeeMonthlySummary[] = useMemo(() => {
    return activeEmployees.map((emp) =>
      computeEmployeeMonthlySummary(emp, selectedMonth, attendance, advances, settings)
    );
  }, [activeEmployees, selectedMonth, attendance, advances, settings]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const query = searchQuery.toLowerCase();
    return summaries.filter(
      (s) =>
        s.employee.name.toLowerCase().includes(query) ||
        s.employee.jobTitle.toLowerCase().includes(query)
    );
  }, [summaries, searchQuery]);

  // Aggregated totals
  const totals = useMemo(() => {
    return filteredSummaries.reduce(
      (acc, s) => {
        acc.baseSalary += s.baseSalary;
        acc.advances += s.totalAdvances;
        acc.deductions += s.totalDeductions;
        acc.netSalary += s.netSalary;
        acc.presentDays += s.daysPresent;
        acc.absentDays += s.daysAbsent;
        acc.lateDays += s.daysLate;
        return acc;
      },
      {
        baseSalary: 0,
        advances: 0,
        deductions: 0,
        netSalary: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
      }
    );
  }, [filteredSummaries]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'اسم الموظف',
      'المسمى الوظيفي',
      'الراتب الأساسي (ل.س)',
      'أيام الحضور',
      'أيام الغياب',
      'أيام التأخير',
      'خصومات الغياب والتأخير (ل.س)',
      'إجمالي السلف (ل.س)',
      'صافي الراتب المستحق (ل.س)',
    ];

    const rows = filteredSummaries.map((s) => [
      `"${s.employee.name}"`,
      `"${s.employee.jobTitle}"`,
      s.baseSalary,
      s.daysPresent,
      s.daysAbsent,
      s.daysLate,
      s.totalDeductions,
      s.totalAdvances,
      s.netSalary,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll_${selectedMonth}_syp.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printablePayrollRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    triggerPrint(printablePayrollRef.current, `كشف مسيرات الرواتب - ${selectedMonth}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-2xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                كشف الرواتب والأجور الشهرية (SYP)
              </h2>
              <p className="text-[11px] text-slate-500">
                جدول تفصيلي يتضمن الراتب الأساسي، السلف، خصومات الغياب والتأخير، وصافي الراتب الصافي
              </p>
            </div>
          </div>

          {/* Month selector & Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            
            {/* Month Input */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="outline-none font-mono bg-transparent text-xs"
              />
            </div>

            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              id="btn-export-payroll-csv"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
              title="تصدير ملف إكسل CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>

            {/* Print Sheet */}
            <button
              onClick={handlePrint}
              id="btn-print-payroll"
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>طباعة الكشف</span>
            </button>

            {/* Red Close Button in Top Corner */}
            <button
              onClick={onClose}
              id="btn-close-payroll-modal"
              title="إغلاق الكشف الشهري"
              className="flex items-center justify-center p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg transition-all shadow-2xs cursor-pointer group"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

          </div>
        </div>

        {/* Printable Area Wrapper */}
        <div ref={printablePayrollRef} id="monthly-payroll-table-printable" className="flex flex-col flex-1 overflow-y-auto">
          {/* Printable Header (Visible only when printing) */}
          <div className="hidden print-only p-6 border-b border-black text-center">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <h1 className="text-2xl font-bold text-black">{settings.companyName}</h1>
              <p className="text-sm text-gray-700">إدارة الموارد البشرية والمالية</p>
              <p className="text-xs text-gray-600">كشف مسيرات الرواتب والسلف الشهرية بالليرة السورية</p>
            </div>
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
            )}
          </div>
          <div className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded font-bold text-sm">
            كشف رواتب شهر: {formatArabicMonth(selectedMonth)} ({selectedMonth})
          </div>
        </div>

        {/* Totals Summary Ribbon */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 no-print">
          
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-2.5">
            <div className="text-[10px] font-bold text-slate-500">إجمالي الرواتب الأساسية</div>
            <div className="text-sm sm:text-base font-bold font-mono text-slate-900 mt-0.5">
              {formatSYP(totals.baseSalary)}
            </div>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-2.5">
            <div className="text-[10px] font-bold text-amber-800">مجموع السلف المصروفة</div>
            <div className="text-sm sm:text-base font-bold font-mono text-amber-900 mt-0.5">
              {formatSYP(totals.advances)}
            </div>
          </div>

          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-2.5">
            <div className="text-[10px] font-bold text-rose-800">مجموع الخصومات والغياب</div>
            <div className="text-sm sm:text-base font-bold font-mono text-rose-900 mt-0.5">
              {formatSYP(totals.deductions)}
            </div>
          </div>

          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-2.5">
            <div className="text-[10px] font-bold text-emerald-800">صافي الرواتب المستحقة</div>
            <div className="text-sm sm:text-base font-bold font-mono text-emerald-950 mt-0.5">
              {formatSYP(totals.netSalary)}
            </div>
          </div>

        </div>

        {/* Search Bar */}
        <div className="px-3 sm:px-4 pt-2.5 pb-2 flex items-center justify-between no-print">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="تصفية حسب اسم الموظف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-lg pr-8 pl-2.5 py-1 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            شهر: <strong className="text-slate-800">{formatArabicMonth(selectedMonth)}</strong>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto flex-1 p-3 sm:p-4 pt-0">
          <table className="w-full text-xs text-right border-collapse bg-white border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <th className="p-2.5">الموظف والمسمى</th>
                <th className="p-2.5">الراتب الأساسي</th>
                <th className="p-2.5 text-center">أيام الحضور</th>
                <th className="p-2.5 text-center">الغياب / التأخير</th>
                <th className="p-2.5">خصومات الدوام</th>
                <th className="p-2.5">إجمالي السلف</th>
                <th className="p-2.5">صافي المستحق</th>
                <th className="p-2.5 text-center no-print">الإيصال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.map((s) => (
                <tr key={s.employee.id} className="hover:bg-slate-50 transition-colors">
                  
                  {/* Name & Job */}
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{s.employee.name}</div>
                    <div className="text-[10px] text-slate-500">{s.employee.jobTitle}</div>
                  </td>

                  {/* Base Salary */}
                  <td className="p-2.5 font-bold font-mono text-slate-900">
                    {formatSYP(s.baseSalary)}
                  </td>

                  {/* Attendance Days */}
                  <td className="p-2.5 text-center font-mono">
                    <span className="px-1.5 py-0.5 bg-[#F0FDF4] text-emerald-800 font-bold rounded border border-[#BBF7D0] text-[11px]">
                      {s.daysPresent} يوم
                    </span>
                  </td>

                  {/* Absent / Late */}
                  <td className="p-2.5 text-center font-mono">
                    <div className="flex items-center justify-center gap-1">
                      {s.daysAbsent > 0 && (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 font-bold rounded text-[10px]">
                          {s.daysAbsent} غياب
                        </span>
                      )}
                      {s.daysLate > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px]">
                          {s.daysLate} تأخير
                        </span>
                      )}
                      {s.daysHalfDay > 0 && (
                        <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 font-bold rounded text-[10px]">
                          {s.daysHalfDay} نصف يوم
                        </span>
                      )}
                      {s.daysAbsent === 0 && s.daysLate === 0 && s.daysHalfDay === 0 && (
                        <span className="text-slate-400 text-[10px]">لا يوجد</span>
                      )}
                    </div>
                  </td>

                  {/* Deductions */}
                  <td className="p-2.5 font-mono font-semibold text-rose-600">
                    {s.totalDeductions > 0 ? (
                      <div>
                        <div>{formatSYP(s.totalDeductions)}</div>
                        <div className="text-[10px] text-slate-400">
                          {s.absentDeductions > 0 && `غياب: ${formatSYP(s.absentDeductions)}`}
                        </div>
                      </div>
                    ) : (
                      '0 ل.س'
                    )}
                  </td>

                  {/* Advances */}
                  <td className="p-2.5 font-mono font-semibold text-amber-800">
                    {s.totalAdvances > 0 ? (
                      <div>
                        <div>{formatSYP(s.totalAdvances)}</div>
                        <div className="text-[10px] text-slate-400">({s.advancesCount} سلفة)</div>
                      </div>
                    ) : (
                      '0 ل.س'
                    )}
                  </td>

                  {/* Net Salary */}
                  <td className="p-2.5 font-mono font-bold text-xs sm:text-sm text-emerald-900 bg-emerald-50/40">
                    {formatSYP(s.netSalary)}
                  </td>

                  {/* Actions / View Detailed Statement & PDF */}
                  <td className="p-2.5 text-center no-print">
                    <button
                      onClick={() => onViewEmployeeSlip(s)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 hover:border-emerald-600 rounded text-[11px] font-bold transition-all shadow-2xs"
                      title="عرض وتنزيل كشف الحساب التفصيلي الشهري كملف PDF"
                    >
                      <Download className="w-3 h-3" />
                      <span>كشف تفصيلي (PDF)</span>
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
            
            {/* Table Footer Totals */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-800 text-xs">
                <td className="p-2.5">الإجمالي ({filteredSummaries.length} موظف)</td>
                <td className="p-2.5 font-mono">{formatSYP(totals.baseSalary)}</td>
                <td className="p-2.5 text-center font-mono">{totals.presentDays} يوم</td>
                <td className="p-2.5 text-center font-mono text-[11px]">
                  {totals.absentDays} غياب / {totals.lateDays} تأخير
                </td>
                <td className="p-2.5 font-mono text-rose-300">{formatSYP(totals.deductions)}</td>
                <td className="p-2.5 font-mono text-amber-300">{formatSYP(totals.advances)}</td>
                <td className="p-2.5 font-mono text-emerald-300 text-xs sm:text-sm font-bold bg-slate-800">
                  {formatSYP(totals.netSalary)}
                </td>
                <td className="p-2.5 no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>

          {/* Printable Signatures footer */}
          <div className="hidden print-only p-8 pt-12 mt-8 border-t border-black grid grid-cols-3 gap-8 text-center text-xs">
            <div>
              <p className="font-bold mb-8">إعداد مسؤول شؤون الموظفين</p>
              <p className="border-t border-gray-400 pt-1">التوقيع: .....................</p>
            </div>
            <div>
              <p className="font-bold mb-8">تدقيق المحاسب المالي</p>
              <p className="border-t border-gray-400 pt-1">التوقيع: .....................</p>
            </div>
            <div>
              <p className="font-bold mb-8">اعتماد المدير العام ({settings.directorName})</p>
              <p className="border-t border-gray-400 pt-1">الختم والتوقيع: .....................</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
