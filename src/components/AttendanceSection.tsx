import React from 'react';
import { Employee, AttendanceRecord, CompanySettings } from '../types';
import { QuickAttendanceSection } from './QuickAttendanceSection';
import { DailyAttendanceRoster } from './DailyAttendanceRoster';

interface AttendanceSectionProps {
  employees: Employee[];
  attendance: Record<string, AttendanceRecord>;
  settings: CompanySettings;
  onUpdateAttendance: (record: AttendanceRecord) => Promise<AttendanceRecord>;
  onBulkUpdateAttendance: (records: AttendanceRecord[]) => Promise<boolean>;
  onOpenLateModal: (employee: Employee, record: AttendanceRecord | null, date: string) => void;
  onOpenDepartureModal: (employee: Employee, record: AttendanceRecord | null, date: string) => void;
  onOpenLedger?: () => void;
}

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({
  employees,
  attendance,
  settings,
  onUpdateAttendance,
  onBulkUpdateAttendance,
  onOpenLateModal,
  onOpenDepartureModal,
  onOpenLedger,
}) => {
  return (
    <div className="flex flex-col gap-5 sm:gap-6 mt-5 sm:mt-6">
      
      {/* 1. Quick One-Click Attendance Punch Section (نفس نمط تسجيل السلف) */}
      <QuickAttendanceSection
        employees={employees}
        attendance={attendance}
        settings={settings}
        onUpdateAttendance={onUpdateAttendance}
        onOpenLateModal={onOpenLateModal}
        onOpenDepartureModal={onOpenDepartureModal}
        onOpenLedger={onOpenLedger}
      />

      {/* 2. Daily Attendance Roster & Quick Actions Table (السجل اليومي والتحضير السريع) */}
      <DailyAttendanceRoster
        employees={employees}
        attendance={attendance}
        settings={settings}
        onUpdateAttendance={onUpdateAttendance}
        onBulkUpdateAttendance={onBulkUpdateAttendance}
        onOpenLateModal={onOpenLateModal}
        onOpenDepartureModal={onOpenDepartureModal}
        onOpenLedger={onOpenLedger}
      />

    </div>
  );
};
