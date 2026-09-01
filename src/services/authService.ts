import { UserAccount, UserRole, Employee } from '../types';
import { syncService } from './syncService';
import { DEFAULT_ACCOUNTS } from '../utils/initialData';

const AUTH_SESSION_KEY = 'syp_auth_active_user_v1';

type AuthListener = (user: UserAccount | null) => void;

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
    // Return null so the 3-role login screen is shown upon opening if not logged in
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
    const accounts = data.settings.users && data.settings.users.length > 0
      ? data.settings.users
      : DEFAULT_ACCOUNTS;
    return accounts;
  }

  public loginWithCredentials(
    username: string, 
    password?: string, 
    expectedRole?: UserRole
  ): { success: boolean; message?: string; user?: UserAccount } {
    if (!username.trim()) {
      return { success: false, message: 'يرجى إدخال اسم المستخدم' };
    }
    if (!password || !password.trim()) {
      return { success: false, message: 'يرجى إدخال كلمة المرور' };
    }

    const accounts = this.getAllAccounts();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Search in defined UserAccounts
    const found = accounts.find((u) => u.username.toLowerCase() === cleanUser && u.active);

    if (found) {
      if (expectedRole && found.role !== expectedRole) {
        const roleLabel = expectedRole === 'employee' ? 'الموظفين' : expectedRole === 'supervisor' ? 'المشرفين' : 'الإدارة العامة';
        return { success: false, message: `هذا الحساب ليس مسجلاً في بوابة ${roleLabel}` };
      }

      const validPassword = found.password || '123';
      if (cleanPass !== validPassword && cleanPass !== found.pin) {
        return { success: false, message: 'كلمة المرور غير صحيحة' };
      }

      this.saveSession(found);
      return { success: true, user: found };
    }

    // 2. Search in Employees collection for Employee Portal
    const data = syncService.getData();
    const matchedEmp = data.employees.find(
      (e) => (
        (e.username && e.username.trim().toLowerCase() === cleanUser) ||
        e.name.toLowerCase() === cleanUser || 
        (e.phone && e.phone.trim().toLowerCase() === cleanUser)
      ) && e.active
    );

    if (matchedEmp) {
      if (expectedRole && expectedRole !== 'employee') {
        return { success: false, message: 'هذا الحساب خاص بموظف، يرجى تسجيل الدخول من بوابة الموظفين' };
      }

      // Check custom password, default '123', PIN or last 4 digits of phone
      const allowedPasswords = [
        matchedEmp.password,
        '123', 
        matchedEmp.pin, 
        matchedEmp.phone?.slice(-4)
      ].filter(Boolean);

      if (!allowedPasswords.includes(cleanPass)) {
        return { success: false, message: 'كلمة المرور غير صحيحة' };
      }

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

    return { success: false, message: 'اسم المستخدم غير موجود أو غير مفعل' };
  }

  public loginWithPin(pin: string): { success: boolean; message?: string; user?: UserAccount } {
    const accounts = this.getAllAccounts();
    const cleanPin = pin.trim();

    // 1. Search in defined user accounts
    const found = accounts.find((u) => u.pin === cleanPin && u.active);
    if (found) {
      this.saveSession(found);
      return { success: true, user: found };
    }

    // 2. Search in employees' custom PINs or last 4 digits of phone
    const data = syncService.getData();
    const matchedEmp = data.employees.find((e) => {
      if (e.pin && e.pin === cleanPin) return true;
      if (e.phone && e.phone.slice(-4) === cleanPin) return true;
      return false;
    });

    if (matchedEmp) {
      const empUser: UserAccount = {
        id: `emp-usr-${matchedEmp.id}`,
        username: matchedEmp.phone || matchedEmp.name,
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
        username: employee.phone || employee.name,
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
