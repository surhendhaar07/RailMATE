import React, { useState, useEffect } from "react";
import { User, Lock, Mail, Trash2, Edit2, UserPlus, Eye, EyeOff, ShieldAlert, Check, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Current logged in user info to prevent self-deletion
  const [currentUser, setCurrentUser] = useState(null);

  // Form States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [deptInput, setDeptInput] = useState("Engineering");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Get logged-in user
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Error reading user from localStorage:", e);
    }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load user accounts. Make sure the API server is reachable.");
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditUserId(null);
    setUsernameInput("");
    setEmailInput("");
    setPasswordInput("");
    setDeptInput("Engineering");
    setFormError("");
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setIsEditing(true);
    setEditUserId(user.id);
    setUsernameInput(user.username);
    setEmailInput(user.email || "");
    setPasswordInput("");
    setDeptInput(user.department);
    setFormError("");
    setShowPassword(false);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    if (!usernameInput.trim()) {
      setFormError("Username is required.");
      setIsSubmitting(false);
      return;
    }

    if (!emailInput.trim()) {
      setFormError("Email address is required.");
      setIsSubmitting(false);
      return;
    }

    if (!isEditing && !passwordInput) {
      setFormError("Password is required for new users.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditing) {
        await api.updateUser(editUserId, usernameInput.trim(), emailInput.trim(), passwordInput ? passwordInput : undefined, deptInput);
        showSuccessNotification("User updated successfully.");
      } else {
        await api.createUser(usernameInput.trim(), emailInput.trim(), passwordInput, deptInput);
        showSuccessNotification("User created successfully.");
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setFormError(err.message || "Failed to save user. Verify if username or email already exists.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    // Prevent self-deletion
    if (currentUser && currentUser.name.toLowerCase().includes("admin") && user.username === "admin") {
      alert("You cannot delete the primary admin user account to avoid self-lockout.");
      return;
    }

    if (currentUser && currentUser.username === user.username) {
      alert("You cannot delete your own logged-in user account.");
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete the user account "${user.username}"?`)) {
      return;
    }

    try {
      await api.deleteUser(user.id);
      showSuccessNotification("User account deleted successfully.");
      loadUsers();
    } catch (err) {
      setError(err.message || "Failed to delete user account.");
    }
  };

  const showSuccessNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg("");
    }, 4000);
  };

  const getDeptBadgeColor = (dept) => {
    switch (dept) {
      case "Admin":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
      case "Engineering":
        return "border-amber-500/20 bg-amber-500/10 text-amber-400";
      case "S&T":
        return "border-cyan-500/20 bg-cyan-500/10 text-cyan-400";
      case "Traction":
        return "border-rose-500/20 bg-rose-500/10 text-rose-400";
      default:
        return "border-slate-850 bg-slate-900/40 text-slate-400";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header action button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-955 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 cursor-pointer flex justify-center items-center"
        >
          <UserPlus size={16} />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Success notification banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl flex items-center gap-3 text-xs animate-in slide-in-from-top-2">
          <Check size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error notification banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadUsers} className="text-rose-400 hover:text-rose-300 underline font-mono flex items-center gap-1">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Users Dashboard Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
          <h3 className="font-bold text-sm uppercase text-slate-300 tracking-wider font-mono">User Accounts ({users.length})</h3>
          <button
            onClick={loadUsers}
            className="text-slate-400 hover:text-slate-200 transition-all p-1.5 hover:bg-slate-800 rounded-xl"
            title="Refresh Account List"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-emerald-400" : ""} />
          </button>
        </div>

        {isLoading && users.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-8 w-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs font-mono">Fetching account registry...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center">
            <ShieldAlert className="text-amber-500 mx-auto mb-3 h-10 w-10 opacity-70" />
            <p className="text-slate-400 font-bold text-sm">No User Accounts Found</p>
            <p className="text-slate-500 text-xs mt-1">Add accounts to let department managers log in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-mono tracking-widest text-slate-500 bg-slate-950/20">
                  <th className="py-4 px-6 font-semibold">User ID / Username</th>
                  <th className="py-4 px-6 font-semibold">Email Address</th>
                  <th className="py-4 px-6 font-semibold">Access Department</th>
                  <th className="py-4 px-6 font-semibold">Access Level</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {users.map((user) => {
                  const isSelf = currentUser && currentUser.username === user.username;
                  return (
                    <tr key={user.id} className="hover:bg-slate-800/20 transition-all group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-mono text-sm font-semibold group-hover:scale-105 transition-transform">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-200">{user.username}</span>
                            {isSelf && (
                              <span className="ml-2 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                Current
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-300">
                        {user.email}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getDeptBadgeColor(user.department)}`}>
                          {user.department}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">
                        {user.department === "Admin" ? "System Administrator" : "Department Operator"}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-xl transition-all hover:scale-105 cursor-pointer"
                            title="Edit Credentials"
                          >
                            <Edit2 size={14} />
                          </button>
                          {user.username !== "admin" && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={isSelf}
                              className={`p-2 rounded-xl transition-all hover:scale-105 ${isSelf
                                ? "bg-slate-800/40 text-slate-650 cursor-not-allowed"
                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 cursor-pointer"
                                }`}
                              title={isSelf ? "Cannot delete yourself" : "Delete Account"}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Glassmorphic Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Header Accent Glow Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-3xl" />

            <h3 className="text-lg font-black text-slate-100 uppercase tracking-wide mb-1">
              {isEditing ? "Modify Credentials" : "Register User Account"}
            </h3>
            <p className="text-slate-400 text-xs mb-6">
              {isEditing ? "Update username, password, or department mapping." : "Create credentials for department dispatcher access."}
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl flex items-center gap-2 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Username (User ID)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. st_operator"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. operator@railmate.in"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!isEditing}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={isEditing ? "Leave blank to keep current" : "••••••••"}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Department Access Mapping
                </label>
                <select
                  value={deptInput}
                  onChange={(e) => setDeptInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer font-bold"
                >
                  <option value="Engineering">Engineering Department</option>
                  <option value="S&T">S&T (Signals & Telecom)</option>
                  <option value="Traction">Traction (Electrical OHE)</option>
                  <option value="Admin">Admin (Dispatcher/System)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-850 hover:bg-slate-800 active:bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3 w-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
