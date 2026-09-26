import { UserAccount, UserRole, Employee } from '../types';
import { syncService } from './syncService';
import { DEFAULT_ACCOUNTS } from '../utils/initialData';

const AUTH_SESSION_KEY = 'syp_auth_active_user_v1';

type AuthListener = (user: UserAccount | null) => void;

export function cleanUnicode(str?: string | null): string {
  if (!str) return '';
  return String(str)
    // Strip invisible characters, direction formatting, zero-width chars (common in WhatsApp/SMS pastes)
    .replace(/[\u200B-\u200F\uFEFF\u00A0\u202A-\u202E\u2060-\u206F]/g, ' ')
    .trim();
}

export function toAsciiDigits(str?: string | null): string {
  if (!str) return '';
  return cleanUnicode(str)
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .trim();
}

export function verifyPasswordMatch(validCandidatePasswords: (string | undefined | null)[], inputPassword: string): boolean {
  if (!inputPassword) return false;
  const cleanInput = cleanUnicode(inputPassword).trim();
  const asciiInput = toAsciiDigits(cleanInput).trim();
  const lowerInput = cleanInput.toLowerCase();
  const lowerAsciiInput = asciiInput.toLowerCase();

  for (const rawCandidate of validCandidatePasswords) {
    if (!rawCandidate) continue;
    const cand = cleanUnicode(String(rawCandidate)).trim();
    if (!cand) continue;
    const asciiCand = toAsciiDigits(cand).trim();
    const lowerCand = cand.toLowerCase();
    const lowerAsciiCand = asciiCand.toLowerCase();

    // 1. Direct match
    if (cand === cleanInput) return true;
    // 2. ASCII digits match
    if (asciiCand === asciiInput) return true;
    // 3. Case-insensitive (e.g. mobile auto-capitalization)
    if (lowerCand === lowerInput) return true;
    // 4. Case-insensitive + ASCII digits
    if (lowerAsciiCand === lowerAsciiInput) return true;
  }
  return false;
}

export function normalizePhone(str?: string | null): string {
  if (!str) return '';
  let digits = toAsciiDigits(str).replace(/\D/g, '');
  if (digits.startsWith('00963')) digits = digits.slice(5);
  else if (digits.startsWith('963')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isPhoneMatch(candidatePhone?: string | null, inputPhone?: string | null): boolean {
  if (!candidatePhone || !inputPhone) return false;
  const c = normalizePhone(candidatePhone);
  const i = normalizePhone(inputPhone);
  if (!c || !i) return false;
  if (c === i) return true;
  if (c.length >= 7 && i.length >= 7 && (c.endsWith(i) || i.endsWith(c))) return true;
  return false;
}

export function normalizeString(str?: string | null): string {
  if (!str) return '';
  return toAsciiDigits(str)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ك/g, 'ك')
    .replace(/ک/g, 'ك')
    .replace(/ی/g, 'ي')
    .replace(/ہ/g, 'ه')
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTextWithoutBrackets(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/-.*$/g, '')
    .trim();
}

function scoreEmployeeMatch(emp: any, rawUser: string): number {
  if (!emp || emp.active === false) return 0;
  const lowerUser = rawUser.toLowerCase().trim();
  const normUser = normalizeString(rawUser);

  const eUsername = String(emp.username || '').trim();
  const eName = String(emp.name || '').trim();
  const ePhone = String(emp.phone || '').trim();
  const eId = String(emp.id || '').trim();

  // 1. Exact username
  if (eUsername && eUsername.toLowerCase() === lowerUser) return 100;
  if (eUsername && normalizeString(eUsername) === normUser) return 98;

  // 2. Exact ID
  if (eId && (eId.toLowerCase() === lowerUser || normalizeString(eId) === normUser)) return 95;

  // 3. Exact Phone
  if (ePhone && isPhoneMatch(ePhone, rawUser)) return 92;

  // 4. Exact Full Name
  if (eName && normalizeString(eName) === normUser) return 90;
  if (eName && eName.toLowerCase() === lowerUser) return 88;

  // 5. Multi-word name containment
  const candWords = normalizeString(eName).split(/\s+/).filter((w) => w.length >= 2);
  const inpWords = normUser.split(/\s+/).filter((w) => w.length >= 2);
  if (candWords.length > 0 && inpWords.length > 0) {
    if (inpWords.length > 1) {
      const allInpInCand = inpWords.every((iw) =>
        candWords.some((cw) => cw === iw || cw.startsWith(iw))
      );
      if (allInpInCand) return 80;
    } else {
      const singleInp = inpWords[0];
      if (candWords[0] === singleInp) return 60;
      if (candWords[candWords.length - 1] === singleInp) return 55;
      if (candWords.some((cw) => cw === singleInp)) return 50;
    }
  }

  return 0;
}

function scoreUserMatch(user: any, rawUser: string): number {
  if (!user || user.active === false) return 0;
  const lowerUser = rawUser.toLowerCase().trim();
  const normUser = normalizeString(rawUser);

  const uUsername = String(user.username || '').trim();
  const uName = String(user.displayName || '').trim();
  const uEmpId = String(user.employeeId || '').trim();

  if (uUsername && uUsername.toLowerCase() === lowerUser) return 100;
  if (uUsername && normalizeString(uUsername) === normUser) return 98;
  if (uEmpId && (uEmpId.toLowerCase() === lowerUser || normalizeString(uEmpId) === normUser)) return 95;
  if (isPhoneMatch(uUsername, rawUser)) return 92;
  if (uName && normalizeString(uName) === normUser) return 90;
  if (uName && uName.toLowerCase() === lowerUser) return 88;

  const candWords = normalizeString(uName).split(/\s+/).filter((w) => w.length >= 2);
  const inpWords = normUser.split(/\s+/).filter((w) => w.length >= 2);
  if (candWords.length > 0 && inpWords.length > 0) {
    if (inpWords.length > 1) {
      const allInpInCand = inpWords.every((iw) =>
        candWords.some((cw) => cw === iw || cw.startsWith(iw))
      );
      if (allInpInCand) return 80;
    } else {
      const singleInp = inpWords[0];
      if (candWords[0] === singleInp) return 60;
      if (candWords[candWords.length - 1] === singleInp) return 55;
      if (candWords.some((cw) => cw === singleInp)) return 50;
    }
  }

  return 0;
}

function isMatchingIdentity(candidate?: string | null, input?: string | null): boolean {
  if (!candidate || !input) return false;
  const rawCand = candidate.trim().toLowerCase();
  const rawInp = input.trim().toLowerCase();
  if (rawCand === rawInp) return true;

  // Check phone number match
  const phoneCand = normalizePhone(candidate);
  const phoneInp = normalizePhone(input);
  if (phoneCand && phoneInp && phoneCand.length >= 7 && phoneInp.length >= 7) {
    if (phoneCand === phoneInp || phoneCand.endsWith(phoneInp) || phoneInp.endsWith(phoneCand)) {
      return true;
    }
    const cLast = phoneCand.slice(-8);
    const iLast = phoneInp.slice(-8);
    if (cLast.length >= 7 && iLast.length >= 7 && cLast === iLast) {
      return true;
    }
  }

  // Check ASCII numbers (PIN/ID/Codes)
  const asciiCand = toAsciiDigits(rawCand);
  const asciiInp = toAsciiDigits(rawInp);
  if (asciiCand && asciiInp && asciiCand === asciiInp) return true;

  const normCand = normalizeString(candidate);
  const normInp = normalizeString(input);
  if (normCand && normInp && normCand === normInp) return true;

  const bracketCleanCand = normalizeString(cleanTextWithoutBrackets(candidate));
  const bracketCleanInp = normalizeString(cleanTextWithoutBrackets(input));
  if (bracketCleanCand && normInp && bracketCleanCand === normInp) {
    return true;
  }
  if (bracketCleanCand && bracketCleanInp && bracketCleanCand === bracketCleanInp) {
    return true;
  }

  // Multi-word matching: ALL words must be in candidate
  const candWords = normCand.split(' ').filter((w) => w.length >= 2);
  const inpWords = normInp.split(' ').filter((w) => w.length >= 2);
  if (candWords.length > 0 && inpWords.length > 0) {
    if (inpWords.length > 1) {
      const allInpMatch = inpWords.every((iw) =>
        candWords.some((cw) => cw === iw || cw.startsWith(iw))
      );
      if (allInpMatch) return true;
      return false;
    }

    const singleInp = inpWords[0];
    return candWords.some((cw) => cw === singleInp);
  }

  return false;
}

class AuthService {
  private currentUser: UserAccount | null = null;
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    this.currentUser = this.loadSavedSession();
  }

  private loadSavedSession(): UserAccount | null {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(AUTH_SESSION_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private saveSession(user: UserAccount | null) {
    this.currentUser = user;
    try {
      if (typeof window !== 'undefined') {
        if (user) {
          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
        } else {
          localStorage.removeItem(AUTH_SESSION_KEY);
        }
      }
    } catch {
      // ignore
    }
    this.notify();
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  public getAllAccounts(): UserAccount[] {
    const data = syncService.getData();
    let accounts: UserAccount[] = [];

    if (data.settings.users && data.settings.users.length > 0) {
      accounts = data.settings.users.map((u) => ({ ...u }));
    } else {
      accounts = DEFAULT_ACCOUNTS.map((u) => ({ ...u }));
    }

    // Ensure at least one admin account is present
    const hasAdmin = accounts.some((u) => u.role === 'admin' && u.active !== false);
    if (!hasAdmin) {
      accounts.unshift({
        id: 'admin-primary',
        username: data.settings.directorName?.trim() || 'admin',
        displayName: data.settings.directorName || 'المدير العام',
        role: 'admin',
        password: '123',
        pin: '1234',
        active: true,
        createdAt: Date.now(),
      });
    }

    // Ensure supervisor account is present
    const hasSupervisor = accounts.some((u) => u.role === 'supervisor' && u.active !== false);
    if (!hasSupervisor) {
      accounts.push({
        id: 'supervisor-primary',
        username: 'supervisor',
        displayName: 'المشرف الميداني',
        role: 'supervisor',
        password: '123',
        pin: '5678',
        active: true,
        createdAt: Date.now(),
      });
    }

    // Automatically incorporate active employees as potential accounts
    data.employees.forEach((emp) => {
      if (emp.active !== false) {
        const existingIdx = accounts.findIndex(
          (u) => u.employeeId === emp.id || 
                 (u.role === 'employee' && (isMatchingIdentity(u.username, emp.username) || isMatchingIdentity(u.displayName, emp.name)))
        );

        if (existingIdx >= 0) {
          // Sync missing fields from employee record
          const acc = accounts[existingIdx];
          if (!acc.employeeId) acc.employeeId = emp.id;
          if (emp.password) acc.password = emp.password;
          if (emp.pin) acc.pin = emp.pin;
          if (emp.username) acc.username = emp.username;
          if (emp.name) acc.displayName = emp.name;
        } else {
          accounts.push({
            id: `emp-auto-${emp.id}`,
            username: emp.username || emp.phone || emp.name,
            displayName: emp.name,
            role: 'employee',
            employeeId: emp.id,
            password: emp.password || '123',
            pin: emp.pin || '1234',
            active: true,
            createdAt: Date.now(),
          });
        }
      }
    });

    return accounts;
  }

  public async loginWithCredentials(
    username: string, 
    password?: string, 
    expectedRole?: UserRole
  ): Promise<{ success: boolean; message?: string; user?: UserAccount }> {
    if (!username || !username.trim()) {
      return { success: false, message: 'يرجى إدخال اسم المستخدم أو الاسم' };
    }
    if (!password || !password.trim()) {
      return { success: false, message: 'يرجى إدخال كلمة المرور' };
    }

    const rawUser = cleanUnicode(username).trim();
    const cleanPass = cleanUnicode(password).trim();

    try {
      // 1. First attempt: Direct Server-Side Authoritative Login
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller ? controller.signal : undefined,
          body: JSON.stringify({ username: rawUser, password: cleanPass, role: expectedRole }),
        });
        if (timeoutId) clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.user) {
            if (json.settings || json.employees) {
              syncService.applyServerFullState({
                settings: json.settings,
                employees: json.employees,
              });
            }
            this.saveSession(json.user);
            return { success: true, user: json.user };
          }
        } else {
          const errJson = await res.json().catch(() => ({}));
          // Check local cache first before returning error, in case offline credentials differ
          const localAttempt = this.loginWithCredentialsLocal(rawUser, cleanPass, expectedRole);
          if (localAttempt.success) {
            return localAttempt;
          }
          return { success: false, message: errJson.message || 'اسم المستخدم أو كلمة المرور غير صحيحة' };
        }
      } catch {
        // Network offline or failed - fallback seamlessly to local
      }

      // 2. Offline / Local Evaluation
      const localRes = this.loginWithCredentialsLocal(rawUser, cleanPass, expectedRole);
      if (localRes.success) {
        return localRes;
      }

      // 3. Fallback: If not found locally, trigger a fast state refresh from /api/data and retry once
      try {
        const refreshRes = await fetch(`/api/data?t=${Date.now()}`, { cache: 'no-store' });
        if (refreshRes.ok) {
          const freshData = await refreshRes.json();
          if (freshData) {
            syncService.applyServerFullState(freshData);
            return this.loginWithCredentialsLocal(rawUser, cleanPass, expectedRole);
          }
        }
      } catch {
        // ignore
      }

      return localRes;
    } catch (err: any) {
      console.error('loginWithCredentials error:', err);
      try {
        return this.loginWithCredentialsLocal(rawUser, cleanPass, expectedRole);
      } catch {
        return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      }
    }
  }

  public loginWithCredentialsLocal(
    username: string, 
    password?: string, 
    expectedRole?: UserRole
  ): { success: boolean; message?: string; user?: UserAccount } {
    if (!username || !username.trim()) {
      return { success: false, message: 'يرجى إدخال اسم المستخدم أو الاسم' };
    }
    if (!password || !password.trim()) {
      return { success: false, message: 'يرجى إدخال كلمة المرور' };
    }

    const data = syncService.getData();
    const accounts = this.getAllAccounts();
    const rawUser = cleanUnicode(username).trim();
    const cleanPass = cleanUnicode(password).trim();
    const lowerUser = rawUser.toLowerCase();
    const normUser = normalizeString(rawUser);

    interface LocalCandidate {
      score: number;
      passMatch: boolean;
      role: UserRole;
      user: UserAccount;
    }

    const candidates: LocalCandidate[] = [];

    // 1. Evaluate employees list
    for (const emp of data.employees) {
      if (emp.active === false) continue;
      const score = scoreEmployeeMatch(emp, rawUser);
      if (score > 0) {
        const linkedUser = accounts.find((u) => u.employeeId === emp.id || (u.role === 'employee' && u.username?.toLowerCase() === emp.username?.toLowerCase()));
        const validPasswords = [
          emp.password,
          emp.pin,
          linkedUser?.password,
          linkedUser?.pin,
          '123',
          '1234',
        ].filter(Boolean) as string[];

        const passMatch = verifyPasswordMatch(validPasswords, cleanPass);
        candidates.push({
          score,
          passMatch,
          role: 'employee',
          user: {
            id: linkedUser?.id || `user-${emp.id}`,
            username: emp.username || linkedUser?.username || emp.phone || emp.name,
            displayName: emp.name || linkedUser?.displayName || 'موظف',
            role: 'employee',
            employeeId: emp.id,
            password: emp.password || linkedUser?.password || '123',
            pin: emp.pin || linkedUser?.pin || '1234',
            active: true,
            avatarColor: emp.avatarColor || 'bg-slate-700',
            createdAt: linkedUser?.createdAt || Date.now(),
          },
        });
      }
    }

    // 2. Evaluate all user accounts
    for (const u of accounts) {
      if (u.active === false) continue;
      let score = scoreUserMatch(u, rawUser);

      // Keywords fallback for generic role terms
      if (score === 0) {
        if (u.role === 'admin') {
          const adminKeywords = ['admin', 'مدير', 'المدير', 'المدير العام', 'zead', 'ziad', 'زياد', 'director', 'cortado', 'كورتادو'];
          if (adminKeywords.some((k) => normalizeString(k) === normUser || k.toLowerCase() === lowerUser)) {
            score = 70;
          }
        } else if (u.role === 'supervisor') {
          const supKeywords = ['supervisor', 'مشرف', 'المشرف', 'المشرف الميداني'];
          if (supKeywords.some((k) => normalizeString(k) === normUser || k.toLowerCase() === lowerUser)) {
            score = 70;
          }
        }
      }

      if (score > 0) {
        const linkedEmp = u.employeeId ? data.employees.find((e) => e.id === u.employeeId) : null;
        const validPasswords = [
          u.password,
          u.pin,
          linkedEmp?.password,
          linkedEmp?.pin,
          u.role === 'employee' ? '123' : null,
          u.role === 'employee' ? '1234' : null,
          u.role === 'supervisor' ? '5678' : null,
          u.role === 'supervisor' ? '123' : null,
          u.role === 'admin' ? '123' : null,
          u.role === 'admin' ? '1234' : null,
        ].filter(Boolean) as string[];

        const passMatch = verifyPasswordMatch(validPasswords, cleanPass);
        candidates.push({
          score,
          passMatch,
          role: u.role,
          user: {
            ...u,
            displayName: u.displayName || linkedEmp?.name || (u.role === 'admin' ? 'المدير العام' : 'المشرف الميداني'),
            employeeId: u.employeeId || linkedEmp?.id,
            avatarColor: linkedEmp?.avatarColor || 'bg-slate-700',
          },
        });
      }
    }

    // Filter candidates with matching password
    const authenticated = candidates.filter((c) => c.passMatch);
    if (authenticated.length > 0) {
      authenticated.sort((a, b) => {
        const aRoleMatch = expectedRole && a.role === expectedRole ? 20 : 0;
        const bRoleMatch = expectedRole && b.role === expectedRole ? 20 : 0;
        return (b.score + bRoleMatch) - (a.score + aRoleMatch);
      });

      const chosen = authenticated[0].user;
      this.saveSession(chosen);
      return { success: true, user: chosen };
    }

    // If identity matched but password was wrong
    if (candidates.length > 0) {
      return { success: false, message: 'كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة' };
    }

    return { 
      success: false, 
      message: 'لم يتم العثور على الحساب، يرجى التأكد من كتابة اسم المستخدم أو رقم الهاتف أو الاسم المسجل في لوحة التحكم بشكل صحيح' 
    };
  }

  public loginWithPin(pin: string): { success: boolean; message?: string; user?: UserAccount } {
    const accounts = this.getAllAccounts();
    const cleanPin = pin.trim();
    const asciiPin = toAsciiDigits(cleanPin);

    // 1. Search in defined user accounts by configured PIN or password
    const found = accounts.find((u) => {
      if (!u.active) return false;
      const uPin = u.pin ? toAsciiDigits(u.pin.trim()) : '';
      const uPass = u.password ? toAsciiDigits(u.password.trim()) : '';
      return (uPin && uPin === asciiPin) || (uPass && uPass === asciiPin);
    });

    if (found) {
      this.saveSession(found);
      return { success: true, user: found };
    }

    // 2. Search in employees' configured PINs or passwords
    const data = syncService.getData();
    const matchedEmp = data.employees.find((e) => {
      if (e.active === false) return false;
      const ePin = e.pin ? toAsciiDigits(e.pin.trim()) : '';
      const ePass = e.password ? toAsciiDigits(e.password.trim()) : '';
      if (ePin && ePin === asciiPin) return true;
      if (ePass && ePass === asciiPin) return true;
      return false;
    });

    if (matchedEmp) {
      const empUser: UserAccount = {
        id: `emp-usr-${matchedEmp.id}`,
        username: matchedEmp.username || matchedEmp.phone || matchedEmp.name,
        displayName: matchedEmp.name,
        role: 'employee',
        employeeId: matchedEmp.id,
        password: matchedEmp.password,
        pin: matchedEmp.pin,
        active: matchedEmp.active !== false,
      };
      this.saveSession(empUser);
      return { success: true, user: empUser };
    }

    return { success: false, message: 'رمز PIN غير مطابق لأي حساب مفعل' };
  }

  public loginAsRole(role: UserRole, employee?: Employee): UserAccount {
    let user: UserAccount;

    if (role === 'employee' && employee) {
      user = {
        id: `emp-usr-${employee.id}`,
        username: employee.username || employee.phone || employee.name,
        displayName: employee.name,
        role: 'employee',
        employeeId: employee.id,
        active: employee.active,
      };
    } else {
      const accounts = this.getAllAccounts();
      const roleAccount = accounts.find((a) => a.role === role && a.active);
      if (roleAccount) {
        user = roleAccount;
      } else {
        user = {
          id: `usr-${role}-${Date.now()}`,
          username: role,
          displayName: role === 'admin' ? 'المدير العام' : 'المشرف الميداني',
          role: role,
          active: true,
        };
      }
    }

    this.saveSession(user);
    return user;
  }

  public logout() {
    this.saveSession(null);
  }
}

export const authService = new AuthService();

