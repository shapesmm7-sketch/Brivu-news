import React, { useState, useEffect, useMemo } from 'react';
import { saveJsPdf } from '../services/fileSaver';
import {
  X,
  Calendar,
  CalendarCheck,
  CalendarX,
  Clock,
  DollarSign,
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  TrendingUp,
  Download,
  LogOut,
  Phone,
  Mail,
  IdCard,
  ChevronDown,
  UserCheck,
  Percent,
  Check,
  ShieldAlert,
  Wallet,
  Coins,
  History,
  Filter,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Boxes,
  Package,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  BusinessWorker,
  StaffAttendanceRecord,
  StaffAttendanceStatus,
  StaffLossRecord,
  StaffLossStatus,
  StaffSaleRecord,
  StaffIncidentRecord,
  StaffIncidentType,
  StaffIncidentSeverity,
  BusinessProfile,
} from '../types';
import { StorageService } from '../services/storage';
import { AdMobService } from '../services/admobService';
import { StockProductPickerModal, SelectedStockItem } from './StockProductPickerModal';

interface StaffManageModalProps {
  worker: BusinessWorker;
  currency: string;
  businessProfile: BusinessProfile;
  onClose: () => void;
  onWorkerUpdated?: (updatedWorker: BusinessWorker) => void;
  initialTab?: ManageTab;
}

type ManageTab = 'sales' | 'losses' | 'incidents' | 'payroll' | 'analytics' | 'manage_attendance';

export const StaffManageModal: React.FC<StaffManageModalProps> = ({
  worker,
  currency,
  businessProfile,
  onClose,
  initialTab = 'sales',
}) => {
  const [activeTab, setActiveTab] = useState<ManageTab>(initialTab);

  // Staff Records State
  const [attendanceList, setAttendanceList] = useState<StaffAttendanceRecord[]>([]);
  const [salesList, setSalesList] = useState<StaffSaleRecord[]>([]);
  const [lossesList, setLossesList] = useState<StaffLossRecord[]>([]);
  const [incidentsList, setIncidentsList] = useState<StaffIncidentRecord[]>([]);

  // Feedback Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Helper to parse YYYY-MM-DD into UTC ms (avoids local timezone date shifts)
  const parseDateToUtcMs = (dateStr: string): number => {
    if (!dateStr) return 0;
    const [y, m, d] = dateStr.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };

  // Difference in calendar days: d2Str - d1Str
  const getCalendarDayDiff = (d1Str: string, d2Str: string): number => {
    const ms1 = parseDateToUtcMs(d1Str);
    const ms2 = parseDateToUtcMs(d2Str);
    return Math.round((ms2 - ms1) / (1000 * 60 * 60 * 24));
  };

  // Add N days to a YYYY-MM-DD string
  const addDaysToDateStr = (dateStr: string, days: number): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().split('T')[0];
  };

  // Helper to calculate days duration of an attendance record
  const getRecordDaysCount = (rec: StaffAttendanceRecord) => {
    if (!rec.endDate || rec.endDate === rec.date) return 1;
    const diffDays = getCalendarDayDiff(rec.date, rec.endDate) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  // Clips or splits any existing present ranges when an exception (absent, leave, late, left_early) occurs
  // This ensures that when an employee is absent or on leave, the present streak stops immediately
  // and only starts again after the leave or absent day is done.
  const clipPresentRangesForException = (startDate: string, endDate?: string) => {
    const excStart = startDate;
    const excEnd = endDate || startDate;
    const allRecords = StorageService.getStaffAttendance();
    let modified = false;

    const updated = allRecords.flatMap((rec) => {
      if (rec.workerId !== worker.id || rec.status !== 'present') {
        return [rec];
      }

      const recStart = rec.date;
      const recEnd = rec.endDate || rec.date;

      // Check if exception overlaps with this present range
      const overlapStart = recStart > excStart ? recStart : excStart;
      const overlapEnd = recEnd < excEnd ? recEnd : excEnd;

      if (overlapStart <= overlapEnd) {
        modified = true;
        const pieces: StaffAttendanceRecord[] = [];

        // Left continuous present streak (before exception date)
        if (recStart < excStart) {
          const leftEnd = addDaysToDateStr(excStart, -1);
          pieces.push({
            ...rec,
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            date: recStart,
            endDate: leftEnd !== recStart ? leftEnd : undefined,
          });
        }

        // Right continuous present streak (resumes after exception date / leave)
        if (recEnd > excEnd) {
          const rightStart = addDaysToDateStr(excEnd, 1);
          pieces.push({
            ...rec,
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            date: rightStart,
            endDate: recEnd !== rightStart ? recEnd : undefined,
          });
        }

        return pieces;
      }

      return [rec];
    });

    if (modified) {
      StorageService.saveStaffAttendance(updated);
    }
  };

  // Automatically consolidates consecutive present days into a single start & end range
  // e.g. Aug 13 to Oct 13. When absent or on leave occurs, the streak stops and restarts next day.
  const consolidateWorkerAttendanceRecords = (
    rawRecords: StaffAttendanceRecord[]
  ): StaffAttendanceRecord[] => {
    if (!rawRecords || rawRecords.length === 0) return [];

    // Sort ascending by start date, then end date
    const sorted = [...rawRecords].sort((a, b) => {
      const dComp = a.date.localeCompare(b.date);
      if (dComp !== 0) return dComp;
      const aEnd = a.endDate || a.date;
      const bEnd = b.endDate || b.date;
      return aEnd.localeCompare(bEnd);
    });

    const consolidated: StaffAttendanceRecord[] = [];

    for (const item of sorted) {
      const itemStart = item.date;
      const itemEnd = item.endDate || item.date;

      if (consolidated.length === 0) {
        consolidated.push({
          ...item,
          endDate: itemEnd !== itemStart ? itemEnd : undefined,
        });
        continue;
      }

      const last = consolidated[consolidated.length - 1];
      const lastStart = last.date;
      const lastEnd = last.endDate || last.date;

      // --- SCENARIO 1: BOTH ARE PRESENT ---
      if (last.status === 'present' && item.status === 'present') {
        const diffFromLastEnd = getCalendarDayDiff(lastEnd, itemStart);

        // Same day or duplicate/overlapping present record
        if (diffFromLastEnd <= 0) {
          if (getCalendarDayDiff(lastEnd, itemEnd) > 0) {
            last.endDate = itemEnd;
          }
          if (!last.notes && item.notes) {
            last.notes = item.notes;
          }
          continue;
        }

        // Consecutive days (e.g. yesterday -> today, diff === 1)
        if (diffFromLastEnd === 1) {
          last.endDate = itemEnd;
          if (!last.notes && item.notes) {
            last.notes = item.notes;
          }
          continue;
        }

        // Gap of 2+ days: streak broken, start new record
        consolidated.push({
          ...item,
          endDate: itemEnd !== itemStart ? itemEnd : undefined,
        });
        continue;
      }

      // --- SCENARIO 2: CONSECUTIVE LEAVES WITH MATCHING REASON ---
      if (last.status === 'leave' && item.status === 'leave' && last.notes === item.notes) {
        const diffFromLastEnd = getCalendarDayDiff(lastEnd, itemStart);
        if (diffFromLastEnd <= 1) {
          if (getCalendarDayDiff(lastEnd, itemEnd) > 0) {
            last.endDate = itemEnd;
          }
          continue;
        }
      }

      // --- SCENARIO 3: STATUS BREAK (absent, late, left_early, leave) ---
      // If previous record was present and overlaps with this exception, shorten the present range
      if (last.status === 'present' && item.status !== 'present') {
        if (getCalendarDayDiff(lastEnd, itemStart) <= 0) {
          if (itemStart === lastStart) {
            if (getCalendarDayDiff(lastStart, lastEnd) > 0) {
              last.date = addDaysToDateStr(itemStart, 1);
              if (last.date === last.endDate) {
                delete last.endDate;
              }
            } else {
              consolidated.pop();
            }
          } else {
            const newEnd = addDaysToDateStr(itemStart, -1);
            last.endDate = newEnd !== last.date ? newEnd : undefined;
          }
        }
      }

      consolidated.push({
        ...item,
        endDate: itemEnd !== itemStart ? itemEnd : undefined,
      });
    }

    return consolidated;
  };

  // --- DELETE CONFIRMATION MODAL STATE ---
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirmDelete = (title: string, message: string, onConfirm: () => void) => {
    setDeleteConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  // Load Data on Mount
  useEffect(() => {
    loadStaffData();
  }, [worker.id]);

  const loadStaffData = () => {
    let rawAtt = StorageService.getStaffAttendance(worker.id);
    const consolidated = consolidateWorkerAttendanceRecords(rawAtt);

    // Save if consolidated merged consecutive days or cleaned duplicates
    const isDifferent =
      consolidated.length !== rawAtt.length ||
      JSON.stringify(consolidated) !== JSON.stringify(rawAtt);

    if (isDifferent) {
      const allRecords = StorageService.getStaffAttendance();
      const otherWorkers = allRecords.filter((r) => r.workerId !== worker.id);
      StorageService.saveStaffAttendance([...otherWorkers, ...consolidated]);
      rawAtt = consolidated;
    }

    // Sort descending by effective date for the UI list
    const sortedForDisplay = [...rawAtt].sort((a, b) => {
      const aEnd = a.endDate || a.date;
      const bEnd = b.endDate || b.date;
      return bEnd.localeCompare(aEnd);
    });

    setAttendanceList(sortedForDisplay);
    setSalesList(StorageService.getStaffSales(worker.id));
    setLossesList(StorageService.getStaffLosses(worker.id));
    setIncidentsList(StorageService.getStaffIncidents(worker.id));
  };

  // --- ATTENDANCE FORM STATE ---
  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [attDate, setAttDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<StaffAttendanceStatus>('present');
  const [attCheckIn, setAttCheckIn] = useState<string>('08:00 AM');
  const [attCheckOut, setAttCheckOut] = useState<string>('05:00 PM');
  const [attNotes, setAttNotes] = useState<string>('');
  const [editingAttId, setEditingAttId] = useState<string | null>(null);

  // --- LEAVE MODAL / SCHEDULING STATE ---
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [leaveStartDate, setLeaveStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [leavePaid, setLeavePaid] = useState<boolean>(true);

  // --- LATE MODAL STATE ---
  const [showLateModal, setShowLateModal] = useState<boolean>(false);
  const [lateDate, setLateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lateTime, setLateTime] = useState<string>('09:00 AM');
  const [lateNotes, setLateNotes] = useState<string>('');
  const [editingLateId, setEditingLateId] = useState<string | null>(null);

  // --- ABSENT MODAL STATE ---
  const [showAbsentModal, setShowAbsentModal] = useState<boolean>(false);
  const [absentDate, setAbsentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [absentNotes, setAbsentNotes] = useState<string>('');
  const [editingAbsentId, setEditingAbsentId] = useState<string | null>(null);

  // --- PRESENT MODAL STATE ---
  const [showPresentModal, setShowPresentModal] = useState<boolean>(false);
  const [presentDate, setPresentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [presentEndDate, setPresentEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [presentCheckIn, setPresentCheckIn] = useState<string>('08:00 AM');
  const [presentCheckOut, setPresentCheckOut] = useState<string>('05:00 PM');
  const [presentNotes, setPresentNotes] = useState<string>('');
  const [editingPresentId, setEditingPresentId] = useState<string | null>(null);

  // --- LEFT EARLY MODAL STATE ---
  const [showLeftEarlyModal, setShowLeftEarlyModal] = useState<boolean>(false);
  const [leftEarlyDate, setLeftEarlyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leftEarlyCheckIn, setLeftEarlyCheckIn] = useState<string>('08:00 AM');
  const [leftEarlyTime, setLeftEarlyTime] = useState<string>('02:00 PM');
  const [leftEarlyNotes, setLeftEarlyNotes] = useState<string>('');
  const [editingLeftEarlyId, setEditingLeftEarlyId] = useState<string | null>(null);

  // --- SALES FORM STATE ---
  const [showAddSale, setShowAddSale] = useState(false);
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saleItem, setSaleItem] = useState<string>('');
  const [saleAmount, setSaleAmount] = useState<string>('');
  const [saleCommission, setSaleCommission] = useState<string>('');
  const [saleCustomer, setSaleCustomer] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [isStockPickerOpen, setIsStockPickerOpen] = useState<boolean>(false);

  // --- LOSSES FORM STATE ---
  const [showAddLoss, setShowAddLoss] = useState(false);
  const [lossDate, setLossDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lossTitle, setLossTitle] = useState<string>('');
  const [lossAmount, setLossAmount] = useState<string>('');
  const [lossStatus, setLossStatus] = useState<StaffLossStatus>('deducted');
  const [lossNotes, setLossNotes] = useState<string>('');
  const [editingLossId, setEditingLossId] = useState<string | null>(null);

  // --- INCIDENTS / MISTAKES FORM STATE ---
  const [showAddIncident, setShowAddIncident] = useState(false);
  const [incDate, setIncDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [incType, setIncType] = useState<StaffIncidentType>('mistake');
  const [incTitle, setIncTitle] = useState<string>('');
  const [incSeverity, setIncSeverity] = useState<StaffIncidentSeverity>('moderate');
  const [incAction, setIncAction] = useState<string>('');
  const [incNotes, setIncNotes] = useState<string>('');
  const [editingIncId, setEditingIncId] = useState<string | null>(null);

  // --- ATTENDANCE CATEGORY SELECTION ---
  type AttendanceCategoryType = 'all' | 'present' | 'late' | 'absent' | 'leave' | 'left_early';
  const [attendanceCategory, setAttendanceCategory] = useState<AttendanceCategoryType>('all');

  // --- TIMEFRAME FILTER ('today' | 'week' | 'month' | 'year' | 'all' | 'custom') ---
  type StaffTimeframeFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
  const [timeframeFilter, setTimeframeFilter] = useState<StaffTimeframeFilter>('all');
  const [customFilterDate, setCustomFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showStaffAnalytics, setShowStaffAnalytics] = useState<boolean>(false);
  const [showTodayAttendanceManagement, setShowTodayAttendanceManagement] = useState<boolean>(false);

  const getTimeframeLabel = (tf: StaffTimeframeFilter): string => {
    switch (tf) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'all': return 'All Time';
      case 'custom':
        if (customFilterDate) {
          const parts = customFilterDate.split('-').map(Number);
          if (parts.length === 3) {
            const dt = new Date(parts[0], parts[1] - 1, parts[2]);
            return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          }
        }
        return 'Selected Date';
    }
  };

  // Timeframe boundaries
  const timeframeBoundaries = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    // Monday to Sunday for this week
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const thisMonthStart = `${curYear}-${curMonth}-01`;
    const lastDayOfMonth = new Date(curYear, now.getMonth() + 1, 0).getDate();
    const thisMonthEnd = `${curYear}-${curMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const thisYearStart = `${curYear}-01-01`;
    const thisYearEnd = `${curYear}-12-31`;

    let start = '';
    let end = '';

    if (timeframeFilter === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (timeframeFilter === 'custom') {
      start = customFilterDate;
      end = customFilterDate;
    } else if (timeframeFilter === 'week') {
      start = mondayStr;
      end = sundayStr;
    } else if (timeframeFilter === 'month') {
      start = thisMonthStart;
      end = thisMonthEnd;
    } else if (timeframeFilter === 'year') {
      start = thisYearStart;
      end = thisYearEnd;
    }

    return { start, end, todayStr, mondayStr, sundayStr, thisMonthStr: `${curYear}-${curMonth}`, thisYearStr: `${curYear}` };
  }, [timeframeFilter, customFilterDate]);

  // Helper to calculate days duration of an attendance record within the active timeframe
  const getRecordDaysWithinTimeframe = (rec: StaffAttendanceRecord): number => {
    if (timeframeFilter === 'all') {
      return getRecordDaysCount(rec);
    }
    const { start: tfStart, end: tfEnd } = timeframeBoundaries;
    const recStart = rec.date;
    const recEnd = rec.endDate || rec.date;

    const oStart = recStart > tfStart ? recStart : tfStart;
    const oEnd = recEnd < tfEnd ? recEnd : tfEnd;

    if (oStart <= oEnd) {
      const diff = getCalendarDayDiff(oStart, oEnd) + 1;
      return diff > 0 ? diff : 1;
    }
    return 0;
  };

  // Filter single-date records (sales, losses, incidents)
  const isDateInTimeframe = (dateStr: string): boolean => {
    if (timeframeFilter === 'all') return true;
    if (!dateStr) return false;
    const { start: tfStart, end: tfEnd } = timeframeBoundaries;
    return dateStr >= tfStart && dateStr <= tfEnd;
  };

  // Timeframe filtered lists
  const timeframeAttendanceList = useMemo(() => {
    if (timeframeFilter === 'all') return attendanceList;
    return attendanceList.filter((rec) => getRecordDaysWithinTimeframe(rec) > 0);
  }, [attendanceList, timeframeFilter, timeframeBoundaries]);

  const timeframeSalesList = useMemo(() => {
    if (timeframeFilter === 'all') return salesList;
    return salesList.filter((s) => {
      const d = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
      return isDateInTimeframe(d);
    });
  }, [salesList, timeframeFilter, timeframeBoundaries]);

  const timeframeLossesList = useMemo(() => {
    if (timeframeFilter === 'all') return lossesList;
    return lossesList.filter((l) => isDateInTimeframe(l.date));
  }, [lossesList, timeframeFilter, timeframeBoundaries]);

  const timeframeIncidentsList = useMemo(() => {
    if (timeframeFilter === 'all') return incidentsList;
    return incidentsList.filter((i) => isDateInTimeframe(i.date));
  }, [incidentsList, timeframeFilter, timeframeBoundaries]);

  // --- CALCULATED METRICS (REFLECTING ACTIVE TIMEFRAME) ---
  const totalDaysPresent = timeframeAttendanceList
    .filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'half_day' || a.status === 'left_early')
    .reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  const totalDaysMissed = timeframeAttendanceList
    .filter((a) => a.status === 'absent')
    .reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  const totalDaysLeave = timeframeAttendanceList
    .filter((a) => a.status === 'leave')
    .reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  const totalDaysTotal = timeframeAttendanceList.reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  const attendanceRate =
    totalDaysTotal > 0
      ? Math.round((totalDaysPresent / totalDaysTotal) * 100)
      : 100;

  // Category specific day counts for analytics
  const presentDaysCount = timeframeAttendanceList
    .filter((a) => a.status === 'present')
    .reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  const lateDaysCount = timeframeAttendanceList
    .filter((a) => a.status === 'late')
    .reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  const absentDaysCount = timeframeAttendanceList
    .filter((a) => a.status === 'absent')
    .reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  const leaveDaysCount = timeframeAttendanceList
    .filter((a) => a.status === 'leave')
    .reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  const leftEarlyDaysCount = timeframeAttendanceList
    .filter((a) => a.status === 'left_early')
    .reduce((sum, a) => sum + getRecordDaysWithinTimeframe(a), 0);

  // Filtered attendance list based on selected category within timeframe
  const filteredAttendanceList = attendanceCategory === 'all'
    ? timeframeAttendanceList
    : timeframeAttendanceList.filter((a) => a.status === attendanceCategory);

  const totalSalesAmount = timeframeSalesList.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalCommissions = timeframeSalesList.reduce((sum, s) => sum + (Number(s.commission) || 0), 0);

  const totalLossesIncurred = timeframeLossesList.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalLossesDeducted = timeframeLossesList
    .filter((l) => l.status === 'deducted')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalLossesWaived = timeframeLossesList
    .filter((l) => l.status === 'waived')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const totalMistakes = timeframeIncidentsList.filter((i) => i.type === 'mistake' || i.type === 'warning').length;
  const totalCommendations = timeframeIncidentsList.filter((i) => i.type === 'appreciation').length;

  // Net Estimated Salary Payable = Base Salary + Commissions - Deducted Losses
  const netEstimatedPay = Math.max(0, (worker.salary || 0) + totalCommissions - totalLossesDeducted);

  // --- QUICK ATTENDANCE ACTION (One-click Today) ---
  const handleQuickMarkToday = (status: StaffAttendanceStatus) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (status === 'leave') {
      setLeaveStartDate(todayStr);
      setLeaveEndDate(todayStr);
      setShowLeaveModal(true);
      return;
    }
    if (status === 'late') {
      setEditingLateId(null);
      setLateDate(todayStr);
      setLateTime('09:00 AM');
      setLateNotes('');
      setShowLateModal(true);
      return;
    }
    if (status === 'absent') {
      setEditingAbsentId(null);
      setAbsentDate(todayStr);
      setAbsentNotes('');
      setShowAbsentModal(true);
      return;
    }
    if (status === 'present') {
      setEditingPresentId(null);
      setPresentDate(todayStr);
      setPresentEndDate(todayStr);
      setPresentCheckIn('08:00 AM');
      setPresentCheckOut('05:00 PM');
      setPresentNotes('');
      setShowPresentModal(true);
      return;
    }
    if (status === 'left_early') {
      setEditingLeftEarlyId(null);
      setLeftEarlyDate(todayStr);
      setLeftEarlyCheckIn('08:00 AM');
      setLeftEarlyTime('02:00 PM');
      setLeftEarlyNotes('');
      setShowLeftEarlyModal(true);
      return;
    }

    // Clipping present streak for today if another status is marked
    clipPresentRangesForException(todayStr);

    StorageService.addStaffAttendance({
      workerId: worker.id,
      date: todayStr,
      status,
      checkInTime: '08:00 AM',
      checkOutTime: '05:00 PM',
      notes: `Logged as ${status}`,
    });
    showToast(`Added ${status.toUpperCase()} record for ${worker.name}`);
    loadStaffData();
  };

  // --- PRESENT MODAL HANDLER ---
  const handleSavePresentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presentDate) return;

    const startDate = presentDate;
    const endDate = presentEndDate && presentEndDate > presentDate ? presentEndDate : undefined;

    if (editingPresentId) {
      StorageService.updateStaffAttendance(editingPresentId, {
        date: startDate,
        endDate: endDate,
        status: 'present',
        checkInTime: presentCheckIn.trim() || '08:00 AM',
        checkOutTime: presentCheckOut.trim() || '05:00 PM',
        notes: presentNotes.trim() || undefined,
      });
      showToast('Present record updated');
    } else {
      StorageService.addStaffAttendance({
        workerId: worker.id,
        date: startDate,
        endDate: endDate,
        status: 'present',
        checkInTime: presentCheckIn.trim() || '08:00 AM',
        checkOutTime: presentCheckOut.trim() || '05:00 PM',
        notes: presentNotes.trim() || undefined,
      });
      showToast(`Present record saved for ${worker.name}`);
    }

    setShowPresentModal(false);
    setEditingPresentId(null);
    setPresentNotes('');
    loadStaffData();
  };

  // --- LEFT EARLY MODAL HANDLER ---
  const handleSaveLeftEarlyModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leftEarlyDate) return;

    // Interrupt/clip any continuous present streak for this day
    clipPresentRangesForException(leftEarlyDate);

    if (editingLeftEarlyId) {
      StorageService.updateStaffAttendance(editingLeftEarlyId, {
        date: leftEarlyDate,
        status: 'left_early',
        checkInTime: leftEarlyCheckIn.trim() || '08:00 AM',
        checkOutTime: leftEarlyTime.trim() || '02:00 PM',
        notes: leftEarlyNotes.trim() || undefined,
      });
      showToast('Left early record updated');
    } else {
      StorageService.addStaffAttendance({
        workerId: worker.id,
        date: leftEarlyDate,
        status: 'left_early',
        checkInTime: leftEarlyCheckIn.trim() || '08:00 AM',
        checkOutTime: leftEarlyTime.trim() || '02:00 PM',
        notes: leftEarlyNotes.trim() || undefined,
      });
      showToast(`Left early record saved for ${worker.name}`);
    }

    setShowLeftEarlyModal(false);
    setEditingLeftEarlyId(null);
    setLeftEarlyNotes('');
    loadStaffData();
  };

  // --- LATE MODAL HANDLER ---
  const handleSaveLateModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lateDate) return;

    // Interrupt/clip any continuous present streak for this day
    clipPresentRangesForException(lateDate);

    const formattedNotes = lateNotes.trim() ? `Late: ${lateNotes.trim()}` : 'Late arrival';
    if (editingLateId) {
      StorageService.updateStaffAttendance(editingLateId, {
        date: lateDate,
        status: 'late',
        checkInTime: lateTime || '09:00 AM',
        notes: formattedNotes,
      });
      showToast('Late attendance record updated');
    } else {
      StorageService.addStaffAttendance({
        workerId: worker.id,
        date: lateDate,
        status: 'late',
        checkInTime: lateTime || '09:00 AM',
        checkOutTime: '05:00 PM',
        notes: formattedNotes,
      });
      showToast(`Late record saved for ${worker.name}`);
    }

    setShowLateModal(false);
    setEditingLateId(null);
    setLateNotes('');
    loadStaffData();
  };

  // --- ABSENT MODAL HANDLER ---
  const handleSaveAbsentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!absentDate) return;

    // Interrupt/clip any continuous present streak for this day
    // This stops the streak and resumes only on the next working day!
    clipPresentRangesForException(absentDate);

    const formattedNotes = absentNotes.trim() ? `Absent: ${absentNotes.trim()}` : 'Absent';
    if (editingAbsentId) {
      StorageService.updateStaffAttendance(editingAbsentId, {
        date: absentDate,
        status: 'absent',
        notes: formattedNotes,
      });
      showToast('Absent record updated');
    } else {
      StorageService.addStaffAttendance({
        workerId: worker.id,
        date: absentDate,
        status: 'absent',
        notes: formattedNotes,
      });
      showToast(`Absent record saved for ${worker.name}`);
    }

    setShowAbsentModal(false);
    setEditingAbsentId(null);
    setAbsentNotes('');
    loadStaffData();
  };

  // --- LEAVE SCHEDULING HANDLER ---
  const calculateLeaveDaysCount = () => {
    if (!leaveStartDate || !leaveEndDate) return 1;
    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate) return;

    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);

    if (end < start) {
      alert('Leave end date cannot be earlier than start date.');
      return;
    }

    const diffTime = end.getTime() - start.getTime();
    const daysApplied = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Interrupt/clip any continuous present streak for this entire leave duration
    // Present streak stops when leave starts and resumes when the leave is done!
    clipPresentRangesForException(leaveStartDate, leaveEndDate);

    const reasonText = leaveReason.trim() ? `: ${leaveReason.trim()}` : '';
    const payStatusText = leavePaid ? ' (Paid)' : ' (Unpaid)';
    const formattedNotes = `Leave${reasonText}${payStatusText}`;

    // Add new leave record
    StorageService.addStaffAttendance({
      workerId: worker.id,
      date: leaveStartDate,
      endDate: leaveStartDate !== leaveEndDate ? leaveEndDate : undefined,
      status: 'leave',
      notes: formattedNotes,
    });

    showToast(`Leave granted for ${daysApplied} day${daysApplied > 1 ? 's' : ''}`);
    setShowLeaveModal(false);
    setLeaveReason('');
    loadStaffData();
  };

  // --- SAVE ATTENDANCE RECORD ---
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attDate) return;

    if (attStatus !== 'present') {
      clipPresentRangesForException(attDate);
    }

    if (editingAttId) {
      StorageService.updateStaffAttendance(editingAttId, {
        date: attDate,
        status: attStatus,
        checkInTime: attCheckIn.trim() || undefined,
        checkOutTime: attCheckOut.trim() || undefined,
        notes: attNotes.trim() || undefined,
      });
      showToast('Attendance record updated');
    } else {
      StorageService.addStaffAttendance({
        workerId: worker.id,
        date: attDate,
        status: attStatus,
        checkInTime: attCheckIn.trim() || undefined,
        checkOutTime: attCheckOut.trim() || undefined,
        notes: attNotes.trim() || undefined,
      });
      showToast('Attendance recorded');
    }
    AdMobService.showInterstitial('staff_attendance_recorded');

    setEditingAttId(null);
    setShowAddAttendance(false);
    setAttNotes('');
    loadStaffData();
  };

  const handleEditAttendance = (record: StaffAttendanceRecord) => {
    if (record.status === 'leave') {
      setLeaveStartDate(record.date);
      setLeaveEndDate(record.endDate || record.date);
      setLeaveReason(record.notes ? record.notes.replace(/^Leave(: )?/, '').replace(/\s*\((Paid|Unpaid)\)$/, '') : '');
      setLeavePaid(!record.notes || !record.notes.includes('(Unpaid)'));
      setShowLeaveModal(true);
      return;
    }
    if (record.status === 'late') {
      setEditingLateId(record.id);
      setLateDate(record.date);
      setLateTime(record.checkInTime || '09:00 AM');
      setLateNotes(record.notes ? record.notes.replace(/^Late:\s*/, '') : '');
      setShowLateModal(true);
      return;
    }
    if (record.status === 'absent') {
      setEditingAbsentId(record.id);
      setAbsentDate(record.date);
      setAbsentNotes(record.notes ? record.notes.replace(/^Absent:\s*/, '') : '');
      setShowAbsentModal(true);
      return;
    }
    if (record.status === 'present') {
      setEditingPresentId(record.id);
      setPresentDate(record.date);
      setPresentEndDate(record.endDate || record.date);
      setPresentCheckIn(record.checkInTime || '08:00 AM');
      setPresentCheckOut(record.checkOutTime || '05:00 PM');
      setPresentNotes(record.notes || '');
      setShowPresentModal(true);
      return;
    }
    if (record.status === 'left_early') {
      setEditingLeftEarlyId(record.id);
      setLeftEarlyDate(record.date);
      setLeftEarlyCheckIn(record.checkInTime || '08:00 AM');
      setLeftEarlyTime(record.checkOutTime || '02:00 PM');
      setLeftEarlyNotes(record.notes || '');
      setShowLeftEarlyModal(true);
      return;
    }
    setEditingAttId(record.id);
    setAttDate(record.date);
    setAttStatus(record.status);
    setAttCheckIn(record.checkInTime || '08:00 AM');
    setAttCheckOut(record.checkOutTime || '05:00 PM');
    setAttNotes(record.notes || '');
    setShowAddAttendance(true);
  };

  const handleDeleteAttendance = (id: string) => {
    showConfirmDelete(
      'Delete Attendance Record',
      'Are you sure you want to delete this attendance record?',
      () => {
        StorageService.deleteStaffAttendance(id);
        showToast('Attendance record deleted');
        loadStaffData();
      }
    );
  };

  // --- SAVE SALE RECORD ---
  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(saleAmount);
    if (!saleItem.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid item description and sale amount');
      return;
    }

    const parsedCommission = parseFloat(saleCommission) || 0;

    if (editingSaleId) {
      StorageService.updateStaffSale(editingSaleId, {
        date: saleDate,
        itemSold: saleItem.trim(),
        amount: parsedAmount,
        commission: parsedCommission > 0 ? parsedCommission : undefined,
        customerName: saleCustomer.trim() || undefined,
        notes: saleNotes.trim() || undefined,
      });
      showToast('Staff sale record updated');
    } else {
      StorageService.addStaffSale({
        workerId: worker.id,
        date: saleDate,
        itemSold: saleItem.trim(),
        amount: parsedAmount,
        commission: parsedCommission > 0 ? parsedCommission : undefined,
        customerName: saleCustomer.trim() || undefined,
        notes: saleNotes.trim() || undefined,
      });
      showToast(`Logged sale: ${currency} ${parsedAmount.toLocaleString()}`);
    }
    AdMobService.showInterstitial('staff_sale_recorded');

    setEditingSaleId(null);
    setShowAddSale(false);
    setSaleItem('');
    setSaleAmount('');
    setSaleCommission('');
    setSaleCustomer('');
    setSaleNotes('');
    loadStaffData();
  };

  const handleEditSale = (record: StaffSaleRecord) => {
    setEditingSaleId(record.id);
    setSaleDate(record.date);
    setSaleItem(record.itemSold);
    setSaleAmount(String(record.amount));
    setSaleCommission(record.commission ? String(record.commission) : '');
    setSaleCustomer(record.customerName || '');
    setSaleNotes(record.notes || '');
    setShowAddSale(true);
  };

  const handleDeleteSale = (id: string) => {
    showConfirmDelete(
      'Delete Sale Record',
      'Are you sure you want to delete this staff sale record?',
      () => {
        StorageService.deleteStaffSale(id);
        showToast('Sale record deleted');
        loadStaffData();
      }
    );
  };

  // --- SAVE LOSS RECORD ---
  const handleSaveLoss = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(lossAmount);
    if (!lossTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter loss description and a valid amount');
      return;
    }

    if (editingLossId) {
      StorageService.updateStaffLoss(editingLossId, {
        date: lossDate,
        title: lossTitle.trim(),
        amount: parsedAmount,
        status: lossStatus,
        notes: lossNotes.trim() || undefined,
      });
      showToast('Loss record updated');
    } else {
      StorageService.addStaffLoss({
        workerId: worker.id,
        date: lossDate,
        title: lossTitle.trim(),
        amount: parsedAmount,
        status: lossStatus,
        notes: lossNotes.trim() || undefined,
      });
      showToast(`Recorded loss of ${currency} ${parsedAmount.toLocaleString()}`);
    }
    AdMobService.showInterstitial('staff_loss_recorded');

    setEditingLossId(null);
    setShowAddLoss(false);
    setLossTitle('');
    setLossAmount('');
    setLossNotes('');
    loadStaffData();
  };

  const handleEditLoss = (record: StaffLossRecord) => {
    setEditingLossId(record.id);
    setLossDate(record.date);
    setLossTitle(record.title);
    setLossAmount(String(record.amount));
    setLossStatus(record.status);
    setLossNotes(record.notes || '');
    setShowAddLoss(true);
  };

  const handleDeleteLoss = (id: string) => {
    showConfirmDelete(
      'Delete Loss Record',
      'Are you sure you want to delete this loss record?',
      () => {
        StorageService.deleteStaffLoss(id);
        showToast('Loss record deleted');
        loadStaffData();
      }
    );
  };

  const handleToggleLossStatus = (record: StaffLossRecord) => {
    const nextStatus: StaffLossStatus =
      record.status === 'deducted'
        ? 'waived'
        : record.status === 'waived'
        ? 'repaid'
        : record.status === 'repaid'
        ? 'pending'
        : record.status === 'pending'
        ? 'none'
        : 'deducted';

    StorageService.updateStaffLoss(record.id, { status: nextStatus });
    showToast(`Loss status changed to ${nextStatus.toUpperCase()}`);
    loadStaffData();
  };

  // --- SAVE INCIDENT / MISTAKE RECORD ---
  const handleSaveIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim()) {
      alert('Please enter a description or title for this incident');
      return;
    }

    if (editingIncId) {
      StorageService.updateStaffIncident(editingIncId, {
        date: incDate,
        type: incType,
        title: incTitle.trim(),
        severity: incSeverity,
        actionTaken: incAction.trim() || undefined,
        notes: incNotes.trim() || undefined,
      });
      showToast('Incident record updated');
    } else {
      StorageService.addStaffIncident({
        workerId: worker.id,
        date: incDate,
        type: incType,
        title: incTitle.trim(),
        severity: incSeverity,
        actionTaken: incAction.trim() || undefined,
        notes: incNotes.trim() || undefined,
      });
      showToast('Incident / Mistake logged successfully');
    }
    AdMobService.showInterstitial('staff_incident_recorded');

    setEditingIncId(null);
    setShowAddIncident(false);
    setIncTitle('');
    setIncAction('');
    setIncNotes('');
    loadStaffData();
  };

  const handleEditIncident = (record: StaffIncidentRecord) => {
    setEditingIncId(record.id);
    setIncDate(record.date);
    setIncType(record.type);
    setIncTitle(record.title);
    setIncSeverity(record.severity || 'moderate');
    setIncAction(record.actionTaken || '');
    setIncNotes(record.notes || '');
    setShowAddIncident(true);
  };

  const handleDeleteIncident = (id: string) => {
    showConfirmDelete(
      'Delete Incident Record',
      'Are you sure you want to delete this incident record?',
      () => {
        StorageService.deleteStaffIncident(id);
        showToast('Incident record deleted');
        loadStaffData();
      }
    );
  };

  // --- EXPORT PDF PERFORMANCE & MANAGEMENT REPORT ---
  const handleExportStaffPDF = async () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 40;

      // Header Banner
      doc.setFillColor(14, 116, 144); // Sky/Cyan 700
      doc.rect(0, 0, pageWidth, 60, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(businessProfile.name || 'BUSINESS PERFORMANCE REPORT', 30, 35);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('STAFF MANAGEMENT & AUDIT REPORT', pageWidth - 30, 35, { align: 'right' });

      y = 85;

      // Staff Summary Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(30, y, pageWidth - 60, 95, 6, 6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(30, y, pageWidth - 60, 95, 6, 6, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(worker.name, 45, y + 22);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Role: ${worker.role || 'Staff Member'}   |   Phone: ${worker.phone || 'N/A'}   |   NIN: ${worker.nin || 'N/A'}`, 45, y + 38);
      doc.text(`Base Salary: ${currency} ${worker.salary?.toLocaleString() || '0'} / ${worker.salaryPeriod || 'month'}`, 45, y + 54);
      doc.text(`Timeframe: ${getTimeframeLabel(timeframeFilter)}   |   Generated On: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 45, y + 70);

      // KPI Boxes on PDF
      const kpiY = y + 110;
      const kpiW = (pageWidth - 60 - 30) / 4;

      // Box 1: Days Worked
      doc.setFillColor(240, 253, 244); // Green 50
      doc.roundedRect(30, kpiY, kpiW, 45, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52);
      doc.text('DAYS WORKED', 38, kpiY + 15);
      doc.setFontSize(12);
      doc.text(`${totalDaysPresent} Days (${attendanceRate}%)`, 38, kpiY + 34);

      // Box 2: Total Sales
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.roundedRect(30 + kpiW + 10, kpiY, kpiW, 45, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 64, 175);
      doc.text('TOTAL SALES', 38 + kpiW + 10, kpiY + 15);
      doc.setFontSize(11);
      doc.text(`${currency} ${totalSalesAmount.toLocaleString()}`, 38 + kpiW + 10, kpiY + 34);

      // Box 3: Total Losses
      doc.setFillColor(254, 242, 242); // Red 50
      doc.roundedRect(30 + (kpiW + 10) * 2, kpiY, kpiW, 45, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(153, 27, 27);
      doc.text('TOTAL LOSSES', 38 + (kpiW + 10) * 2, kpiY + 15);
      doc.setFontSize(11);
      doc.text(`${currency} ${totalLossesIncurred.toLocaleString()}`, 38 + (kpiW + 10) * 2, kpiY + 34);

      // Box 4: Net Estimated Pay
      doc.setFillColor(254, 243, 199); // Amber 50
      doc.roundedRect(30 + (kpiW + 10) * 3, kpiY, kpiW, 45, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text('EST. PAYABLE', 38 + (kpiW + 10) * 3, kpiY + 15);
      doc.setFontSize(11);
      doc.text(`${currency} ${netEstimatedPay.toLocaleString()}`, 38 + (kpiW + 10) * 3, kpiY + 34);

      y = kpiY + 65;

      // Section: Recent Attendance
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('1. ATTENDANCE & WORK LOG SUMMARY', 30, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      if (timeframeAttendanceList.length === 0) {
        doc.text(`No attendance logs recorded for ${getTimeframeLabel(timeframeFilter).toLowerCase()}.`, 30, y);
        y += 18;
      } else {
        timeframeAttendanceList.slice(0, 8).forEach((att) => {
          const statusText = att.status.replace('_', ' ').toUpperCase();
          const timeText = att.checkInTime ? ` (${att.checkInTime} - ${att.checkOutTime || 'end'})` : '';
          const dateRange = att.endDate && att.endDate !== att.date
            ? `${att.date} to ${att.endDate} (${getRecordDaysCount(att)} days)`
            : att.date;
          doc.text(`• ${dateRange}: ${statusText}${timeText} - ${att.notes || 'No note'}`, 40, y);
          y += 13;
        });
      }

      y += 10;

      // Section: Losses & Damages
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('2. LOSSES, SHORTAGES & DAMAGES', 30, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      if (timeframeLossesList.length === 0) {
        doc.text(`No losses or shortages recorded for ${getTimeframeLabel(timeframeFilter).toLowerCase()}.`, 30, y);
        y += 18;
      } else {
        timeframeLossesList.slice(0, 6).forEach((loss) => {
          doc.text(`• ${loss.date}: ${loss.title} | ${currency} ${loss.amount.toLocaleString()} [Status: ${loss.status.toUpperCase()}]`, 40, y);
          y += 13;
        });
      }

      y += 10;

      // Section: Mistakes & Incidents
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('3. MISTAKES, INCIDENTS & COMMENDATIONS', 30, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      if (timeframeIncidentsList.length === 0) {
        doc.text(`No disciplinary or mistake incidents recorded for ${getTimeframeLabel(timeframeFilter).toLowerCase()}.`, 30, y);
        y += 18;
      } else {
        timeframeIncidentsList.slice(0, 6).forEach((inc) => {
          doc.text(`• ${inc.date} [${inc.type.toUpperCase()} / ${inc.severity || 'normal'}]: ${inc.title} - ${inc.actionTaken || 'No action specified'}`, 40, y);
          y += 13;
        });
      }

      y += 10;

      // Section: Sales Generated
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('4. SALES GENERATED BY STAFF', 30, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      if (timeframeSalesList.length === 0) {
        doc.text(`No sales recorded for ${getTimeframeLabel(timeframeFilter).toLowerCase()}.`, 30, y);
        y += 18;
      } else {
        timeframeSalesList.slice(0, 6).forEach((sale) => {
          const commText = sale.commission ? ` (+${currency} ${sale.commission.toLocaleString()} comm.)` : '';
          doc.text(`• ${sale.date}: ${sale.item} | Total: ${currency} ${sale.amount.toLocaleString()}${commText}`, 40, y);
          y += 13;
        });
      }

      // Save PDF
      const sanitizedName = worker.name.replace(/[^a-zA-Z0-9]/g, '_');
      const pdfFilename = `Staff_Report_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;
      await saveJsPdf(doc, pdfFilename, `Staff Report - ${worker.name}`);
      showToast('Staff report PDF exported!');
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const initials = worker.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full sm:h-[92vh] sm:max-h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleUp">
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 text-white p-3.5 sm:p-4 shrink-0 shadow-sm">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              {worker.profilePic ? (
                <img
                  src={worker.profilePic}
                  alt={worker.name}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover ring-2 ring-white/30 shadow-md shrink-0"
                />
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 text-white backdrop-blur-xs flex items-center justify-center font-black text-sm sm:text-base shadow-md shrink-0 border border-white/30">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight truncate text-white">
                    {worker.name}
                  </h3>
                  {worker.role && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide backdrop-blur-xs shrink-0">
                      {worker.role}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-header-export-staff-pdf"
                onClick={handleExportStaffPDF}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer border border-white/30 backdrop-blur-xs"
                title="Export all data and analytics PDF for this worker"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-white text-sky-900 hover:bg-sky-50 text-xs font-black flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                title="Done & Close"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition sm:hidden cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Timeframe Filter Buttons: Today | This Week | This Month | This Year | All Time | Select Date */}
          <div className="mt-3 bg-white/10 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-white/20 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'today' as StaffTimeframeFilter, label: 'Today' },
              { id: 'week' as StaffTimeframeFilter, label: 'This Week' },
              { id: 'month' as StaffTimeframeFilter, label: 'This Month' },
              { id: 'year' as StaffTimeframeFilter, label: 'This Year' },
              { id: 'all' as StaffTimeframeFilter, label: 'All Time' },
            ].map((f) => {
              const active = timeframeFilter === f.id;
              return (
                <button
                  key={f.id}
                  id={`btn-staff-filter-${f.id}`}
                  type="button"
                  onClick={() => setTimeframeFilter(f.id)}
                  className={`flex-1 min-w-[68px] py-1.5 px-2 rounded-xl font-bold text-xs text-center transition whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-md scale-[1.02]'
                      : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}

            {/* Custom Date Picker Button */}
            <div className="relative flex-1 min-w-[105px] flex items-center shrink-0">
              <button
                type="button"
                id="btn-staff-filter-custom"
                className={`w-full py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                  timeframeFilter === 'custom'
                    ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-md scale-[1.02]'
                    : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800/50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {timeframeFilter === 'custom' && customFilterDate
                    ? (() => {
                        const parts = customFilterDate.split('-').map(Number);
                        if (parts.length === 3) {
                          const d = new Date(parts[0], parts[1] - 1, parts[2]);
                          return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                        }
                        return customFilterDate;
                      })()
                    : 'Select Date'}
                </span>
              </button>
              <input
                type="date"
                value={customFilterDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomFilterDate(e.target.value);
                    setTimeframeFilter('custom');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Select specific date for staff analytics & records"
              />
            </div>
          </div>
        </div>

        {/* TOAST ALERT */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-fadeIn shrink-0">
            {toastMessage}
          </div>
        )}

        {/* 1. TOP NAVIGATION / BANNER (EITHER DEDICATED ANALYTICS TOOLBAR OR DEDICATED ATTENDANCE MANAGEMENT TOOLBAR OR PROMINENT OPEN BUTTON + TABS) */}
        {activeTab === 'analytics' ? (
          /* DEDICATED STAFF ANALYTICS TOP TOOLBAR */
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
            <button
              type="button"
              id="btn-back-to-management"
              onClick={() => setActiveTab('sales')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs group"
            >
              <ArrowLeft className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Staff Management</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Period: <span className="text-sky-600 dark:text-sky-400 font-bold">{getTimeframeLabel(timeframeFilter)}</span>
              </span>
              <button
                type="button"
                id="btn-export-staff-analytics"
                onClick={handleExportStaffPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-xs font-bold border border-sky-200 dark:border-sky-800 transition shadow-2xs cursor-pointer active:scale-95"
                title="Export Performance Audit PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'manage_attendance' ? (
          /* DEDICATED ATTENDANCE / WORK RECORDS MANAGEMENT TOP TOOLBAR */
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
            <button
              type="button"
              id="btn-back-from-attendance-management"
              onClick={() => setActiveTab('sales')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs group"
            >
              <ArrowLeft className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Staff Management</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex text-xs font-bold text-slate-700 dark:text-slate-200 items-center gap-1.5 mr-1">
                <CalendarCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>{worker.name}</span>
              </span>
              <button
                type="button"
                id="btn-export-working-days"
                onClick={handleExportStaffPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-xs font-bold border border-sky-200 dark:border-sky-800 transition shadow-2xs cursor-pointer active:scale-95"
                title="Export Working Days PDF Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* PROMINENT ACTION CARDS TO OPEN MANAGE WORKING DAYS & STAFF ANALYTICS */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Open Working Days Management */}
              <button
                type="button"
                id="btn-open-staff-attendance-mgmt"
                onClick={() => setActiveTab('manage_attendance')}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <CalendarCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-white block truncate">
                        Manage Working Days
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100 truncate font-medium mt-0.5">
                      Mark status, schedule leaves & work days
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-emerald-700 text-xs font-black shadow-xs shrink-0 group-hover:bg-emerald-50 group-hover:translate-x-0.5 transition-all">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Open Staff Analytics */}
              <button
                type="button"
                id="btn-open-staff-analytics"
                onClick={() => setActiveTab('analytics')}
                className="w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 hover:from-sky-700 hover:via-indigo-700 hover:to-sky-800 text-white rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-white block truncate">
                        Open {worker.name ? worker.name.trim().split(/\s+/).slice(-1)[0] : 'Staff'} Analytics
                      </span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-white/20 text-white backdrop-blur-xs">
                        {getTimeframeLabel(timeframeFilter)}
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-100 truncate font-medium mt-0.5">
                      Work days, sales, losses & earnings
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-sky-700 text-xs font-black shadow-xs shrink-0 group-hover:bg-sky-50 group-hover:translate-x-0.5 transition-all">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* MANAGEMENT FEATURE TABS (BELOW OPEN BUTTONS) */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 sm:px-4 overflow-x-auto no-scrollbar shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'sales'
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Sales Made</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                  {timeframeSalesList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('losses')}
                className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                  activeTab === 'losses'
                    ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Losses & Shortages</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                  {timeframeLossesList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                  activeTab === 'incidents'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-purple-500" />
                <span>Incidents / Mistakes</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                  {timeframeIncidentsList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                  activeTab === 'payroll'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-emerald-500" />
                <span>Salary & Due Pay</span>
              </button>
            </div>
          </>
        )}

        {/* MANAGEMENT FEATURES WORKSPACE */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/40 pb-16">
          {/* ========================================================= */}
          {/* DEDICATED TAB: STAFF ANALYTICS (THE ONLY PAGE OPEN) */}
          {/* ========================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-6">
              {/* Executive Overview Header Card */}
              <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 rounded-3xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                        Staff Performance Report
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900">
                        {getTimeframeLabel(timeframeFilter)}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                      <span>{worker.name}</span>
                      <span className="text-xs sm:text-sm font-semibold text-sky-200">
                        ({worker.role || 'Staff Member'})
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-sky-100/90 mt-1 max-w-2xl">
                      Comprehensive audit of attendance, revenue contribution, recorded losses, conduct and net payable compensation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('manage_attendance')}
                    className="self-start sm:self-center px-4 py-2 rounded-2xl bg-white text-sky-800 hover:bg-sky-50 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Exit Analytics View</span>
                  </button>
                </div>
              </div>

              {/* Top 5 KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {/* Attendance KPI */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance</span>
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {totalDaysPresent}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/ {totalDaysTotal} days</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {attendanceRate}% rate
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                    {totalDaysMissed} absent • {leaveDaysCount} leave
                  </div>
                </div>

                {/* Sales KPI */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sales Closed</span>
                    <div className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300 truncate">
                      {currency} {totalSalesAmount.toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {timeframeSalesList.length} sales logged
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-sky-600 dark:text-sky-400 font-medium truncate">
                    +{currency} {totalCommissions.toLocaleString()} commission
                  </div>
                </div>

                {/* Losses KPI */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Losses / Shortages</span>
                    <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 truncate">
                      {currency} {totalLossesIncurred.toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {timeframeLossesList.length} incidents recorded
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-rose-600 dark:text-rose-400 font-medium truncate">
                    {currency} {totalLossesDeducted.toLocaleString()} deducted
                  </div>
                </div>

                {/* Incidents KPI */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Conduct / Mistakes</span>
                    <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
                      <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {totalMistakes} <span className="text-xs font-normal text-slate-400">mistakes</span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {totalCommendations} commendations
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                    {totalMistakes === 0 ? 'Clean disciplinary record' : 'Action or warnings logged'}
                  </div>
                </div>

                {/* Est. Net Pay KPI */}
                <div className="col-span-2 sm:col-span-1 bg-gradient-to-tr from-emerald-500/15 via-emerald-500/10 to-teal-500/5 dark:bg-emerald-950/30 rounded-2xl p-3.5 sm:p-4 border border-emerald-300 dark:border-emerald-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Est. Net Due</span>
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 truncate">
                      {currency} {netEstimatedPay.toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Base: {currency} {(worker.salary || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    Payable for {getTimeframeLabel(timeframeFilter)}
                  </div>
                </div>
              </div>

              {/* Section 1: Detailed Attendance & Punctuality Breakdown */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        Working Days & Punctuality Breakdown
                      </h3>
                      <p className="text-xs text-slate-400">
                        Workdays recorded, late arrivals, and absence trends
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manage_attendance')}
                    className="self-start sm:self-auto text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>View Working Days</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Visual Multi-Color Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-300">Working Days Distribution</span>
                    <span className="text-slate-900 dark:text-white font-bold">{attendanceRate}% Work Attendance Rate</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    {totalDaysTotal > 0 ? (
                      <>
                        <div style={{ width: `${(presentDaysCount / totalDaysTotal) * 100}%` }} className="bg-emerald-500 transition-all duration-300" title={`Present: ${presentDaysCount} days`} />
                        <div style={{ width: `${(lateDaysCount / totalDaysTotal) * 100}%` }} className="bg-amber-500 transition-all duration-300" title={`Late: ${lateDaysCount} days`} />
                        <div style={{ width: `${(leftEarlyDaysCount / totalDaysTotal) * 100}%` }} className="bg-orange-500 transition-all duration-300" title={`Left Early: ${leftEarlyDaysCount} days`} />
                        <div style={{ width: `${(absentDaysCount / totalDaysTotal) * 100}%` }} className="bg-rose-500 transition-all duration-300" title={`Absent: ${absentDaysCount} days`} />
                        <div style={{ width: `${(leaveDaysCount / totalDaysTotal) * 100}%` }} className="bg-purple-500 transition-all duration-300" title={`Leave: ${leaveDaysCount} days`} />
                      </>
                    ) : (
                      <div className="w-full bg-slate-200 dark:bg-slate-700" />
                    )}
                  </div>
                </div>

                {/* Attendance Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Present</div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{presentDaysCount} days</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">On-time attendance</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                    <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">Late Arrivals</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">{lateDaysCount} days</div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400">Logged late</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                    <div className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase">Left Early</div>
                    <div className="text-lg font-black text-orange-700 dark:text-orange-300 mt-0.5">{leftEarlyDaysCount} days</div>
                    <div className="text-[10px] text-orange-600 dark:text-orange-400">Early departures</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                    <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">Absent Days</div>
                    <div className="text-lg font-black text-rose-700 dark:text-rose-300 mt-0.5">{absentDaysCount} days</div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400">Unexcused missed</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase">Approved Leave</div>
                    <div className="text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5">{leaveDaysCount} days</div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400">Granted time off</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Sales & Revenue Contribution + Losses & Conduct Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sales Analytics */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sales & Revenue Contribution</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('sales')}
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>View Sales</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      <div className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total Sales Value</span>
                        <span className="text-base font-black text-sky-700 dark:text-sky-300">
                          {currency} {totalSalesAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Transactions</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{timeframeSalesList.length}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Earned Commission</div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            +{currency} {totalCommissions.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {timeframeSalesList.length === 0
                      ? 'No sales registered for this employee within this period.'
                      : `Average value per transaction: ${currency} ${Math.round(totalSalesAmount / timeframeSalesList.length).toLocaleString()}`}
                  </p>
                </div>

                {/* Losses & Shortages Analytics */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Losses, Damages & Shortages</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('losses')}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>View Losses</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total Incurred Loss</span>
                        <span className="text-base font-black text-rose-600 dark:text-rose-400">
                          {currency} {totalLossesIncurred.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Deducted from Pay</div>
                          <div className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">
                            {currency} {totalLossesDeducted.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Waived / Forgiven</div>
                          <div className="text-sm font-black text-slate-700 dark:text-slate-300 mt-0.5">
                            {currency} {totalLossesWaived.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {totalLossesIncurred === 0
                      ? 'Excellent: zero losses or stock shortages recorded.'
                      : `${timeframeLossesList.length} loss record(s) logged in this period.`}
                  </p>
                </div>
              </div>

              {/* Section 3: Salary & Settlement Calculation Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        Estimated Salary & Settlement Breakdown
                      </h3>
                      <p className="text-xs text-slate-400">
                        Audit calculation of net pay based on active timeframe ({getTimeframeLabel(timeframeFilter)})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payroll')}
                    className="self-start sm:self-auto text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Open Full Payroll View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Base Salary ({worker.salaryPeriod || 'monthly'})
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      +{currency} {worker.salary ? worker.salary.toLocaleString() : '0'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                    <span className="font-semibold">Sales Commissions & Bonuses</span>
                    <span className="font-bold">
                      +{currency} {totalCommissions.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300">
                    <span className="font-semibold">Losses Deducted from Salary</span>
                    <span className="font-bold">
                      -{currency} {totalLossesDeducted.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm sm:text-base shadow-md mt-2">
                    <span>Estimated Net Payable</span>
                    <span>
                      {currency} {netEstimatedPay.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* DEDICATED WORK RECORDS / ATTENDANCE MANAGEMENT VIEW */}
          {/* ========================================================= */}
          {activeTab === 'manage_attendance' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Quick Check-in Banner for Today (Defaults to Present) */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const todayRecord = attendanceList.find((a) => {
                  const eDate = a.endDate || a.date;
                  return a.date <= todayStr && eDate >= todayStr;
                });
                const currentStatus = todayRecord ? todayRecord.status : 'present';

                return (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
                    {/* Heading for Attendance Management */}
                    <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            currentStatus === 'present'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : currentStatus === 'absent'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                              : currentStatus === 'late'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                              : currentStatus === 'left_early'
                              ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
                              : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          <CalendarCheck className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              Today's Work Status
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                              ({new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Current: {' '}
                            <span
                              className={`font-black uppercase inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md ${
                                currentStatus === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : currentStatus === 'absent'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                  : currentStatus === 'late'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                  : currentStatus === 'left_early'
                                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                              }`}
                            >
                              {currentStatus === 'present'
                                ? '🟢 Present'
                                : currentStatus === 'left_early'
                                ? '🚪 Left Early'
                                : currentStatus === 'late'
                                ? '🟡 Late'
                                : currentStatus === 'absent'
                                ? '🔴 Absent'
                                : '🟣 On Leave'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Tap status to mark:
                        </span>
                      </div>
                    </div>

                    {/* Quick status buttons directly visible and clickable */}
                    <div className="p-3.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        id="btn-quick-mark-present"
                        onClick={() => handleQuickMarkToday('present')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                          currentStatus === 'present'
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Add Present</span>
                      </button>

                      <button
                        type="button"
                        id="btn-quick-mark-absent"
                        onClick={() => handleQuickMarkToday('absent')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/50'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Add Absent</span>
                      </button>

                      <button
                        type="button"
                        id="btn-quick-mark-late"
                        onClick={() => handleQuickMarkToday('late')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                          currentStatus === 'late'
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/50'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>Add Late</span>
                      </button>

                      <button
                        type="button"
                        id="btn-quick-mark-left-early"
                        onClick={() => handleQuickMarkToday('left_early')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                          currentStatus === 'left_early'
                            ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-400/50'
                            : 'bg-orange-50 hover:bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200/50 dark:border-orange-800/50'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Add Left Early</span>
                      </button>

                      <button
                        type="button"
                        id="btn-quick-mark-leave"
                        onClick={() => handleQuickMarkToday('leave')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                          currentStatus === 'leave'
                            ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/50'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50'
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Add on Leave</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Attendance Category Headings lined from left to right (clean headings, no numbers) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all' as AttendanceCategoryType, label: 'All' },
                  { id: 'present' as AttendanceCategoryType, label: 'Present' },
                  { id: 'late' as AttendanceCategoryType, label: 'Late' },
                  { id: 'absent' as AttendanceCategoryType, label: 'Absent' },
                  { id: 'leave' as AttendanceCategoryType, label: 'Leave' },
                  { id: 'left_early' as AttendanceCategoryType, label: 'Left Early' },
                ].map((cat) => {
                  const isSelected = attendanceCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAttendanceCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-sky-600 dark:border-sky-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Inside Category Analytics (displays analytics for the selected category) */}
              {attendanceCategory === 'present' && (
                <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        He worked for {presentDaysCount} {presentDaysCount === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {attendanceList.filter((a) => a.status === 'present').length} present records logged on file
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full">
                    {attendanceRate}% Work Attendance
                  </span>
                </div>
              )}

              {attendanceCategory === 'late' && (
                <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                        He came late {lateDaysCount} {lateDaysCount === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        {attendanceList.filter((a) => a.status === 'late').length} late arrival records
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-full">
                    {lateDaysCount} Late Shifts
                  </span>
                </div>
              )}

              {attendanceCategory === 'absent' && (
                <div className="p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <XCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-950 dark:text-rose-200">
                        He was absent {absentDaysCount} {absentDaysCount === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400">
                        {attendanceList.filter((a) => a.status === 'absent').length} unexcused absence records
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-1 rounded-full">
                    {absentDaysCount} Days Missed
                  </span>
                </div>
              )}

              {attendanceCategory === 'leave' && (
                <div className="p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-950 dark:text-purple-200">
                        On leave for {leaveDaysCount} {leaveDaysCount === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-[11px] text-purple-700 dark:text-purple-400">
                        {attendanceList.filter((a) => a.status === 'leave').length} approved leave requests
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2.5 py-1 rounded-full">
                    {leaveDaysCount} Days Approved
                  </span>
                </div>
              )}

              {attendanceCategory === 'left_early' && (
                <div className="p-3 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-orange-950 dark:text-orange-200">
                        Left early {leftEarlyDaysCount} {leftEarlyDaysCount === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-[11px] text-orange-700 dark:text-orange-400">
                        {attendanceList.filter((a) => a.status === 'left_early').length} early departure records
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-orange-800 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/60 px-2.5 py-1 rounded-full">
                    {leftEarlyDaysCount} Days Early
                  </span>
                </div>
              )}

              {/* Header - Only visible when category is 'all' */}
              {attendanceCategory === 'all' && (
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Staff Working Days ({filteredAttendanceList.length})
                  </h4>
                </div>
              )}

              {/* Attendance List */}
              {attendanceList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No work records logged yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Click the quick status buttons above to monitor days worked vs missed.
                  </p>
                </div>
              ) : filteredAttendanceList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No {attendanceCategory === 'all' ? 'work' : attendanceCategory.replace('_', ' ')} records found {timeframeFilter !== 'all' ? `for ${getTimeframeLabel(timeframeFilter).toLowerCase()}` : `for ${worker.name}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframeFilter('all');
                      setAttendanceCategory('all');
                    }}
                    className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                  >
                    View all work records ({attendanceList.length})
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAttendanceList.map((att) => {
                    const isPresent = att.status === 'present';
                    const isAbsent = att.status === 'absent';
                    const isLate = att.status === 'late';
                    const isLeftEarly = att.status === 'left_early';
                    const isRange = att.endDate && att.endDate !== att.date;
                    const durationDays = getRecordDaysCount(att);

                    const formatDateStr = (dStr: string) => {
                      if (!dStr) return '';
                      const [y, m, d] = dStr.split('-').map(Number);
                      if (!y || !m || !d) return dStr;
                      const date = new Date(y, m - 1, d);
                      return date.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });
                    };

                    const badgeColor = isPresent
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : isAbsent
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : isLate
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : isLeftEarly
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';

                    return (
                      <div
                        key={att.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 hover:border-sky-200 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shrink-0">
                            {isPresent ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : isAbsent ? (
                              <XCircle className="w-5 h-5 text-rose-600" />
                            ) : isLate ? (
                              <Clock className="w-5 h-5 text-amber-600" />
                            ) : isLeftEarly ? (
                              <LogOut className="w-5 h-5 text-orange-600" />
                            ) : (
                              <Calendar className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {isRange ? (
                                  <>
                                    <span>{formatDateStr(att.date)}</span>
                                    <span className="text-slate-400 font-normal">to</span>
                                    <span>{formatDateStr(att.endDate!)}</span>
                                  </>
                                ) : (
                                  formatDateStr(att.date)
                                )}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeColor}`}>
                                {isRange
                                  ? `${att.status.replace('_', ' ')} • ${durationDays} DAYS`
                                  : att.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-slate-400 mt-0.5">
                              {att.checkInTime && (
                                <span>
                                  {isRange && isPresent ? 'Daily Shift: ' : ''}{att.checkInTime} {att.checkOutTime ? `→ ${att.checkOutTime}` : ''}
                                </span>
                              )}
                              {isRange && isPresent && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  • Continuous {durationDays} days worked
                                </span>
                              )}
                              {att.notes && <span className="italic text-slate-500">“{att.notes}”</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditAttendance(att)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttendance(att.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}


            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: SALES MADE */}
          {/* ========================================================= */}
          {activeTab === 'sales' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sales Generated by {worker.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Total: <strong className="text-sky-600 dark:text-sky-400">{currency} {totalSalesAmount.toLocaleString()}</strong> across {salesList.length} sales
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-record-staff-sale"
                  onClick={() => {
                    setEditingSaleId(null);
                    setShowAddSale(!showAddSale);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  {showAddSale ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>
                    {showAddSale
                      ? 'Cancel'
                      : `Record ${worker.name ? worker.name.trim().split(/\s+/).slice(-1)[0] : 'Staff'} Sale`}
                  </span>
                </button>
              </div>

              {/* Add / Edit Sale Form */}
              {showAddSale && (
                <form
                  onSubmit={handleSaveSale}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-sky-200 dark:border-slate-800 shadow-sm space-y-3 animate-scaleUp"
                >
                  <h5 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    <span>
                      {editingSaleId
                        ? 'Edit Sale Record'
                        : `Record Sale by ${worker.name ? worker.name.trim().split(/\s+/).slice(-1)[0] : 'Staff Member'}`}
                    </span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          Item / Goods Sold *
                        </label>
                        <button
                          type="button"
                          id="btn-pick-stock-staff-sale"
                          onClick={() => setIsStockPickerOpen(true)}
                          className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 transition hover:underline cursor-pointer"
                        >
                          <Boxes className="w-3.5 h-3.5 text-sky-500" />
                          <span>Pick from Stock</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 3x Men's Polo T-Shirts"
                        value={saleItem}
                        onChange={(e) => setSaleItem(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Sale Amount ({currency}) *
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="any"
                        value={saleAmount}
                        onChange={(e) => setSaleAmount(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Commission / Bonus ({currency}) (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="any"
                        value={saleCommission}
                        onChange={(e) => setSaleCommission(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Customer Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John Bosco"
                        value={saleCustomer}
                        onChange={(e) => setSaleCustomer(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Paid in cash, customer returned for second order"
                      value={saleNotes}
                      onChange={(e) => setSaleNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSale(false);
                        setEditingSaleId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {editingSaleId
                          ? 'Update Sale'
                          : `Save ${worker.name ? worker.name.trim().split(/\s+/).slice(-1)[0] : 'Staff'} Sale`}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* Sales List */}
              {salesList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <TrendingUp className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No staff sales recorded yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Record individual sales closed by {worker.name} to track sales volume and calculate performance bonuses.
                  </p>
                </div>
              ) : timeframeSalesList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No sales recorded for {getTimeframeLabel(timeframeFilter).toLowerCase()}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTimeframeFilter('all')}
                    className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                  >
                    View all sales ({salesList.length})
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {timeframeSalesList.map((sale) => (
                    <div
                      key={sale.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 hover:border-sky-200 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {sale.itemSold}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                              {currency} {sale.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-slate-400 mt-0.5">
                            <span>{new Date(sale.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            {sale.customerName && <span>• Customer: {sale.customerName}</span>}
                            {sale.commission && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                • Comm: +{currency} {sale.commission.toLocaleString()}
                              </span>
                            )}
                            {sale.notes && <span className="italic text-slate-500">“{sale.notes}”</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSale(sale)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSale(sale.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: LOSSES & SHORTAGES */}
          {/* ========================================================= */}
          {activeTab === 'losses' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Losses, Cash Shortages & Damaged Stock
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Total: <strong className="text-rose-600">{currency} {totalLossesIncurred.toLocaleString()}</strong> ({currency} {totalLossesDeducted.toLocaleString()} deducted from salary)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingLossId(null);
                    setShowAddLoss(!showAddLoss);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  {showAddLoss ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{showAddLoss ? 'Cancel' : 'Record Loss / Shortage'}</span>
                </button>
              </div>

              {/* Add / Edit Loss Form */}
              {showAddLoss && (
                <form
                  onSubmit={handleSaveLoss}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200 dark:border-slate-800 shadow-sm space-y-3 animate-scaleUp"
                >
                  <h5 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>{editingLossId ? 'Edit Loss Record' : 'Record New Loss or Shortage'}</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={lossDate}
                        onChange={(e) => setLossDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Loss Description / Item *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cash drawer shortage of 20k, or broken display bottle"
                        value={lossTitle}
                        onChange={(e) => setLossTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Loss Amount ({currency}) *
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="any"
                        value={lossAmount}
                        onChange={(e) => setLossAmount(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-rose-600 focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Resolution / Action Status *
                      </label>
                      <select
                        value={lossStatus}
                        onChange={(e) => setLossStatus(e.target.value as StaffLossStatus)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="none">⚪ None (No Action / Under Notice)</option>
                        <option value="deducted">🔴 Deduct from Staff Salary</option>
                        <option value="pending">🟡 Pending Investigation / Review</option>
                        <option value="waived">🟢 Waived / Forgiven by Business</option>
                        <option value="repaid">🔵 Paid Back Directly by Staff</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Notes / Incident Context (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Staff admitted fault and agreed to salary deduction"
                        value={lossNotes}
                        onChange={(e) => setLossNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddLoss(false);
                        setEditingLossId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingLossId ? 'Update Loss' : 'Record Loss'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Losses List */}
              {lossesList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No losses or shortages on record</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Clean record! Any damaged items, cash register shortages, or inventory discrepancies can be logged here.
                  </p>
                </div>
              ) : timeframeLossesList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No losses recorded for {getTimeframeLabel(timeframeFilter).toLowerCase()}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTimeframeFilter('all')}
                    className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                  >
                    View all losses ({lossesList.length})
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {timeframeLossesList.map((loss) => {
                    const statusColor =
                      loss.status === 'deducted'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
                        : loss.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
                        : loss.status === 'waived'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                        : loss.status === 'repaid'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                    return (
                      <div
                        key={loss.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 hover:border-rose-200 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {loss.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                                {currency} {loss.amount.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleLossStatus(loss)}
                                className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border cursor-pointer hover:opacity-80 transition ${statusColor}`}
                                title="Click to cycle status"
                              >
                                {loss.status.toUpperCase()}
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-slate-400 mt-0.5">
                              <span>{new Date(loss.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              {loss.notes && <span className="italic text-slate-500">“{loss.notes}”</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditLoss(loss)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLoss(loss.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: MISTAKES & INCIDENTS */}
          {/* ========================================================= */}
          {activeTab === 'incidents' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Mistakes, Disciplinary Notes & Commendations
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {totalMistakes} Mistakes / Warnings recorded, {totalCommendations} Commendations
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingIncId(null);
                    setShowAddIncident(!showAddIncident);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  {showAddIncident ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{showAddIncident ? 'Cancel' : 'Log Incident / Mistake'}</span>
                </button>
              </div>

              {/* Add / Edit Incident Form */}
              {showAddIncident && (
                <form
                  onSubmit={handleSaveIncident}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-200 dark:border-slate-800 shadow-sm space-y-3 animate-scaleUp"
                >
                  <h5 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>{editingIncId ? 'Edit Incident Record' : 'Record Staff Incident / Mistake'}</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={incDate}
                        onChange={(e) => setIncDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Entry Type *
                      </label>
                      <select
                        value={incType}
                        onChange={(e) => setIncType(e.target.value as StaffIncidentType)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="none">⚪ None (General / Uncategorized)</option>
                        <option value="mistake">⚠️ Mistake / Error Made</option>
                        <option value="warning">🚨 Disciplinary Warning</option>
                        <option value="appreciation">🌟 Commendation / Good Performance</option>
                        <option value="note">📝 General Observation / Note</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Severity Level
                      </label>
                      <select
                        value={incSeverity}
                        onChange={(e) => setIncSeverity(e.target.value as StaffIncidentSeverity)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="minor">Minor</option>
                        <option value="moderate">Moderate</option>
                        <option value="critical">Critical</option>
                        <option value="praise">Praise / Commendation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Incident Title / What Happened *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Packaged wrong size for customer order, or left shop unlocked"
                      value={incTitle}
                      onChange={(e) => setIncTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Action Taken by Management (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verbal warning given, customer refunded, or congratulated"
                        value={incAction}
                        onChange={(e) => setIncAction(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Additional Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Promised not to repeat in future"
                        value={incNotes}
                        onChange={(e) => setIncNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddIncident(false);
                        setEditingIncId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingIncId ? 'Update Record' : 'Save Record'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Incidents List */}
              {incidentsList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Award className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No mistakes or incidents logged</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Keep an objective log of operational mistakes, disciplinary warnings, customer feedback, and commendations.
                  </p>
                </div>
              ) : timeframeIncidentsList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No incidents recorded for {getTimeframeLabel(timeframeFilter).toLowerCase()}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTimeframeFilter('all')}
                    className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                  >
                    View all incidents ({incidentsList.length})
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {timeframeIncidentsList.map((inc) => {
                    const isPraise = inc.type === 'appreciation';
                    const isMistake = inc.type === 'mistake' || inc.type === 'warning';

                    const typeBadge = isPraise
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                      : inc.type === 'warning'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
                      : inc.type === 'mistake'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
                      : inc.type === 'note'
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                    return (
                      <div
                        key={inc.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 hover:border-purple-200 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                              isPraise
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                            }`}
                          >
                            {isPraise ? <Award className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {inc.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border uppercase ${typeBadge}`}>
                                {inc.type}
                              </span>
                              {inc.severity && (
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  ({inc.severity})
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-slate-400 mt-0.5">
                              <span>{new Date(inc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              {inc.actionTaken && (
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  • Action: {inc.actionTaken}
                                </span>
                              )}
                              {inc.notes && <span className="italic text-slate-500">“{inc.notes}”</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditIncident(inc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIncident(inc.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: PAYROLL & NET DUE CALCULATION */}
          {/* ========================================================= */}
          {activeTab === 'payroll' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Net Salary & Payroll Breakdown</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Calculated net payout for {worker.name} taking into account base wage, bonuses, and loss deductions.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Net Due</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {currency} {netEstimatedPay.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Base Salary ({worker.salaryPeriod || 'monthly'})</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      +{currency} {worker.salary ? worker.salary.toLocaleString() : '0'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                    <span className="font-semibold">Sales Commissions & Performance Bonuses</span>
                    <span className="font-bold">
                      +{currency} {totalCommissions.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300">
                    <span className="font-semibold">Losses Deducted from Salary</span>
                    <span className="font-bold">
                      -{currency} {totalLossesDeducted.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-md mt-3">
                    <span>Final Estimated Pay</span>
                    <span>
                      {currency} {netEstimatedPay.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 text-[11px] text-sky-800 dark:text-sky-300 space-y-1">
                  <strong>Audit Summary:</strong>
                  <p>
                    {worker.name} worked <strong>{totalDaysPresent} days</strong> (Attendance rate: {attendanceRate}%), generated <strong>{currency} {totalSalesAmount.toLocaleString()}</strong> in sales, and incurred <strong>{currency} {totalLossesIncurred.toLocaleString()}</strong> in losses ({currency} {totalLossesDeducted.toLocaleString()} deducted).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* IN-FLOW BOTTOM ACTIONS (Scrolls with page so no fixed bar hides content) */}
          <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-[11px] text-slate-400 text-center sm:text-left">
              All records for {worker.name} are saved automatically.
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LEAVE SCHEDULING MODAL DIALOG */}
      {/* ========================================================= */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base leading-tight">
                    Schedule Leave
                  </h3>
                  <p className="text-xs text-purple-200">
                    Grant official time off for <strong>{worker.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Leave Form */}
            <form onSubmit={handleApplyLeave} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Date Range: Starting Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Leave Starting Date *
                  </label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => {
                      setLeaveStartDate(e.target.value);
                      if (e.target.value > leaveEndDate) {
                        setLeaveEndDate(e.target.value);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Leave End Date *
                  </label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    min={leaveStartDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Duration summary badge */}
                <div className="sm:col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Total Duration:
                  </span>
                  <span className="font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 px-2.5 py-0.5 rounded-full">
                    {calculateLeaveDaysCount()} Day{calculateLeaveDaysCount() > 1 ? 's' : ''} Leave
                  </span>
                </div>
              </div>

              {/* Reason for Leave */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Leave / Details *
                </label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Doctor recommendation for recovery, traveling upcountry for family event, annual leave approved..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Pay Status Option */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Paid Leave Policy
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {leavePaid ? 'Worker will receive normal salary for these days' : 'Unpaid leave days'}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLeavePaid(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      leavePaid
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeavePaid(false)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      !leavePaid
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Unpaid
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm & Grant Leave</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LATE ATTENDANCE MODAL */}
      {showLateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-amber-200 dark:border-amber-900/50 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    {editingLateId ? 'Edit Late Record' : 'Log Late Attendance'}
                  </h3>
                  <p className="text-xs text-amber-100">
                    Record arrival time & reason for <strong>{worker.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLateModal(false);
                  setEditingLateId(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Late Form */}
            <form onSubmit={handleSaveLateModal} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Late Date *
                </label>
                <input
                  type="date"
                  value={lateDate}
                  onChange={(e) => setLateDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Time Staff Came In *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09:30 AM"
                  value={lateTime}
                  onChange={(e) => setLateTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Being Late / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Traffic delay, vehicle trouble, heavy rain, or family matter..."
                  value={lateNotes}
                  onChange={(e) => setLateNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowLateModal(false);
                    setEditingLateId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingLateId ? 'Update Late Record' : 'Save Late Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABSENT ATTENDANCE MODAL */}
      {showAbsentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-rose-200 dark:border-rose-900/50 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    {editingAbsentId ? 'Edit Absent Record' : 'Log Absent Record'}
                  </h3>
                  <p className="text-xs text-rose-100">
                    Record absent date & reason for <strong>{worker.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAbsentModal(false);
                  setEditingAbsentId(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Absent Form */}
            <form onSubmit={handleSaveAbsentModal} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Absent Date *
                </label>
                <input
                  type="date"
                  value={absentDate}
                  onChange={(e) => setAbsentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Absence
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Sickness without prior leave, family emergency, unexcused absence..."
                  value={absentNotes}
                  onChange={(e) => setAbsentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAbsentModal(false);
                    setEditingAbsentId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingAbsentId ? 'Update Absent Record' : 'Save Absent Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRESENT ATTENDANCE MODAL */}
      {showPresentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-emerald-200 dark:border-emerald-900/50 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    {editingPresentId ? 'Edit Present Record' : 'Log Present Attendance'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Record present date & shift details for <strong>{worker.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPresentModal(false);
                  setEditingPresentId(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Present Form */}
            <form onSubmit={handleSavePresentModal} className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={presentDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setPresentDate(newStart);
                      if (!presentEndDate || presentEndDate < newStart) {
                        setPresentEndDate(newStart);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date (Continuous Range)
                  </label>
                  <input
                    type="date"
                    value={presentEndDate}
                    min={presentDate}
                    onChange={(e) => setPresentEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {presentEndDate && presentEndDate > presentDate && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
                  <Calendar className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Continuous streak: <strong>{getCalendarDayDiff(presentDate, presentEndDate) + 1} days</strong> will be logged as one consolidated record.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Time In
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 AM"
                    value={presentCheckIn}
                    onChange={(e) => setPresentCheckIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Time Out
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 05:00 PM"
                    value={presentCheckOut}
                    onChange={(e) => setPresentCheckOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes / Shift Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Full day shift, worked overtime..."
                  value={presentNotes}
                  onChange={(e) => setPresentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPresentModal(false);
                    setEditingPresentId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingPresentId ? 'Update Present Record' : 'Save Present Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEFT EARLY (EARLY DEPARTURE) ATTENDANCE MODAL */}
      {showLeftEarlyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-orange-200 dark:border-orange-900/50 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    {editingLeftEarlyId ? 'Edit Left Early Record' : 'Log Left Early (Early Departure)'}
                  </h3>
                  <p className="text-xs text-orange-100">
                    Staff left work before their working time ended for <strong>{worker.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLeftEarlyModal(false);
                  setEditingLeftEarlyId(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Left Early Form */}
            <form onSubmit={handleSaveLeftEarlyModal} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date Staff Left Early *
                </label>
                <input
                  type="date"
                  value={leftEarlyDate}
                  onChange={(e) => setLeftEarlyDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Time In (Arrived)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 AM"
                    value={leftEarlyCheckIn}
                    onChange={(e) => setLeftEarlyCheckIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Time Left Early *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 02:00 PM"
                    value={leftEarlyTime}
                    onChange={(e) => setLeftEarlyTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reason for Leaving Early
                  </label>
                  <span className="text-[10px] text-slate-400">Quick reasons:</span>
                </div>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    'Without permission',
                    'Permission granted',
                    'Felt unwell / Sick',
                    'Family emergency',
                    'Medical appointment',
                    'Official errand',
                  ].map((quickReason) => {
                    const isWithoutPerm = quickReason === 'Without permission';
                    return (
                      <button
                        key={quickReason}
                        type="button"
                        onClick={() => setLeftEarlyNotes(quickReason)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition ${
                          isWithoutPerm
                            ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 shadow-2xs'
                            : 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/40'
                        }`}
                      >
                        +{quickReason}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  rows={2}
                  placeholder="e.g. Requested permission to leave at 2:00 PM due to fever / family matter..."
                  value={leftEarlyNotes}
                  onChange={(e) => setLeftEarlyNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowLeftEarlyModal(false);
                    setEditingLeftEarlyId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingLeftEarlyId ? 'Update Left Early Record' : 'Save Left Early Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>{deleteConfirmModal.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {deleteConfirmModal.message}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteConfirmModal.onConfirm();
                  setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white shadow-md transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOCK PRODUCT PICKER MODAL */}
      <StockProductPickerModal
        isOpen={isStockPickerOpen}
        currency={currency}
        documentType="receipt"
        onClose={() => setIsStockPickerOpen(false)}
        onSelectProduct={(item: SelectedStockItem) => {
          const qtyPrefix = item.quantity > 1 ? `${item.quantity}x ` : '';
          setSaleItem(`${qtyPrefix}${item.name}`);
          const calculatedTotal = item.unitPrice * (item.quantity || 1);
          if (calculatedTotal > 0) {
            setSaleAmount(calculatedTotal.toString());
          }
          setIsStockPickerOpen(false);
          showToast(`Selected "${item.name}" from stock`);
        }}
      />
    </div>
  );
};
