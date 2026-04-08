"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CompanyAnalysisData } from "@/lib/company-analysis";

export interface MaStrategyCompanyData {
  name: string;
  industry?: string;
  listingCategory?: string;
  creditRating?: string;
  creditScore?: number;
  marketCap?: number;
  revenue?: number;
  operatingIncome?: number;
  netIncome?: number;
  totalAssets?: number;
  equity?: number;
  cash?: number;
  equityRatio?: number;
  shareholders?: {
    name: string;
    ratio: number;
    delta: number;
    purpose: string;
  }[];
  description?: string;
}

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: CompanyAnalysisData }
  | { status: "error"; message: string };

export type MaState =
  | { status: "idle" }
  | { status: "loading"; text: string }
  | { status: "success"; text: string }
  | { status: "error"; message: string };

interface CompanyAnalysisContextValue {
  analysis: AnalysisState;
  ma: MaState;
  runAll: () => void;
}

const Ctx = createContext<CompanyAnalysisContextValue | null>(null);

export function useCompanyAnalysis(): CompanyAnalysisContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // プロバイダなしでも読み取り可能（idle を返す）
    return {
      analysis: { status: "idle" },
      ma: { status: "idle" },
      runAll: () => {},
    };
  }
  return ctx;
}

interface ProviderProps {
  edinetCode: string;
  maCompany: MaStrategyCompanyData;
  autoRun?: boolean;
  children: React.ReactNode;
}

export function CompanyAnalysisProvider({
  edinetCode,
  maCompany,
  autoRun = false,
  children,
}: ProviderProps) {
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [ma, setMa] = useState<MaState>({ status: "idle" });
  const autoRunTriggered = useRef(false);

  const runAnalysis = useCallback(async () => {
    setAnalysis({ status: "loading" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edinetCode }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setAnalysis({
          status: "error",
          message: body.error ?? `AI分析に失敗しました (${res.status})`,
        });
        return;
      }
      const data = (await res.json()) as CompanyAnalysisData;
      setAnalysis({ status: "success", data });
    } catch (err) {
      setAnalysis({
        status: "error",
        message:
          err instanceof Error ? err.message : "AI分析中にエラーが発生しました",
      });
    }
  }, [edinetCode]);

  const runMaStrategy = useCallback(async () => {
    setMa({ status: "loading", text: "" });
    try {
      const res = await fetch("/api/ma-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: maCompany }),
      });
      if (!res.ok || !res.body) {
        setMa({
          status: "error",
          message: "M&A戦略推察に失敗しました。APIキーを確認してください。",
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        setMa({ status: "loading", text: buf });
      }
      setMa({ status: "success", text: buf });
    } catch {
      setMa({
        status: "error",
        message: "M&A戦略推察中にエラーが発生しました",
      });
    }
  }, [maCompany]);

  const runAll = useCallback(() => {
    // 並列実行。Promise.all はしない（各パネルが独立して進捗/エラー表示）
    void runAnalysis();
    void runMaStrategy();
  }, [runAnalysis, runMaStrategy]);

  // 上部の一括実行ボタン (?ai=1) から発火するオート起動。
  // Strict Mode で二重起動しないよう ref でガード。
  // queueMicrotask で setState を effect 本体から外し、cascading render を回避。
  useEffect(() => {
    if (autoRun && !autoRunTriggered.current) {
      autoRunTriggered.current = true;
      queueMicrotask(runAll);
    }
  }, [autoRun, runAll]);

  return (
    <Ctx.Provider value={{ analysis, ma, runAll }}>{children}</Ctx.Provider>
  );
}
