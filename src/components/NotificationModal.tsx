import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BellRing,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Users,
  QrCode,
  Trash2,
  CheckCheck,
  X,
  Sparkles,
} from 'lucide-react';
import {
  PushNotificationService,
  BusinessAlert,
} from '../services/pushNotificationService';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertCountChange?: (count: number) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onAlertCountChange,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [alerts, setAlerts] = useState<BusinessAlert[]>(PushNotificationService.getLocalAlerts());
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-enable notifications by default on mount / open
  useEffect(() => {
    if (isOpen) {
      const settings = PushNotificationService.getSettings();
      const perm = PushNotificationService.getPermissionStatus();
      setPermission(perm);
      
      const isEnabled = settings.pushEnabled !== false;
      setNotificationsEnabled(isEnabled);

      if (isEnabled && perm !== 'granted' && (PushNotificationService.isNative() || (typeof window !== 'undefined' && 'Notification' in window))) {
        // Auto request/register push permission by default
        PushNotificationService.registerPushToken().then((res) => {
          const currentPerm = PushNotificationService.getPermissionStatus();
          setPermission(currentPerm);
          if (res.success) {
            setNotificationsEnabled(true);
          }
        }).catch(() => {});
      }
      loadAlerts();
    }
  }, [isOpen]);

  const loadAlerts = () => {
    const local = PushNotificationService.getLocalAlerts();
    setAlerts(local);
    const unread = local.filter((a) => !a.isRead).length;
    if (onAlertCountChange) onAlertCountChange(unread);
  };

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    if (!isOpen) return;
    const unsub = PushNotificationService.subscribeToNotifications((firestoreAlerts) => {
      setAlerts(firestoreAlerts);
      const unread = firestoreAlerts.filter((a) => !a.isRead).length;
      if (onAlertCountChange) onAlertCountChange(unread);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleToggleNotifications = async () => {
    setLoading(true);
    setStatusMessage(null);
    const nextState = !notificationsEnabled;

    try {
      if (nextState) {
        // Enabling notifications
        const res = await PushNotificationService.registerPushToken();
        const currentPerm = PushNotificationService.getPermissionStatus();
        setPermission(currentPerm);
        PushNotificationService.saveSettings({ pushEnabled: true });
        setNotificationsEnabled(true);
        setStatusMessage({
          type: 'success',
          text: 'Notifications are enabled!',
        });
      } else {
        // Disabling notifications
        PushNotificationService.saveSettings({ pushEnabled: false });
        setNotificationsEnabled(false);
        setStatusMessage({
          type: 'success',
          text: 'Notifications paused.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Could not update notification setting.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = (id: string) => {
    PushNotificationService.markAsRead(id);
    loadAlerts();
  };

  const handleMarkAllRead = () => {
    PushNotificationService.markAllAsRead();
    loadAlerts();
  };

  const handleClearAll = () => {
    PushNotificationService.clearAll();
    loadAlerts();
  };

  const getAlertIcon = (type: BusinessAlert['type']) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'sale':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'debt_reminder':
        return <CreditCard className="w-4 h-4 text-rose-500" />;
      case 'staff':
        return <Users className="w-4 h-4 text-indigo-500" />;
      case 'qr_order':
        return <QrCode className="w-4 h-4 text-cyan-500" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-500" />;
    }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const modalContent = (
    <div
      id="notification-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full h-[85vh] sm:h-auto sm:max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 overflow-hidden relative z-10"
      >
        {/* Mobile pull bar */}
        <div
          onClick={onClose}
          className="sm:hidden pt-2.5 pb-1 flex justify-center items-center cursor-pointer bg-slate-50/90 dark:bg-slate-950/80"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <BellRing className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Business Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Live activity & business alerts feed
              </p>
            </div>
          </div>
          <button
            id="btn-close-notification-top"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition active:scale-95"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Notifications Toggle Bar & Actions */}
        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Notifications
            </span>
            <button
              type="button"
              onClick={handleToggleNotifications}
              disabled={loading}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              title={notificationsEnabled ? 'Notifications Enabled (Click to disable)' : 'Notifications Disabled (Click to enable)'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-[11px] font-semibold ${notificationsEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {notificationsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {alerts.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className="text-[11px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 font-semibold transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
              <button
                onClick={handleClearAll}
                title="Clear all alerts"
                className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs font-medium border-b flex items-center justify-between shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-100 dark:border-emerald-900'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-100 dark:border-rose-900'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body - Alerts List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 text-xs">
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No notifications yet
                </p>
                <p className="text-[11px] mt-0.5">
                  Business events, sales, low stock warnings, and staff alerts will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleMarkAsRead(alert.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                    alert.isRead
                      ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 opacity-80'
                      : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs shrink-0 mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                        {alert.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(alert.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 leading-relaxed">
                      {alert.body}
                    </p>
                  </div>
                  {!alert.isRead && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Bottom Footer */}
        <div className="p-3 sm:p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex items-center justify-end shrink-0">
          <button
            id="btn-close-notification-bottom"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
