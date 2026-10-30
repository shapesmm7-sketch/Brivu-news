import React from 'react';
import {
  ShieldCheck,
  X,
  Lock,
  Database,
  Cloud,
  Share2,
  Trash2,
  EyeOff,
  FileCheck,
  Check,
  Crown,
  HardDrive,
  Sparkles,
} from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Privacy Policy</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  Brivu v1.0
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last updated: September 2026 • Data Storage & Privacy Terms
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed custom-scrollbar">
          {/* Important Notice: Local Storage Default vs Premium Cloud */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <HardDrive className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                Important Data Storage Notice: Local Storage by Default
              </h3>
            </div>
            <p className="text-[11.5px] text-slate-700 dark:text-slate-200 leading-relaxed">
              <strong>All user data is stored strictly on your device&apos;s local storage unless you upgrade to Premium.</strong> In the standard version, your receipts, inventory, customer lists, and business transactions never leave your phone or browser. When you upgrade to a Premium subscription, encrypted Cloud Backup & automated cloud storage are unlocked for multi-device sync and disaster recovery.
            </p>
          </div>

          {/* Key Privacy Highlights */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Core Privacy Guarantees</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-950 dark:text-emerald-200">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>100% Local storage by default</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Premium cloud backup option</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero advertising trackers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>No selling or renting your data</span>
              </div>
            </div>
          </div>

          {/* Section 1: Introduction */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Introduction & Purpose</span>
            </h3>
            <p>
              Welcome to <strong>Brivu</strong> (&quot;the Application&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). Brivu is built as a fast, reliable business management and digital receipt platform designed for small enterprises, retail shops, salons, contractors, restaurants, and freelancers.
            </p>
            <p>
              We respect your privacy and are committed to protecting the confidential business data, receipts, invoices, and customer records you manage inside Brivu. This Privacy Policy explains how data is saved on your device and how cloud features operate for Premium subscribers.
            </p>
          </div>

          {/* Section 2: What Data You Store */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Information Stored by Brivu</span>
            </h3>
            <p>
              All data inside Brivu is inputted directly by you to operate your day-to-day business:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li><strong>Business Profile:</strong> Business name, contact numbers, email, physical address, currency preferences, payment instructions, logos, and signatures.</li>
              <li><strong>Receipts & Invoices:</strong> Transaction numbers, line items, prices, quantities, payment methods, tax rates, and timestamps.</li>
              <li><strong>Customer & Contact Records:</strong> Client names, phone numbers, delivery addresses, and debtor ledger entries.</li>
              <li><strong>Inventory & Products:</strong> Product names, cost and selling prices, stock levels, and item photos.</li>
              <li><strong>Security Passcodes:</strong> PIN passcode hash and secret recovery phrase used for App Lock intruder protection.</li>
            </ul>
          </div>

          {/* Section 3: Local Storage (Free / Standard Tier) */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Local Storage by Default</span>
            </h3>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                  Zero Server Uploads on Standard Plan
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                By default, all user data is stored <strong>exclusively inside your device&apos;s local storage sandbox</strong>. No receipts, prices, or customer identities are sent over the network to external databases unless you intentionally upgrade to Premium. You can create receipts, track stock, and run your business 100% offline.
              </p>
            </div>
          </div>

          {/* Section 4: Premium Cloud Backup & Synchronization */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">4</span>
              <span>Cloud Backup & Sync for Premium Users</span>
            </h3>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300/70 dark:border-amber-800/70 space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-bold text-amber-900 dark:text-amber-200 text-[11px]">
                  Premium Cloud Backup Upgrade
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                When you <strong>upgrade to Premium</strong>, Brivu activates automated encrypted Cloud Backup and file storage to protect your business against lost devices, accidental cache clearing, or device upgrades:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-700 dark:text-slate-300">
                <li><strong>Cloud Database (D1 SQL):</strong> Backs up receipts, customer accounts, and stock levels securely.</li>
                <li><strong>Cloud File Storage (R2):</strong> Safely archives PDF documents and generated receipts.</li>
                <li><strong>Encrypted in Transit:</strong> All communications utilize industry-standard TLS 1.3 / HTTPS encryption.</li>
              </ul>
            </div>
          </div>

          {/* Section 5: Third-Party Sharing & Permissions */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">5</span>
              <span>Third-Party Sharing & Communications</span>
            </h3>
            <p>
              We do <strong>not</strong> share, sell, rent, or trade your data with any advertising companies or third-party brokers.
            </p>
            <p className="text-[11px]">
              Information is only shared when you deliberately trigger an action:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li><strong>WhatsApp & Direct Messages:</strong> Sending a receipt or invoice PDF dispatches the file through your chosen messaging application.</li>
              <li><strong>Native Share Sheet:</strong> Sharing PDFs via Android or iOS delegates transmission to the selected app (e.g., Gmail, Print, Bluetooth).</li>
            </ul>
          </div>

          {/* Section 6: Security & Access Control */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">6</span>
              <span>Intruder Protection & App PIN Lock</span>
            </h3>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
              <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[11px]">
                <strong>App Lock (PIN Passcode):</strong> You can protect your receipts and sensitive financial sales records by setting an App PIN passcode. When active, sales numbers and client ledgers cannot be opened without entering your PIN.
              </p>
            </div>
          </div>

          {/* Section 7: User Sovereignty & Data Deletion */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">7</span>
              <span>Your Data Rights & Deletion</span>
            </h3>
            <p>You retain 100% ownership of your business data at all times:</p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li><strong>Manual JSON Backups:</strong> Export full database backups to your device anytime from Settings.</li>
              <li><strong>Edit & Delete:</strong> Instantly modify or delete any receipt, product, or client entry.</li>
              <li><strong>Permanent Purge:</strong> Clearing application cache or resetting data deletes local records permanently.</li>
            </ul>
          </div>

          {/* Section 8: Children's Privacy */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">8</span>
              <span>Children&apos;s Privacy</span>
            </h3>
            <p className="text-[11px]">
              Brivu is a commercial application intended for business operators and does not knowingly collect personal information from individuals under the age of 13.
            </p>
          </div>

          {/* Section 9: Updates & Contact */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">9</span>
              <span>Policy Updates & Contact</span>
            </h3>
            <p className="text-[11px]">
              We may update this policy periodically to reflect platform improvements. If you have questions about your privacy, you can reach out via official Brivu support channels.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
