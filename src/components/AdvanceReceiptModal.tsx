import React, { useRef, useState } from 'react';
import { SalaryAdvance, CompanySettings } from '../types';
import { formatSYP, formatArabicDate } from '../utils/formatters';
import { X, Printer, Receipt, Building2, Download, CheckCircle2 } from 'lucide-react';
import { downloadPdfFromElement, triggerPrint } from '../utils/printPdfUtils';

interface AdvanceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  advance: SalaryAdvance | null;
  settings: CompanySettings;
}

export const AdvanceReceiptModal: React.FC<AdvanceReceiptModalProps> = ({
  isOpen,
  onClose,
  advance,
  settings,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !advance) return null;

  const handlePrint = () => {
    triggerPrint(printableRef.current, `سند سلفة - ${advance.employeeName || 'موظف'}`);
  };

  const handleDownloadPdf = async () => {
    const element = printableRef.current;
    if (!element) return;

    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      const safeEmpName = (advance.employeeName || 'موظف').replace(/[^\u0600-\u06FFa-zA-Z0-9_-]/g, '_');
      const filename = `سند_سلفة_${safeEmpName}_${advance.date}.pdf`;
      await downloadPdfFromElement(element, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      triggerPrint(element, `سند سلفة - ${advance.employeeName || 'موظف'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-[#F8FAFC] no-print">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-xs sm:text-sm text-slate-900">سند صرف سلفة مالية (إيصال رسمي)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              id="btn-download-advance-pdf"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <span>جاري التحميل...</span>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تم التنزيل</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              id="btn-print-advance-receipt"
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>طباعة الإيصال</span>
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

        {/* Printable Official Receipt Body */}
        <div 
          ref={printableRef}
          id="advance-receipt-printable" 
          className="p-5 sm:p-7 bg-white border border-slate-300 m-3 sm:m-5 rounded-xl shadow-2xs text-right"
        >
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b-2 border-slate-900">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">{settings.companyName}</h2>
              <p className="text-[11px] text-slate-600 mt-0.5">قسم الشؤون المالية والمحاسبة</p>
            </div>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
            ) : (
              <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="text-center py-1.5 mb-3.5 bg-[#F8FAFC] rounded-lg font-bold text-xs sm:text-sm text-slate-900 border border-slate-200">
            سند صرف سلفة على الراتب الشهري (SYP)
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 pb-2 border-b border-slate-100 font-mono">
            <span>رقم السند: <strong className="text-slate-800 font-bold">{advance.id}</strong></span>
            <span>التاريخ: <strong className="text-slate-800">{formatArabicDate(advance.date)}</strong></span>
          </div>

          {/* Body Info */}
          <div className="flex flex-col gap-2.5 text-xs text-slate-800 leading-relaxed mb-5">
            <div className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-lg border border-slate-200">
              <span className="text-slate-500">اسم الموظف المستفيد:</span>
              <strong className="text-slate-900 text-xs sm:text-sm">{advance.employeeName}</strong>
            </div>

            <div className="flex items-center justify-between p-2 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
              <span className="text-emerald-800 font-bold">مبلغ السلفة المصروفة:</span>
              <strong className="text-emerald-950 font-mono text-sm sm:text-base font-bold">
                {formatSYP(advance.amount)}
              </strong>
            </div>

            <div className="p-2 bg-[#F8FAFC] rounded-lg border border-slate-200">
              <span className="text-slate-500 block mb-0.5">البيان / سبب السلفة:</span>
              <span className="text-slate-800 font-medium">
                {advance.note || 'سلفة مالية على حساب مستحقات الراتب الشهري'}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 bg-slate-100/70 p-2 rounded-lg border border-slate-200">
              * إقرار: أقر أنا الموظف المذكور أعلاه باستلامي المبلغ الموضح أعلاه نقداً كسلفة على راتبي، وأوافق على خصم هذا المبلغ بالكامل من جدول مسيرات رواتب الشهر الحالي.
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-300 text-center text-xs">
            <div>
              <p className="font-bold text-slate-900 mb-6">توقيع المستلم (الموظف)</p>
              <p className="text-slate-400 font-mono text-[10px]">...................................</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-6">اعتماد الإدارة المالية / المدير</p>
              <p className="text-slate-400 font-mono text-[10px]">({settings.directorName || 'المدير العام'})</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
