"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Folder, Shield, ArrowRight, BookOpen, Layers, Users, Sparkles, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { user, allUsers, login, isLoading } = useAuth();
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !selectedOrgId) return;

    setIsCreatingProject(true);
    setCreateError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          organizationId: selectedOrgId,
        }),
      });

      if (res.ok) {
        setNewProjectName("");
        setNewProjectDesc("");
        window.location.reload();
      } else {
        const data = await res.json();
        setCreateError(data.error || "Failed to create project");
      }
    } catch (err) {
      console.error(err);
      setCreateError("Connection error");
    } finally {
      setIsCreatingProject(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Loading workspace...</p>
      </div>
    );
  }

  // Welcome Screen (Unauthenticated - Mobile First Minimalist White)
  if (!user) {
    return (
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Systematic Literature Review Workspace
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Article Review Workspace
          </h1>

          <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Import PubMed articles, validate datasets, enforce project boundaries, and review research efficiently.
          </p>
        </div>

        {/* Persona selection cards (Mobile First grid) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Sign in as a Test Persona
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Select an identity below to test role permissions and project access isolation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {allUsers.map((u) => {
              const isAlice = u.email.startsWith("alice");
              const isBob = u.email.startsWith("bob");

              let title = "Reviewer";
              let badgeColor = "bg-slate-100 text-slate-700";
              let desc = "Review articles in Project Alpha.";

              if (isAlice) {
                title = "Dr. Alice (Owner)";
                badgeColor = "bg-indigo-50 text-indigo-700 border border-indigo-200";
                desc = "Full access to Projects Alpha & Beta. Can import articles.";
              } else if (!isAlice && !isBob) {
                title = "Dr. Charlie (External)";
                badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                desc = "Belongs to Org B. Access to Org A projects will be denied.";
              }

              return (
                <button
                  key={u.id}
                  onClick={() => login(u.id)}
                  className="group text-left p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-indigo-500 transition flex flex-col justify-between h-44 bg-slate-50/50"
                >
                  <div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${badgeColor}`}>
                      {title.split(" ")[0]}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-indigo-600 transition-colors">
                      {u.name.split(" (")[0]}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-indigo-600 mt-4">
                    <span>Activate Persona</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard (Authenticated - Mobile First Minimalist White)
  const isOwner = user.orgMemberships.some((m) => m.role === "OWNER");

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Welcome, {user.name.split(" (")[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organization: <strong className="text-slate-800">{user.orgMemberships[0]?.organization.name || "Workspace"}</strong>
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold self-start sm:self-auto">
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          Role: {user.orgMemberships[0]?.role}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Projects list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Projects ({user.projectMemberships.length})
            </h2>
          </div>

          {user.projectMemberships.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
              <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No assigned projects</p>
              <p className="text-[11px] text-slate-500 mt-1">You do not have active memberships in this organization.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user.projectMemberships.map((pm) => (
                <Link
                  key={pm.id}
                  href={`/project/${pm.projectId}`}
                  className="group block p-5 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl transition shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 rounded-lg bg-slate-100 text-indigo-600">
                      <Folder className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      pm.role === "OWNER"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {pm.role}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {pm.project.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {pm.project.description || "No description provided."}
                  </p>

                  <div className="flex items-center text-xs font-semibold text-indigo-600 mt-4 pt-3 border-t border-slate-100">
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Controls / Create Project */}
        <div className="space-y-6">
          {isOwner && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Create New Project
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Add a systematic review project to your workspace.
              </p>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hypertension Study"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Scope of review..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Organization
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Organization...</option>
                    {user.orgMemberships.map((m) => (
                      <option key={m.organization.id} value={m.organization.id}>
                        {m.organization.name}
                      </option>
                    ))}
                  </select>
                </div>

                {createError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingProject}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {isCreatingProject ? "Creating..." : "Create Project"}
                </button>
              </form>
            </div>
          )}

          {/* Persona Testing Helper Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600" />
              Testing Authorization Boundaries
            </div>
            <p className="leading-relaxed">
              Use the header dropdown to switch between Alice (Owner), Bob (Reviewer in Alpha only), and Charlie (External - blocked access).
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
