import { AppData, SalaryAdvance, AttendanceRecord, Employee, CompanySettings, SyncEventType } from '../types';
import { INITIAL_APP_DATA } from '../utils/initialData';
import { DEFAULT_CORTADO_LOGO } from '../utils/brandLogo';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

const FIRESTORE_COLLECTION = 'company_app_data';
const FIRESTORE_DOC_ID = 'cortado_clean_app_v3';
const LOCAL_STORAGE_KEY = 'cortado_clean_app_v3';
const CLIENT_ID = 'client_' + Math.random().toString(36).substring(2, 11);

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
  private eventSource: EventSource | null = null;
  private pollInterval: any = null;
  private isWritingToFirestore: boolean = false;

  constructor() {
    // 1. Initialize from local storage or initial defaults for instant 0ms UI render
    this.data = this.loadLocal();

    // 2. Setup BroadcastChannel for 0ms cross-tab sync in the same browser
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

    if (typeof window !== 'undefined') {
      // 3. Connect to Real-Time Server-Sent Events (SSE) stream for instant multi-device sync
      this.initServerEventsSync();

      // 4. Immediately fetch latest server state (REST) to guarantee fresh data on initial open
      this.fetchServerState();

      // 5. Setup periodic background sync polling every 3.5s as an unbreakable fallback
      this.startBackgroundSyncPoll();

      // 6. Connect to Firebase Firestore in background if available
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
            settings.companyName = backupCompanyName.trim();
          }
          if (backupLogo && backupLogo.trim()) {
            settings.logoUrl = backupLogo;
          }
          if (backupDirectorName && backupDirectorName.trim()) {
            settings.directorName = backupDirectorName.trim();
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
            lastUpdated: parsed.lastUpdated || 0,
          };
        }
      } else {
        const settings: CompanySettings = { ...INITIAL_APP_DATA.settings };
        if (backupCompanyName && backupCompanyName.trim()) {
          settings.companyName = backupCompanyName.trim();
        }
        if (backupLogo && backupLogo.trim()) {
          settings.logoUrl = backupLogo;
        }
        if (backupDirectorName && backupDirectorName.trim()) {
          settings.directorName = backupDirectorName.trim();
        }
        return {
          ...INITIAL_APP_DATA,
          settings,
          lastUpdated: 0,
        };
      }
    } catch {
      // ignore
    }
    return { ...INITIAL_APP_DATA, lastUpdated: 0 };
  }

  private saveLocal() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore
    }
  }

  // ================= 1. SERVER-SENT EVENTS (SSE) REAL-TIME SYNC =================

  /**
   * Connects to /api/sync/stream SSE endpoint.
   * Delivers instantaneous push notifications to all connected clients (<50ms).
   */
  private initServerEventsSync() {
    if (typeof window === 'undefined' || !window.EventSource) return;

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
        // ignore
      }
    }

    try {
      this.eventSource = new EventSource('/api/sync/stream');

      this.eventSource.onopen = () => {
        this.setConnectionStatus('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(':')) return;
          const msg = JSON.parse(event.data);
          this.handleIncomingServerEvent(msg);
        } catch (err) {
          console.warn('Error parsing SSE event:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.setConnectionStatus('reconnecting');
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto-reconnect after 2.5 seconds
        setTimeout(() => {
          this.initServerEventsSync();
        }, 2500);
      };
    } catch (err) {
      console.warn('SSE stream initialization notice:', err);
    }
  }

  /**
   * Processes live messages broadcasted by the Express backend.
   */
  private handleIncomingServerEvent(msg: { type: string; payload: any; timestamp?: number; clientId?: string }) {
    if (!msg || !msg.type) return;

    // Ignore events that originated from our own client
    if (msg.clientId && msg.clientId === CLIENT_ID) return;

    const { type, payload } = msg;

    switch (type) {
      case 'INIT': {
        if (payload && typeof payload === 'object') {
          this.applyServerFullState(payload);
        }
        break;
      }

      case 'BRANDING_UPDATED': {
        if (payload && typeof payload === 'object') {
          this.applyBrandingUpdate(payload);
        }
        break;
      }

      case 'SETTINGS_UPDATED': {
        if (payload && typeof payload === 'object') {
          this.applySettingsUpdate(payload);
        }
        break;
      }

      case 'ADVANCE_ADDED': {
        if (payload && payload.id) {
          const exists = this.data.advances.some((a) => a.id === payload.id);
          if (!exists) {
            this.data.advances = [payload, ...this.data.advances];
            this.data.lastUpdated = Date.now();
            this.notify();
          }
        }
        break;
      }

      case 'ADVANCE_DELETED': {
        if (payload && payload.id) {
          this.data.advances = this.data.advances.filter((a) => a.id !== payload.id);
          this.data.lastUpdated = Date.now();
          this.notify();
        }
        break;
      }

      case 'ATTENDANCE_UPDATED': {
        if (payload && payload.id) {
          this.data.attendance[payload.id] = payload;
          this.data.lastUpdated = Date.now();
          this.notify();
        }
        break;
      }

      case 'ATTENDANCE_BULK_UPDATED': {
        if (Array.isArray(payload)) {
          payload.forEach((rec) => {
            const id = rec.id || `${rec.employeeId}_${rec.date}`;
            this.data.attendance[id] = { ...rec, id };
          });
          this.data.lastUpdated = Date.now();
          this.notify();
        }
        break;
      }

      case 'EMPLOYEE_ADDED': {
        if (payload && payload.id) {
          const exists = this.data.employees.some((e) => e.id === payload.id);
          if (!exists) {
            this.data.employees.push(payload);
            this.data.lastUpdated = Date.now();
            this.notify();
          }
        }
        break;
      }

      case 'EMPLOYEE_UPDATED': {
        if (payload && payload.id) {
          this.data.employees = this.data.employees.map((e) => (e.id === payload.id ? payload : e));
          this.data.lastUpdated = Date.now();
          this.notify();
        }
        break;
      }

      case 'EMPLOYEE_DELETED': {
        if (payload && payload.id) {
          this.data.employees = this.data.employees.filter((e) => e.id !== payload.id);
          this.data.lastUpdated = Date.now();
          this.notify();
        }
        break;
      }

      case 'MONTH_RESET': {
        this.data.advances = [];
        this.data.attendance = {};
        this.data.lastUpdated = Date.now();
        this.notify();
        break;
      }

      case 'DATA_RESET': {
        if (payload && typeof payload === 'object') {
          this.data = { ...payload, lastUpdated: Date.now() };
          this.notify();
        }
        break;
      }
    }
  }

  /**
   * Applies a branding update directly and forcibly across memory, storage, and events.
   */
  private applyBrandingUpdate(branding: { companyName?: string; directorName?: string; logoUrl?: string; forceReset?: boolean }) {
    let changed = false;

    if (branding.companyName !== undefined && branding.companyName.trim() && branding.companyName.trim() !== this.data.settings.companyName) {
      this.data.settings.companyName = branding.companyName.trim();
      try {
        localStorage.setItem('cortado_company_name', this.data.settings.companyName);
      } catch {
        // ignore
      }
      changed = true;
    }

    if (branding.directorName !== undefined && branding.directorName.trim() && branding.directorName.trim() !== this.data.settings.directorName) {
      this.data.settings.directorName = branding.directorName.trim();
      try {
        localStorage.setItem('cortado_director_name', this.data.settings.directorName);
      } catch {
        // ignore
      }
      changed = true;
    }

    if (branding.forceReset) {
      this.data.settings.logoUrl = '';
      try {
        localStorage.removeItem('cortado_company_logo');
      } catch {
        // ignore
      }
      changed = true;
    } else if (branding.logoUrl !== undefined && branding.logoUrl.trim() !== '' && branding.logoUrl !== this.data.settings.logoUrl) {
      this.data.settings.logoUrl = branding.logoUrl;
      try {
        localStorage.setItem('cortado_company_logo', branding.logoUrl);
      } catch {
        // ignore
      }
      changed = true;
    }

    if (changed) {
      if (typeof document !== 'undefined' && this.data.settings.companyName) {
        document.title = `${this.data.settings.companyName} | سلف وحضور الموظفين`;
      }
      this.data.lastUpdated = Date.now();
      this.saveLocal();
      this.notify();
      this.broadcastLocal('BRANDING_UPDATED', branding);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cortado_branding_updated', { detail: branding }));
      }
    }
  }

  /**
   * Dedicated global branding updater - broadcasts instantly to all devices and persists to server.
   */
  public async updateBranding(branding: { companyName?: string; directorName?: string; logoUrl?: string; forceReset?: boolean }): Promise<void> {
    this.applyBrandingUpdate(branding);

    // 1. Push to Firestore company_branding document in background (never blocks UI)
    try {
      const brandingDocRef = doc(db, FIRESTORE_COLLECTION, 'company_branding');
      setDoc(
        brandingDocRef,
        {
          companyName: branding.companyName || this.data.settings.companyName || '',
          directorName: branding.directorName || this.data.settings.directorName || '',
          logoUrl: branding.logoUrl !== undefined ? branding.logoUrl : (this.data.settings.logoUrl || ''),
          forceReset: branding.forceReset || false,
          lastUpdated: Date.now(),
          updatedByClientId: CLIENT_ID,
        },
        { merge: true }
      ).catch((err) => {
        console.warn('Background Firestore write branding warning:', err);
      });
    } catch (err) {
      console.warn('Failed to write branding to Firestore:', err);
    }

    // 2. Also push full doc to Firestore in background
    this.pushToFirestore(true).catch(() => {});

    // 3. Post to backend server /api/branding with fast timeout so UI never hangs
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;

      fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          companyName: branding.companyName || this.data.settings.companyName,
          directorName: branding.directorName || this.data.settings.directorName,
          logoUrl: branding.logoUrl !== undefined ? branding.logoUrl : this.data.settings.logoUrl,
          forceReset: branding.forceReset,
          clientId: CLIENT_ID,
        }),
      })
        .catch((e) => console.warn('updateBranding server sync error:', e))
        .finally(() => {
          if (timeoutId) clearTimeout(timeoutId);
        });
    } catch (e) {
      console.warn('updateBranding server sync error:', e);
    }
  }

  /**
   * Applies full company settings update.
   */
  private applySettingsUpdate(newSettings: Partial<CompanySettings>) {
    this.data.settings = {
      ...this.data.settings,
      ...newSettings,
    };

    if (this.data.settings.companyName) {
      try {
        localStorage.setItem('cortado_company_name', this.data.settings.companyName);
        if (typeof document !== 'undefined') {
          document.title = `${this.data.settings.companyName} | سلف وحضور الموظفين`;
        }
      } catch {
        // ignore
      }
    }

    if (this.data.settings.logoUrl !== undefined) {
      try {
        localStorage.setItem('cortado_company_logo', this.data.settings.logoUrl);
      } catch {
        // ignore
      }
    }

    if (this.data.settings.directorName) {
      try {
        localStorage.setItem('cortado_director_name', this.data.settings.directorName);
      } catch {
        // ignore
      }
    }

    this.data.lastUpdated = Date.now();
    this.saveLocal();
    this.notify();
  }

  /**
   * Merges authoritative server full state into local memory.
   */
  private applyServerFullState(serverData: any) {
    if (!serverData) return;

    const mergedSettings: CompanySettings = {
      ...INITIAL_APP_DATA.settings,
      ...this.data.settings,
      ...(serverData.settings || {}),
    };

    // If server has custom company name or logo, adopt it
    if (serverData.settings?.companyName && serverData.settings.companyName.trim()) {
      mergedSettings.companyName = serverData.settings.companyName.trim();
      try {
        localStorage.setItem('cortado_company_name', mergedSettings.companyName);
      } catch {
        // ignore
      }
    }

    if (serverData.settings?.logoUrl !== undefined && serverData.settings.logoUrl !== '') {
      mergedSettings.logoUrl = serverData.settings.logoUrl;
      try {
        localStorage.setItem('cortado_company_logo', mergedSettings.logoUrl);
      } catch {
        // ignore
      }
    }

    if (serverData.settings?.directorName && serverData.settings.directorName.trim()) {
      mergedSettings.directorName = serverData.settings.directorName.trim();
      try {
        localStorage.setItem('cortado_director_name', mergedSettings.directorName);
      } catch {
        // ignore
      }
    }

    this.data = {
      ...this.data,
      settings: mergedSettings,
      employees: Array.isArray(serverData.employees) && serverData.employees.length > 0 ? serverData.employees : this.data.employees,
      advances: Array.isArray(serverData.advances) ? serverData.advances : this.data.advances,
      attendance: serverData.attendance && typeof serverData.attendance === 'object' ? serverData.attendance : this.data.attendance,
      lastUpdated: serverData.lastUpdated || Date.now(),
    };

    if (typeof document !== 'undefined' && this.data.settings.companyName) {
      document.title = `${this.data.settings.companyName} | سلف وحضور الموظفين`;
    }

    this.saveLocal();
    this.notify();
    this.setConnectionStatus('connected');
  }

  // ================= 2. REST API FETCH ON STARTUP =================

  private async fetchServerState() {
    try {
      // 1. Fetch fast dedicated branding first
      const brandRes = await fetch('/api/branding', { cache: 'no-store' });
      if (brandRes.ok) {
        const branding = await brandRes.json();
        const localLogo = typeof window !== 'undefined' ? localStorage.getItem('cortado_company_logo') : null;
        const localName = typeof window !== 'undefined' ? localStorage.getItem('cortado_company_name') : null;
        const localDirector = typeof window !== 'undefined' ? localStorage.getItem('cortado_director_name') : null;

        // Auto-heal: If local storage already has custom branding (e.g. manager uploaded it)
        // and server currently has empty logo, push local branding to server so all clients get it immediately!
        const serverHasNoLogo = !branding?.logoUrl || branding.logoUrl.trim() === '';
        const localHasLogo = localLogo && localLogo.trim() !== '';

        if (serverHasNoLogo && localHasLogo) {
          fetch('/api/branding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyName: localName || this.data.settings.companyName,
              directorName: localDirector || this.data.settings.directorName,
              logoUrl: localLogo,
              clientId: CLIENT_ID,
            }),
          }).catch(() => {});
        } else if (branding) {
          this.applyBrandingUpdate(branding);
        }
      }

      // 2. Fetch full data
      const dataRes = await fetch('/api/data', { cache: 'no-store' });
      if (dataRes.ok) {
        const fullData = await dataRes.json();
        this.applyServerFullState(fullData);
      }
      this.setConnectionStatus('connected');
    } catch (err) {
      console.warn('Initial server state fetch note:', err);
    }
  }

  // ================= 3. ACTIVE HEARTBEAT & SYNC POLLING =================

  private startBackgroundSyncPoll() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/branding', { cache: 'no-store' });
        if (res.ok) {
          const branding = await res.json();
          if (branding) {
            const hasNameMismatch = branding.companyName && branding.companyName !== this.data.settings.companyName;
            const hasLogoMismatch = branding.logoUrl !== undefined && branding.logoUrl !== this.data.settings.logoUrl;
            const hasDirectorMismatch = branding.directorName && branding.directorName !== this.data.settings.directorName;

            if (hasNameMismatch || hasLogoMismatch || hasDirectorMismatch) {
              this.applyBrandingUpdate(branding);
            }
          }
          this.setConnectionStatus('connected');
        }
      } catch {
        // ignore offline moments
      }
    }, 2000);
  }

  // ================= 4. FIREBASE FIRESTORE SYNC (DUAL BACKUP) =================

  private async initFirestoreSync() {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

      // Check if doc exists in Firestore, seed if empty
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
        // ignore Firestore permission if not provisioned
      }

      // Dedicated Branding Initial Fetch & Real-time Listener
      const brandingDocRef = doc(db, FIRESTORE_COLLECTION, 'company_branding');
      try {
        const bSnap = await getDoc(brandingDocRef);
        if (bSnap.exists()) {
          const bData = bSnap.data() as any;
          if (bData && (bData.companyName || bData.logoUrl !== undefined)) {
            this.applyBrandingUpdate(bData);
          }
        }
      } catch (e) {
        // ignore
      }

      this.unsubscribeBranding = onSnapshot(
        brandingDocRef,
        { includeMetadataChanges: false },
        (bSnap) => {
          if (bSnap.exists()) {
            const bData = bSnap.data() as any;
            if (bData) {
              this.applyBrandingUpdate(bData);
            }
          }
        },
        (bError) => {
          // ignore Firestore error
        }
      );

      // Main Data Listener
      this.unsubscribeFirestore = onSnapshot(
        docRef,
        { includeMetadataChanges: false },
        (docSnap) => {
          if (docSnap.exists()) {
            const remoteData = docSnap.data() as any;
            if (remoteData && remoteData.updatedByClientId !== CLIENT_ID) {
              this.applyServerFullState(remoteData);
            }
          }
        },
        (error) => {
          // ignore
        }
      );
    } catch (err) {
      // ignore
    }
  }

  private async pushToFirestore(merge: boolean = false): Promise<void> {
    try {
      this.isWritingToFirestore = true;

      // Push branding
      try {
        const brandingDocRef = doc(db, FIRESTORE_COLLECTION, 'company_branding');
        setDoc(
          brandingDocRef,
          {
            companyName: this.data.settings.companyName || '',
            directorName: this.data.settings.directorName || '',
            logoUrl: this.data.settings.logoUrl || '',
            lastUpdated: Date.now(),
            updatedByClientId: CLIENT_ID,
          },
          { merge: true }
        ).catch(() => {});
      } catch {
        // ignore
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

      const setDocPromise = setDoc(docRef, payload, { merge });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 6000)
      );

      await Promise.race([setDocPromise, timeoutPromise]);
    } catch (error) {
      // ignore
    } finally {
      this.isWritingToFirestore = false;
    }
  }

  // ================= CROSS-TAB BROADCAST =================

  private handleLocalBroadcast(msg: any) {
    if (msg.clientId && msg.clientId === CLIENT_ID) return;
    if (msg.payload && msg.type) {
      if (msg.type === 'SETTINGS_UPDATED') {
        this.applySettingsUpdate(msg.payload);
      } else if (msg.type === 'BRANDING_UPDATED') {
        this.applyBrandingUpdate(msg.payload);
      } else {
        this.data.lastUpdated = Date.now();
        this.notify();
      }
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

  // ================= MUTATIONS (INSTANT REAL-TIME TO EVERYONE) =================

  public async addAdvance(advanceData: Omit<SalaryAdvance, 'id' | 'createdAt' | 'approved'>): Promise<SalaryAdvance> {
    const newAdvance: SalaryAdvance = {
      ...advanceData,
      id: `adv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      approved: true,
      createdBy: this.data.settings.directorName || 'الإدارة',
    };

    // 1. Instant local update
    this.data.advances = [newAdvance, ...this.data.advances];
    this.data.lastUpdated = Date.now();
    this.notify();
    this.broadcastLocal('ADVANCE_ADDED', newAdvance);

    // 2. Post to Express server
    fetch('/api/advances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advance: newAdvance, clientId: CLIENT_ID }),
    }).catch((e) => console.warn('POST /api/advances err:', e));

    // 3. Backup Firestore
    this.pushToFirestore().catch(() => {});
    return newAdvance;
  }

  public async deleteAdvance(id: string): Promise<boolean> {
    // 1. Instant local update
    this.data.advances = this.data.advances.filter((a) => a.id !== id);
    this.data.lastUpdated = Date.now();
    this.notify();
    this.broadcastLocal('ADVANCE_DELETED', { id });

    // 2. Post to Express server
    fetch(`/api/advances/${id}?clientId=${CLIENT_ID}`, {
      method: 'DELETE',
    }).catch((e) => console.warn('DELETE /api/advances err:', e));

    // 3. Backup Firestore
    this.pushToFirestore().catch(() => {});
    return true;
  }

  public async updateAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const id = record.id || `${record.employeeId}_${record.date}`;
    const updated = { ...record, id, updatedAt: Date.now() };

    // 1. Instant local update
    this.data.attendance[id] = updated;
    this.data.lastUpdated = Date.now();
    this.notify();
    this.broadcastLocal('ATTENDANCE_UPDATED', updated);

    // 2. Post to Express server
    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: updated, clientId: CLIENT_ID }),
    }).catch((e) => console.warn('POST /api/attendance err:', e));

    // 3. Backup Firestore
    this.pushToFirestore().catch(() => {});
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

    // Post to Express server
    fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, clientId: CLIENT_ID }),
    }).catch((e) => console.warn('POST /api/attendance/bulk err:', e));

    // Backup Firestore
    this.pushToFirestore().catch(() => {});
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

    // Post to Express server
    fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: saved, clientId: CLIENT_ID }),
    }).catch((e) => console.warn('POST /api/employees err:', e));

    // Backup Firestore
    this.pushToFirestore().catch(() => {});
    return saved;
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    this.data.employees = this.data.employees.filter((e) => e.id !== id);
    this.data.lastUpdated = Date.now();
    this.notify();
    this.broadcastLocal('EMPLOYEE_DELETED', { id });

    fetch(`/api/employees/${id}?clientId=${CLIENT_ID}`, {
      method: 'DELETE',
    }).catch((e) => console.warn('DELETE /api/employees err:', e));

    this.pushToFirestore().catch(() => {});
    return true;
  }

  /**
   * Updates company settings, specifically companyName, logoUrl, directorName, etc.
   * Instantly propagates to all connected devices via SSE, localStorage, and REST.
   */
  public async updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    this.data.settings = { ...this.data.settings, ...settings };
    this.data.lastUpdated = Date.now();

    // 1. Immediately cache in local storage for 0ms paint
    if (this.data.settings.logoUrl !== undefined) {
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

    // 2. Update document title dynamically
    if (typeof document !== 'undefined' && this.data.settings.companyName) {
      document.title = `${this.data.settings.companyName} | سلف وحضور الموظفين`;
    }

    // 3. Notify local UI listeners immediately
    this.saveLocal();
    this.notify();
    this.broadcastLocal('SETTINGS_UPDATED', this.data.settings);

    // 4. Send POST to server for instant multi-device SSE broadcast
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;

      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({ settings: this.data.settings, clientId: CLIENT_ID }),
      })
        .catch((err) => console.warn('POST /api/settings failed:', err))
        .finally(() => {
          if (timeoutId) clearTimeout(timeoutId);
        });
    } catch (err) {
      console.warn('POST /api/settings failed:', err);
    }

    // 5. Also send dedicated branding update to Firestore & /api/branding
    if (settings.companyName !== undefined || settings.logoUrl !== undefined || settings.directorName !== undefined) {
      const brandingPayload = {
        companyName: this.data.settings.companyName || '',
        directorName: this.data.settings.directorName || '',
        logoUrl: this.data.settings.logoUrl || '',
        lastUpdated: Date.now(),
        updatedByClientId: CLIENT_ID,
      };

      try {
        const brandingDocRef = doc(db, FIRESTORE_COLLECTION, 'company_branding');
        setDoc(brandingDocRef, brandingPayload, { merge: true }).catch((err) => {
          console.warn('Failed to write branding to Firestore:', err);
        });
      } catch (err) {
        console.warn('Error preparing branding doc ref:', err);
      }

      try {
        fetch('/api/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...brandingPayload,
            clientId: CLIENT_ID,
          }),
        }).catch((be) => console.warn('POST /api/branding failed:', be));
      } catch (be) {
        console.warn('POST /api/branding error:', be);
      }

      this.broadcastLocal('BRANDING_UPDATED', brandingPayload);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cortado_branding_updated', { detail: brandingPayload }));
      }
    }

    // 6. Push to Firebase Firestore in background with merge
    this.pushToFirestore(true).catch(() => {});
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

    fetch('/api/data/reset-month', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: CLIENT_ID }),
    }).catch(() => {});

    try {
      this.pushToFirestore(false).catch(() => {});
    } catch {
      // ignore
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

    fetch('/api/data/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: CLIENT_ID }),
    }).catch(() => {});

    try {
      this.pushToFirestore(false).catch(() => {});
    } catch {
      // ignore
    }
    return true;
  }
}

export const syncService = new SyncService();
