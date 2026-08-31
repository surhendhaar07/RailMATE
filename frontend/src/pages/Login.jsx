import React, { useState } from "react";
import { Train, Lock, User, Mail, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { api } from "../services/api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.loginDepartment(email.trim(), password);
      localStorage.setItem("isLoggedIn", "true");
      if (response.department === "Admin") {
        localStorage.setItem("user", JSON.stringify({
          name: "System Administrator",
          role: "Dispatcher",
          department: "Admin"
        }));
      } else {
        localStorage.setItem("user", JSON.stringify({
          name: `${response.department} Manager`,
          role: "Department",
          department: response.department
        }));
      }
      onLogin();
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotSubmitting(true);
    try {
      await api.forgotPassword(forgotEmail.trim());
      setForgotSuccess("OTP has been sent to your email address (check backend logs if SMTP is not configured).");
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message || "Failed to send OTP. Verify the email address.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (forgotOtp.trim().length !== 6) {
      setForgotError("Please enter a valid 6-digit OTP code.");
      return;
    }
    setForgotError("");
    setForgotStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    if (forgotNewPassword.length < 4) {
      setForgotError("Password should be at least 4 characters long.");
      return;
    }
    setForgotSubmitting(true);
    try {
      await api.verifyOtp(forgotEmail.trim(), forgotOtp.trim(), forgotNewPassword);
      alert("Password reset successfully. You can now login with your new password.");
      setShowForgotModal(false);
    } catch (err) {
      setForgotError(err.message || "Failed to reset password. Verify the OTP code.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-955 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-slate-100">
      {/* Background Decorative Glow & Mesh Effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Subtle Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Glassmorphic Container Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-slate-950/80 relative overflow-hidden">

          {/* Header Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          {/* Logo & Branding */}
          <div className="flex flex-col items-center text-center space-y-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group transition-transform hover:scale-105">
              <Train className="text-slate-950 h-7 w-7 transition-transform group-hover:rotate-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-slate-100">RailMATE</h1>
              <p className="text-xs text-slate-400 font-mono mt-1">Railway Corridor Maintenance & Allocation Engine</p>
            </div>
          </div>

          {/* Demo Credentials Instruction Badge */}
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 text-xs text-emerald-400">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>Demo Accounts (Email / Pass):</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-[10px] font-mono">
              <div className="bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-500/10 text-emerald-100">
                <strong className="font-semibold text-emerald-250 mr-1">Admin:</strong> admin@railmate.in / admin
              </div>
              <div className="bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-500/10 text-emerald-100">
                <strong className="text-emerald-250 font-semibold mr-1">Engineering:</strong> engineering@railmate.in / password
              </div>
              <div className="bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-500/10 text-emerald-100">
                <strong className="text-emerald-250 font-semibold mr-1">Signals (S&T):</strong> signals@railmate.in / password
              </div>
              <div className="bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-500/10 text-emerald-100">
                <strong className="text-emerald-250 font-semibold mr-1">Traction:</strong> traction@railmate.in / password
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-xs text-rose-400 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotStep(1);
                    setForgotEmail(email);
                    setForgotOtp("");
                    setForgotNewPassword("");
                    setForgotConfirmPassword("");
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-mono transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-955/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to System</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <p className="text-[11px] text-slate-500">
              Authorized Rail Operations Access Only
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Glassmorphic Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Header Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-3xl" />

            <h3 className="text-lg font-black text-slate-100 uppercase tracking-wide mb-1 flex items-center gap-2">
              <Lock size={18} className="text-emerald-400" />
              <span>Password Recovery</span>
            </h3>
            <p className="text-slate-400 text-xs mb-6 font-medium">
              {forgotStep === 1 && "Step 1: Enter your registered email address to receive a 6-digit verification code."}
              {forgotStep === 2 && "Step 2: Enter the 6-digit verification code sent to your email address."}
              {forgotStep === 3 && "Step 3: Setup your new password secure credentials."}
            </p>

            {forgotError && (
              <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center gap-3 text-xs animate-in slide-in-from-top-1">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3 text-xs animate-in slide-in-from-top-1">
                <ShieldCheck size={16} className="shrink-0 text-emerald-400" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. engineering@railmate.in"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-800 text-slate-350 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-955 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {forgotSubmitting ? (
                      <>
                        <div className="h-3 w-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send OTP</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit code"
                    className="w-full text-center tracking-widest font-mono py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-lg placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-800 text-slate-350 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-955 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Verify Code
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(2)}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-800 text-slate-350 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-955 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {forgotSubmitting ? (
                      <>
                        <div className="h-3 w-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
