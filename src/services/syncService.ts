import { AppData, SalaryAdvance, AttendanceRecord, Employee, CompanySettings, SyncEventType } from '../types';
import { INITIAL_APP_DATA } from '../utils/initialData';
import { DEFAULT_CORTADO_LOGO } from '../utils/brandLogo';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

const FIRESTORE_COLLECTION = 'company_app_data';
const FIRESTORE_DOC_ID = 'cortado_clean_app_v3';
const LOCAL_STORAGE_KEY = 'cortado_clean_app_v3';
const CLIENT_ID = 'client_' + Math.random().toString(36).substr(2, 9);

function sanitizeForFirestore<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (err) {
    console.error('Failed to sanitize data for Firestore:', err);
    return data;
  }
}

type Listener = (data: AppData) => void;
type ConnectionListener = (status: 'connected' | 'reconnecting' | 'offline') => void;

class SyncService {
  private data: AppData;
  private listeners: Set<Listener> = new Set();
  private connListeners: Set<ConnectionListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private connectionStatus: 'connected' | 'reconnecting' | 'offline' = 'reconnecting';
  private unsubscribeFirestore: (() => void) | null = null;
  private unsubscribeBranding: (() => void) | null = null;
  private isWritingToFirestore: boolean = false;

  constructor() {
    // 1. Initialize from local storage or initial defaults for instant UI load
    this.data = this.loadLocal();

    // 2. Setup BroadcastChannel for cross-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('syp_attendance_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type) {
            this.handleLocalBroadcast(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported', err);
      }
    }

    // 3. Connect to Firebase Firestore Real-Time Listener
    if (typeof window !== 'undefined') {
      this.initFirestoreSync();
    }
  }

  public getClientId(): string {
    return CLIENT_ID;
  }

  public getData(): AppData {
    return this.data;
  }

  public getConnectionStatus(): 'connected' | 'reconnecting' | 'offline' {
    return this.connectionStatus;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.data);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeConnection(listener: ConnectionListener): () => void {
    this.connListeners.add(listener);
    listener(this.connectionStatus);
    return () => {
      this.connListeners.delete(listener);
    };
  }

  private setConnectionStatus(status: 'connected' | 'reconnecting' | 'offline') {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.connListeners.forEach((fn) => fn(status));
    }
  }

  private notify() {
    this.saveLocal();
    this.listeners.forEach((fn) => fn(this.data));
  }

  private loadLocal(): AppData {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const backupLogo = localStorage.getItem('cortado_company_logo');
      const backupCompanyName = localStorage.getItem('cortado_company_name');
      const backupDirectorName = localStorage.getItem('cortado_director_name');

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          const settings: CompanySettings = {
            ...INITIAL_APP_DATA.settings,
            ...(parsed.settings || {}),
          };
          if (backupCompanyName && backupCompanyName.trim()) {
            settings.companyName = backupCompanyName;
          }
          if (backupLogo && backupLogo !== DEFAULT_CORTADO_LOGO) {
            settings.logoUrl = backupLogo;
          } else if ((!settings.logoUrl || settings.logoUrl === '') && backupLogo) {
            settings.logoUrl = backupLogo;
          }
          if (backupDirectorName && backupDirectorName.trim()) {
            settings.directorName = backupDirectorName;
          }
          if (!settings.shifts || settings.shifts.length === 0) {
            settings.shifts = INITIAL_APP_DATA.settings.shifts;
          }
          if (settings.maxAdvancePerMonth === undefined) {
            settings.maxAdvancePerMonth = 2000000;
          }
          return {
            ...INITIAL_APP_DATA,
            ...parsed,
            settings,
            employees: Array.isArray(parsed.employees) ? parsed.employees : [],
            advances: Array.isArray(parsed.advances) ? parsed.advances : [],
            attendance: parsed.attendance && typeof parsed.attendance === 'object' ? parsed.attendance : {},
          };
        }
      } else {
        const settings: CompanySettings = { ...INITIAL_APP_DATA.settings };
        if (backupCompanyName && backupCompanyName.trim()) {
          settings.companyName = backupCompanyName;
        }
        if (backupLogo && backupLogo !== DEFAULT_CORTADO_LOGO) {
          settings.logoUrl = backupLogo;
        }
        if (backupDirectorName && backupDirectorName.trim()) {
          settings.directorName = backupDirectorName;
        }
        return {
          ...INITIAL_APP_DATA,
          settings,
        };
      }
    } catch {
      // ignore
    }
    return INITIAL_APP_DATA;
  }

  private saveLocal() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore
    }
  }

  /**
   * Initializes real-time bidirectional syncing with Firebase Firestore.
   * Every branch and device listening to this document will receive live instant updates.
   */
  private async initFirestoreSync() {
    try {
      this.setConnectionStatus('reconnecting');
      const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

      // Check if doc exists in Firestore, if not seed it with clean data
      try {
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
          const payload = sanitizeForFirestore({
            ...this.data,
            lastUpdated: Date.now(),
            updatedByClientId: CLIENT_ID,
          });
          await setDoc(docRef, payload);
        }
      } catch (e) {
        console.warn('Initial doc check/seed info:', e);
      }

      // 1. Dedicated Real-Time Listener for Company Branding & Logo
      // This ensures that any change to the company name or logo anywhere in the world
      // is pushed to all screens and devices instantly (< 300ms)
      const brandingDocRef = doc(db, FIRESTORE_COLLECTION, 'company_branding');
      this.unsubscribeBranding = onSnapshot(
        brandingDocRef,
        { includeMetadataChanges: false },
        (bSnap) => {
          if (bSnap.exists()) {
            const bData = bSnap.data() as any;
            if (bData) {
              let changed = false;
              if (bData.companyName && bData.companyName.trim() && bData.companyName !== this.data.settings.companyName) {
                this.data.settings.companyName = bData.companyName.trim();
                try {
                  localStorage.setItem('cortado_company_name', this.data.settings.companyName);
                } catch {
                  // ignore
                }
                changed = true;
              }
              if (bData.logoUrl && bData.logoUrl !== this.data.settings.logoUrl) {
                this.data.settings.logoUrl = bData.logoUrl;
                try {
                  localStorage.setItem('cortado_company_logo', bData.logoUrl);
                } catch {
                  // ignore
                }
                changed = true;
              }
              if (bData.directorName && bData.directorName.trim() && bData.directorName !== this.data.settings.directorName) {
                this.data.settings.directorName = bData.directorName.trim();
                try {
                  localStorage.setItem('cortado_director_name', this.data.settings.directorName);
                } catch {
                  // ignore
                }
                changed = true;
              }
              if (changed) {
                this.saveLocal();
                this.notify();
                this.broadcastLocal('SETTINGS_UPDATED', this.data.settings);
              }
            }
          }
        },
        (bError) => {
          console.warn('Branding onSnapshot listener notice:', bError);
        }
      );

      // 2. Start Real-Time onSnapshot listener for main application data
      this.unsubscribeFirestore = onSnapshot(
        docRef,
        { includeMetadataChanges: false },
        (docSnap) => {
          if (docSnap.exists()) {
            const remoteData = docSnap.data() as any;
            
            if (remoteData) {
              // Ignore our own updates if we already have this or newer state
              if (remoteData.updatedByClientId === CLIENT_ID && (remoteData.lastUpdated || 0) <= this.data.lastUpdated) {
                this.setConnectionStatus('connected');
                return;
              }
              if ((remoteData.lastUpdated || 0) < this.data.lastUpdated) {
                this.setConnectionStatus('connected');
                return;
              }

              const settings: CompanySettings = {
                ...INITIAL_APP_DATA.settings,
                ...(remoteData.settings || {}),
              };

              // Prevent overwriting custom company name with default placeholder
              const localCustomName = localStorage.getItem('cortado_company_name') || (this.data.settings.companyName !== 'شركة كورتادو كافيه' ? this.data.settings.companyName : null);
              if (localCustomName && (!remoteData.settings?.companyName || remoteData.settings.companyName === 'شركة كورتادو كافيه')) {
                settings.companyName = localCustomName;
              }

              // Prevent overwriting custom logo with default logo
              const localCustomLogo = localStorage.getItem('cortado_company_logo') || (this.data.settings.logoUrl !== DEFAULT_CORTADO_LOGO ? this.data.settings.logoUrl : null);
              if (localCustomLogo && localCustomLogo !== DEFAULT_CORTADO_LOGO) {
                settings.logoUrl = localCustomLogo;
              } else if (!settings.logoUrl && this.data.settings.logoUrl) {
                settings.logoUrl = this.data.settings.logoUrl;
              }

              if (!settings.shifts || settings.shifts.length === 0) {
                settings.shifts = INITIAL_APP_DATA.settings.shifts;
              }
              if (settings.maxAdvancePerMonth === undefined) {
                settings.maxAdvancePerMonth = 2000000;
              }
              if (!settings.users || settings.users.length === 0) {
                settings.users = this.data.settings.users || INITIAL_APP_DATA.settings.users;
              }

              this.data = {
                ...INITIAL_APP_DATA,
                settings,
                employees: Array.isArray(remoteData.employees) ? remoteData.employees : [],
                advances: Array.isArray(remoteData.advances) ? remoteData.advances : [],
                attendance: remoteData.attendance && typeof remoteData.attendance === 'object' ? remoteData.attendance : {},
                lastUpdated: remoteData.lastUpdated || Date.now(),
              };

              this.notify();
            }
            this.setConnectionStatus('connected');
          }
        },
        (error) => {
          console.error('Firebase Firestore onSnapshot error:', error);
          this.setConnectionStatus('offline');
        }
      );
    } catch (err) {
      console.error('Failed to init Firebase Firestore sync:', err);
      this.setConnectionStatus('offline');
    }
  }

  /**
   * Persists the current state to Firebase Firestore and notifies other branches.
   */
  private async pushToFirestore(merge: boolean = false): Promise<void> {
    try {
      this.isWritingToFirestore = true;

      // Always push branding immediately to the fast, dedicated document
      try {
        const brandingDocRef = doc(db, FIRESTORE_COLLECTION, 'company_branding');
        setDoc(brandingDocRef, {
          companyName: this.data.settings.companyName || '',
          directorName: this.data.settings.directorName || '',
          logoUrl: this.data.settings.logoUrl || '',
          lastUpdated: Date.now(),
          updatedByClientId: CLIENT_ID,
        }, { merge: true }).catch((e) => console.warn('Branding push background note:', e));
      } catch (be) {
        console.warn('Branding push sync note:', be);
      }

      const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
      const payload = sanitizeForFirestore({
        employees: this.data.employees,
        advances: this.data.advances,
        attendance: this.data.attendance,
        settings: this.data.settings,
        lastUpdated: Date.now(),
        updatedByClientId: CLIENT_ID,
      });

      // 12-second timeout wrapper so real networks have ample time to complete write
      const setDocPromise = setDoc(docRef, payload, { merge });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timeout')), 12000)
      );

      await Promise.race([setDocPromise, timeoutPromise]);
      this.setConnectionStatus('connected');
    } catch (error) {
      console.warn('Firebase Firestore write notice (cached locally):', error);
    } finally {
      this.isWritingToFirestore = false;
    }
  }

  private handleLocalBroadcast(msg: any) {
    if (msg.clientId && msg.clientId === CLIENT_ID) return;
    if (msg.payload && msg.type) {
      this.data.lastUpdated = Date.now();
      this.notify();
    }
  }

  private broadcastLocal(type: SyncEventType, payload: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type,
          payload,
          timestamp: Date.now(),
          clientId: CLIENT_ID,
        });
      } catch {
        // ignore
      }
    }
  }

  // ================= MUTATIONS (INSTANT & NON-BLOCKING) =================

  public async addAdvance(advanceData: Omit<SalaryAdvance, 'id' | 'createdAt' | 'approved'>): Promise<SalaryAdvance> {
    const newAdvance: SalaryAdvance = {
      ...advanceData,
      id: `adv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
      approved: true,
      createdBy: this.data.settings.directorName || 'الإدارة',
    };

    // Instant local state & storage update
    this.data.advances = [newAdvance, ...this.data.advances];
    this.data.lastUpdated = Date.now();
    this.notify();
    this.broadcastLocal('ADVANCE_ADDED', newAdvance);

    // Push to Firebase Firestore in background
    this.pushToFirestore().catch((err) => console.warn(err));
    return newAdvance;
  }

  public async deleteAdvance(id: string): Promise<boolean> {
    // Instant local state & storage update
    this.data.advances = this.data.advances.filter((a) => a.id !== id);
    this.data.lastUpdated = Date.now();
    this.notify();
    this.broadcastLocal('ADVANCE_DELETED', { id });

    // Push to Firebase Firestore in background
    this.pushToFirestore().catch((err) => console.warn(err));
    return true;
  }

  public async updateAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const id = record.id || `${record.employeeId}_${record.date}`;
    const updated = { ...record, id, updatedAt: Date.now() };

    // Instant local state & storage update
    this.data.attendance[id] = updated;
    this.data.lastUpdated = Date.now();
    this.notify();
    this.broadcastLocal('ATTENDANCE_UPDATED', updated);

    // Push to Firebase Firestore in background
    this.pushToFirestore().catch((err) => console.warn(err));
    return updated;
  }

  public async bulkUpdateAttendance(records: AttendanceRecord[]): Promise<boolean> {
    const now = Date.now();
    records.forEach((r) => {
      const id = r.id || `${r.employeeId}_${r.date}`;
      this.data.attendance[id] = { ...r, id, updatedAt: now };
    });
    this.data.lastUpdated = now;
    this.notify();
    this.broadcastLocal('ATTENDANCE_BULK_UPDATED', records);

    // Push to Firebase Firestore in background
    this.pushToFirestore().catch((err) => console.warn(err));
    return true;
  }

  public async saveEmployee(employee: Partial<Employee> & { name: string; baseSalary: number }): Promise<Employee> {
    const isNew = !employee.id || !this.data.employees.some((e) => e.id === employee.id);
    let saved: Employee;

    if (isNew) {
      saved = {
        id: employee.id || `emp-${Date.now()}`,
        name: employee.name,
        jobTitle: employee.jobTitle || 'موظف',
        phone: employee.phone || '',
        baseSalary: Number(employee.baseSalary) || 0,
        dailyWorkHours: employee.dailyWorkHours || this.data.settings.defaultWorkHours || 8,
        monthlyWorkDays: employee.monthlyWorkDays || this.data.settings.defaultWorkDays || 26,
        absentDeductionRate: employee.absentDeductionRate || 1.0,
        assignedShiftId: employee.assignedShiftId,
        maxMonthlyAdvance: employee.maxMonthlyAdvance,
        pin: employee.pin || '1234',
        username: employee.username || undefined,
        password: employee.password || '123',
        active: employee.active !== undefined ? employee.active : true,
        joinedDate: employee.joinedDate || new Date().toISOString().split('T')[0],
        avatarColor: employee.avatarColor || 'bg-slate-700',
      };
      this.data.employees.push(saved);
      this.broadcastLocal('EMPLOYEE_ADDED', saved);
    } else {
      saved = {
        ...(this.data.employees.find((e) => e.id === employee.id)!),
        ...employee,
        baseSalary: Number(employee.baseSalary),
      };
      this.data.employees = this.data.employees.map((e) => (e.id === employee.id ? saved : e));
      this.broadcastLocal('EMPLOYEE_UPDATED', saved);
    }

    this.data.lastUpdated = Date.now();
    this.notify();

    // Push to Firebase Firestore in background
    this.pushToFirestore().catch((err) => console.warn(err));
    return saved;
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    this.data.employees = this.data.employees.filter((e) => e.id !== id);
    this.data.lastUpdated = Date.now();
    this.notify();
    this.broadcastLocal('EMPLOYEE_DELETED', { id });

    // Push to Firebase Firestore in background
    this.pushToFirestore().catch((err) => console.warn(err));
    return true;
  }

  public async updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    this.data.settings = { ...this.data.settings, ...settings };
    this.data.lastUpdated = Date.now();
    
    if (this.data.settings.logoUrl) {
      try {
        localStorage.setItem('cortado_company_logo', this.data.settings.logoUrl);
      } catch (e) {
        console.warn('Could not cache logo in localStorage:', e);
      }
    }
    if (this.data.settings.companyName) {
      try {
        localStorage.setItem('cortado_company_name', this.data.settings.companyName);
      } catch (e) {
        console.warn('Could not cache companyName in localStorage:', e);
      }
    }
    if (this.data.settings.directorName) {
      try {
        localStorage.setItem('cortado_director_name', this.data.settings.directorName);
      } catch (e) {
        console.warn('Could not cache directorName in localStorage:', e);
      }
    }

    // Update document title dynamically
    if (typeof document !== 'undefined' && this.data.settings.companyName) {
      document.title = `${this.data.settings.companyName} | سلف وحضور الموظفين`;
    }

    this.saveLocal();
    this.notify();
    this.broadcastLocal('SETTINGS_UPDATED', this.data.settings);

    // Push to Firebase Firestore in background with merge
    this.pushToFirestore(true).catch((err) => console.warn('pushToFirestore updateSettings err:', err));
    return this.data.settings;
  }

  /**
   * Clears monthly transactional data (advances and attendance)
   * while keeping all employees, salaries, shifts, and company settings intact.
   */
  public async resetNewMonth(): Promise<boolean> {
    this.data.advances = [];
    this.data.attendance = {};
    this.data.lastUpdated = Date.now();
    this.saveLocal();
    this.notify();
    this.broadcastLocal('MONTH_RESET', this.data);

    // Save to Firebase Firestore in background without blocking UI
    try {
      this.pushToFirestore(false).catch((err) => console.error('Firestore resetNewMonth err:', err));
    } catch (e) {
      console.error(e);
    }
    return true;
  }

  /**
   * Completely resets all data (removes all employees, advances, and attendance records)
   * to start completely fresh from zero (Factory Reset).
   */
  public async resetData(): Promise<boolean> {
    this.data = {
      settings: { ...INITIAL_APP_DATA.settings },
      employees: [],
      advances: [],
      attendance: {},
      lastUpdated: Date.now(),
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('syp_payroll_app_state');
        localStorage.removeItem('syp_payroll_app_state_v2');
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    this.saveLocal();
    this.notify();
    this.broadcastLocal('DATA_RESET', this.data);

    // Save to Firebase Firestore in background without blocking UI
    try {
      this.pushToFirestore(false).catch((err) => console.error('Firestore resetData err:', err));
    } catch (e) {
      console.error(e);
    }
    return true;
  }
}

export const syncService = new SyncService();
