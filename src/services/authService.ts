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
    // Default to admin for seamless first load
    return DEFAULT_ACCOUNTS[0];
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

  public loginWithCredentials(username: string, password?: string): { success: boolean; message?: string; user?: UserAccount } {
    const accounts = this.getAllAccounts();
    const cleanUser = username.trim().toLowerCase();
    const found = accounts.find((u) => u.username.toLowerCase() === cleanUser && u.active);

    if (!found) {
      // Check if username matches an employee name
      const data = syncService.getData();
      const matchedEmp = data.employees.find((e) => e.name.toLowerCase() === cleanUser || (e.phone && e.phone === cleanUser));
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
      return { success: false, message: 'اسم المستخدم غير موجود' };
    }

    if (found.password && password && found.password !== password) {
      return { success: false, message: 'كلمة المرور غير صحيحة' };
    }

    this.saveSession(found);
    return { success: true, user: found };
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
