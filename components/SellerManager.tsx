"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

type BuyerSource = "ai" | "manual";
type BuyerStatus =
  | "候補"
  | "打診中"
  | "面談済"
  | "LOI受領"
  | "交渉中"
  | "成約"
  | "見送り";
type SellerStage =
  | "初回面談"
  | "情報収集"
  | "買い手選定"
  | "打診中"
  | "交渉中"
  | "成約"
  | "見送り";

type SellerRank = "A" | "B" | "C" | "D";
type MediatorType = "仲介" | "買FA" | "FA" | "両面";

interface BuyerCandidate {
  id: string;
  companyCode: string;
  companyName: string;
  industry?: string;
  source: BuyerSource;
  reasoning: string;
  status: BuyerStatus;
  addedAt: string;
  updatedAt: string;
}

interface SellerMinute {
  id: string;
  title: string;
  date: string;
  participants: string[];
  content: string;
  createdAt: string;
}

interface SellerDocument {
  id: string;
  title: string;
  content: string;
  uploadedAt: string;
}

interface Seller {
  id: string;
  companyName: string;
  companyCode?: string;
  industry?: string;
  prefecture?: string;
  description: string;
  profile: string;
  desiredTerms: string;
  stage: SellerStage;
  // 構造化メタ
  priority?: string;
  rank?: SellerRank;
  assignedTo?: string;
  mediatorType?: MediatorType;
  introSource?: string;
  feeEstimate?: string;
  ndaSigned: boolean;
  adSigned: boolean;
  folderUrl?: string;
  minutes: SellerMinute[];
  documents: SellerDocument[];
  buyers: BuyerCandidate[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  sellerId?: string;
  startDate: string;
  targetDate: string;
}

const SELLER_STAGES: SellerStage[] = [
  "初回面談",
  "情報収集",
  "買い手選定",
  "打診中",
  "交渉中",
  "成約",
  "見送り",
];

const SELLER_RANKS: SellerRank[] = ["A", "B", "C", "D"];
const MEDIATOR_TYPES: MediatorType[] = ["仲介", "買FA", "FA", "両面"];

const RANK_COLORS: Record<SellerRank, string> = {
  A: "bg-rose-100 text-rose-700",
  B: "bg-amber-100 text-amber-700",
  C: "bg-blue-100 text-blue-700",
  D: "bg-slate-100 text-slate-600",
};

const BUYER_STATUSES: BuyerStatus[] = [
  "候補",
  "打診中",
  "面談済",
  "LOI受領",
  "交渉中",
  "成約",
  "見送り",
];

const STAGE_COLORS: Record<SellerStage, string> = {
  初回面談: "bg-slate-100 text-slate-600",
  情報収集: "bg-blue-100 text-blue-700",
  買い手選定: "bg-indigo-100 text-indigo-700",
  打診中: "bg-amber-100 text-amber-700",
  交渉中: "bg-orange-100 text-orange-700",
  成約: "bg-emerald-100 text-emerald-700",
  見送り: "bg-rose-100 text-rose-700",
};

const BUYER_STATUS_COLORS: Record<BuyerStatus, string> = {
  候補: "bg-slate-100 text-slate-600",
  打診中: "bg-blue-100 text-blue-700",
  面談済: "bg-indigo-100 text-indigo-700",
  LOI受領: "bg-purple-100 text-purple-700",
  交渉中: "bg-amber-100 text-amber-700",
  成約: "bg-emerald-100 text-emerald-700",
  見送り: "bg-rose-100 text-rose-700",
};

type Tab = "profile" | "minutes" | "documents" | "buyers";

const EMPTY_SELLER_FORM = {
  companyName: "",
  companyCode: "",
  industry: "",
  prefecture: "",
  description: "",
  profile: "",
  desiredTerms: "",
  stage: "初回面談" as SellerStage,
  priority: "" as "" | "★",
  rank: "" as SellerRank | "",
  assignedTo: "",
  mediatorType: "" as MediatorType | "",
  introSource: "",
  feeEstimate: "",
  ndaSigned: false,
  adSigned: false,
  folderUrl: "",
};

export default function SellerManager() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<SellerStage | "">("");
  const [filterRank, setFilterRank] = useState<SellerRank | "">("");
  const [filterPriority, setFilterPriority] = useState<"" | "★">("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterMediator, setFilterMediator] = useState<MediatorType | "">("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_SELLER_FORM);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const fetchSellers = useCallback(async () => {
    const res = await fetch("/api/sellers");
    const data = await res.json();
    setSellers(data);
  }, []);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSellers(), fetchProjects()]);
  }, [fetchSellers, fetchProjects]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/sellers"),
        fetch("/api/projects"),
      ]);
      const [sData, pData] = await Promise.all([sRes.json(), pRes.json()]);
      if (cancelled) return;
      setSellers(sData);
      setProjects(pData);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => sellers.find((s) => s.id === selectedId) ?? null,
    [sellers, selectedId],
  );

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    sellers.forEach((s) => {
      if (s.assignedTo) set.add(s.assignedTo);
    });
    return Array.from(set).sort();
  }, [sellers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sellers.filter((s) => {
      if (q) {
        const hit =
          s.companyName.toLowerCase().includes(q) ||
          s.industry?.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.profile.toLowerCase().includes(q) ||
          s.assignedTo?.toLowerCase().includes(q) ||
          s.introSource?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filterStage && s.stage !== filterStage) return false;
      if (filterRank && s.rank !== filterRank) return false;
      if (filterPriority && s.priority !== filterPriority) return false;
      if (filterAssignee && s.assignedTo !== filterAssignee) return false;
      if (filterMediator && s.mediatorType !== filterMediator) return false;
      return true;
    });
  }, [
    sellers,
    search,
    filterStage,
    filterRank,
    filterPriority,
    filterAssignee,
    filterMediator,
  ]);

  async function handleCreateSeller(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.companyName.trim()) return;
    const res = await fetch("/api/sellers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    if (res.ok) {
      const created: Seller = await res.json();
      setNewForm(EMPTY_SELLER_FORM);
      setShowNewForm(false);
      await fetchSellers();
      setSelectedId(created.id);
    }
  }

  async function handleDeleteSeller(id: string) {
    if (!confirm("この売主と関連データを削除しますか？")) return;
    await fetch(`/api/sellers/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    await fetchSellers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">売主管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            売主を中心に議事録・資料・買い手候補を一元管理。AIが買い手リストを提案します
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0 shadow-md"
        >
          + 新規売主
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="売主数" value={sellers.length} color="slate" />
        <StatCard
          label="進行中"
          value={
            sellers.filter((s) => s.stage !== "成約" && s.stage !== "見送り")
              .length
          }
          color="blue"
        />
        <StatCard
          label="紐付けプロジェクト"
          value={projects.filter((p) => p.sellerId).length}
          color="indigo"
        />
        <StatCard
          label="成約"
          value={sellers.filter((s) => s.stage === "成約").length}
          color="emerald"
        />
      </div>

      {/* New seller form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">新規売主登録</h3>
            <button
              onClick={() => setShowNewForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xl"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleCreateSeller} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="企業名 *"
                value={newForm.companyName}
                onChange={(v) => setNewForm({ ...newForm, companyName: v })}
                required
              />
              <Input
                label="業種"
                value={newForm.industry}
                onChange={(v) => setNewForm({ ...newForm, industry: v })}
              />
              <Input
                label="所在地"
                value={newForm.prefecture}
                onChange={(v) => setNewForm({ ...newForm, prefecture: v })}
              />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  ステージ
                </label>
                <select
                  value={newForm.stage}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      stage: e.target.value as SellerStage,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SELLER_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Textarea
              label="概要"
              value={newForm.description}
              onChange={(v) => setNewForm({ ...newForm, description: v })}
              rows={2}
              placeholder="事業内容・売却動機など"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
              >
                登録
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 space-y-3">
        <input
          type="text"
          placeholder="企業名・業種・担当者・紹介元で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value as SellerStage | "")}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">stage 全て</option>
            {SELLER_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterRank}
            onChange={(e) => setFilterRank(e.target.value as SellerRank | "")}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ランク 全て</option>
            {SELLER_RANKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as "" | "★")}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">優先度 全て</option>
            <option value="★">★ のみ</option>
          </select>
          <select
            value={filterMediator}
            onChange={(e) =>
              setFilterMediator(e.target.value as MediatorType | "")
            }
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">仲介/FA 全て</option>
            {MEDIATOR_TYPES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">担当者 全て</option>
            {assigneeOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        {(filterStage ||
          filterRank ||
          filterPriority ||
          filterAssignee ||
          filterMediator) && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">{filtered.length} 件</span>
            <button
              type="button"
              onClick={() => {
                setFilterStage("");
                setFilterRank("");
                setFilterPriority("");
                setFilterAssignee("");
                setFilterMediator("");
              }}
              className="px-2 py-0.5 rounded text-rose-600 hover:bg-rose-50 font-medium"
            >
              フィルタクリア
            </button>
          </div>
        )}
      </div>

      {/* Master-detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-slate-400">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200/60">
              <div className="text-3xl mb-2">---</div>
              {sellers.length === 0 ? "売主が登録されていません" : "該当なし"}
            </div>
          ) : (
            filtered.map((s) => {
              const projCount = projects.filter(
                (p) => p.sellerId === s.id,
              ).length;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedId(s.id);
                    setActiveTab("profile");
                  }}
                  className={`w-full text-left p-4 rounded-2xl border shadow-sm transition-all ${
                    selectedId === s.id
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-slate-200/60 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.priority === "★" && (
                          <span className="text-amber-500 text-sm shrink-0">
                            ★
                          </span>
                        )}
                        <p className="font-semibold text-slate-800 truncate">
                          {s.companyName}
                        </p>
                        {s.rank && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${RANK_COLORS[s.rank]}`}
                          >
                            {s.rank}
                          </span>
                        )}
                      </div>
                      {s.industry && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.industry}
                          {s.prefecture && ` / ${s.prefecture}`}
                          {s.mediatorType && ` / ${s.mediatorType}`}
                        </p>
                      )}
                      {s.assignedTo && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          担当: {s.assignedTo}
                          {s.introSource && ` / 紹介: ${s.introSource}`}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${STAGE_COLORS[s.stage]}`}
                    >
                      {s.stage}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 flex-wrap">
                    <span>議事録 {s.minutes.length}</span>
                    <span>資料 {s.documents.length}</span>
                    <span className="text-blue-500 font-semibold">
                      買い手 {s.buyers.length}
                    </span>
                    {projCount > 0 && (
                      <span className="text-indigo-600 font-semibold">
                        PJ {projCount}
                      </span>
                    )}
                    {s.ndaSigned && (
                      <span className="text-emerald-600 font-semibold">
                        NDA✓
                      </span>
                    )}
                    {s.adSigned && (
                      <span className="text-emerald-600 font-semibold">
                        AD✓
                      </span>
                    )}
                    {s.folderUrl && <span className="text-purple-500">📁</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail */}
        <div>
          {selected ? (
            <SellerDetail
              key={selected.id}
              seller={selected}
              projects={projects.filter((p) => p.sellerId === selected.id)}
              unlinkedProjects={projects.filter((p) => !p.sellerId)}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onRefresh={refreshAll}
              onDelete={() => handleDeleteSeller(selected.id)}
            />
          ) : (
            <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200/60">
              左側のリストから売主を選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Detail View ==========

function SellerDetail({
  seller,
  projects,
  unlinkedProjects,
  activeTab,
  setActiveTab,
  onRefresh,
  onDelete,
}: {
  seller: Seller;
  projects: ProjectSummary[];
  unlinkedProjects: ProjectSummary[];
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  onRefresh: () => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800 truncate">
                {seller.companyName}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${STAGE_COLORS[seller.stage]}`}
              >
                {seller.stage}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              {seller.industry && <span>{seller.industry}</span>}
              {seller.prefecture && <span>{seller.prefecture}</span>}
            </div>
          </div>
          <button
            onClick={onDelete}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
          >
            削除
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-slate-100 -mb-[21px]">
          {(
            [
              ["profile", `概要`],
              ["minutes", `議事録 (${seller.minutes.length})`],
              ["documents", `資料 (${seller.documents.length})`],
              ["buyers", `買い手 (${seller.buyers.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {activeTab === "profile" && (
          <ProfilePanel
            seller={seller}
            projects={projects}
            unlinkedProjects={unlinkedProjects}
            onRefresh={onRefresh}
          />
        )}
        {activeTab === "minutes" && (
          <MinutesPanel seller={seller} onRefresh={onRefresh} />
        )}
        {activeTab === "documents" && (
          <DocumentsPanel seller={seller} onRefresh={onRefresh} />
        )}
        {activeTab === "buyers" && (
          <BuyersPanel seller={seller} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
}

// ========== Profile ==========

function ProfilePanel({
  seller,
  projects,
  unlinkedProjects,
  onRefresh,
}: {
  seller: Seller;
  projects: ProjectSummary[];
  unlinkedProjects: ProjectSummary[];
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    description: seller.description,
    profile: seller.profile,
    desiredTerms: seller.desiredTerms,
    stage: seller.stage,
    priority: seller.priority ?? "",
    rank: seller.rank ?? ("" as SellerRank | ""),
    assignedTo: seller.assignedTo ?? "",
    mediatorType: seller.mediatorType ?? ("" as MediatorType | ""),
    introSource: seller.introSource ?? "",
    feeEstimate: seller.feeEstimate ?? "",
    ndaSigned: seller.ndaSigned,
    adSigned: seller.adSigned,
    folderUrl: seller.folderUrl ?? "",
  });

  async function handleSave() {
    await fetch(`/api/sellers/${seller.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priority: form.priority || undefined,
        rank: form.rank || undefined,
        assignedTo: form.assignedTo || undefined,
        mediatorType: form.mediatorType || undefined,
        introSource: form.introSource || undefined,
        feeEstimate: form.feeEstimate || undefined,
        folderUrl: form.folderUrl || undefined,
      }),
    });
    setEditing(false);
    await onRefresh();
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              ステージ
            </label>
            <select
              value={form.stage}
              onChange={(e) =>
                setForm({ ...form, stage: e.target.value as SellerStage })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              {SELLER_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              優先
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="">-</option>
              <option value="★">★</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              ランク
            </label>
            <select
              value={form.rank}
              onChange={(e) =>
                setForm({ ...form, rank: e.target.value as SellerRank | "" })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="">-</option>
              {SELLER_RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              仲介/FA
            </label>
            <select
              value={form.mediatorType}
              onChange={(e) =>
                setForm({
                  ...form,
                  mediatorType: e.target.value as MediatorType | "",
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="">-</option>
              {MEDIATOR_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              担当者
            </label>
            <input
              type="text"
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              紹介元
            </label>
            <input
              type="text"
              value={form.introSource}
              onChange={(e) =>
                setForm({ ...form, introSource: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              手数料想定
            </label>
            <input
              type="text"
              value={form.feeEstimate}
              onChange={(e) =>
                setForm({ ...form, feeEstimate: e.target.value })
              }
              placeholder="例: 3750万"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.ndaSigned}
                onChange={(e) =>
                  setForm({ ...form, ndaSigned: e.target.checked })
                }
                className="rounded"
              />
              NDA
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.adSigned}
                onChange={(e) =>
                  setForm({ ...form, adSigned: e.target.checked })
                }
                className="rounded"
              />
              AD契約
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            フォルダリンク (Google Drive 等)
          </label>
          <input
            type="url"
            value={form.folderUrl}
            onChange={(e) => setForm({ ...form, folderUrl: e.target.value })}
            placeholder="https://drive.google.com/..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <Textarea
          label="概要"
          value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          rows={3}
        />
        <Textarea
          label="プロフィール（現況・経緯・今後のアクション）"
          value={form.profile}
          onChange={(v) => setForm({ ...form, profile: v })}
          rows={6}
        />
        <Textarea
          label="希望条件（想定譲渡対価・ストラクチャー・時期）"
          value={form.desiredTerms}
          onChange={(v) => setForm({ ...form, desiredTerms: v })}
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-3 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
        >
          編集
        </button>
      </div>
      <StructuredMetaCard seller={seller} />
      <LinkedProjectsSection
        seller={seller}
        projects={projects}
        unlinkedProjects={unlinkedProjects}
        onRefresh={onRefresh}
      />
      <Section label="概要" content={seller.description} />
      <Section
        label="プロフィール（事業モデル・強み・現況）"
        content={seller.profile}
      />
      <Section label="希望条件" content={seller.desiredTerms} />
    </div>
  );
}

function StructuredMetaCard({ seller }: { seller: Seller }) {
  const items: Array<{ label: string; value: React.ReactNode }> = [];
  if (seller.priority) items.push({ label: "優先", value: seller.priority });
  if (seller.rank)
    items.push({
      label: "ランク",
      value: (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${RANK_COLORS[seller.rank]}`}
        >
          {seller.rank}
        </span>
      ),
    });
  if (seller.mediatorType)
    items.push({ label: "仲介/FA", value: seller.mediatorType });
  if (seller.assignedTo)
    items.push({ label: "担当者", value: seller.assignedTo });
  if (seller.introSource)
    items.push({ label: "紹介元", value: seller.introSource });
  if (seller.feeEstimate)
    items.push({ label: "手数料想定", value: seller.feeEstimate });
  items.push({
    label: "NDA",
    value: seller.ndaSigned ? "✓ 締結済" : "未",
  });
  items.push({
    label: "AD契約",
    value: seller.adSigned ? "✓ 締結済" : "未",
  });

  if (items.length === 0 && !seller.folderUrl) return null;

  return (
    <div className="bg-slate-50/80 rounded-xl border border-slate-100 p-4 space-y-2">
      <p className="text-xs font-semibold text-slate-500 mb-2">案件メタ</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {items.map((it, i) => (
          <div key={i}>
            <p className="text-slate-400">{it.label}</p>
            <p className="text-slate-700 font-medium mt-0.5">{it.value}</p>
          </div>
        ))}
      </div>
      {seller.folderUrl && (
        <a
          href={seller.folderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
        >
          📁 案件フォルダを開く
        </a>
      )}
    </div>
  );
}

function LinkedProjectsSection({
  seller,
  projects,
  unlinkedProjects,
  onRefresh,
}: {
  seller: Seller;
  projects: ProjectSummary[];
  unlinkedProjects: ProjectSummary[];
  onRefresh: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"none" | "link" | "create">("none");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    status: "企画中",
    priority: "中",
    startDate: "",
    targetDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleLink() {
    if (!linkTargetId) return;
    setSubmitting(true);
    await fetch(`/api/projects/${linkTargetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId: seller.id }),
    });
    setLinkTargetId("");
    setMode("none");
    await onRefresh();
    setSubmitting(false);
  }

  async function handleUnlink(projectId: string) {
    if (!confirm("このプロジェクトとの紐付けを解除しますか？")) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId: "" }),
    });
    await onRefresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setSubmitting(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...createForm,
        sellerId: seller.id,
        relatedCompanies: seller.companyCode
          ? [
              {
                companyCode: seller.companyCode,
                companyName: seller.companyName,
                role: "売却対象",
              },
            ]
          : [],
        assignedEmployeeIds: [],
      }),
    });
    setCreateForm({
      name: "",
      description: "",
      status: "企画中",
      priority: "中",
      startDate: "",
      targetDate: "",
    });
    setMode("none");
    await onRefresh();
    setSubmitting(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          紐付けプロジェクト
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => setMode(mode === "link" ? "none" : "link")}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
          >
            既存を紐付け
          </button>
          <button
            onClick={() => setMode(mode === "create" ? "none" : "create")}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
          >
            + 新規作成
          </button>
        </div>
      </div>

      {mode === "link" && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-2 space-y-2">
          {unlinkedProjects.length === 0 ? (
            <p className="text-xs text-slate-400">
              未紐付けのプロジェクトがありません
            </p>
          ) : (
            <>
              <select
                value={linkTargetId}
                onChange={(e) => setLinkTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                <option value="">プロジェクトを選択...</option>
                {unlinkedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.status}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setMode("none")}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleLink}
                  disabled={!linkTargetId || submitting}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  紐付け
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {mode === "create" && (
        <form
          onSubmit={handleCreate}
          className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 mb-2 space-y-2"
        >
          <Input
            label="プロジェクト名 *"
            value={createForm.name}
            onChange={(v) => setCreateForm({ ...createForm, name: v })}
            required
          />
          <Textarea
            label="概要"
            value={createForm.description}
            onChange={(v) => setCreateForm({ ...createForm, description: v })}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="開始日"
              type="date"
              value={createForm.startDate}
              onChange={(v) => setCreateForm({ ...createForm, startDate: v })}
            />
            <Input
              label="目標完了日"
              type="date"
              value={createForm.targetDate}
              onChange={(v) => setCreateForm({ ...createForm, targetDate: v })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode("none")}
              className="px-3 py-1.5 text-xs text-slate-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              作成して紐付け
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="text-xs text-slate-400 italic">
          紐付けられたプロジェクトがありません
        </p>
      ) : (
        <div className="space-y-1.5">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-200 rounded-lg px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-indigo-800 truncate">
                  {p.name}
                </p>
                {p.description && (
                  <p className="text-[11px] text-slate-500 truncate">
                    {p.description}
                  </p>
                )}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-indigo-600 border border-indigo-200 shrink-0">
                {p.status}
              </span>
              <button
                onClick={() => handleUnlink(p.id)}
                className="text-[11px] text-slate-400 hover:text-red-600 shrink-0"
              >
                解除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
        {label}
      </h4>
      {content ? (
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
          {content}
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic">未記入</div>
      )}
    </div>
  );
}

// ========== Minutes ==========

function MinutesPanel({
  seller,
  onRefresh,
}: {
  seller: Seller;
  onRefresh: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    participantsText: "",
    content: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await fetch(`/api/sellers/${seller.id}/minutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        date: form.date,
        participants: form.participantsText
          .split(/[,、\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        content: form.content,
      }),
    });
    setForm({
      title: "",
      date: new Date().toISOString().split("T")[0],
      participantsText: "",
      content: "",
    });
    setShowForm(false);
    await onRefresh();
  }

  async function handleDelete(minuteId: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/sellers/${seller.id}/minutes?minuteId=${minuteId}`, {
      method: "DELETE",
    });
    await onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
        >
          + 議事録追加
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3"
        >
          <Input
            label="タイトル *"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="日付"
              type="date"
              value={form.date}
              onChange={(v) => setForm({ ...form, date: v })}
            />
            <Input
              label="参加者（カンマ区切り）"
              value={form.participantsText}
              onChange={(v) => setForm({ ...form, participantsText: v })}
            />
          </div>
          <Textarea
            label="内容"
            value={form.content}
            onChange={(v) => setForm({ ...form, content: v })}
            rows={5}
            placeholder="売主との打ち合わせ内容..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl"
            >
              追加
            </button>
          </div>
        </form>
      )}

      {seller.minutes.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">
          議事録がありません
        </div>
      ) : (
        <div className="space-y-2">
          {[...seller.minutes]
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .map((m) => (
              <div
                key={m.id}
                className="border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{m.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span>{m.date}</span>
                      {m.participants.length > 0 && (
                        <span>参加: {m.participants.join(", ")}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    削除
                  </button>
                </div>
                {m.content && (
                  <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                    {m.content}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ========== Documents ==========

function DocumentsPanel({
  seller,
  onRefresh,
}: {
  seller: Seller;
  onRefresh: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await fetch(`/api/sellers/${seller.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", content: "" });
    setShowForm(false);
    await onRefresh();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await fetch(`/api/sellers/${seller.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: file.name, content: text }),
    });
    e.target.value = "";
    await onRefresh();
  }

  async function handleDelete(docId: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/sellers/${seller.id}/documents?documentId=${docId}`, {
      method: "DELETE",
    });
    await onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <label className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium cursor-pointer">
          テキストファイル読込
          <input
            type="file"
            accept=".txt,.md,.csv,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
        >
          + 資料追加
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3"
        >
          <Input
            label="資料タイトル *"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            required
          />
          <Textarea
            label="資料本文 / メモ"
            value={form.content}
            onChange={(v) => setForm({ ...form, content: v })}
            rows={6}
            placeholder="財務ハイライト、事業内容、組織図など..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl"
            >
              追加
            </button>
          </div>
        </form>
      )}

      {seller.documents.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">
          資料がありません
        </div>
      ) : (
        <div className="space-y-2">
          {seller.documents.map((d) => (
            <details key={d.id} className="border border-slate-200 rounded-xl">
              <summary className="p-4 cursor-pointer flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">
                    {d.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(d.uploadedAt).toLocaleString("ja-JP")}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(d.id);
                  }}
                  className="text-xs text-slate-400 hover:text-red-600 ml-2"
                >
                  削除
                </button>
              </summary>
              {d.content && (
                <div className="px-4 pb-4 text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 border-t border-slate-200">
                  {d.content}
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Buyers ==========

function BuyersPanel({
  seller,
  onRefresh,
}: {
  seller: Seller;
  onRefresh: () => Promise<void>;
}) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    companyName: "",
    industry: "",
    reasoning: "",
  });
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerateAi() {
    setGenerating(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/sellers/${seller.id}/ai-buyers`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAiError(err.error || "AI生成に失敗しました");
        return;
      }
      const data: {
        buyers: Array<{
          companyName: string;
          industry: string;
          rationale: string;
          fitScore: number;
        }>;
      } = await res.json();

      // Sequentially add AI buyers (duplicates auto-skipped)
      for (const b of data.buyers) {
        await fetch(`/api/sellers/${seller.id}/buyers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: b.companyName,
            industry: b.industry,
            reasoning: `[適合度 ${b.fitScore}/10] ${b.rationale}`,
            source: "ai",
            status: "候補",
          }),
        });
      }
      await onRefresh();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "エラー");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualForm.companyName.trim()) return;
    await fetch(`/api/sellers/${seller.id}/buyers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...manualForm,
        source: "manual",
        status: "候補",
      }),
    });
    setManualForm({ companyName: "", industry: "", reasoning: "" });
    setShowManualForm(false);
    await onRefresh();
  }

  async function handleDelete(buyerId: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/sellers/${seller.id}/buyers?buyerId=${buyerId}`, {
      method: "DELETE",
    });
    await onRefresh();
  }

  async function handleStatusChange(buyerId: string, status: BuyerStatus) {
    await fetch(`/api/sellers/${seller.id}/buyers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerId, status }),
    });
    await onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <button
          onClick={handleGenerateAi}
          disabled={generating}
          className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 font-medium disabled:opacity-50"
        >
          {generating ? "AI生成中..." : "✨ AIで買い手候補を提案"}
        </button>
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
        >
          + 手動追加
        </button>
      </div>

      {aiError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {aiError}
        </div>
      )}

      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
        ヒント: 企業検索ページから「+
        売主に紐付け」ボタンでも買い手を追加できます
      </div>

      {showManualForm && (
        <form
          onSubmit={handleAddManual}
          className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3"
        >
          <Input
            label="企業名 *"
            value={manualForm.companyName}
            onChange={(v) => setManualForm({ ...manualForm, companyName: v })}
            required
          />
          <Input
            label="業種"
            value={manualForm.industry}
            onChange={(v) => setManualForm({ ...manualForm, industry: v })}
          />
          <Textarea
            label="追加理由・メモ"
            value={manualForm.reasoning}
            onChange={(v) => setManualForm({ ...manualForm, reasoning: v })}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="px-4 py-2 text-sm text-slate-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl"
            >
              追加
            </button>
          </div>
        </form>
      )}

      {seller.buyers.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">
          買い手候補がありません
        </div>
      ) : (
        <div className="space-y-2">
          {seller.buyers.map((b) => (
            <div key={b.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">
                      {b.companyName}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        b.source === "ai"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {b.source === "ai" ? "AI" : "手動"}
                    </span>
                    <select
                      value={b.status}
                      onChange={(e) =>
                        handleStatusChange(b.id, e.target.value as BuyerStatus)
                      }
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer ${BUYER_STATUS_COLORS[b.status]}`}
                    >
                      {BUYER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {b.industry && (
                    <p className="text-xs text-slate-500 mt-1">{b.industry}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  削除
                </button>
              </div>
              {b.reasoning && (
                <div className="mt-2 text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-2">
                  {b.reasoning}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Small reusable inputs ==========

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "slate" | "blue" | "indigo" | "emerald";
}) {
  const colors: Record<string, string> = {
    slate: "text-slate-800",
    blue: "text-blue-600",
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
    </div>
  );
}
