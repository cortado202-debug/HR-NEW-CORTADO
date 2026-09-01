import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, RotateCcw, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'emerald' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-100',
          btnBg: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white',
          border: 'border-rose-200',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-100',
          btnBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
          border: 'border-amber-200',
        };
      case 'emerald':
        return {
          icon: <RotateCcw className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-100',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
          border: 'border-emerald-200',
        };
      case 'primary':
      default:
        return {
          icon: <AlertCircle className="w-6 h-6 text-slate-700" />,
          iconBg: 'bg-slate-100',
          btnBg: 'bg-slate-900 hover:bg-slate-800 text-white',
          border: 'border-slate-200',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-right flex flex-col gap-4 animate-in zoom-in-95 duration-150 z-[10000]"
        dir="rtl"
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl flex-shrink-0 ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {title}
            </h3>
            <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {message}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-2 ${styles.btnBg}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
