"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";

export interface FinancialChartData {
  fiscal_year: number;
  revenue: number | null;
  operating_income: number | null;
  net_income: number | null;
  total_assets: number | null;
  equity: number | null;
  cash: number | null;
  equity_ratio_official?: number | null;
  eps?: number | null;
  bps?: number | null;
  roe?: number | null;
  roa?: number | null;
  market_cap?: number | null;
  avg_annual_salary?: number | null;
}

function formatOku(value: number): string {
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(1)}兆`;
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(0)}億`;
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(0)}万`;
  return value.toLocaleString();
}

function formatOkuYen(value: number): string {
  return formatOku(value) + "円";
}

const COLORS = {
  revenue: "#1d4ed8",
  operatingIncome: "#3b82f6",
  netIncome: "#93c5fd",
  totalAssets: "#047857",
  equity: "#10b981",
  cash: "#6ee7b7",
  roe: "#b91c1c",
  roa: "#fca5a5",
  marketCap: "#6366f1",
  salary: "#ec4899",
};

export function PLChart({ data }: { data: FinancialChartData[] }) {
  if (data.length === 0) return null;

  const chartData = data
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map((d) => ({
      year: `${d.fiscal_year}`,
      売上高: d.revenue ?? 0,
      営業利益: d.operating_income ?? 0,
      純利益: d.net_income ?? 0,
    }));

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-500 mb-3">
        売上高・利益推移
      </h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatOku} tick={{ fontSize: 11 }} width={65} />
          <Tooltip
            formatter={(value, name) => [
              formatOkuYen(Number(value)),
              String(name),
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="売上高" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="営業利益"
            fill={COLORS.operatingIncome}
            radius={[4, 4, 0, 0]}
          />
          <Bar dataKey="純利益" fill={COLORS.netIncome} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BSChart({ data }: { data: FinancialChartData[] }) {
  if (data.length === 0) return null;

  const chartData = data
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map((d) => ({
      year: `${d.fiscal_year}`,
      総資産: d.total_assets ?? 0,
      自己資本: d.equity ?? 0,
      現金: d.cash ?? 0,
    }));

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-500 mb-3">資産構成推移</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatOku} tick={{ fontSize: 11 }} width={65} />
          <Tooltip
            formatter={(value, name) => [
              formatOkuYen(Number(value)),
              String(name),
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="総資産"
            fill={COLORS.totalAssets}
            radius={[4, 4, 0, 0]}
          />
          <Bar dataKey="自己資本" fill={COLORS.equity} radius={[4, 4, 0, 0]} />
          <Bar dataKey="現金" fill={COLORS.cash} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProfitabilityChart({ data }: { data: FinancialChartData[] }) {
  const withRatios = data.filter((d) => d.roe != null || d.roa != null);
  if (withRatios.length === 0) return null;

  const chartData = withRatios
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map((d) => ({
      year: `${d.fiscal_year}`,
      ROE: d.roe != null ? +(d.roe * 100).toFixed(1) : null,
      ROA: d.roa != null ? +(d.roa * 100).toFixed(1) : null,
    }));

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-500 mb-3">収益性指標</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            width={50}
          />
          <Tooltip
            formatter={(value, name) => [`${value}%`, String(name)]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="ROE"
            stroke={COLORS.roe}
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="ROA"
            stroke={COLORS.roa}
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MarketCapChart({ data }: { data: FinancialChartData[] }) {
  const withMC = data.filter((d) => d.market_cap != null && d.market_cap > 0);
  if (withMC.length === 0) return null;

  const chartData = withMC
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map((d) => ({
      year: `${d.fiscal_year}`,
      時価総額: d.market_cap ?? 0,
    }));

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-500 mb-3">時価総額推移</h4>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatOku} tick={{ fontSize: 11 }} width={65} />
          <Tooltip
            formatter={(value, name) => [
              formatOkuYen(Number(value)),
              String(name),
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          />
          <Area
            type="monotone"
            dataKey="時価総額"
            fill="#dbeafe"
            stroke={COLORS.marketCap}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalaryChart({ data }: { data: FinancialChartData[] }) {
  const withSalary = data.filter(
    (d) => d.avg_annual_salary != null && d.avg_annual_salary > 0,
  );
  if (withSalary.length === 0) return null;

  const chartData = withSalary
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map((d) => ({
      year: `${d.fiscal_year}`,
      平均年収: d.avg_annual_salary ?? 0,
    }));

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-500 mb-3">平均年収推移</h4>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatOku} tick={{ fontSize: 11 }} width={65} />
          <Tooltip
            formatter={(value, name) => [
              formatOkuYen(Number(value)),
              String(name),
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          />
          <Area
            type="monotone"
            dataKey="平均年収"
            fill="#fce7f3"
            stroke={COLORS.salary}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FinancialCharts({ data }: { data: FinancialChartData[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">財務データなし</p>
    );
  }

  return (
    <div className="space-y-8">
      <MarketCapChart data={data} />
      <PLChart data={data} />
      <BSChart data={data} />
      <ProfitabilityChart data={data} />
      <SalaryChart data={data} />
    </div>
  );
}
