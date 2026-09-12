import { UserAccount, UserRole, Employee } from '../types';
import { syncService } from './syncService';
import { DEFAULT_ACCOUNTS } from '../utils/initialData';

const AUTH_SESSION_KEY = 'syp_auth_active_user_v1';

type AuthListener = (user: UserAccount | null) => void;

function toAsciiDigits(str?: string | null): string {
  if (!str) return '';
  return String(str)
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

function normalizePhone(str?: string | null): string {
  if (!str) return '';
  const digits = toAsciiDigits(str).replace(/\D/g, '');
  if (digits.startsWith('00963')) return '0' + digits.slice(5);
  if (digits.startsWith('963')) return '0' + digits.slice(3);
  return digits;
}

function normalizeString(str?: string | null): string {
  if (!str) return '';
  return toAsciiDigits(str)
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
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
  if (bracketCleanCand && normInp && (bracketCleanCand === normInp || bracketCleanCand.includes(normInp) || normInp.includes(bracketCleanCand))) {
    return true;
  }
  if (bracketCleanCand && bracketCleanInp && bracketCleanCand === bracketCleanInp) {
    return true;
  }

  // Check prefix or first word (e.g. "Ahmed" matches "Ahmed (مستودع)" or "Ahmed Ali")
  const firstWordCand = normCand.split(' ')[0];
  const firstWordInp = normInp.split(' ')[0];
  if (firstWordCand && firstWordInp && firstWordCand === firstWordInp && firstWordInp.length >= 3) {
    return true;
  }

  if (normCand.includes(normInp) || normInp.includes(normCand)) {
    return true;
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

    const rawUser = username.trim();
    const cleanPass = password.trim();

    // 1. First attempt: Direct Server-Side Authoritative Login
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;

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
      } else if (res.status === 401) {
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
    const rawUser = username.trim();
    const cleanPass = password.trim();

    let found: UserAccount | undefined;

    // 1. If role is EMPLOYEE: Check both accounts and employees list with smart matching
    if (expectedRole === 'employee') {
      // Check in user accounts first
      found = accounts.find((u) => {
        if (u.role !== 'employee' || u.active === false) return false;
        if (isMatchingIdentity(u.username, rawUser) || isMatchingIdentity(u.displayName, rawUser)) return true;
        if (u.employeeId && isMatchingIdentity(u.employeeId, rawUser)) return true;
        if (u.employeeId) {
          const emp = data.employees.find((e) => e.id === u.employeeId);
          if (emp && (isMatchingIdentity(emp.name, rawUser) || (emp.phone && isMatchingIdentity(emp.phone, rawUser)))) {
            return true;
          }
        }
        return false;
      });

      // If not found in accounts, check directly in employees collection
      if (!found) {
        const matchedEmp = data.employees.find((e) => {
          if (e.active === false) return false;
          return (
            isMatchingIdentity(e.username, rawUser) ||
            isMatchingIdentity(e.name, rawUser) ||
            (e.phone && isMatchingIdentity(e.phone, rawUser)) ||
            (e.id && isMatchingIdentity(e.id, rawUser))
          );
        });

        if (matchedEmp) {
          found = {
            id: `emp-usr-${matchedEmp.id}`,
            username: matchedEmp.username || matchedEmp.phone || matchedEmp.name,
            displayName: matchedEmp.name,
            role: 'employee',
            employeeId: matchedEmp.id,
            password: matchedEmp.password || '123',
            pin: matchedEmp.pin || '1234',
            active: matchedEmp.active !== false,
          };
        }
      }
    } 
    // 2. If role is SUPERVISOR
    else if (expectedRole === 'supervisor') {
      // First try exact username/display match
      found = accounts.find((u) => {
        if (u.role !== 'supervisor' || u.active === false) return false;
        return isMatchingIdentity(u.username, rawUser) || isMatchingIdentity(u.displayName, rawUser);
      });

      if (!found) {
        const supervisorKeywords = ['supervisor', 'مشرف', 'المشرف', 'المشرف الميداني'];
        const isKeyword = supervisorKeywords.some((k) => isMatchingIdentity(k, rawUser));
        if (isKeyword) {
          found = accounts.find((u) => u.role === 'supervisor' && u.active !== false);
        }
      }

      if (!found) {
        found = {
          id: 'supervisor-primary',
          username: 'supervisor',
          displayName: 'المشرف الميداني',
          role: 'supervisor',
          password: '123',
          pin: '5678',
          active: true,
          createdAt: Date.now(),
        };
      }
    }
    // 3. If role is ADMIN
    else if (expectedRole === 'admin') {
      // First try exact username/display match
      found = accounts.find((u) => {
        if (u.role !== 'admin' || u.active === false) return false;
        return isMatchingIdentity(u.username, rawUser) || isMatchingIdentity(u.displayName, rawUser);
      });

      if (!found) {
        const adminKeywords = ['admin', 'مدير', 'المدير', 'المدير العام', 'zead', 'ziad', 'زياد', 'director', 'cortado', 'كورتادو'];
        const isKeyword = adminKeywords.some((k) => isMatchingIdentity(k, rawUser)) ||
                          isMatchingIdentity(data.settings.directorName, rawUser);
        if (isKeyword) {
          found = accounts.find((u) => u.role === 'admin' && u.active !== false);
        }
      }

      if (!found) {
        found = {
          id: 'admin-primary',
          username: data.settings.directorName || 'admin',
          displayName: data.settings.directorName || 'المدير العام',
          role: 'admin',
          password: '123',
          pin: '1234',
          active: true,
          createdAt: Date.now(),
        };
      }
    }
    // 4. Any Role (Generic fallback)
    else {
      found = accounts.find((u) => {
        if (u.active === false) return false;
        return isMatchingIdentity(u.username, rawUser) || isMatchingIdentity(u.displayName, rawUser);
      });
    }

    if (found) {
      // Keep credentials in sync with employee record if linked
      if (found.role === 'employee' && found.employeeId) {
        const emp = data.employees.find((e) => e.id === found?.employeeId);
        if (emp) {
          if (emp.password) found.password = emp.password;
          if (emp.pin) found.pin = emp.pin;
          if (emp.username) found.username = emp.username;
        }
      }

      // Collect ONLY the user's actual configured passwords and PINs
      const validPasswords: string[] = [];
      if (found.password && found.password.trim()) {
        validPasswords.push(found.password.trim());
      }
      if (found.pin && found.pin.trim()) {
        validPasswords.push(found.pin.trim());
      }

      if (found.employeeId) {
        const emp = data.employees.find((e) => e.id === found?.employeeId);
        if (emp) {
          if (emp.password && emp.password.trim() && !validPasswords.includes(emp.password.trim())) {
            validPasswords.push(emp.password.trim());
          }
          if (emp.pin && emp.pin.trim() && !validPasswords.includes(emp.pin.trim())) {
            validPasswords.push(emp.pin.trim());
          }
        }
      }

      // If absolutely no password or PIN was configured at all, allow initial default '123'
      if (validPasswords.length === 0) {
        validPasswords.push('123');
      }

      const asciiCleanPass = toAsciiDigits(cleanPass);
      const isPasswordMatch = validPasswords.some((p) => {
        if (!p) return false;
        const pTrim = p.trim();
        const asciiPTrim = toAsciiDigits(pTrim);

        // 1. Exact match
        if (pTrim === cleanPass) return true;
        // 2. ASCII digits match (e.g. 123 vs ١٢٣)
        if (asciiPTrim === asciiCleanPass) return true;
        // 3. Case-insensitive match (crucial for mobile auto-capitalization e.g. "Pass123" vs "pass123")
        if (pTrim.toLowerCase() === cleanPass.toLowerCase()) return true;
        // 4. Case-insensitive + ASCII digits
        if (asciiPTrim.toLowerCase() === asciiCleanPass.toLowerCase()) return true;

        return false;
      });

      if (!isPasswordMatch) {
        return { success: false, message: 'كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة' };
      }

      this.saveSession(found);
      return { success: true, user: found };
    }

    return { 
      success: false, 
      message: 'لم يتم العثور على الحساب، يرجى التأكد من كتابة الاسم أو الرقم المسجل' 
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

