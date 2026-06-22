"use client";

import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import {
  LayoutDashboard, Briefcase, TrendingUp, Shield, Search, Sparkles,
  RefreshCw, Lock, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Send, AlertCircle,
  CheckCircle, Info, ChevronDown, ChevronUp
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList
} from "recharts";
import type { PortfolioData, NetWorthSnapshot, Cashflow } from "@/lib/parser";

const fmt = (n: number, dec = 0) =>
  new Intl.NumberFormat("en-SG", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
const fmtSGD = (n: number) => `$${fmt(Math.abs(n))}`;
const fmtPct = (n: number, dec = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(dec)}%`;

const COLORS = {
  index: "#0b6b3a", stock: "#1fa76a", bonds: "#06b6d4",
  cash: "#10b981", crypto: "#e6b73b", amber: "#e6b73b",
  rose: "#f43f5e", emerald: "#10b981",
};

// Privacy mode context — when on, fmtSGD is replaced with "••••" throughout
const PrivacyCtx = createContext(false);
const usePrivacy = () => useContext(PrivacyCtx);

const NAV = [
  { id: "home",      icon: LayoutDashboard, label: "Home" },
  { id: "portfolio", icon: Briefcase,        label: "Portfolio" },
  { id: "insights",  icon: TrendingUp,       label: "Insights" },
  { id: "plan",      icon: Shield,           label: "Plan" },
  { id: "ai",        icon: Sparkles,          label: "AI" },
];

function SectionHeader({ title }: { title: string }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">{title}</p>;
}

function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/folio-app-logo-512.png"
      alt="Folio logo"
      width={size}
      height={size}
      className={`${className} object-contain`} 
    />
  );
}

function MetricCard({ label, value, sub, positive, negative }: {
  label: string; value: string; sub?: string; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold font-mono ${positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-slate-100"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const TTip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  const privacy = usePrivacy();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e2a] border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: {privacy ? "••••" : `$${fmt(p.value)}`}</p>)}
    </div>
  );
};

function SubTabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 mb-4">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${active === t.id ? "bg-[#1e1e2a] text-slate-100" : "text-slate-500 hover:text-slate-400"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────

type Range = "6M" | "1Y" | "3Y" | "YTD" | "custom";

// Parses snapshot date strings like "01-Jun-2023" into a Date
function parseSnapDate(d: string): Date {
  const p = d.split("-");
  if (p.length < 3) return new Date(0);
  const mo: Record<string, number> = {
    Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
    Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11,
  };
  const yr = parseInt(p[2]);
  const year = yr < 100 ? 2000 + yr : yr; // handle both "23" and "2023"
  return new Date(year, mo[p[1]] ?? 0, 1);
}

function SnapshotScreen({ data }: { data: PortfolioData }) {
  const [range, setRange]           = useState<Range>("1Y");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const privacy = usePrivacy();
  const $m = (n: number) => privacy ? "••••" : fmtSGD(n);

  const last = data.snapshots[data.snapshots.length - 1];
  const prev = data.snapshots[data.snapshots.length - 2];
  const change    = last && prev ? last.netWorth - prev.netWorth : 0;
  const changePct = prev?.netWorth ? (change / prev.netWorth) * 100 : 0;

  const filteredSnapshots = useMemo(() => {
    // Use the latest snapshot as the reference point, not today,
    // so ranges work correctly even if the sheet isn't updated recently.
    const latest = parseSnapDate(data.snapshots[data.snapshots.length - 1]?.date ?? "");
    let from: Date;
    let to: Date = latest;
    switch (range) {
      case "6M":  from = new Date(latest.getFullYear(), latest.getMonth() - 6,  1); break;
      case "1Y":  from = new Date(latest.getFullYear(), latest.getMonth() - 12, 1); break;
      case "3Y":  from = new Date(latest.getFullYear(), latest.getMonth() - 36, 1); break;
      case "YTD": from = new Date(latest.getFullYear(), 0, 1);                      break;
      case "custom":
        from = customFrom ? new Date(customFrom) : new Date(2000, 0, 1);
        to   = customTo   ? new Date(customTo)   : latest;
        break;
      default: from = new Date(2000, 0, 1);
    }
    return data.snapshots.filter(s => {
      const d = parseSnapDate(s.date);
      return d >= from && d <= to;
    });
  }, [data.snapshots, range, customFrom, customTo]);

  const chartData = filteredSnapshots.map(s => ({
    date: s.date.replace(/^\d+-/, ""),
    value: s.netWorth,
  }));

  const monthlyChanges = filteredSnapshots.slice(1).map((s, i) => ({
    date: s.date.replace(/^\d+-/, ""),
    change: s.netWorth - filteredSnapshots[i].netWorth,
  }));

  const RANGES: Range[] = ["6M", "1Y", "3Y", "YTD", "custom"];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b6b3a]/5 to-transparent pointer-events-none" />
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">Net Worth (excl. CPF)</p>
        <p className="text-4xl font-bold font-mono text-slate-100 mb-1">{$m(data.netWorthExclCpf)}</p>
        <div className="flex items-center gap-2">
          {change >= 0 ? <ArrowUpRight size={14} className="text-emerald-400" /> : <ArrowDownRight size={14} className="text-rose-400" />}
          <span className={`text-sm font-mono ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {change >= 0 ? "+" : "-"}{$m(change)} ({fmtPct(changePct)}) vs last month
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">Updated {data.lastUpdated}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Gross Assets"    value={$m(data.grossAssets)}        sub="before loans" />
        <MetricCard label="Loans"           value={$m(data.totalLoans)}         sub="outstanding" negative />
        <MetricCard label="incl. CPF OA"    value={$m(data.netWorthInclOa)}     positive />
        <MetricCard label="incl. Full CPF"  value={$m(data.netWorthInclFullCpf)} positive />
      </div>

      {/* Range selector — controls both charts below */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-3 space-y-2">
        <div className="flex gap-1.5">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`flex-1 text-[10px] font-semibold py-1.5 rounded-xl transition-all ${
                range === r
                  ? "bg-[#0b6b3a]/25 text-[#a5f4d4] border border-[#0b6b3a]/40"
                  : "bg-white/[0.04] text-slate-500 border border-transparent hover:text-slate-400"
              }`}>
              {r === "custom" ? "Custom" : r}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="month"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="flex-1 bg-[#0f0f18] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#0b6b3a]/40"
            />
            <span className="text-slate-600 text-xs flex-shrink-0">→</span>
            <input
              type="month"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="flex-1 bg-[#0f0f18] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#0b6b3a]/40"
            />
          </div>
        )}
      </div>

      {/* Net worth trend */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title={`Net worth — ${range === "custom" ? "custom range" : range}`} />
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.index} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.index} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={["dataMin - 20000", "dataMax + 10000"]} />
              <Tooltip content={<TTip />} />
              <Area type="monotone" dataKey="value" name="Net Worth" stroke={COLORS.index} fill="url(#g1)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-slate-600 text-center py-8">No data for this range</p>
        )}
      </div>

      {/* Monthly change bars */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Monthly change" />
        {monthlyChanges.length > 0 ? (
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={monthlyChanges} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: any) => [`${Number(v) >= 0 ? "+" : "-"}${$m(Number(v))}`, "Change"]}
                contentStyle={{ background: "#1e1e2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
                labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
              <Bar dataKey="change" radius={[2, 2, 0, 0]}>
                {monthlyChanges.map((e, i) => (
                  <Cell key={i} fill={e.change >= 0 ? "#10b981" : "#f43f5e"} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-slate-600 text-center py-6">No data for this range</p>
        )}
      </div>

      {/* Portfolio split */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <SectionHeader title="Portfolio split" />
        {[
          { label: "Equities",      value: data.equitiesValue,   color: COLORS.index },
          { label: "Cash",          value: data.cashValue,       color: COLORS.emerald },
          { label: "Bonds (SSBs)",  value: data.bondsValue,      color: COLORS.bonds },
          { label: "Crypto + Gold", value: data.cryptoGoldValue, color: COLORS.amber },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-sm text-slate-300 flex-1">{item.label}</span>
            <span className="text-sm font-mono text-slate-200">{$m(item.value)}</span>
            <span className="text-xs text-slate-500 w-10 text-right font-mono">
              {((item.value / data.grossAssets) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

function HoldingsScreen({ data }: { data: PortfolioData }) {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const privacy = usePrivacy();
  const $m = (n: number) => privacy ? "••••" : fmtSGD(n);

  const catColor: Record<string, string> = {
    index: COLORS.index, stock: "#1fa76a", gold: "#e6b73b",
    crypto: "#f97316", cash: "#10b981", bond: COLORS.bonds,
  };

  const donutData = [
    { name: "Index",       value: data.categoryBreakdown.indexFunds,      color: COLORS.index  },
    { name: "Stocks",      value: data.categoryBreakdown.individualStocks, color: "#1fa76a"     },
    { name: "Bonds",       value: data.categoryBreakdown.bonds,            color: COLORS.bonds  },
    { name: "Cash",        value: data.categoryBreakdown.cash,             color: "#10b981"     },
    { name: "Crypto+Gold", value: data.categoryBreakdown.cryptoGold,       color: COLORS.amber  },
  ].filter(d => d.value > 0);

  const FILTERS = ["all", "index", "stock", "bond", "crypto", "cash"] as const;

  // Consolidate per-platform positions into one row per ticker
  type ConsolidatedPos = {
    ticker: string; category: typeof data.positions[0]["category"];
    currency: string; totalUnits: number; currentPrice: number;
    valueLocal: number; fxRate: number; valueSGD: number;
    allocationPct: number; platforms: string;
  };
  const consolidated: ConsolidatedPos[] = useMemo(() => {
    const map = new Map<string, typeof data.positions>();
    for (const p of data.positions) {
      if (!map.has(p.ticker)) map.set(p.ticker, []);
      map.get(p.ticker)!.push(p);
    }
    return Array.from(map.entries()).map(([ticker, ps]) => {
      const first = ps[0];
      const totalSGD   = ps.reduce((s, p) => s + p.valueSGD, 0);
      const totalUnits = ps.reduce((s, p) => s + p.units, 0);
      const totalLocal = ps.reduce((s, p) => s + p.valueLocal, 0);
      return {
        ticker, category: first.category, currency: first.currency,
        totalUnits, currentPrice: first.currentPrice, valueLocal: totalLocal,
        fxRate: first.fxRate, valueSGD: totalSGD,
        allocationPct: (totalSGD / data.grossAssets) * 100,
        platforms: ps.map(p => p.platform).join(" · "),
      };
    });
  }, [data.positions, data.grossAssets]);

  // Build a unified sorted item list across all three sources
  type Item =
    | { kind: "cpos"; key: string; value: number; data: ConsolidatedPos }
    | { kind: "bond"; key: string; value: number; data: typeof data.bondPositions[0] }
    | { kind: "bank"; key: string; value: number; data: typeof data.bankAccounts[0] };

  const items: Item[] = [];

  // Consolidated positions (equities, gold, crypto, platform cash)
  const posFilter = filter === "all" ? null : filter === "bond" ? "__none__" : filter;
  consolidated
    .filter(cp => posFilter === null || cp.category === posFilter)
    .forEach((cp, i) => items.push({ kind: "cpos", key: `cpos-${i}`, value: cp.valueSGD, data: cp }));

  // Bond positions (SSBs) — shown for "all" or "bond"
  if (filter === "all" || filter === "bond") {
    data.bondPositions.forEach((b, i) =>
      items.push({ kind: "bond", key: `bond-${i}`, value: b.amount, data: b }));
  }

  // Bank accounts — shown for "all" or "cash"
  if (filter === "all" || filter === "cash") {
    data.bankAccounts.forEach((a, i) =>
      items.push({ kind: "bank", key: `bank-${i}`, value: a.balance, data: a }));
  }

  items.sort((a, b) => b.value - a.value);

  const RADIAN = Math.PI / 180;
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (percent < 0.06) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    return (
      <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
        fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <div className="space-y-3">
      {/* Donut — full portfolio breakdown */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Holdings by category" />
        <ResponsiveContainer width="100%" height={180}>
          <RPieChart>
            <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
              dataKey="value" labelLine={false} label={renderLabel}>
              {donutData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
            </Pie>
            <Tooltip
              formatter={(v: any) => $m(Number(v ?? 0))}
              contentStyle={{ background: "#1e1e2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
            />
          </RPieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          {donutData.map(item => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: item.color }} />
              <span className="text-[10px] text-slate-400">{item.name}</span>
              <span className="text-[10px] text-slate-600 font-mono">
                {((item.value / data.grossAssets) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); setExpanded(null); }}
            className={`text-[10px] font-medium px-3 py-1.5 rounded-full flex-shrink-0 transition-all capitalize ${
              filter === f ? "bg-[#0b6b3a]/20 text-[#a5f4d4]" : "bg-white/5 text-slate-500"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Unified item list */}
      <div className="space-y-2">
        {items.map(item => {
          const isOpen = expanded === item.key;
          const toggle = () => setExpanded(isOpen ? null : item.key);

          if (item.kind === "cpos") {
            const pos = item.data;
            return (
              <div key={item.key}
                className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 cursor-pointer active:bg-white/[0.03] transition-colors"
                onClick={toggle}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: catColor[pos.category] || "#475569" }} />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{pos.ticker}</p>
                      <p className="text-xs text-slate-500">{pos.platforms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold text-slate-100">{$m(pos.valueSGD)}</p>
                      <p className="text-xs text-slate-500">{pos.allocationPct.toFixed(1)}%</p>
                    </div>
                    {isOpen ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Units</p>
                      <p className="text-sm font-mono text-slate-200">{pos.totalUnits}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Price ({pos.currency})</p>
                      <p className="text-sm font-mono text-slate-200">{pos.currentPrice.toFixed(2)}</p>
                    </div>
                    {pos.currency !== "SGD" && (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Value ({pos.currency})</p>
                          <p className="text-sm font-mono text-slate-200">{privacy ? "••••" : fmt(pos.valueLocal)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">FX Rate</p>
                          <p className="text-sm font-mono text-slate-200">{pos.fxRate.toFixed(4)}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Category</p>
                      <p className="text-sm font-mono text-slate-200 capitalize">{pos.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">SGD Value</p>
                      <p className="text-sm font-mono text-slate-200">{$m(pos.valueSGD)}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (item.kind === "bond") {
            const bond = item.data;
            return (
              <div key={item.key}
                className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 cursor-pointer active:bg-white/[0.03] transition-colors"
                onClick={toggle}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: COLORS.bonds }} />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{bond.issueCode}</p>
                      <p className="text-xs text-slate-500">SSB · {bond.yieldPct.toFixed(2)}% p.a.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold text-slate-100">{$m(bond.amount)}</p>
                      <p className="text-xs text-slate-500">{((bond.amount / data.grossAssets) * 100).toFixed(1)}%</p>
                    </div>
                    {isOpen ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Issue Code</p>
                      <p className="text-sm font-mono text-slate-200">{bond.issueCode}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Yield p.a.</p>
                      <p className="text-sm font-mono text-slate-200">{bond.yieldPct.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Maturity</p>
                      <p className="text-sm font-mono text-slate-200">{bond.maturity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Amount Invested</p>
                      <p className="text-sm font-mono text-slate-200">{$m(bond.amount)}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // bank account
          if (item.kind !== "bank") return null;
          const acct = item.data;
          return (
            <div key={item.key}
              className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 cursor-pointer active:bg-white/[0.03] transition-colors"
              onClick={toggle}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{acct.name}</p>
                    <p className="text-xs text-slate-500">Bank account</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-slate-100">{$m(acct.balance)}</p>
                    <p className="text-xs text-slate-500">{((acct.balance / data.grossAssets) * 100).toFixed(1)}%</p>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Account</p>
                    <p className="text-sm font-mono text-slate-200">{acct.name}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AllocationScreen({ data }: { data: PortfolioData }) {
  const { categoryBreakdown: cat } = data;
  const privacy = usePrivacy();
  const $m = (n: number) => privacy ? "••••" : fmtSGD(n);
  const base = cat.indexFunds + cat.individualStocks + cat.bonds + cat.cryptoGold;
  const pcts = {
    index:  (cat.indexFunds / base) * 100,
    stocks: (cat.individualStocks / base) * 100,
    bonds:  (cat.bonds / base) * 100,
    crypto: (cat.cryptoGold / base) * 100,
  };
  const targets = { index: 78, stocks: 12, bonds: 5, crypto: 5 };
  const pieData = [
    { name: "Index",      value: cat.indexFunds,         color: COLORS.index },
    { name: "Stocks",     value: cat.individualStocks,   color: COLORS.stock },
    { name: "Bonds",      value: cat.bonds,              color: COLORS.bonds },
    { name: "Crypto+Gold",value: cat.cryptoGold,         color: COLORS.amber },
  ];
  const RADIAN = Math.PI / 180;
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    return (
      <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
        fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={500}>
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Allocation (excl. cash, invested base)" />
        <ResponsiveContainer width="100%" height={200}>
          <RPieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
              dataKey="value" labelLine={false} label={renderLabel}>
              {pieData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
            </Pie>
            <Tooltip
              formatter={(v: any) => $m(Number(v ?? 0))}
              contentStyle={{ background: "#1e1e2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
            />
          </RPieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 justify-center">
          {pieData.map(item => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: item.color }} />
              <span className="text-[10px] text-slate-400">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 space-y-4">
        <SectionHeader title="Actual vs target" />
        {[
          { label: "Index funds",       actual: pcts.index,  target: targets.index,  color: COLORS.index },
          { label: "Individual stocks", actual: pcts.stocks, target: targets.stocks, color: COLORS.stock },
          { label: "Bonds (SSBs)",      actual: pcts.bonds,  target: targets.bonds,  color: COLORS.bonds },
          { label: "Crypto + Gold",     actual: pcts.crypto, target: targets.crypto, color: COLORS.amber },
        ].map(item => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  Math.abs(item.actual - item.target) <= 2 ? "bg-emerald-400" :
                  Math.abs(item.actual - item.target) <= 5 ? "bg-amber-400" : "bg-rose-400"
                }`} />
                <span className="text-xs text-slate-300">{item.label}</span>
              </div>
              <span className="text-xs font-mono text-slate-400">{item.actual.toFixed(1)}% → {item.target}%</span>
            </div>
            <div className="relative h-2 bg-white/5 rounded-full overflow-visible">
              <div className="h-full rounded-full" style={{ width: `${Math.min(item.actual, 100)}%`, background: item.color, opacity: 0.85 }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-white/30" style={{ left: `${item.target}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Platform breakdown" />
        {Object.entries(data.platformBreakdown).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([platform, value]) => (
          <div key={platform} className="flex items-center gap-3 mb-3">
            <span className="text-sm text-slate-300 w-20">{platform}</span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#0b6b3a]/70" style={{ width: `${(value / data.equitiesValue) * 100}%` }} />
            </div>
            <span className="text-sm font-mono text-slate-200 w-24 text-right">{$m(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioScreen({ data }: { data: PortfolioData }) {
  const [tab, setTab] = useState("holdings");
  return (
    <div>
      <SubTabs tabs={[{ id: "holdings", label: "Holdings" }, { id: "allocation", label: "Allocation" }]} active={tab} onChange={setTab} />
      {tab === "holdings"   && <HoldingsScreen data={data} />}
      {tab === "allocation" && <AllocationScreen data={data} />}
    </div>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────

type PriceMap = Record<string, number>; // "YYYY-MM" → closing price
interface BenchmarkPrices { VOO: PriceMap; QQQ: PriceMap; VWRA: PriceMap; }
interface ChartPeriod { label: string; startMonth: string; endMonth: string; annualize: boolean; }

function snapForMonth(snapshots: NetWorthSnapshot[], yyyyMM: string): NetWorthSnapshot | null {
  const [y, m] = yyyyMM.split("-").map(Number);
  const target = new Date(y, m - 1, 15).getTime();
  let nearest: NetWorthSnapshot | null = null;
  let minDiff = Infinity;
  for (const s of snapshots) {
    const diff = Math.abs(parseSnapDate(s.date).getTime() - target);
    if (diff < minDiff) { minDiff = diff; nearest = s; }
  }
  return nearest;
}

function findBenchPrice(prices: PriceMap, month: string): number | null {
  const [y, m] = month.split("-").map(Number);
  for (let i = 0; i <= 2; i++) {
    const d = new Date(y, m - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (prices[key] != null) return prices[key];
  }
  return null;
}

function calcPeriodReturn(start: number, end: number, months: number, annualize: boolean): number {
  const raw = (end / start - 1) * 100;
  if (!annualize || months <= 0) return raw;
  return (Math.pow(1 + raw / 100, 12 / months) - 1) * 100;
}

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

function deriveChartPeriods(snapshots: NetWorthSnapshot[]): ChartPeriod[] {
  if (snapshots.length < 2) return [];
  const fd = parseSnapDate(snapshots[0].date);
  const ld = parseSnapDate(snapshots[snapshots.length - 1].date);
  const fy = fd.getFullYear(), fm = fd.getMonth() + 1;
  const ly = ld.getFullYear(), lm = ld.getMonth() + 1;
  const mm = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
  const mon = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  const periods: ChartPeriod[] = [];

  // Partial first year (inception not in January)
  if (fm > 1) {
    periods.push({ label: `${mon(fd)}–Dec ${String(fy).slice(2)}`, startMonth: mm(fy, fm), endMonth: mm(fy, 12), annualize: false });
  }
  // Full calendar years
  const fullStart = fm > 1 ? fy + 1 : fy;
  for (let y = fullStart; y < ly; y++) {
    periods.push({ label: `Full ${y}`, startMonth: mm(y - 1, 12), endMonth: mm(y, 12), annualize: false });
  }
  // Current partial year
  if (ly > fy || fm === 1) {
    periods.push({ label: `Jan–${mon(ld)} ${String(ly).slice(2)}`, startMonth: mm(ly - 1, 12), endMonth: mm(ly, lm), annualize: false });
  }
  // ITD — annualisation controlled by user toggle, not hardcoded here
  periods.push({ label: "ITD", startMonth: mm(fy, fm), endMonth: mm(ly, lm), annualize: false });

  return periods;
}

// Modified Dietz return for a period — strips cash-flow timing effects from the return.
// Basis: equities + crypto (matches Equities sheet; excludes SSBs to stay consistent with cashflow data).
// cashflows: positive = deposit into portfolio, negative = withdrawal.
function modifiedDietz(
  startValue: number, endValue: number,
  startMs: number, endMs: number,
  cashflows: Cashflow[],
  annualize: boolean, months: number
): number | null {
  const periodMs = endMs - startMs;
  if (periodMs <= 0 || startValue <= 0) return null;
  let sumFlows = 0, weightedFlows = 0;
  for (const cf of cashflows) {
    if (cf.dateMs <= startMs || cf.dateMs > endMs) continue;
    const w = (endMs - cf.dateMs) / periodMs;
    sumFlows += cf.amountSGD;
    weightedFlows += w * cf.amountSGD;
  }
  const denom = startValue + weightedFlows;
  if (denom <= 0) return null;
  const raw = (endValue - startValue - sumFlows) / denom;
  if (!annualize || months <= 0) return parseFloat((raw * 100).toFixed(1));
  return parseFloat(((Math.pow(1 + raw, 12 / months) - 1) * 100).toFixed(1));
}

// Chain-link monthly Modified Dietz sub-period returns → annualised TWR.
// This removes the deposit-timing effect that CAGR / simple ratios cannot avoid.
function calcTWR(snapshots: NetWorthSnapshot[], cashflows: Cashflow[]): number {
  if (snapshots.length < 2) return 0;
  let product = 1;
  const n = snapshots.length - 1;
  for (let i = 0; i < n; i++) {
    const a = snapshots[i], b = snapshots[i + 1];
    const sv = a.equities + a.crypto;
    const ev = b.equities + b.crypto;
    const sm = parseSnapDate(a.date).getTime();
    const em = parseSnapDate(b.date).getTime();
    const r = modifiedDietz(sv, ev, sm, em, cashflows, false, 1);
    if (r !== null) product *= (1 + r / 100);
  }
  return (Math.pow(product, 12 / n) - 1) * 100;
}

function InsightsScreen({ data }: { data: PortfolioData }) {
  const [benchmarks, setBenchmarks]     = useState<BenchmarkPrices | null>(null);
  const [benchLoading, setBenchLoading] = useState(true);
  const privacy = usePrivacy();
  const $m = (n: number) => privacy ? "••••" : fmtSGD(n);

  useEffect(() => {
    fetch("/api/benchmarks")
      .then(r => r.json())
      .then(d => { if (d.ok) setBenchmarks(d.prices); })
      .catch(() => {})
      .finally(() => setBenchLoading(false));
  }, []);

  const first = data.snapshots[0];
  const last  = data.snapshots[data.snapshots.length - 1];
  const n     = data.snapshots.length - 1;
  // TWR: chain-linked monthly Modified Dietz — strips deposit-size and timing effects
  const twr = calcTWR(data.snapshots, data.cashflows);
  // MWR: XIRR pre-computed by the spreadsheet from actual transaction dates — the gold standard
  const mwr = data.investmentMetrics.annualisedReturn;
  const totalGainPct = data.investmentMetrics.totalReturn;

  const monthlyReturns = data.snapshots.slice(1).map((s, i) => ({
    date: s.date.replace(/^\d+-/, ""),
    pct: data.snapshots[i].netWorth > 0
      ? ((s.netWorth - data.snapshots[i].netWorth) / data.snapshots[i].netWorth) * 100 : 0,
  }));

  const bestMonth  = monthlyReturns.length ? monthlyReturns.reduce((b, m) => m.pct > b.pct ? m : b) : null;
  const worstMonth = monthlyReturns.length ? monthlyReturns.reduce((w, m) => m.pct < w.pct ? m : w) : null;
  const winRate    = monthlyReturns.length
    ? (monthlyReturns.filter(m => m.pct > 0).length / monthlyReturns.length) * 100 : 0;

  const periods      = deriveChartPeriods(data.snapshots);
  const [selectedIdx, setSelectedIdx] = useState(() => Math.max(0, periods.length - 1));
  const [annualise, setAnnualise]     = useState(false);

  const hasVwra      = !!benchmarks && Object.keys(benchmarks.VWRA ?? {}).length > 0;
  const hasBenchData = !!benchmarks && (
    Object.keys(benchmarks.VOO ?? {}).length > 0 || Object.keys(benchmarks.QQQ ?? {}).length > 0
  );

  const selIdx    = Math.min(selectedIdx, Math.max(0, periods.length - 1));
  const selPeriod = periods[selIdx];

  const im = data.investmentMetrics;
  const isITD = selPeriod?.label === "ITD";

  const selectedChartData = useMemo(() => {
    if (!selPeriod) return [];
    const months = monthsBetween(selPeriod.startMonth, selPeriod.endMonth);
    const doAnn  = annualise && months > 0;

    // ITD: use the spreadsheet's own XIRR / total return — the authoritative pre-computed figure.
    // Sub-periods: Modified Dietz strips DCA deposit effects, giving a comparable investment return.
    let portRet: number | null = null;
    if (isITD) {
      portRet = annualise ? im.annualisedReturn : im.totalReturn;
    } else {
      const startSnap = snapForMonth(data.snapshots, selPeriod.startMonth);
      const endSnap   = snapForMonth(data.snapshots, selPeriod.endMonth);
      if (startSnap && endSnap) {
        const sv = startSnap.equities + startSnap.crypto;
        const ev = endSnap.equities   + endSnap.crypto;
        const sm = parseSnapDate(startSnap.date).getTime();
        const em = parseSnapDate(endSnap.date).getTime();
        portRet = modifiedDietz(sv, ev, sm, em, data.cashflows, doAnn, months);
      }
    }

    const entries: { name: string; value: number | null; fill: string }[] = [
      { name: "Portfolio", value: portRet, fill: COLORS.index },
    ];

    if (hasBenchData && benchmarks) {
      // For ITD, use the portfolio's actual inception date so the benchmark covers
      // the same period; for sub-periods use the period's start month.
      const benchStartMonth = isITD && im.inceptionMonth ? im.inceptionMonth : selPeriod.startMonth;
      // ITD months = months from inception to now (not from first snapshot)
      const benchMonths = isITD && im.inceptionMonth
        ? monthsBetween(im.inceptionMonth, selPeriod.endMonth)
        : months;

      const addBench = (key: keyof BenchmarkPrices, label: string, fill: string) => {
        const sp = findBenchPrice(benchmarks[key], benchStartMonth);
        const ep = findBenchPrice(benchmarks[key], selPeriod.endMonth);
        if (sp && ep) entries.push({
          name: label,
          value: parseFloat(calcPeriodReturn(sp, ep, benchMonths, annualise).toFixed(1)),
          fill,
        });
      };
      addBench("VOO",  "VOO",  "#f59e0b");
      addBench("QQQ",  "QQQ",  "#f43f5e");
      if (hasVwra) addBench("VWRA", "VWRA", "#6366f1");
    }
    return entries;
  }, [selPeriod, isITD, annualise, benchmarks, hasBenchData, hasVwra, data.snapshots, data.cashflows, im]);

  const stackedData = data.snapshots.map(s => ({
    date: s.date.replace(/^\d+-/, ""),
    equities: s.equities, bonds: s.bonds, cash: s.cash, crypto: s.crypto,
  }));

  const clr  = (v: number) => v >= 0 ? "text-emerald-400" : "text-rose-400";
  const sign = (v: number) => v >= 0 ? "+" : "";

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <div className="flex justify-between mb-3">
          {[
            { label: "TWR (ann.)", value: `${sign(twr)}${twr.toFixed(1)}%`, color: clr(twr) },
            { label: "MWR (ann.)", value: `${sign(mwr)}${mwr.toFixed(1)}%`, color: clr(mwr) },
            { label: "Win rate",   value: `${winRate.toFixed(0)}%`,          color: "text-slate-200" },
          ].map(s => (
            <div key={s.label} className="text-center flex-1">
              <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">{s.label}</p>
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">Total gain</p>
            <p className={`text-sm font-mono ${clr(totalGainPct)}`}>{sign(totalGainPct)}{totalGainPct.toFixed(1)}%</p>
            <p className="text-[9px] text-slate-600 mt-0.5">since inception</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">Best month</p>
            <p className="text-sm font-mono text-emerald-400">{bestMonth ? `+${bestMonth.pct.toFixed(1)}%` : "—"}</p>
            <p className="text-[9px] text-slate-600 mt-0.5">{bestMonth?.date}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">Worst month</p>
            <p className="text-sm font-mono text-rose-400">{worstMonth ? `${worstMonth.pct.toFixed(1)}%` : "—"}</p>
            <p className="text-[9px] text-slate-600 mt-0.5">{worstMonth?.date}</p>
          </div>
        </div>
        <p className="text-[9px] text-slate-600 mt-2 text-center">TWR = chain-linked Modified Dietz (equities + crypto) · MWR = XIRR from spreadsheet cashflows</p>
      </div>

      {/* Monthly returns */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Monthly return %" />
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={monthlyReturns} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 7 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis hide />
            <Tooltip
              formatter={(v: any) => [`${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`, "Return"]}
              contentStyle={{ background: "#1e1e2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
              labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Bar dataKey="pct" radius={[2, 2, 0, 0]}>
              {monthlyReturns.map((e, i) => (
                <Cell key={i} fill={e.pct >= 0 ? "#10b981" : "#f43f5e"} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Benchmark comparison */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Returns vs benchmarks" />

        {/* Period pills */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {periods.map((p, i) => (
            <button key={i} onClick={() => setSelectedIdx(i)}
              className={`text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all ${
                i === selIdx
                  ? "bg-[#0b6b3a]/80 text-emerald-200"
                  : "bg-white/[0.05] text-slate-500 hover:text-slate-300"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Total / Annualised toggle */}
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 mb-4">
          {(["Total %", "Annualised %"] as const).map((label, i) => (
            <button key={label} onClick={() => setAnnualise(i === 1)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all ${
                (i === 1) === annualise
                  ? "bg-[#1e1e2a] text-slate-100"
                  : "text-slate-500 hover:text-slate-400"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {benchLoading ? (
          <div className="flex items-center justify-center h-32 text-xs text-slate-600">Fetching benchmark prices…</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={selectedChartData} layout="vertical"
                margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 8 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false} tickLine={false} width={62} />
                <Tooltip
                  formatter={(v: any) => [`${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`, annualise ? "Annualised" : "Total return"]}
                  contentStyle={{ background: "#1e1e2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
                  labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
                />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.12)" />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {selectedChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  <LabelList dataKey="value" position="right"
                    formatter={(v: any) => v != null ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%` : ""}
                    style={{ fill: "#94a3b8", fontSize: "10px" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {!hasBenchData && (
              <p className="text-[9px] text-amber-600/80 mt-1 text-center">Benchmark prices unavailable</p>
            )}
            <p className="text-[9px] text-slate-600 mt-2 text-center">
              {isITD
                ? `Portfolio = XIRR from ${im.inceptionDate} · benchmarks = lump-sum same start date`
                : "Portfolio = Modified Dietz (strips DCA effects) · benchmarks = lump-sum"}
            </p>
          </>
        )}
      </div>

      {/* Asset composition */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Asset composition — full history" />
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stackedData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              {([["eq", COLORS.index], ["bo", "#06b6d4"], ["ca", "#10b981"], ["cr", "#e6b73b"]] as [string,string][]).map(([id, c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 7 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis hide />
            <Tooltip content={<TTip />} />
            <Area type="monotone" dataKey="equities" name="Equities"    stroke={COLORS.index} fill="url(#eq)" strokeWidth={1.5} dot={false} stackId="1" />
            <Area type="monotone" dataKey="bonds"    name="Bonds"       stroke="#06b6d4"      fill="url(#bo)" strokeWidth={1.5} dot={false} stackId="1" />
            <Area type="monotone" dataKey="cash"     name="Cash"        stroke="#10b981"      fill="url(#ca)" strokeWidth={1.5} dot={false} stackId="1" />
            <Area type="monotone" dataKey="crypto"   name="Crypto+Gold" stroke="#f59e0b"      fill="url(#cr)" strokeWidth={1.5} dot={false} stackId="1" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Snapshot table */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Monthly snapshots" />
        <div className="max-h-72 overflow-y-auto">
          {[...data.snapshots].reverse().map((s, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400 w-24">{s.date}</span>
              <span className="text-xs font-mono text-slate-200">{$m(s.netWorth)}</span>
              <span className={`text-xs font-mono ${s.totalPLPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {s.totalPLPct >= 0 ? "+" : ""}{s.totalPLPct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

function LiabilitiesScreen({ data }: { data: PortfolioData }) {
  const gxs = data.loans.find(l => l.name.toLowerCase().includes("gxs") || l.name.toLowerCase().includes("msdeal"));
  const fatherLoans = data.loans.filter(l => l.name.toLowerCase().includes("father"));
  const fatherTotal = fatherLoans.reduce((s, l) => s + l.amount, 0);
  const privacy = usePrivacy();
  const $m = (n: number) => privacy ? "••••" : fmtSGD(n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Loans" value={$m(data.totalLoanAmount || data.totalLoans)} negative />
        <MetricCard label="Net Impact" value={`-${$m(data.totalLoanAmount || data.totalLoans)}`} sub="on net worth" negative />
      </div>
      {gxs && (
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-slate-100">GXS Loan</p>
              <p className="text-xs text-slate-500">EIR 4.09% · Matures Oct 2026</p>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">Action needed</span>
          </div>
          <p className="text-2xl font-mono font-bold text-rose-400">{$m(gxs.amount)}</p>
          <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-2">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">Bullet repayment ~$6,480 due Oct 2026. Ring-fence from DCA capital.</p>
          </div>
        </div>
      )}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <div className="flex justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-100">Father&apos;s Capital</p>
            <p className="text-xs text-slate-500">Interest-free · 5–7 year horizon</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0b6b3a]/10 text-[#a5f4d4]">Family</span>
        </div>
        <p className="text-2xl font-mono font-bold text-slate-100">{$m(fatherTotal)}</p>
        <p className="text-xs text-slate-500 mt-1">Invested in VWRA on behalf of father (age 56)</p>
        <div className="mt-3 space-y-2">
          {fatherLoans.map((loan, i) => (
            <div key={i} className="flex justify-between py-2 border-t border-white/5">
              <div>
                <p className="text-xs text-slate-300">{loan.name.replace("Father Cash ", "Tranche ")}</p>
                {loan.refPrice && <p className="text-[10px] text-slate-600">VWRA @ ${loan.refPrice}</p>}
              </div>
              <p className="text-xs font-mono text-slate-200">{$m(loan.amount)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-[#0b6b3a]/5 border border-[#0b6b3a]/20 rounded-xl flex gap-2">
              <Info size={14} className="text-[#10b981] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#a5b4fc]">Weighted avg VWRA entry ~$183.17. Current ~$188. Up ~2.7% on this tranche.</p>
        </div>
      </div>
    </div>
  );
}

function CPFScreen({ data }: { data: PortfolioData }) {
  const cpf = data.cpf;
  const totalOa = cpf.oa; // oa from parser is already the OA subtotal (cash + POEMs + OCBC)
  const frsGap  = cpf.estimatedFrs3 - cpf.total;
  const privacy = usePrivacy();
  const $m = (n: number) => privacy ? "••••" : fmtSGD(n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="OA (incl. inv.)" value={$m(totalOa)} sub="OA + POEMs + OCBC" />
        <MetricCard label="Special Account" value={$m(cpf.sa)} sub="4% p.a." positive />
        <MetricCard label="MediSave" value={$m(cpf.ma)} />
        <MetricCard label="Total CPF" value={$m(cpf.total)} positive />
      </div>
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="FRS gap — retire 2053" />
        {[
          { label: "Est. FRS @ 3.0% growth", value: cpf.estimatedFrs3,  color: "text-slate-300" },
          { label: "Est. FRS @ 3.5% growth", value: cpf.estimatedFrs35, color: "text-slate-300" },
          { label: "Current CPF total",       value: cpf.total,          color: "text-[#10b981]" },
          { label: "Gap (@ 3.0%)",            value: frsGap,             color: "text-rose-400" },
        ].map(item => (
          <div key={item.label} className="flex justify-between py-2 border-b border-white/5">
            <span className="text-xs text-slate-400">{item.label}</span>
            <span className={`text-sm font-mono font-semibold ${item.color}`}>{$m(item.value)}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 flex gap-3">
        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400">$14,643 OA→SA transfers + $5,671 cash top-ups since 2023. SA 4% guaranteed rate is exceptional risk-adjusted return.</p>
      </div>
    </div>
  );
}

function PlanScreen({ data }: { data: PortfolioData }) {
  const [tab, setTab] = useState("cpf");
  return (
    <div>
      <SubTabs tabs={[{ id: "cpf", label: "CPF" }, { id: "loans", label: "Loans" }]} active={tab} onChange={setTab} />
      {tab === "cpf"   && <CPFScreen data={data} />}
      {tab === "loans" && <LiabilitiesScreen data={data} />}
    </div>
  );
}

// ─── Research + AI ────────────────────────────────────────────────────────────

function HealthArc({ score }: { score: number }) {
  const R = 32, cx = 40, cy = 40;
  const circum = Math.PI * R;
  const filled = circum * (score / 10);
  const color = score >= 7 ? "#10b981" : score >= 5 ? "#f59e0b" : "#f43f5e";
  return (
    <svg width={80} height={44} viewBox="0 0 80 44" className="flex-shrink-0">
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} strokeLinecap="round" />
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${filled} ${circum}`} />
      <text x={cx} y={cx + 2} textAnchor="middle" fill={color} fontSize={12} fontWeight="bold" fontFamily="monospace">
        {score}/10
      </text>
    </svg>
  );
}

function renderMd(text: string, privacy = false): React.ReactNode {
  const MONEY_RE = /(?:S?\$|SGD\s*)[\d,]+(?:\.\d{1,2})?/g;
  const maskText = (s: string) => privacy ? s.replace(MONEY_RE, "••••") : s;
  const inlineBold = (s: string): React.ReactNode[] =>
    maskText(s).split(/(\*\*.+?\*\*)/).map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} className="text-slate-200 font-semibold">{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    );

  // Group consecutive pipe-lines into table blocks; everything else is a text line.
  type Block = { kind: "table"; rows: string[] } | { kind: "line"; text: string };
  const blocks: Block[] = [];
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("|")) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "table") last.rows.push(line);
      else blocks.push({ kind: "table", rows: [line] });
    } else {
      blocks.push({ kind: "line", text: line });
    }
  }

  const parseRow = (l: string) => l.split("|").slice(1, -1).map(c => c.trim());
  const isSep    = (l: string) => /^\s*\|[\s\-:|]+\|\s*$/.test(l);

  return blocks.map((block, bi) => {
    if (block.kind === "line") {
      const line = block.text;
      if (/^[-*•]\s+/.test(line))
        return (
          <div key={bi} className="flex gap-1.5 mt-0.5">
            <span className="text-slate-500 flex-shrink-0">·</span>
            <span>{inlineBold(line.replace(/^[-*•]\s+/, ""))}</span>
          </div>
        );
      if (!line.trim()) return <div key={bi} className="h-1" />;
      return <p key={bi} className="mt-0.5">{inlineBold(line)}</p>;
    }

    // Table block
    const { rows } = block;
    if (rows.length < 2) return <p key={bi} className="mt-0.5 font-mono text-xs">{rows[0]}</p>;
    const headers  = parseRow(rows[0]);
    const hasSep   = isSep(rows[1]);
    const dataRows = rows.slice(hasSep ? 2 : 1);

    return (
      <div key={bi} className="mt-2 mb-1 overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#0b6b3a]/20">
              {headers.map((h, ci) => (
                <th key={ci} className="py-2 px-3 text-left text-slate-300 font-semibold border-b border-white/[0.08] whitespace-nowrap">
                  {inlineBold(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 1 ? "bg-white/[0.025]" : ""}>
                {parseRow(row).map((cell, ci) => (
                  <td key={ci} className="py-2 px-3 text-slate-300 border-b border-white/[0.04] last:border-b-0">
                    {inlineBold(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  });
}

function AIScreen({ data }: { data: PortfolioData }) {
  const [messages, setMessages]   = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [health, setHealth]       = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const privacy = usePrivacy();
  const MONEY_RE = /(?:S?\$|SGD\s*)[\d,]+(?:\.\d{1,2})?/g;
  const $t = (s: string) => privacy ? s.replace(MONEY_RE, "••••") : s;

  useEffect(() => {
    fetch(`/api/analyze?data=${encodeURIComponent(JSON.stringify(data))}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setHealth(j.analysis); })
      .catch(() => {})
      .finally(() => setHealthLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput("");
    const updated = [...messages, { role: "user" as const, content: msg }];
    setMessages(updated);
    setSending(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, portfolioData: data, history: updated.slice(-10) }),
      });
      const j = await res.json();
      if (j.ok) setMessages(m => [...m, { role: "assistant", content: j.reply }]);
    } catch {}
    setSending(false);
  };

  const suggestions = [
    "How is my allocation tracking vs my targets?",
    "What should I do about the GXS loan?",
    "Am I on track for CPF FRS by 2053?",
    "Review my top 3 positions",
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Health scorecard */}
      {healthLoading ? (
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#0b6b3a]/30 border-t-[#0b6b3a] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Analysing your portfolio…</p>
        </div>
      ) : health ? (
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SectionHeader title="Portfolio health" />
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">{$t(health.healthReason)}</p>
            </div>
            <HealthArc score={health.healthScore} />
          </div>
          {health.recommendations?.length > 0 && (
            <div className="space-y-2">
              {health.recommendations.map((r: any, i: number) => {
                const pri = (r.priority || "").toLowerCase();
                const priCls = pri === "high"
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  : pri === "medium"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                return (
                  <div key={i} className="flex gap-2 p-2.5 bg-[#0b6b3a]/5 rounded-xl border border-[#0b6b3a]/15">
                    <span className="text-xs text-[#a5f4d4] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="text-xs text-slate-200 font-medium flex-1">{$t(r.action)}</p>
                        {pri && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 capitalize ${priCls}`}>
                            {pri}
                          </span>
                        )}
                      </div>
                      {r.detail && <p className="text-[10px] text-slate-500 mt-0.5">{$t(r.detail)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {health.risks?.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Key risks</p>
              {health.risks.map((risk: string, i: number) => (
                <div key={i} className="flex gap-2 items-start">
                  <AlertCircle size={11} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">{$t(risk)}</p>
                </div>
              ))}
            </div>
          )}
          {health.highlight && (
            <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex gap-2">
              <CheckCircle size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-300">{$t(health.highlight)}</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-[#0b6b3a]/20 text-[#a5f4d4]"
                  : "bg-white/[0.05] text-slate-300"
              }`}>
                {m.role === "user" ? m.content : renderMd(m.content, privacy)}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/[0.05] rounded-2xl px-3 py-2.5">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Suggestions (shown before first message) */}
      {messages.length === 0 && !healthLoading && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-1">Ask me anything</p>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)}
              className="w-full text-left bg-[#16161f] border border-white/[0.06] rounded-xl p-3 text-sm text-slate-300 hover:bg-white/[0.05] transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask about your portfolio…"
          className="flex-1 bg-[#16161f] border border-white/[0.08] rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#0b6b3a]/50 text-sm"
        />
        <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
          className="bg-[#0b6b3a] hover:bg-[#0f8f4a] text-white rounded-xl px-4 transition-all disabled:opacity-40">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function ResearchScreen() {
  const [ticker, setTicker] = useState("");
  type ResearchResult = {
    ticker?: string;
    data?: {
      profile?: { companyName?: string; sector?: string; mktCap?: number; price?: number };
      quote?: { changesPercentage?: number };
      ratios?: { peRatioTTM?: number; priceToSalesRatioTTM?: number };
      recentNews?: { title?: string; publishedDate?: string; url?: string }[];
    };
    analysis?: {
      verdict?: string;
      bullCase?: string[];
      bearCase?: string[];
      valuation?: string;
      portfolioFit?: string;
      watchMetrics?: string[];
    };
  };
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [watchlist, setWatchlist] = useState(["NVDA", "XPEV", "VWRA", "VOO", "MU", "GOOGL"]);

  const search = async (t?: string) => {
    const q = (t || ticker).trim().toUpperCase();
    if (!q) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await fetch(`/api/research?ticker=${q}`);
      const json = await res.json();
      if (json.ok) setResult(json);
      else setError("Could not find data for this ticker.");
    } catch { setError("Research failed. Check ticker and try again."); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Ticker (e.g. XPEV, NVDA, 9880.HK)"
          className="flex-1 bg-[#16161f] border border-white/[0.08] rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#0b6b3a]/50 text-sm" />
        <button onClick={() => search()} disabled={loading || !ticker.trim()}
          className="bg-[#0b6b3a] hover:bg-[#0f8f4a] text-white rounded-xl px-4 transition-all disabled:opacity-40">
          <Search size={16} />
        </button>
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Watchlist" />
        <div className="flex flex-wrap gap-2">
          {watchlist.map(t => (
            <button key={t} onClick={() => { setTicker(t); search(t); }}
              className="text-[10px] font-medium px-3 py-1.5 rounded-full bg-[#0b6b3a]/10 text-[#a5f4d4] hover:bg-[#0b6b3a]/20 transition-all">
              {t}
            </button>
          ))}
          <button onClick={() => { if (ticker && !watchlist.includes(ticker)) setWatchlist(p => [...p, ticker]); }}
            className="text-[10px] font-medium px-3 py-1.5 rounded-full bg-white/5 text-slate-500 hover:bg-white/10 transition-all">
            + Add
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-8 flex flex-col items-center gap-2">
          <Search size={20} className="text-[#0b6b3a] animate-pulse" />
          <p className="text-xs text-slate-500">Fetching data and running analysis…</p>
        </div>
      )}
      {error && (
        <div className="bg-[#16161f] border border-rose-500/20 rounded-2xl p-4 flex gap-2">
          <AlertCircle size={14} className="text-rose-400" />
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}
      {result && (
        <div className="space-y-3">
          <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xl font-bold text-slate-100">{result.ticker}</p>
                <p className="text-sm text-slate-400">{result.data?.profile?.companyName}</p>
                <p className="text-xs text-slate-600">{result.data?.profile?.sector}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-mono font-bold text-slate-100">${result.data?.profile?.price?.toFixed(2)}</p>
                <p className={`text-sm font-mono ${(result.data?.quote?.changesPercentage || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {fmtPct(result.data?.quote?.changesPercentage || 0)}
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-3">
              <div><p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Mkt Cap</p><p className="text-xs font-mono text-slate-300">${((result.data?.profile?.mktCap || 0) / 1e9).toFixed(1)}B</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">P/E TTM</p><p className="text-xs font-mono text-slate-300">{result.data?.ratios?.peRatioTTM?.toFixed(1) || "N/A"}x</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">P/S TTM</p><p className="text-xs font-mono text-slate-300">{result.data?.ratios?.priceToSalesRatioTTM?.toFixed(1) || "N/A"}x</p></div>
            </div>
          </div>
          {result.analysis && (
            <>
              <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                <SectionHeader title="AI verdict" />
                {(() => {
                  const word = (result.analysis.verdict || "").split(/\s/)[0].toUpperCase();
                  const chipCls: Record<string, string> = {
                    BUY:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                    HOLD:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
                    WATCH: "bg-blue-500/15 text-blue-400 border-blue-500/30",
                    AVOID: "bg-rose-500/15 text-rose-400 border-rose-500/30",
                  };
                  const cls = chipCls[word] || "bg-white/10 text-slate-300 border-white/20";
                  const body = (result.analysis.verdict || "").replace(/^(BUY|HOLD|WATCH|AVOID)\s*[-—:]\s*/i, "").trim();
                  return (
                    <div className="space-y-2">
                      {chipCls[word] && (
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{word}</span>
                      )}
                      <div className="text-sm text-slate-200 leading-relaxed">{renderMd(body)}</div>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                  <SectionHeader title="Bull case" />
                  <div className="space-y-2">
                    {(result.analysis.bullCase || []).map((p, i) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="text-emerald-400 text-xs flex-shrink-0 mt-0.5">+</span>
                        <div className="text-xs text-slate-400 leading-relaxed">{renderMd(p)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                  <SectionHeader title="Bear case" />
                  <div className="space-y-2">
                    {(result.analysis.bearCase || []).map((p, i) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="text-rose-400 text-xs flex-shrink-0 mt-0.5">−</span>
                        <div className="text-xs text-slate-400 leading-relaxed">{renderMd(p)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                {result.analysis.valuation && (
                  <div>
                    <SectionHeader title="Valuation" />
                    <div className="text-xs text-slate-300 leading-relaxed">{renderMd(result.analysis.valuation)}</div>
                  </div>
                )}
                <div>
                  <SectionHeader title="Portfolio fit" />
                  <div className="text-xs text-slate-300 leading-relaxed">{renderMd(result.analysis.portfolioFit ?? "")}</div>
                </div>
                {result.analysis.watchMetrics && result.analysis.watchMetrics.length > 0 && (
                  <div>
                    <SectionHeader title="Watch metrics" />
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {result.analysis.watchMetrics.map((m, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-400">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {(result.data?.recentNews?.length || 0) > 0 && (
            <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
              <SectionHeader title="Recent news" />
              <div className="space-y-2">
                {(result.data?.recentNews || []).slice(0, 3).map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                    className="block p-3 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] transition-all">
                    <p className="text-xs text-slate-300 line-clamp-2">{n.title}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{n.publishedDate?.slice(0, 10)}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResearchAIScreen({ data }: { data: PortfolioData }) {
  const [tab, setTab] = useState("research");
  return (
    <div>
      <SubTabs tabs={[{ id: "research", label: "Research Advisor" }, { id: "ai", label: "Portfolio Advisor" }]} active={tab} onChange={setTab} />
      {tab === "research" && <ResearchScreen />}
      {tab === "ai"       && <AIScreen data={data} />}
    </div>
  );
}

// ─── Lock screen ──────────────────────────────────────────────────────────────

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd]   = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);

  const attempt = async () => {
    const res  = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    const json = await res.json();
    if (json.ok) { onUnlock(); }
    else { setError(true); setPwd(""); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-[#0a0a0f]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <LogoMark size={200} className="rounded-3xl mx-auto mb-0 translate-y-8" />
          <h1 className="text-2xl font-bold text-slate-100 -mt-4">Folio</h1>
          <p className="text-sm text-slate-500 mt-1">Personal Portfolio Analyzer</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <input type={show ? "text" : "password"} value={pwd}
              onChange={e => { setPwd(e.target.value); setError(false); }}
              onKeyDown={e => e.key === "Enter" && attempt()}
              placeholder="Enter password"
              className={`w-full bg-[#16161f] border rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none pr-12 text-sm ${error ? "border-rose-500/50" : "border-white/[0.08] focus:border-[#0b6b3a]/50"}`}
              autoFocus />
            <button onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400 text-center">Incorrect password</p>}
          <button onClick={attempt}
            className="w-full bg-[#0b6b3a] hover:bg-[#0f8f4a] text-white font-medium rounded-xl px-6 py-3 transition-all flex items-center justify-center gap-2 text-sm">
            <Lock size={16} /> Unlock Folio
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────

export default function FolioApp() {
  const [unlocked, setUnlocked]   = useState(false);
  const [screen, setScreen]       = useState("home");
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  const fetchPortfolio = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const res  = await fetch("/api/portfolio");
      const json = await res.json();
      if (json.ok) setPortfolio(json.data);
      else setError("Could not load portfolio data.");
    } catch { setError("Network error."); }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { if (unlocked) fetchPortfolio(); }, [unlocked, fetchPortfolio]);

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  const activeNav = NAV.find(n => n.id === screen);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col max-w-md mx-auto">
      <header
        className="px-4 pt-2 pb-2 flex items-center justify-between border-b border-white/[0.04] sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-xl z-10"
        style={{ paddingTop: "max(0.6rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2">
          <LogoMark
            size={activeNav?.id === "home" ? 144 : 128}
            className={activeNav?.id === "home" ? "flex-shrink-0 translate-y-1" : "flex-shrink-0"}
          />
          <div className="leading-tight">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Folio</p>
            <h1 className="text-lg font-semibold text-slate-100 -mt-0.5">{activeNav?.label}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {privacy && (
            <span className="text-[10px] font-mono tracking-tight text-slate-400 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 select-none">
              folio
            </span>
          )}
          <button onClick={() => setPrivacy(p => !p)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              privacy ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.05] text-slate-400 hover:bg-white/[0.1]"
            }`}
            title={privacy ? "Privacy on — tap to reveal" : "Privacy off — tap to hide values"}>
            {privacy ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={() => fetchPortfolio(true)} disabled={refreshing}
            className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-slate-400 hover:bg-white/[0.1] transition-all disabled:opacity-40">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-[#0b6b3a]/30 border-t-[#0b6b3a] rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading your portfolio…</p>
          </div>
        )}
        {error && !loading && (
          <div className="bg-[#16161f] border border-rose-500/20 rounded-2xl p-4 mt-4">
            <div className="flex gap-2 items-center mb-3">
              <AlertCircle size={14} className="text-rose-400" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
            <button onClick={() => fetchPortfolio()}
              className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-xl px-4 py-2 text-sm transition-all">
              Retry
            </button>
          </div>
        )}
        {!loading && !error && portfolio && (
          <PrivacyCtx.Provider value={privacy}>
            {screen === "home"      && <SnapshotScreen   data={portfolio} />}
            {screen === "portfolio" && <PortfolioScreen  data={portfolio} />}
            {screen === "insights"  && <InsightsScreen   data={portfolio} />}
            {screen === "plan"      && <PlanScreen       data={portfolio} />}
            {screen === "ai"        && <ResearchAIScreen data={portfolio} />}
          </PrivacyCtx.Provider>
        )}
      </main>

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.04] px-2 py-1 z-10"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex justify-around">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setScreen(id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-150 ${screen === id ? "text-[#10b981]" : "text-slate-600 hover:text-slate-400"}`}>
              <Icon size={20} strokeWidth={screen === id ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
