import React, { useState, useEffect } from 'react';
import { CheckCircle2, ExternalLink, ArrowRight, Smartphone } from 'lucide-react';
import { CloudflareService } from '../services/cloudflareService';
import { WorkOSAuthService } from '../services/workosAuthService';

export const GoogleAuthPopupPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [authCode, setAuthCode] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error') || urlParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMsg(error);
      return;
    }

    const sessionId = urlParams.get('auth_session');
    const rawUser = urlParams.get('user');

    if (rawUser) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawUser));
        if (parsed && (parsed.email || parsed.id)) {
          WorkOSAuthService.saveAndSyncUser(parsed).then(() => {
            if (window.opener) {
              try {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: parsed }, '*');
              } catch (_) {}
            }
            setStatus('success');
            setTimeout(() => {
              if (window.opener) {
                try { window.close(); } catch (_) {}
              } else {
                window.location.replace('/');
              }
            }, 400);
          });
          return;
        }
      } catch (_) {}
    }

    if (sessionId) {
      setStatus('loading');
      CloudflareService.checkAuthSessionStatus(sessionId).then(async (check) => {
        if (check.status === 'completed' && check.user) {
          await WorkOSAuthService.saveAndSyncUser(check.user);
          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: check.user, sessionId }, '*');
            } catch (_) {}
          }
          setStatus('success');
          setTimeout(() => {
            if (window.opener) {
              try { window.close(); } catch (_) {}
            } else {
              window.location.replace('/');
            }
          }, 400);
        } else if (code) {
          proceedWithCodeExchange(code);
        } else {
          setStatus('error');
          setErrorMsg('Authentication session could not be completed.');
        }
      }).catch(() => {
        if (code) proceedWithCodeExchange(code);
      });
      return;
    }

    if (code) {
      proceedWithCodeExchange(code);
    } else {
      setStatus('loading');
    }

    function proceedWithCodeExchange(c: string) {
      setAuthCode(c);
      setStatus('loading');

      if (window.opener) {
        // Send the real code back to Brivu main window (desktop popup flow)
        try {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code: c }, '*');
        } catch (_) {}
        
        setStatus('success');
        setTimeout(() => {
          try {
            window.close();
          } catch (_) {}
        }, 800);
      } else {
        // Direct exchange for mobile Chrome / web browser flow
        const verifier = localStorage.getItem('workos_pkce_verifier') || sessionStorage.getItem('workos_pkce_verifier') || undefined;

        CloudflareService.authenticateWorkOSCode(c, undefined, verifier).then(async (authRes) => {
          if (authRes.success && authRes.user) {
            await WorkOSAuthService.saveAndSyncUser(authRes.user);
            setStatus('success');
            setTimeout(() => {
              window.location.replace('/');
            }, 300);
          } else {
            setStatus('error');
            setErrorMsg(authRes.message || 'Authentication code exchange failed');
          }
        }).catch((err) => {
          setStatus('error');
          setErrorMsg(err?.message || 'Authentication error');
        });
      }
    }
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans text-white">
        <div className="w-full max-w-md p-8 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 flex flex-col items-center space-y-4">
          <div className="text-red-400 font-extrabold text-lg">Google Sign-In Error</div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {errorMsg || 'Could not complete Google Sign-In. Please check your WorkOS settings and try again.'}
          </p>
          <div className="flex gap-2 w-full pt-2">
            <button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  window.location.href = '/';
                }
              }}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans text-white">
        <div className="w-full max-w-md p-8 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col items-center space-y-6">
          <div className="w-14 h-14 bg-emerald-950/80 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-800 shadow-md">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black tracking-tight text-white">Google Sign-In Complete</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your Google authentication was approved by WorkOS. Return to the Brivu app to finish connecting.
            </p>
          </div>

          {authCode && (
            <div className="w-full space-y-3">
              <a
                href="/"
                className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 active:scale-95 transition cursor-pointer"
              >
                <span>Continue to Brivu Application</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans text-white">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col items-center space-y-6">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-400 border-b-purple-500 border-l-transparent animate-spin" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-white">Connecting Google Sign-In...</h3>
          <p className="text-xs text-slate-400">Verifying secure OAuth credentials with WorkOS</p>
        </div>
      </div>
    </div>
  );
};

