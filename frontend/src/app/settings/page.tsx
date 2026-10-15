"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { updatePatientProfile, updateNotificationPreferences } from "@/lib/supabase/data";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Check,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name || "Priya Sharma");
  const [email, setEmail] = useState(user?.email || profile?.email || "priya.sharma@example.com");
  const [phone, setPhone] = useState(profile?.phone || "+1 (555) 234-5678");
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || "B+");
  const [emergencyContact, setEmergencyContact] = useState(
    profile?.emergencyContact || "+1 (555) 987-6543"
  );
  const [language, setLanguage] = useState("English (US)");

  // Notification toggles
  const [pushReminders, setPushReminders] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);
  const [appointmentAlerts, setAppointmentAlerts] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.id) {
      await updatePatientProfile(user.id, {
        name,
        phone,
        bloodGroup,
        emergencyContact,
      });
      await updateNotificationPreferences(user.id, {
        pushReminders,
        smsAlerts: smsReminders,
        appointmentAlerts,
      });
      await refreshProfile();
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Account & Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your personal profile, notification preferences, and privacy.
          </p>
        </div>

        {savedNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile and preferences updated successfully!</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Personal Information
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-200 to-rose-200 text-slate-800 flex items-center justify-center font-bold text-xl border-2 border-white shadow-xs">
                PS
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  {name}
                </span>
                <span className="text-xs text-slate-400">
                  Role: Patient • MediMate ID: #MED-8823
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Blood Group
                </label>
                <input
                  type="text"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Preferred Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="English (US)">English (US)</option>
                  <option value="Spanish (ES)">Spanish (Español)</option>
                  <option value="Hindi (IN)">Hindi (हिन्दी)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>

        {/* Notifications & Reminders */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <Bell className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Notification Preferences
            </h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Push Dose Reminders
                </span>
                <span className="text-[11px] text-slate-500">
                  Receive browser notifications at scheduled dose times (e.g. 08:00 AM)
                </span>
              </div>
              <input
                type="checkbox"
                checked={pushReminders}
                onChange={(e) => setPushReminders(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  SMS / WhatsApp Alerts
                </span>
                <span className="text-[11px] text-slate-500">
                  Critical backup reminder if morning dose is unconfirmed after 45 minutes
                </span>
              </div>
              <input
                type="checkbox"
                checked={smsReminders}
                onChange={(e) => setSmsReminders(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Appointment Alerts (24 Hours Prior)
                </span>
                <span className="text-[11px] text-slate-500">
                  Reminders with pre-consultation summary check
                </span>
              </div>
              <input
                type="checkbox"
                checked={appointmentAlerts}
                onChange={(e) => setAppointmentAlerts(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300"
              />
            </label>
          </div>
        </div>

        {/* Privacy & Account Actions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Privacy & Security
            </h2>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <span>Export Full Medical History (JSON)</span>
              <button
                type="button"
                onClick={() => alert("Export initiated. File will download shortly.")}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Export
              </button>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-900 block">
                  Sign Out
                </span>
                <span className="text-[10px] text-rose-600">
                  End active session on this device
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
