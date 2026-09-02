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
    .replace(/\s+/g, ' ');
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
      accounts = [...data.settings.users];
    } else {
      accounts = [...DEFAULT_ACCOUNTS];
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

    // Automatically incorporate active employees as potential accounts if not already present
    data.employees.forEach((emp) => {
      if (emp.active !== false) {
        const hasAccount = accounts.some(
          (u) => u.employeeId === emp.id || (u.role === 'employee' && normalizeString(u.username) === normalizeString(emp.username || emp.name))
        );
        if (!hasAccount) {
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
    const cleanUser = normalizeString(rawUser);
    const cleanPass = password.trim();
    const directorClean = normalizeString(data.settings.directorName);

    // 1. Search in defined UserAccounts
    let found = accounts.find((u) => {
      if (u.active === false) return false;
      
      const uUser = normalizeString(u.username);
      const uDisplay = normalizeString(u.displayName);
      const rawMatch = (u.username || '').trim().toLowerCase() === rawUser.toLowerCase() || (u.displayName || '').trim().toLowerCase() === rawUser.toLowerCase();
      const normMatch = uUser === cleanUser || uDisplay === cleanUser;
      const matchDirector = u.role === 'admin' && directorClean && (directorClean === cleanUser || cleanUser.includes(directorClean) || directorClean.includes(cleanUser));

      return rawMatch || normMatch || matchDirector;
    });

    // 2. Admin special fallbacks (words like "admin", "مدير", etc.)
    if (!found && expectedRole === 'admin') {
      const adminKeywords = ['admin', 'مدير', 'المدير', 'المدير العام', 'zead', 'ziad', 'زياد', 'director'];
      if (adminKeywords.includes(cleanUser) || (directorClean && cleanUser.includes(directorClean)) || (directorClean && directorClean.includes(cleanUser))) {
        found = accounts.find((u) => u.role === 'admin' && u.active !== false) || {
          id: 'admin-fallback',
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

    // 3. Employee portal search across employees collection
    if (!found || (found && expectedRole === 'employee' && found.role !== 'employee')) {
      const matchedEmp = data.employees.find((e) => {
        if (e.active === false) return false;
        const eUser = normalizeString(e.username);
        const eName = normalizeString(e.name);
        const ePhone = (e.phone || '').trim();
        const rawMatch = (e.username || '').toLowerCase() === rawUser.toLowerCase() || (e.name || '').toLowerCase() === rawUser.toLowerCase();
        const normMatch = (eUser && eUser === cleanUser) || (eName && eName === cleanUser);
        const phoneMatch = ePhone && (ePhone === rawUser || ePhone.endsWith(rawUser) || rawUser.endsWith(ePhone));
        return rawMatch || normMatch || phoneMatch;
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

    if (found) {
      // If expected role is enforced and doesn't match
      if (expectedRole && found.role !== expectedRole) {
        const roleLabel = expectedRole === 'employee' ? 'الموظفين' : expectedRole === 'supervisor' ? 'المشرفين' : 'الإدارة العامة';
        return { success: false, message: `هذا الحساب ليس مسجلاً في بوابة ${roleLabel}` };
      }

      // If it's an employee role, link with actual employee record if employeeId missing
      if (found.role === 'employee' && !found.employeeId) {
        const linked = data.employees.find((e) => 
          normalizeString(e.username) === normalizeString(found?.username) ||
          normalizeString(e.name) === normalizeString(found?.displayName)
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

