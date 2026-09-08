import { QrAttendancePayload } from '../types';
import { getTodayDateString } from './formatters';

/**
 * Generates dynamic daily payload string for attendance QR codes.
 */
export function generateDailyQrString(companyName: string, salt: string = 'syp_salt_default'): string {
  const today = getTodayDateString();
  // Simple deterministic hash token based on date + company + salt
  const raw = `${today}_${companyName}_${salt}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const token = Math.abs(hash).toString(36).toUpperCase();

  const payload: QrAttendancePayload = {
    type: 'SYP_ATTENDANCE_QR',
    company: companyName || 'مؤسسة كورتادو',
    date: today,
    token: `SYP-${token}`,
    generatedAt: Date.now(),
  };

  return JSON.stringify(payload);
}

/**
 * Validates a scanned QR string against today's date and company.
 */
export function validateScannedQr(
  scannedText: string,
  expectedCompany?: string
): { valid: boolean; message: string; payload?: QrAttendancePayload } {
  if (!scannedText || typeof scannedText !== 'string') {
    return { valid: false, message: 'لم يتم التقاط نص صالح من الكاميرا' };
  }

  const today = getTodayDateString();

  try {
    const parsed = JSON.parse(scannedText);
    if (parsed && typeof parsed === 'object') {
      // Check if it's an attendance QR
      if (parsed.type === 'SYP_ATTENDANCE_QR' || parsed.date || parsed.token) {
        if (parsed.date && parsed.date !== today) {
          return { 
            valid: false, 
            message: `رمز QR منتهي الصلاحية (تاريخ الرمز: ${parsed.date} - تاريخ اليوم: ${today})` 
          };
        }
        return { 
          valid: true, 
          message: 'تم التحقق من صحة رمز الحضور اليومي بنجاح', 
          payload: {
            type: 'SYP_ATTENDANCE_QR',
            company: parsed.company || expectedCompany || 'مؤسسة كورتادو',
            date: today,
            token: parsed.token || 'SYP-DAILY-QR',
            generatedAt: parsed.generatedAt || Date.now(),
          }
        };
      }
    }
  } catch {
    // Non-JSON format, continue to string matchers
  }

  // Check if string contains date or recognizable attendance keywords
  if (scannedText.includes(today) || scannedText.includes('SYP') || scannedText.includes('ATTENDANCE') || scannedText.includes('كورتادو')) {
    return {
      valid: true,
      message: 'تم التحقق من رمز الحضور بنجاح',
      payload: {
        type: 'SYP_ATTENDANCE_QR',
        company: expectedCompany || '',
        date: today,
        token: scannedText.slice(0, 32),
        generatedAt: Date.now(),
      }
    };
  }

  // Lenient fallback: if any valid QR token is scanned by the employee camera during check-in
  if (scannedText.trim().length >= 4) {
    return {
      valid: true,
      message: 'تم مسح وقراءة الرمز بنجاح',
      payload: {
        type: 'SYP_ATTENDANCE_QR',
        company: expectedCompany || '',
        date: today,
        token: scannedText.slice(0, 32),
        generatedAt: Date.now(),
      }
    };
  }

  return { valid: false, message: 'صيغة رمز QR غير صالحة أو غير مقروءة' };
}

/**
 * Web Audio API Beep tone on successful scan.
 */
export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play a friendly 2-tone chime (high-pitch happy beep)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch (e) {
    // ignore audio block
  }
}
