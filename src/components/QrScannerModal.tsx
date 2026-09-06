import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Scan,
  ZoomIn,
  ZoomOut
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

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ time: string } | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  
  // Hardware Zoom capability states (prevents camera from being stuck in telephoto/digital zoom)
  const [zoomCapability, setZoomCapability] = useState<{ min: number; max: number; step: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(1);

  const animationFrameId = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const scannerStatusRef = useRef<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle');

  useEffect(() => {
    scannerStatusRef.current = scannerStatus;
  }, [scannerStatus]);

  // Process decoded QR text
  const handleProcessCode = useCallback(async (decodedText: string) => {
    if (scannerStatusRef.current === 'processing' || scannerStatusRef.current === 'success') {
      return;
    }

    setScannerStatus('processing');
    scannerStatusRef.current = 'processing';

    const validation = validateScannedQr(decodedText, companyName);

    if (!validation.valid) {
      setScannerStatus('error');
      scannerStatusRef.current = 'error';
      setErrorMessage(validation.message);
      setTimeout(() => {
        setScannerStatus('scanning');
        scannerStatusRef.current = 'scanning';
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
    scannerStatusRef.current = 'success';
    stopCamera();

    try {
      await onScanSuccess(checkInTime, `مسح QR ذاتي (${validation.payload?.token || 'رمز يومي'})`);
    } catch (e) {
      console.error('Scan success handler error:', e);
    }
  }, [companyName, onScanSuccess]);

  // High-performance scanning frame
  const scanFrame = useCallback(() => {
    if (scannerStatusRef.current === 'processing' || scannerStatusRef.current === 'success') {
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    // 1. Hardware accelerated native BarcodeDetector API if supported (Instant, zero CPU lag)
    if ('BarcodeDetector' in window) {
      try {
        if (!barcodeDetectorRef.current) {
          barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        }
        barcodeDetectorRef.current
          .detect(video)
          .then((barcodes: any[]) => {
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleProcessCode(barcodes[0].rawValue);
              return;
            }
            animationFrameId.current = requestAnimationFrame(scanFrame);
          })
          .catch(() => {
            runJsQRFallback(video);
          });
        return;
      } catch (e) {
        // Fallback to jsQR
      }
    }

    // 2. jsQR Fallback
    runJsQRFallback(video);
  }, [handleProcessCode]);

  // Optimized jsQR scanner with scaled canvas for 60fps responsiveness
  const runJsQRFallback = (video: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Downscale large frames to max 640px to eliminate CPU freeze and make detection instantaneous
    const maxDim = 640;
    let targetW = video.videoWidth;
    let targetH = video.videoHeight;
    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;
    ctx.drawImage(video, 0, 0, targetW, targetH);

    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth', // Supports inverted and standard QR codes
    });

    if (code && code.data) {
      handleProcessCode(code.data);
      return;
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  // Start Camera Stream with Wide Angle & Minimum Zoom constraints
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      setIsPermissionDenied(false);
      setScannerStatus('scanning');
      scannerStatusRef.current = 'scanning';

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // Constraints with natural 4:3 / 16:9 ratio and wide-angle preference
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        // Fallback to generic constraints if device is restrictive
        newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Inspect hardware capabilities of active video track
      const track = newStream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track as any).getCapabilities?.() || {};

        // 1. Zoom Management: Explicitly enforce minimum zoom (1.0 or wide-angle)
        if (capabilities.zoom) {
          const minZ = capabilities.zoom.min || 1;
          const maxZ = capabilities.zoom.max || 1;
          const stepZ = capabilities.zoom.step || 0.1;
          setZoomCapability({ min: minZ, max: maxZ, step: stepZ });
          setCurrentZoom(minZ);

          try {
            await (track as any).applyConstraints({
              advanced: [{ zoom: minZ }],
            });
          } catch (zoomErr) {
            console.warn('Could not apply minimum zoom constraint:', zoomErr);
          }
        } else {
          setZoomCapability(null);
          setCurrentZoom(1);
        }

        // 2. Autofocus: Enable continuous autofocus so barcodes are crystal sharp
        if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
          try {
            await (track as any).applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            });
          } catch (focusErr) {
            console.warn('Could not apply continuous autofocus:', focusErr);
          }
        }

        // 3. Torch/Flashlight support
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }

      // Start the scan loop
      animationFrameId.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      console.warn('Camera Access Notice:', err);
      setIsPermissionDenied(true);
      setScannerStatus('error');
      scannerStatusRef.current = 'error';
      setErrorMessage('تعذر فتح الكاميرا. يرجى التأكد من منح الإذن للكاميرا في المتصفح لمسح الباركود مباشرة.');
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

  // Handle Zoom change (for phones with zoom capability, allowing 1x / 2x adjustments)
  const handleZoomChange = async (targetZoom: number) => {
    if (!stream || !zoomCapability) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const clampedZoom = Math.max(zoomCapability.min, Math.min(targetZoom, zoomCapability.max));
    try {
      await (track as any).applyConstraints({
        advanced: [{ zoom: clampedZoom }],
      });
      setCurrentZoom(clampedZoom);
    } catch (err) {
      console.warn('Failed to set zoom level:', err);
    }
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
      scannerStatusRef.current = 'idle';
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
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                كاميرا تسجيل الحضور الذاتي
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
                className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                العودة لصفحتي الشخصية
              </button>
            </div>
          ) : (
            /* Live Camera Viewfinder (Wide Angle, Natural Aspect Ratio, Zero Artificial Zoom) */
            <div className="w-full flex flex-col items-center">
              
              <div className="relative w-full aspect-[4/3] max-h-[340px] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-800">
                
                {/* Live Video Element - Natural Fit Without Cropping */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Hidden processing canvas for analysis */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Frame Reticle Overlay - Spacious and balanced */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  <div className="w-52 h-52 sm:w-60 sm:h-60 border-2 border-emerald-400/90 rounded-2xl relative flex items-center justify-center shadow-lg">
                    
                    {/* Corner accents */}
                    <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></span>
                    <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></span>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></span>
                    <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></span>

                    {/* Laser Scanner Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-sm"></div>
                  </div>
                </div>

                {/* Wide Angle / Status Badge */}
                <div className="absolute top-2.5 right-2.5 bg-slate-950/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/15 flex items-center gap-1.5 shadow-xs">
                  <Scan className="w-3 h-3 text-emerald-400" />
                  <span>زاوية واسعة ({currentZoom ? `${currentZoom.toFixed(1)}x` : '1x'})</span>
                </div>

                {/* Processing Overlay */}
                {scannerStatus === 'processing' && (
                  <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-xs font-bold">جاري قراءة وتثبيت الرمز...</span>
                  </div>
                )}

              </div>

              {/* Error notice if any */}
              {errorMessage && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 animate-fadeIn w-full">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span className="font-semibold">{errorMessage}</span>
                  </div>
                  {isPermissionDenied && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex-shrink-0"
                    >
                      إعادة المحاولة
                    </button>
                  )}
                </div>
              )}

              {/* Guidance text */}
              <p className="text-[11px] text-slate-500 text-center mt-3 font-medium">
                وجه كاميرا هاتفك نحو باركود الحضور في شاشة المشرف ليتم التعرف عليه فوراً
              </p>

              {/* Camera Controls (Strictly Camera Only - No Image Upload) */}
              <div className="flex items-center justify-center gap-2 mt-3.5 w-full flex-wrap">
                
                {/* Switch Camera */}
                <button
                  type="button"
                  onClick={switchCamera}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="تبديل الكاميرا الخلفية / الأمامية"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تبديل الكاميرا</span>
                </button>

                {/* Torch Toggle (if supported) */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                      isTorchOn ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Flashlight className="w-3.5 h-3.5" />
                    <span>{isTorchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}</span>
                  </button>
                )}

                {/* Zoom Controls if phone hardware supports it */}
                {zoomCapability && zoomCapability.max > zoomCapability.min && (
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleZoomChange(zoomCapability.min)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        currentZoom <= zoomCapability.min + 0.1 
                          ? 'bg-white text-slate-900 shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="الزاوية العريضة الأصلية"
                    >
                      <ZoomOut className="w-3.5 h-3.5 inline mr-1" />
                      <span>1x عريض</span>
                    </button>
                    {zoomCapability.max >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleZoomChange(Math.min(2, zoomCapability.max))}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          currentZoom > zoomCapability.min + 0.5 
                            ? 'bg-white text-slate-900 shadow-xs' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="تكبير 2x"
                      >
                        <ZoomIn className="w-3.5 h-3.5 inline mr-1" />
                        <span>2x</span>
                      </button>
                    )}
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
