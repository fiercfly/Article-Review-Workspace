"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, ChevronDown, LogOut, Users } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { user, allUsers, login, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center space-x-2.5">
          <span className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white font-bold flex items-center justify-center text-xs tracking-wider">
            SLR
          </span>
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
            EasySLR
          </span>
        </Link>

        {/* Persona Selector Dropdown (Mobile-first compact sizing) */}
        <div className="relative">
          {isLoading ? (
            <div className="h-9 w-28 sm:w-36 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          ) : user ? (
            <div>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-[160px]">{user.name.split(" (")[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-slate-800 dark:text-slate-200">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Test Persona
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {allUsers.map((u) => {
                      const isCurrent = u.id === user.id;
                      const isAlice = u.email.startsWith("alice");
                      const isBob = u.email.startsWith("bob");

                      let roleLabel = "Reviewer";
                      if (isAlice) roleLabel = "Admin / Owner";
                      if (!isAlice && !isBob) roleLabel = "External User (Org B)";

                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            setDropdownOpen(false);
                            login(u.id);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-3 transition ${
                            isCurrent ? "bg-slate-50 dark:bg-slate-800/80 font-semibold" : ""
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs text-slate-900 dark:text-white font-medium">
                              <span className="truncate">{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                              {roleLabel}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {u.email}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-2 px-2">
                    <button
                      onClick={logout}
                      className="w-full flex items-center space-x-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-lg text-xs font-semibold transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3.5 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition shadow-sm"
            >
              Select Persona
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
