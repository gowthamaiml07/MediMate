"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  BarChart2,
  Plus,
  Pill,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loginAsDemo, isConfigured } = useAuth();

  const [email, setEmail] = useState("priya.sharma@example.com");
  const [password, setPassword] = useState("••••••••••••");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!isConfigured) {
      // In unconfigured development mode, smoothly log in as demo
      loginAsDemo();
      setLoading(false);
      router.push("/dashboard");
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
    } else {
      router.push("/dashboard");
    }
  };

  const handleDirectDemoStart = () => {
    loginAsDemo();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Central Login Card matching Screen 1 in reference */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
        {/* Left Column: Information & Actions */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* MediMate Logo */}
            <div className="mb-6 flex items-center justify-between">
              <Logo size="md" showSubtitle={true} clickable={false} />
              {!isConfigured && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Demo Mode
                </span>
              )}
            </div>

            {/* Title & Description matching Screen 1 */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Smarter Healthcare <br />
                for a Healthier You
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
                Scan your prescriptions, manage your medicines, track appointments and get instant answers — all in one place.
              </p>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Buttons Group matching Screen 1 */}
            <div className="mt-8 space-y-3 max-w-sm">
              {showEmailForm ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-xs shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowEmailForm(false)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <Link
                      href="/signup"
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      Need an account? Sign up
                    </Link>
                  </div>
                </form>
              ) : (
                <>
                  {/* Primary "Get Started" (Solid Royal Blue) */}
                  <button
                    type="button"
                    onClick={handleDirectDemoStart}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-xs shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Get Started</span>
                  </button>

                  {/* Secondary "Login with Email" (White Outlined with Thin Border) */}
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Login with Email
                  </button>

                  {/* Demo Patient Fast Track */}
                  <button
                    type="button"
                    onClick={handleDirectDemoStart}
                    className="w-full py-2.5 px-4 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 text-blue-700 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Demo Patient Account (Priya Sharma)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Footer: Lock + "Your data is safe and private" matching Screen 1 */}
          <div className="pt-8 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Your medical records are encrypted and protected</span>
          </div>
        </div>

        {/* Right Column: Pale blue container with doctor illustration & floating badges */}
        <div className="hidden lg:flex lg:col-span-5 bg-blue-50/70 border-l border-blue-100/60 p-8 flex-col items-center justify-center relative overflow-hidden select-none">
          {/* Subtle concentric decorative rings */}
          <div className="absolute w-80 h-80 rounded-full border border-blue-200/40 -top-10 -right-10 pointer-events-none"></div>
          <div className="absolute w-96 h-96 rounded-full border border-blue-200/30 -bottom-20 -left-20 pointer-events-none"></div>

          {/* Medical Illustration matching reference */}
          <div className="relative w-full max-w-[280px] flex flex-col items-center justify-center py-6">
            <svg
              className="w-48 h-56 drop-shadow-md transition-transform hover:scale-[1.02] duration-300"
              viewBox="0 0 200 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <ellipse cx="100" cy="220" rx="60" ry="10" fill="#E2E8F0" />
              <rect x="70" y="90" width="60" height="120" rx="20" fill="#FFFFFF" />
              <path d="M70 120 L50 170" stroke="#0066FF" strokeWidth="12" strokeLinecap="round" />
              <path d="M130 120 L150 170" stroke="#0066FF" strokeWidth="12" strokeLinecap="round" />
              <circle cx="100" cy="55" r="32" fill="#FCE7D6" />
              <path d="M68 55 C68 25 132 25 132 55 C122 35 78 35 68 55 Z" fill="#1E293B" />
              <circle cx="90" cy="55" r="3" fill="#1E293B" />
              <circle cx="110" cy="55" r="3" fill="#1E293B" />
              <path d="M94 68 Q100 74 106 68" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M80 100 L100 125 L120 100" stroke="#0066FF" strokeWidth="6" strokeLinecap="round" fill="none" />
              <rect x="94" y="105" width="12" height="40" fill="#0066FF" rx="2" />
              <rect x="80" y="119" width="40" height="12" fill="#0066FF" rx="2" />
              <path d="M85 88 Q70 140 100 155 Q130 140 115 88" stroke="#94A3B8" strokeWidth="3" fill="none" />
              <circle cx="100" cy="155" r="6" fill="#3B82F6" />
            </svg>

            {/* Floating Metric 1 */}
            <div className="absolute top-2 -left-2 bg-white/95 backdrop-blur-xs rounded-xl p-2.5 shadow-md border border-blue-100 flex items-center gap-2 animate-bounce-subtle">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div className="pr-1">
                <span className="text-[10px] text-slate-400 block font-medium">Adherence</span>
                <span className="text-xs font-bold text-slate-800">98% High</span>
              </div>
            </div>

            {/* Floating Metric 2 */}
            <div className="absolute bottom-6 -right-2 bg-white/95 backdrop-blur-xs rounded-xl p-2.5 shadow-md border border-blue-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
              <div className="pr-1">
                <span className="text-[10px] text-slate-400 block font-medium">Daily Doses</span>
                <span className="text-xs font-bold text-slate-800">2 Due Today</span>
              </div>
            </div>

            {/* Floating Metric 3 */}
            <div className="absolute -bottom-2 left-6 bg-white/95 backdrop-blur-xs rounded-full px-3 py-1 shadow-xs border border-blue-100 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Plus className="w-3 h-3 text-blue-600 stroke-[3]" />
              <span>Smart Pill Reminders</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
