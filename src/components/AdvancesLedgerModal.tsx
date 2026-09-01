import React, { useState, useMemo } from 'react';
import { SalaryAdvance, Employee, CompanySettings } from '../types';
import { formatSYP, formatArabicDate } from '../utils/formatters';
import { 
  X, 
  ReceiptText, 
  Search, 
  Printer, 
  Trash2, 
  Calendar, 
  User, 
  Banknote,
  Download
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface AdvancesLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  advances: SalaryAdvance[];
  employees: Employee[];
  settings: CompanySettings;
  onDeleteAdvance: (id: string) => Promise<boolean>;
  onViewReceipt: (advance: SalaryAdvance) => void;
}

export const AdvancesLedgerModal: React.FC<AdvancesLedgerModalProps> = ({
  isOpen,
  onClose,
  advances,
  employees,
  settings,
  onDeleteAdvance,
  onViewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('');
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'emerald';
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Filtered advances
  const filteredAdvances = useMemo(() => {
    if (!isOpen) return [];
    return advances.filter((adv) => {
      // Search
      const matchesSearch =
        adv.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (adv.note && adv.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        adv.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Employee Filter
      if (selectedEmployeeFilter !== 'all' && adv.employeeId !== selectedEmployeeFilter) {
        return false;
      }

      // Month Filter
      if (selectedMonthFilter && !adv.date.startsWith(selectedMonthFilter)) {
        return false;
      }

      return true;
    });
  }, [isOpen, advances, searchQuery, selectedEmployeeFilter, selectedMonthFilter]);

  // Total sum of filtered advances in SYP
  const totalFilteredSYP = filteredAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['رقم السند', 'اسم الموظف', 'المبلغ (ل.س)', 'التاريخ', 'الوقت', 'البيان'];
    const rows = filteredAdvances.map((a) => [
      `"${a.id}"`,
      `"${a.employeeName}"`,
      a.amount,
      a.date,
      a.time,
      `"${a.note || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `advances_ledger_syp.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-2xs">
              <ReceiptText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                سجل ودفتر السلف المالية بالليرة السورية
              </h2>
              <p className="text-[11px] text-slate-500">
                أرشيف كامل لكافة السلف المصروفة مع إمكانية البحث والتصفية وطباعة السندات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
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

        {/* Filter Bar & Summary Ribbon */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2 flex-1">
            
            {/* Search Input */}
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث بالموظف أو البيان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-lg pr-8 pl-2.5 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Employee Filter */}
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:bg-white"
            >
              <option value="all">كافة الموظفين</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>

            {/* Month Filter */}
            <input
              type="month"
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:bg-white"
            />
            {selectedMonthFilter && (
              <button
                onClick={() => setSelectedMonthFilter('')}
                className="text-xs text-rose-600 font-bold px-1"
              >
                إلغاء الشهر
              </button>
            )}

          </div>

          {/* Sum Total Badge */}
          <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-2.5 shadow-2xs">
            <div className="text-right">
              <span className="text-[9px] text-slate-400 block font-semibold">إجمالي السلف المعروضة</span>
              <strong className="text-sm sm:text-base font-mono font-bold text-emerald-400">
                {formatSYP(totalFilteredSYP)}
              </strong>
            </div>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {filteredAdvances.length} سلفة
            </span>
          </div>

        </div>

        {/* Table View */}
        <div className="overflow-x-auto flex-1 p-3 sm:p-4 pt-2">
          {filteredAdvances.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-[#F8FAFC] rounded-lg my-2 border border-dashed border-slate-200">
              لا توجد سلف مسجلة تطابق معايير التصفية المحددة
            </div>
          ) : (
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="p-2.5">رقم السند</th>
                  <th className="p-2.5">الموظف المستفيد</th>
                  <th className="p-2.5">المبلغ (ل.س)</th>
                  <th className="p-2.5">التاريخ والوقت</th>
                  <th className="p-2.5">البيان والملاحظات</th>
                  <th className="p-2.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-2.5 font-mono text-slate-500 font-semibold">{adv.id}</td>
                    <td className="p-2.5 font-bold text-slate-900 text-xs sm:text-sm">{adv.employeeName}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-800 text-xs sm:text-sm">{formatSYP(adv.amount)}</td>
                    <td className="p-2.5 text-slate-600">
                      <div>{formatArabicDate(adv.date)}</div>
                      {adv.time && <div className="text-[10px] text-slate-400 font-mono">{adv.time}</div>}
                    </td>
                    <td className="p-2.5 text-slate-600 max-w-xs truncate">{adv.note || '—'}</td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewReceipt(adv)}
                          className="px-2 py-1 bg-[#F8FAFC] hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>سند الصرف</span>
                        </button>
                        <button
                          onClick={() => {
                            setConfirmModalConfig({
                              isOpen: true,
                              title: 'تأكيد حذف السلفة',
                              message: `هل تريد بالتأكيد حذف سلفة "${adv.employeeName}" بقيمة ${formatSYP(adv.amount)}؟`,
                              confirmText: 'نعم، حذف السلفة',
                              variant: 'danger',
                              onConfirm: async () => {
                                await onDeleteAdvance(adv.id);
                                setConfirmModalConfig(null);
                              },
                            });
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          onClose={() => setConfirmModalConfig(null)}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          variant={confirmModalConfig.variant}
        />
      )}
    </div>
  );
};
