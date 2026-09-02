import { UserAccount, UserRole, Employee } from '../types';
import { syncService } from './syncService';
import { DEFAULT_ACCOUNTS } from '../utils/initialData';

const AUTH_SESSION_KEY = 'syp_auth_active_user_v1';

type AuthListener = (user: UserAccount | null) => void;

function normalizeString(str?: string | null): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
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
          if (!acc.password && emp.password) acc.password = emp.password;
          if (!acc.pin && emp.pin) acc.pin = emp.pin;
        } else {
          accounts.push({
            id: `emp-auto-${emp.id}`,
            username: emp.username || emp.name,
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

  public loginWithCredentials(
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
        return (
          isMatchingIdentity(u.username, rawUser) ||
          isMatchingIdentity(u.displayName, rawUser) ||
          (u.employeeId && isMatchingIdentity(u.employeeId, rawUser))
        );
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
            username: matchedEmp.username || matchedEmp.name,
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
      const supervisorKeywords = ['supervisor', 'مشرف', 'المشرف', 'المشرف الميداني'];
      const isKeyword = supervisorKeywords.some((k) => isMatchingIdentity(k, rawUser));

      found = accounts.find((u) => {
        if (u.role !== 'supervisor' || u.active === false) return false;
        return isKeyword || isMatchingIdentity(u.username, rawUser) || isMatchingIdentity(u.displayName, rawUser);
      });

      if (!found && isKeyword) {
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
      const adminKeywords = ['admin', 'مدير', 'المدير', 'المدير العام', 'zead', 'ziad', 'زياد', 'director', 'cortado', 'كورتادو'];
      const isKeyword = adminKeywords.some((k) => isMatchingIdentity(k, rawUser)) ||
                        isMatchingIdentity(data.settings.directorName, rawUser);

      found = accounts.find((u) => {
        if (u.role !== 'admin' || u.active === false) return false;
        return isKeyword || isMatchingIdentity(u.username, rawUser) || isMatchingIdentity(u.displayName, rawUser);
      });

      if (!found && isKeyword) {
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
      // If role is employee, link with actual employee record if employeeId is missing
      if (found.role === 'employee' && !found.employeeId) {
        const linked = data.employees.find((e) => 
          isMatchingIdentity(e.username, found?.username) ||
          isMatchingIdentity(e.name, found?.displayName)
        );
        if (linked) {
          found.employeeId = linked.id;
          if (!found.password && linked.password) found.password = linked.password;
          if (!found.pin && linked.pin) found.pin = linked.pin;
        }
      }

      // Check passwords:
      // - Account password
      // - Account pin
      // - Linked employee password/pin
      // - Default '123'
      // - Default '1234'
      const validPasswords: string[] = [
        found.password,
        found.pin,
        '123',
        '1234',
      ].filter(Boolean) as string[];

      if (found.employeeId) {
        const emp = data.employees.find((e) => e.id === found?.employeeId);
        if (emp) {
          if (emp.password) validPasswords.push(emp.password);
          if (emp.pin) validPasswords.push(emp.pin);
          if (emp.phone && emp.phone.length >= 4) validPasswords.push(emp.phone.slice(-4));
          if (emp.phone) validPasswords.push(emp.phone);
        }
      }

      const isPasswordMatch = validPasswords.some((p) => p.trim() === cleanPass);

      if (!isPasswordMatch) {
        return { success: false, message: 'كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مجدداً' };
      }

      this.saveSession(found);
      return { success: true, user: found };
    }

    return { 
      success: false, 
      message: 'اسم المستخدم غير موجود أو غير مفعل' 
    };
  }

  public loginWithPin(pin: string): { success: boolean; message?: string; user?: UserAccount } {
    const accounts = this.getAllAccounts();
    const cleanPin = pin.trim();

    // 1. Search in defined user accounts
    const found = accounts.find((u) => (u.pin === cleanPin || u.password === cleanPin) && u.active);
    if (found) {
      this.saveSession(found);
      return { success: true, user: found };
    }

    // 2. Search in employees' custom PINs or last 4 digits of phone
    const data = syncService.getData();
    const matchedEmp = data.employees.find((e) => {
      if (e.pin && e.pin === cleanPin) return true;
      if (e.password && e.password === cleanPin) return true;
      if (e.phone && e.phone.slice(-4) === cleanPin) return true;
      return false;
    });

    if (matchedEmp) {
      const empUser: UserAccount = {
        id: `emp-usr-${matchedEmp.id}`,
        username: matchedEmp.username || matchedEmp.phone || matchedEmp.name,
        displayName: matchedEmp.name,
        role: 'employee',
        employeeId: matchedEmp.id,
        active: matchedEmp.active,
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

