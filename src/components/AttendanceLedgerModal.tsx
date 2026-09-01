import React, { useState } from 'react';
import { Employee, AttendanceRecord, CompanySettings } from '../types';
import { 
  formatSYP, 
  getTodayDateString, 
  formatArabicDate 
} from '../utils/formatters';
import { 
  computeEmployeeMonthlySummary, 
  calculateDayDeduction 
} from '../utils/payrollMath';
import { triggerPrint } from '../utils/printPdfUtils';
import { 
  X, 
  Calendar, 
  Search, 
  Printer, 
  Clock, 
  UserCheck, 
  AlertCircle, 
  FileText, 
  Filter, 
  ChevronRight, 
  ChevronLeft,
  Users,
  Download
} from 'lucide-react';

interface AttendanceLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  attendance: Record<string, AttendanceRecord>;
  settings: CompanySettings;
}

export const AttendanceLedgerModal: React.FC<AttendanceLedgerModalProps> = ({
  isOpen,
  onClose,
  employees,
  attendance,
  settings,
}) => {
  const todayStr = getTodayDateString();
  const [currentYear, currentMonth] = todayStr.split('-');
  const [selectedMonth, setSelectedMonth] = useState<string>(`${currentYear}-${currentMonth}`);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'monthly_summary' | 'detailed_log'>('monthly_summary');

  if (!isOpen) return null;

  const activeEmployees = employees.filter((e) => e.active);

  // Compute monthly summaries for all employees
  const monthlySummaries = activeEmployees.map((emp) => {
    return computeEmployeeMonthlySummary(emp, selectedMonth, attendance, [], settings);
  });

  // Filtered summaries
  const filteredSummaries = monthlySummaries.filter((sum) => {
    const matchesSearch = sum.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sum.employee.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedEmployeeFilter !== 'all' && sum.employee.id !== selectedEmployeeFilter) return false;
    return true;
  });

  // Filtered detailed records
  const allRecordsInMonth = (Object.values(attendance) as AttendanceRecord[]).filter((rec) => {
    if (!rec.date.startsWith(selectedMonth)) return false;
    if (selectedEmployeeFilter !== 'all' && rec.employeeId !== selectedEmployeeFilter) return false;
    
    const emp = employees.find((e) => e.id === rec.employeeId);
    if (!emp) return false;
    if (searchQuery && !emp.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Totals for this month
  const totalLateMinsMonth = monthlySummaries.reduce((sum, s) => sum + s.totalLateMinutes, 0);
  const totalAbsentDaysMonth = monthlySummaries.reduce((sum, s) => sum + s.daysAbsent, 0);
  const totalDeductionsMonth = monthlySummaries.reduce((sum, s) => sum + (s.absentDeductions + s.lateDeductions + s.halfDayDeductions), 0);

  const handlePrint = () => {
    triggerPrint();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-2xs">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                سجل وكشف الحضور والغياب والتأخيرات الشهري
              </h2>
              <p className="text-xs text-slate-500">
                متابعة دقيقة لعدد أيام الحضور، الغياب، وإجمالي دقائق التأخير والخصومات لكل موظف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة الكشف</span>
            </button>
            <button
              onClick={onClose}
              title="إغلاق"
              className="flex items-center justify-center p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg transition-all shadow-2xs cursor-pointer group"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3.5 sm:p-4 bg-[#F8FAFC] border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Month Picker */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label htmlFor="ledger-month-select" className="text-xs font-bold text-slate-700">الشهر:</label>
              <input
                id="ledger-month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold font-mono text-slate-900 outline-none bg-transparent"
              />
            </div>

            {/* Employee Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
              <Users className="w-4 h-4 text-slate-500" />
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                className="text-xs font-bold text-slate-800 outline-none bg-transparent"
              >
                <option value="all">جميع الموظفين ({activeEmployees.length})</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs rounded-lg pr-8 pl-3 py-1.5 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* View Tab Toggle */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-lg w-full md:w-auto">
            <button
              onClick={() => setActiveTab('monthly_summary')}
              className={`flex-1 md:flex-none text-xs font-bold px-3 py-1 rounded-md transition-all ${
                activeTab === 'monthly_summary'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ملخص الموظفين الشامل
            </button>
            <button
              onClick={() => setActiveTab('detailed_log')}
              className={`flex-1 md:flex-none text-xs font-bold px-3 py-1 rounded-md transition-all ${
                activeTab === 'detailed_log'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              السجل اليومي التفصيلي
            </button>
          </div>

        </div>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-slate-50 border-b border-slate-200 text-center">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block">إجمالي دقائق التأخير للشهر</span>
            <span className="text-base sm:text-lg font-bold font-mono text-amber-700">{totalLateMinsMonth} دقيقة</span>
            <span className="text-[10px] text-slate-400 block font-mono">({Math.round((totalLateMinsMonth / 60) * 10) / 10} ساعة)</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block">إجمالي أيام الغياب المسجلة</span>
            <span className="text-base sm:text-lg font-bold font-mono text-rose-700">{totalAbsentDaysMonth} يوم</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block">إجمالي ساعات المغادرات</span>
            <span className="text-base sm:text-lg font-bold font-mono text-indigo-700">
              {monthlySummaries.reduce((acc, s) => acc + (s.totalDepartureHours || 0), 0)} س
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block">إجمالي خصومات الدوام والمغادرات</span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900">{formatSYP(totalDeductionsMonth)}</span>
          </div>
        </div>

        {/* Modal Body / Tables */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {activeTab === 'monthly_summary' ? (
            /* Monthly Summary by Employee Table */
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-right border-collapse bg-white">
                <thead>
                  <tr className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3 text-center">#</th>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3">المسمى الوظيفي</th>
                    <th className="p-3 text-center">أيام الحضور</th>
                    <th className="p-3 text-center">أيام الغياب</th>
                    <th className="p-3 text-center">مرات التأخير</th>
                    <th className="p-3 text-center">مجموع دقائق التأخير</th>
                    <th className="p-3 text-center">ساعات المغادرة</th>
                    <th className="p-3 text-center">نصف يوم</th>
                    <th className="p-3">إجمالي الخصومات (SYP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSummaries.map((sum, idx) => (
                    <tr key={sum.employee.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{sum.employee.name}</td>
                      <td className="p-3 text-slate-600">{sum.employee.jobTitle}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                        {sum.daysPresent} يوم
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-rose-700 bg-rose-50/40">
                        {sum.daysAbsent} يوم
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-700">
                        {sum.daysLate} مرة
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-900 bg-amber-50/40">
                        {sum.totalLateMinutes} دقيقة
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                        {sum.totalDepartureHours || 0} س
                      </td>
                      <td className="p-3 text-center font-mono text-sky-700">
                        {sum.daysHalfDay}
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-700">
                        {formatSYP(sum.absentDeductions + sum.lateDeductions + (sum.departureDeductions || 0) + sum.halfDayDeductions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Detailed Daily Log Table */
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-right border-collapse bg-white">
                <thead>
                  <tr className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الموظف</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">وقت الحضور</th>
                    <th className="p-3">المغادرة</th>
                    <th className="p-3">الشفت</th>
                    <th className="p-3">دقائق التأخير</th>
                    <th className="p-3">الخصم المحتسب</th>
                    <th className="p-3">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRecordsInMonth.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        لا توجد سجلات مسجلة لهذا الشهر
                      </td>
                    </tr>
                  ) : (
                    allRecordsInMonth.map((rec) => {
                      const emp = employees.find((e) => e.id === rec.employeeId);
                      if (!emp) return null;
                      const { deduction, reason } = calculateDayDeduction(emp, rec, settings);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-semibold text-slate-800">{rec.date}</td>
                          <td className="p-3 font-bold text-slate-900">{emp.name}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'late'
                                ? 'bg-amber-100 text-amber-900'
                                : rec.status === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}>
                              {rec.status === 'present' && '🟢 حاضر'}
                              {rec.status === 'late' && '🟠 متأخر'}
                              {rec.status === 'absent' && '🔴 غائب'}
                              {rec.status === 'half_day' && '🔵 نصف يوم'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-700 font-bold">{rec.checkInTime || '—'}</td>
                          <td className="p-3 font-mono text-slate-700">
                            {rec.departureHours ? (
                              <span className="text-indigo-800 bg-indigo-50 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                                {rec.departureHours}س ({rec.departureTime || '—'})
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">{rec.shiftName || '—'}</td>
                          <td className="p-3 font-mono font-bold">
                            {rec.lateMinutes && rec.lateMinutes > 0 ? (
                              <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                                {rec.lateMinutes} د
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-rose-700">
                            {deduction > 0 ? formatSYP(deduction) : <span className="text-slate-300 font-normal">0 ل.س</span>}
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 max-w-[180px] truncate">
                            {rec.departureReason || rec.note || reason || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            ملاحظة: السجلات المحفوظة هنا تُستخدم آلياً في احتساب الرواتب عند ترحيل الشهر
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
