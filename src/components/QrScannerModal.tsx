import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { validateScannedQr, playSuccessChime } from '../utils/qrUtils';
import { getCurrentTimeString, getTodayDateString } from '../utils/formatters';
import { 
  Camera, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Flashlight, 
  Upload, 
  QrCode,
  ShieldCheck
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  companyName: string;
  onScanSuccess: (checkInTime: string, note?: string) => Promise<void>;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  companyName,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ time: string } | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);

  const animationFrameId = useRef<number | null>(null);

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      setIsPermissionDenied(false);
      setScannerStatus('scanning');

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
      }

      // Check for torch/flashlight support
      const track = newStream.getVideoTracks()[0];
      const capabilities = (track as any).getCapabilities?.() || {};
      if (capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }

      // Start scan loop
      requestAnimationFrame(scanFrame);
    } catch (err: any) {
      console.warn('Camera Access Notice:', err);
      setIsPermissionDenied(true);
      setScannerStatus('error');
      setErrorMessage('تعذر الوصول للكاميرا. يرجى التأكد من منح الإذن أو استخدام خيار رفع صورة الرمز أدناه.');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Scan frame in loop
  const scanFrame = () => {
    if (scannerStatus === 'processing' || scannerStatus === 'success') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleProcessCode(code.data);
          return;
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  // Process decoded QR text
  const handleProcessCode = async (decodedText: string) => {
    setScannerStatus('processing');
    const validation = validateScannedQr(decodedText, companyName);

    if (!validation.valid) {
      setScannerStatus('error');
      setErrorMessage(validation.message);
      setTimeout(() => {
        setScannerStatus('scanning');
        setErrorMessage(null);
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }, 3000);
      return;
    }

    // Success!
    const checkInTime = getCurrentTimeString();
    playSuccessChime();
    setSuccessInfo({ time: checkInTime });
    setScannerStatus('success');
    stopCamera();

    try {
      await onScanSuccess(checkInTime, `مسح QR ذاتي (${validation.payload?.token || 'رمز يومي'})`);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Image File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleProcessCode(code.data);
          } else {
            setScannerStatus('error');
            setErrorMessage('لم يتم العثور على رمز QR صالح في الصورة المرفوعة.');
            setTimeout(() => setScannerStatus('scanning'), 3000);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Torch toggle
  const toggleTorch = async () => {
    if (stream && hasTorch) {
      const track = stream.getVideoTracks()[0];
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle error', err);
      }
    }
  };

  // Switch between front and back camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannerStatus('idle');
      setSuccessInfo(null);
      setErrorMessage(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 no-print animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative">
        
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                مسح باركود الحضور الذاتي
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                الموظف: <strong className="text-slate-800 font-bold">{employeeName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="إغلاق الماسح"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scanner Viewport / Success State */}
        <div className="p-4 flex flex-col items-center">
          
          {scannerStatus === 'success' && successInfo ? (
            /* Success Feedback Card */
            <div className="w-full py-8 px-4 flex flex-col items-center text-center animate-scaleIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                تم تسجيل حضورك بنجاح!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تم تثبيت حضور اليوم ومطابقة الشفت في قاعدة البيانات الحية
              </p>

              <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 w-full mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">اسم الموظف:</span>
                  <span className="font-bold text-slate-900">{employeeName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">وقت تسجيل الحضور:</span>
                  <span className="font-bold font-mono text-emerald-800">{successInfo.time}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">تاريخ اليوم:</span>
                  <span className="font-bold font-mono text-slate-700">{getTodayDateString()}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                العودة لصفحتي الشخصية
              </button>
            </div>
          ) : (
            /* Camera Live Viewfinder */
            <div className="w-full flex flex-col items-center">
              
              <div className="relative w-full aspect-square max-h-[300px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-800">
                
                {/* Live Video Element */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Hidden processing canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Frame Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400/90 rounded-2xl relative flex items-center justify-center shadow-lg">
                    
                    {/* Corner accents */}
                    <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></span>
                    <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></span>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></span>
                    <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></span>

                    {/* Laser Scanner Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-sm"></div>
                  </div>
                </div>

                {/* Status Overlay */}
                {scannerStatus === 'processing' && (
                  <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-xs font-bold">جاري التحقق من رمز الحضور...</span>
                  </div>
                )}

              </div>

              {/* Error notice if any */}
              {errorMessage && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn w-full">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Instructions text */}
              <p className="text-[11px] text-slate-500 text-center mt-3 font-medium">
                وجه الكاميرا نحو باركود الحضور المعروض في لوحة المشرف ليتم المسح تلقائياً
              </p>

              {/* Scanner Control Buttons */}
              <div className="flex items-center justify-center gap-2 mt-3.5 w-full">
                
                {/* Camera Switch */}
                <button
                  type="button"
                  onClick={switchCamera}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تبديل الكاميرا الخلفية / الأمامية"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تبديل الكاميرا</span>
                </button>

                {/* Torch Toggle if available */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isTorchOn ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Flashlight className="w-3.5 h-3.5" />
                    <span>{isTorchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}</span>
                  </button>
                )}

                {/* Upload Image Fallback */}
                <label className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>رفع صورة</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
