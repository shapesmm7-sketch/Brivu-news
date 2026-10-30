import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  Check,
  CheckCircle2,
  ShieldCheck,
  Zap,
  X,
  ShieldAlert,
  CreditCard,
  RefreshCw,
  ArrowRight,
  Cloud,
  QrCode,
  Infinity as InfinityIcon,
  Layers,
  Lock,
  RotateCcw,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { PlayBillingService, GOOGLE_PLAY_PRODUCTS } from '../services/playBillingService';
import { SubscriptionPlanId, UserSubscription } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubscription: UserSubscription | null;
  onSubscriptionChange: (subscription: UserSubscription | null) => void;
}

interface PlanOption {
  id: SubscriptionPlanId;
  name: string;
  durationLabel: string;
  price: number;
  formattedPrice: string;
  periodLabel: string;
  monthlyEquivalent: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  monthsCount: number;
  googlePlayProductId: string;
}

export const SUBSCRIPTION_PLANS: PlanOption[] = [
  {
    id: '1-month',
    name: '1 Month',
    durationLabel: 'Monthly',
    price: 5.6,
    formattedPrice: '$5.6',
    periodLabel: '/ month',
    monthlyEquivalent: '$5.60/mo',
    description: 'Flexible monthly billing with zero lock-in. Cancel anytime.',
    monthsCount: 1,
    googlePlayProductId: 'brivu_pro_monthly',
  },
  {
    id: '6-months',
    name: '6 Months',
    durationLabel: '6 Months',
    price: 30.0,
    formattedPrice: '$30.0',
    periodLabel: '/ 6 months',
    monthlyEquivalent: '$5.00/mo',
    badge: 'SAVE 11%',
    badgeColor: 'bg-emerald-500 text-white',
    description: 'Billed $30.00 every 6 months. Great balance of savings & flexibility.',
    monthsCount: 6,
    googlePlayProductId: 'brivu_pro_6months',
  },
  {
    id: '1-year',
    name: '1 Year',
    durationLabel: '1 Year',
    price: 55.9,
    formattedPrice: '$55.9',
    periodLabel: '/ year',
    monthlyEquivalent: '$4.66/mo',
    badge: 'BEST VALUE • SAVE 17%',
    badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black',
    description: 'Billed $55.90 annually. Maximum savings and full premium access.',
    monthsCount: 12,
    googlePlayProductId: 'brivu_pro_yearly',
  },
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentSubscription,
  onSubscriptionChange,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('1-year');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'google_play' | 'card' | 'gpay' | 'momo'>('google_play');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string>('');
  const [restoreFeedback, setRestoreFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  if (!isOpen) return null;

  const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[2];
  const isCurrentlyActive = currentSubscription && currentSubscription.status === 'active';

  const handleSubscribe = async () => {
    setIsProcessing(true);
    setRestoreFeedback(null);

    const result = await PlayBillingService.purchaseSubscription(
      selectedPlan.id,
      selectedPaymentMethod
    );

    setIsProcessing(false);
    if (result.success && result.subscription) {
      onSubscriptionChange(result.subscription);
      setActionSuccessMessage(`Successfully subscribed to Brivu Pro ${selectedPlan.name} for ${selectedPlan.formattedPrice} via Google Play Billing!`);
      setPaymentStep('success');
    } else {
      setRestoreFeedback({
        msg: result.error || 'Subscription checkout could not be completed.',
        success: false,
      });
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    setRestoreFeedback(null);

    const res = await PlayBillingService.restorePurchases();
    setIsRestoring(false);

    if (res.restored && res.subscription) {
      onSubscriptionChange(res.subscription);
      setRestoreFeedback({ msg: res.message, success: true });
    } else {
      setRestoreFeedback({ msg: res.message, success: false });
    }
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  const handleCancelSub = () => {
    StorageService.clearSubscription();
    onSubscriptionChange(null);
    setShowCancelConfirm(false);
    setActionSuccessMessage('Subscription has been canceled.');
  };

  const features = [
    {
      title: 'Cloud Sync & Data Loss Protection',
      desc: 'Save and synchronize all your receipts and records to the cloud so you never lose them if the app is uninstalled.',
      icon: Cloud,
    },
    {
      title: 'Live QR Code & Business Link Hosting',
      desc: 'Host your live business menu and online receipts so customers can scan and view them anytime.',
      icon: QrCode,
    },
    {
      title: 'Unlimited Digital Receipts & Invoices',
      desc: 'Generate, print, and share unlimited PDF receipts with customizable prefixes and auto-incrementing numbers.',
      icon: InfinityIcon,
    },
    {
      title: 'Custom Brand Identity & Colors',
      desc: 'Upload high-resolution logos, authorized digital signatures, and custom palette presets on every receipt.',
      icon: Sparkles,
    },
    {
      title: 'Multi-Worker & Commission Ledger',
      desc: 'Track employee attendance, sales commissions, salaries, and incident loss deductions automatically.',
      icon: Layers,
    },
    {
      title: 'Inventory Tracking & Barcode Scanner',
      desc: 'Real-time stock deduction, barcode camera scanning, profit margins, and automated low-stock warnings.',
      icon: Zap,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white">
        
        {/* Header with Visual Banner */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-black dark:via-indigo-950 dark:to-slate-950 text-white p-5 sm:p-6 shrink-0 overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Brivu Pro</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 tracking-wider">
                  Premium
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium">
                Unlock full business potential without limitations
              </p>
            </div>
          </div>

          {/* Active status banner if already subscribed */}
          {isCurrentlyActive && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Active Plan:</strong> {currentSubscription.planName} (Expires:{' '}
                  {new Date(currentSubscription.expiresAt).toLocaleDateString()})
                </span>
              </div>
              <span className="text-[10px] uppercase font-extrabold bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded">
                PRO
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {paymentStep === 'success' ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Welcome to Brivu Pro!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                  {actionSuccessMessage || 'Your subscription is now active. All pro features, unlimited stock, and custom templates are unlocked.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left max-w-xs mx-auto space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Selected Tier:</span>
                  <strong className="text-slate-900 dark:text-white">{selectedPlan.name}</strong>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Amount:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedPlan.formattedPrice}</strong>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Status:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-98"
              >
                Continue to App
              </button>
            </div>
          ) : (
            <>
              {/* Data Loss Warning & Cloud Sync Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Pro Membership Benefits & Notice</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                  ⚠️ <strong>Without subscription:</strong> All receipts, inventory, and ledger records remain <strong>only on your local phone storage</strong> and can be lost if browser cache or apps are cleared.
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                  ☁️ <strong>Cloud Sync & Backup:</strong> Safe real-time backup to the cloud with instant restoration on any phone.
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                  🌐 <strong>Live QR Hosting:</strong> Enables 24/7 public online hosting for your business catalog & QR flyers.
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px] font-bold text-purple-700 dark:text-purple-300">
                  🚫 <strong>100% Ad-Free:</strong> All AdMob banners, interstitial popups, and ads disappear completely.
                </p>
              </div>

              {/* Subscription Plans Selection */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Select Your Subscription Plan
                  </span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                    Cancel Anytime
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all relative flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-md shadow-amber-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        {/* Radio Check Indicator */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500 text-slate-950'
                                : 'border-slate-300 dark:border-slate-600 bg-transparent'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {plan.name}
                              </span>
                              {plan.badge && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    plan.badgeColor || 'bg-amber-500 text-white'
                                  }`}
                                >
                                  {plan.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                              {plan.description}
                            </p>
                          </div>
                        </div>

                        {/* Price Display */}
                        <div className="text-right shrink-0">
                          <div className="flex items-baseline justify-end gap-0.5">
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                              {plan.formattedPrice}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {plan.periodLabel}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {plan.monthlyEquivalent}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* What is Included Checklist */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2.5">
                  Everything Included in Pro
                </span>
                <div className="space-y-2">
                  {features.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-start gap-2.5"
                      >
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Payment System (Play Billing & Web)
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    Google Play v9 Ready
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('google_play')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 text-[11px] font-bold cursor-pointer ${
                      selectedPaymentMethod === 'google_play'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-indigo-500" />
                    <span>Play Billing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('gpay')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 text-[11px] font-bold cursor-pointer ${
                      selectedPaymentMethod === 'gpay'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Google Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 text-[11px] font-bold cursor-pointer ${
                      selectedPaymentMethod === 'card'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('momo')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 text-[11px] font-bold cursor-pointer ${
                      selectedPaymentMethod === 'momo'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-500" />
                    <span>Mobile Money</span>
                  </button>
                </div>
              </div>

              {/* Restore Purchases / Error Feedback */}
              {restoreFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    restoreFeedback.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{restoreFeedback.msg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  id="btn-confirm-subscription"
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSubscribe}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/25 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Google Play Billing...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 fill-white" />
                      <span>
                        {isCurrentlyActive ? 'Switch Plan' : 'Subscribe with Google Play'} — {selectedPlan.formattedPrice}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRestorePurchases}
                    disabled={isRestoring}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                    <span>{isRestoring ? 'Checking Play Store...' : 'Restore Google Play Purchases'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => PlayBillingService.openManageSubscriptions()}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium flex items-center gap-1 py-1 px-2 hover:underline transition cursor-pointer"
                  >
                    <span>Manage Subscriptions</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {isCurrentlyActive && (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full mt-2 text-center text-xs text-rose-500 hover:text-rose-600 font-semibold underline py-1 transition cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                )}

                {showCancelConfirm && (
                  <div className="mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center space-y-2">
                    <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                      Confirm cancellation? Your data will remain on your local device.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelSub}
                        className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                      >
                        Yes, Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className="flex-1 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
                      >
                        Keep Plan
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-400 font-medium">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>256-Bit SSL Encrypted • Cancel Anytime • Instant Activation</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};