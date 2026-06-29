"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Search, Filter, ArrowUpDown, Plus, Download, Check, X,
  ChevronLeft, ChevronRight, AlertCircle, FileSpreadsheet,
  UploadCloud, AlertTriangle, Tag, Trash2, Calendar, User, Eye, XCircle, RefreshCw
} from "lucide-react";

interface Article {
  id: string;
  pmid: string | null;
  title: string;
  authors: string | null;
  citation: string | null;
  firstAuthor: string | null;
  journalBook: string | null;
  publicationYear: number | null;
  createDate: string | null;
  pmcid: string | null;
  nihmsId: string | null;
  doi: string | null;
  reviewStatus: string;
  priority: string;
  notes: string | null;
  tags: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface ImportPreviewRow {
  index: number;
  status: "valid" | "invalid" | "duplicate";
  errors: string[];
  warnings: string[];
  data: Partial<Article>;
}

export default function ProjectWorkspace() {
  const { id: projectId } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();

  // Project & Articles State
  const [articles, setArticles] = useState<Article[]>([]);
  const [userRole, setUserRole] = useState<string>("REVIEWER");
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Pagination, Filter, Sort State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawer / Single Article Detail state
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [isUpdatingArticle, setIsUpdatingArticle] = useState(false);
  const [detailStatus, setDetailStatus] = useState("UNREVIEWED");
  const [detailPriority, setDetailPriority] = useState("MEDIUM");
  const [detailNotes, setDetailNotes] = useState("");
  const [detailTags, setDetailTags] = useState("");

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    summary: { totalRows: number; validCount: number; invalidCount: number; duplicateCount: number };
    previewRows: ImportPreviewRow[];
  } | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "overwrite" | "keep-both">("skip");
  const [importCommitLoading, setImportCommitLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const previewLimit = 15;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch articles
  const fetchArticles = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const q = new URLSearchParams({
        search: debouncedSearch,
        status: statusFilter,
        priority: priorityFilter,
        tag: tagFilter,
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/projects/${projectId}/articles?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        setTagsList(data.tags || []);
        setUserRole(data.userRole || "REVIEWER");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to load project articles.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchArticles();
    }
  }, [projectId, debouncedSearch, statusFilter, priorityFilter, tagFilter, sortBy, sortOrder, page]);

  // Handle Sort changes
  const handleSort = (field: string) => {
    const isAsc = sortBy === field && sortOrder === "asc";
    setSortBy(field);
    setSortOrder(isAsc ? "desc" : "asc");
    setPage(1);
  };

  // Toggle selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(articles.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Handle single article click
  const openDrawer = (article: Article) => {
    setActiveArticle(article);
    setDetailStatus(article.reviewStatus);
    setDetailPriority(article.priority);
    setDetailNotes(article.notes || "");
    setDetailTags(article.tags || "");
  };

  const closeDrawer = () => {
    setActiveArticle(null);
  };

  const saveArticleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeArticle) return;

    setIsUpdatingArticle(true);
    try {
      const res = await fetch(`/api/articles/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          articleIds: [activeArticle.id],
          updates: {
            reviewStatus: detailStatus,
            priority: detailPriority,
            notes: detailNotes,
            tags: detailTags,
          },
        }),
      });

      if (res.ok) {
        const updatedTags = detailTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .join(",");

        setArticles(
          articles.map((a) =>
            a.id === activeArticle.id
              ? {
                  ...a,
                  reviewStatus: detailStatus,
                  priority: detailPriority,
                  notes: detailNotes || null,
                  tags: updatedTags || null,
                }
              : a
          )
        );
        closeDrawer();
        fetchArticles();
      } else {
        alert("Failed to save updates.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving updates.");
    } finally {
      setIsUpdatingArticle(false);
    }
  };

  // Bulk operations
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch(`/api/articles/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          articleIds: selectedIds,
          updates: { reviewStatus: status },
        }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchArticles();
      } else {
        alert("Bulk update failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Bulk update error.");
    }
  };

  // Excel Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportPreview(null);
      setImportError("");
      triggerPreview(file);
    }
  };

  const triggerPreview = async (file: File) => {
    setImportLoading(true);
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImportPreview(data);
      } else {
        const data = await res.json();
        setImportError(data.error || "Failed to generate file preview.");
      }
    } catch (err) {
      console.error(err);
      setImportError("Network error parsing file.");
    } finally {
      setImportLoading(false);
    }
  };

  const commitImport = async () => {
    if (!importPreview) return;
    setImportCommitLoading(true);
    setImportError("");

    try {
      const importRows = importPreview.previewRows.filter(
        (r) => r.status === "valid" || r.status === "duplicate"
      );

      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          articles: importRows,
          duplicateStrategy,
        }),
      });

      if (res.ok) {
        setImportModalOpen(false);
        setImportFile(null);
        setImportPreview(null);
        fetchArticles();
      } else {
        const data = await res.json();
        setImportError(data.error || "Failed to commit import.");
      }
    } catch (err) {
      console.error(err);
      setImportError("Error saving articles.");
    } finally {
      setImportCommitLoading(false);
    }
  };

  // Export reviewed articles to CSV
  const handleCSVExport = () => {
    const csvHeaders = [
      "PMID", "Title", "Authors", "Journal", "Pub Year", "DOI", "Review Status", "Priority", "Notes", "Tags"
    ];

    const csvRows = articles.map((a) => [
      a.pmid || "",
      `"${(a.title || "").replace(/"/g, '""')}"`,
      `"${(a.authors || "").replace(/"/g, '""')}"`,
      `"${(a.journalBook || "").replace(/"/g, '""')}"`,
      a.publicationYear || "",
      a.doi || "",
      a.reviewStatus,
      a.priority,
      `"${(a.notes || "").replace(/"/g, '""')}"`,
      `"${(a.tags || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((e) => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `project_${projectId}_articles_export.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Access Denied
  if (errorMsg && errorMsg.includes("Access Denied")) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <XCircle className="w-10 h-10 text-red-500 mx-auto" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Access Denied</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your persona does not have permission to access this project. Use the header to switch users.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Project Desk</span>
            <span className="text-slate-300">•</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              userRole === "OWNER" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {userRole}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
            Article Review Space
          </h1>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {userRole === "OWNER" && (
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Import Excel
            </button>
          )}

          <button
            onClick={handleCSVExport}
            disabled={articles.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-semibold transition hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Toolbar Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search PMID, title, authors, DOI..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNREVIEWED">Unreviewed</option>
            <option value="INCLUDE">Include</option>
            <option value="EXCLUDE">Exclude</option>
            <option value="MAYBE">Maybe</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>

          <select
            value={tagFilter}
            onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
            className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
          >
            <option value="">All Tags</option>
            {tagsList.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <span className="text-xs text-indigo-900 font-semibold">
            Selected <strong>{selectedIds.length}</strong> item(s)
          </span>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleBulkStatusUpdate("INCLUDE")}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 transition"
            >
              Include
            </button>
            <button
              onClick={() => handleBulkStatusUpdate("EXCLUDE")}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-500 transition"
            >
              Exclude
            </button>
            <button
              onClick={() => handleBulkStatusUpdate("MAYBE")}
              className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-500 transition"
            >
              Maybe
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-500 hover:underline ml-auto sm:ml-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace View: Mobile Cards + Desktop Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading articles...
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center p-6 max-w-sm mx-auto space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No articles found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Adjust filters or upload PubMed articles using the Excel import button.
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {articles.map((a) => {
                const isSelected = selectedIds.includes(a.id);
                let statusBadge = "bg-slate-100 text-slate-600";
                if (a.reviewStatus === "INCLUDE") statusBadge = "bg-emerald-50 text-emerald-700";
                if (a.reviewStatus === "EXCLUDE") statusBadge = "bg-red-50 text-red-700";
                if (a.reviewStatus === "MAYBE") statusBadge = "bg-amber-50 text-amber-700";

                return (
                  <div key={a.id} className={`p-4 space-y-3 ${isSelected ? "bg-indigo-50/50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(a.id)}
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusBadge}`}>
                          {a.reviewStatus}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 mt-1.5 leading-snug">
                          {a.title}
                        </h4>
                      </div>
                      <button
                        onClick={() => openDrawer(a)}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold shrink-0"
                      >
                        Inspect
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1 pl-7">
                      <div><strong className="text-slate-700">Author:</strong> {a.firstAuthor || "Unknown"} ({a.publicationYear || "—"})</div>
                      <div className="truncate"><strong className="text-slate-700">Journal:</strong> {a.journalBook || "—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === articles.length}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 w-28">Status</th>
                    <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort("title")}>
                      Title <ArrowUpDown className="inline w-3 h-3 ml-1" />
                    </th>
                    <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort("publicationYear")}>
                      Year <ArrowUpDown className="inline w-3 h-3 ml-1" />
                    </th>
                    <th className="py-3 px-4 w-28 cursor-pointer hover:text-slate-900" onClick={() => handleSort("priority")}>
                      Priority <ArrowUpDown className="inline w-3 h-3 ml-1" />
                    </th>
                    <th className="py-3 px-4 w-32">Tags</th>
                    <th className="py-3 px-4 w-20 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articles.map((a) => {
                    const isSelected = selectedIds.includes(a.id);
                    let statusBadge = "bg-slate-100 text-slate-600";
                    if (a.reviewStatus === "INCLUDE") statusBadge = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                    if (a.reviewStatus === "EXCLUDE") statusBadge = "bg-red-50 text-red-700 border border-red-200";
                    if (a.reviewStatus === "MAYBE") statusBadge = "bg-amber-50 text-amber-700 border border-amber-200";

                    return (
                      <tr key={a.id} className={`hover:bg-slate-50/80 transition ${isSelected ? "bg-indigo-50/40" : ""}`}>
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(a.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusBadge}`}>
                            {a.reviewStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-md">
                          <div className="font-bold text-xs text-slate-900 truncate" title={a.title}>
                            {a.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {a.firstAuthor || "Unknown Author"} • {a.journalBook || "Unknown Journal"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                          {a.publicationYear || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className={a.priority === "HIGH" ? "text-red-600 font-semibold" : a.priority === "MEDIUM" ? "text-amber-600" : "text-emerald-600"}>
                            {a.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {a.tags ? (
                              a.tags.split(",").map((t) => (
                                <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {t.trim()}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => openDrawer(a)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div>Page <strong>{page}</strong> of <strong>{totalPages}</strong></div>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-1 border border-slate-200 disabled:opacity-30 rounded hover:bg-slate-100 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 border border-slate-200 disabled:opacity-30 rounded hover:bg-slate-100 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Side-Drawer */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fadeIn">
          <div onClick={closeDrawer} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

          <div className="relative w-full max-w-lg bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-10">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Review Panel</span>
                <h2 className="text-sm font-bold text-slate-900 truncate max-w-[280px] sm:max-w-[340px] mt-0.5">{activeArticle.title}</h2>
              </div>
              <button onClick={closeDrawer} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveArticleDetails} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</label>
                  <select
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="UNREVIEWED">Unreviewed</option>
                    <option value="INCLUDE">Include</option>
                    <option value="EXCLUDE">Exclude</option>
                    <option value="MAYBE">Maybe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                  <select
                    value={detailPriority}
                    onChange={(e) => setDetailPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                <textarea
                  placeholder="Reviewer justification or notes..."
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. diabetes, trial"
                  value={detailTags}
                  onChange={(e) => setDetailTags(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3 text-xs text-slate-500">
                <h3 className="font-bold text-slate-900 text-xs uppercase">Metadata</h3>
                <div><strong>PMID:</strong> {activeArticle.pmid || "—"}</div>
                <div><strong>DOI:</strong> {activeArticle.doi || "—"}</div>
                <div><strong>Authors:</strong> {activeArticle.authors || "—"}</div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={isUpdatingArticle}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
                >
                  {isUpdatingArticle ? "Saving..." : "Save Review"}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Dialog Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setImportModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

          <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl flex flex-col max-h-[85vh] shadow-xl z-10">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  Import Articles
                </h2>
              </div>
              <button onClick={() => setImportModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {!importPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-8 sm:p-12 text-center space-y-3 cursor-pointer bg-slate-50/50 transition"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
                  <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto" />
                  <span className="text-xs font-bold text-slate-900 block">Click to select PubMed export file (.xlsx)</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-50 rounded-lg"><span className="text-[10px] text-slate-400 font-bold block">Total</span><span className="font-bold text-slate-900">{importPreview.summary.totalRows}</span></div>
                    <div className="p-3 bg-slate-50 rounded-lg"><span className="text-[10px] text-emerald-500 font-bold block">Valid</span><span className="font-bold text-emerald-600">{importPreview.summary.validCount}</span></div>
                    <div className="p-3 bg-slate-50 rounded-lg"><span className="text-[10px] text-rose-500 font-bold block">Invalid</span><span className="font-bold text-rose-600">{importPreview.summary.invalidCount}</span></div>
                    <div className="p-3 bg-slate-50 rounded-lg"><span className="text-[10px] text-amber-500 font-bold block">Duplicates</span><span className="font-bold text-amber-600">{importPreview.summary.duplicateCount}</span></div>
                  </div>

                  {importPreview.summary.duplicateCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs text-amber-800 font-semibold">Resolve Duplicates:</span>
                      <select
                        value={duplicateStrategy}
                        onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                        className="bg-white border border-amber-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="skip">Skip duplicates (Default)</option>
                        <option value="overwrite">Overwrite existing columns</option>
                        <option value="keep-both">Keep both (Create duplicate)</option>
                      </select>
                    </div>
                  )}

                  {/* Windowed Virtualized Preview Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 flex justify-between items-center border-b border-slate-200">
                      <span>Parsed Preview (Showing {Math.min((previewPage - 1) * previewLimit + 1, importPreview.previewRows.length)} - {Math.min(previewPage * previewLimit, importPreview.previewRows.length)} of {importPreview.previewRows.length})</span>
                      {Math.ceil(importPreview.previewRows.length / previewLimit) > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={previewPage === 1}
                            onClick={() => setPreviewPage(previewPage - 1)}
                            className="px-2 py-0.5 border border-slate-200 rounded disabled:opacity-30"
                          >
                            Prev
                          </button>
                          <span>{previewPage} / {Math.ceil(importPreview.previewRows.length / previewLimit)}</span>
                          <button
                            type="button"
                            disabled={previewPage === Math.ceil(importPreview.previewRows.length / previewLimit)}
                            onClick={() => setPreviewPage(previewPage + 1)}
                            className="px-2 py-0.5 border border-slate-200 rounded disabled:opacity-30"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {importPreview.previewRows
                        .slice((previewPage - 1) * previewLimit, previewPage * previewLimit)
                        .map((r) => (
                          <div key={r.index} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                r.status === "valid" ? "bg-emerald-100 text-emerald-800" :
                                r.status === "duplicate" ? "bg-amber-100 text-amber-800" :
                                "bg-rose-100 text-rose-800"
                              }`}>
                                {r.status}
                              </span>
                              <span className="font-semibold text-slate-900 truncate max-w-xs">{r.data.title || "Untitled"}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">{r.data.pmid ? `PMID:${r.data.pmid}` : r.data.doi || "—"}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {importLoading && <div className="py-8 text-center text-xs text-slate-400">Parsing sheet...</div>}
              {importError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs">{importError}</div>}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-between">
              {importPreview ? <button onClick={() => setImportPreview(null)} className="px-3 py-1.5 border border-slate-200 rounded text-xs">Change File</button> : <div />}
              <div className="flex gap-2">
                <button onClick={() => setImportModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded text-xs">Close</button>
                {importPreview && (
                  <button onClick={commitImport} disabled={importCommitLoading} className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold">
                    {importCommitLoading ? "Importing..." : "Commit Import"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
