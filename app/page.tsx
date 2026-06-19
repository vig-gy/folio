"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  LayoutDashboard, Briefcase, TrendingUp, Shield, Search, Sparkles,
  RefreshCw, Lock, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Send, AlertCircle,
  CheckCircle, Info, ChevronDown, ChevronUp
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from "recharts";
import type { PortfolioData } from "@/lib/parser";

const fmt = (n: number, dec = 0) =>
  new Intl.NumberFormat("en-SG", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
const fmtSGD = (n: number) => `$${fmt(Math.abs(n))}`;
const fmtPct = (n: number, dec = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(dec)}%`;

const COLORS = {
  index: "#0b6b3a", stock: "#1fa76a", bonds: "#06b6d4",
  cash: "#10b981", crypto: "#e6b73b", amber: "#e6b73b",
  rose: "#f43f5e", emerald: "#10b981",
};

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
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e2a] border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: ${fmt(p.value)}</p>)}
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

type Range = "6M" | "12M" | "YTD" | "1Y" | "custom";

// Parses snapshot date strings like "01-Jun-23" into a Date
function parseSnapDate(d: string): Date {
  const p = d.split("-");
  if (p.length < 3) return new Date(0);
  const mo: Record<string, number> = {
    Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
    Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11,
  };
  return new Date(2000 + parseInt(p[2]), mo[p[1]] ?? 0, 1);
}

function SnapshotScreen({ data }: { data: PortfolioData }) {
  const [range, setRange]           = useState<Range>("12M");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");

  const last = data.snapshots[data.snapshots.length - 1];
  const prev = data.snapshots[data.snapshots.length - 2];
  const change    = last && prev ? last.netWorth - prev.netWorth : 0;
  const changePct = prev?.netWorth ? (change / prev.netWorth) * 100 : 0;

  const filteredSnapshots = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date = now;
    switch (range) {
      case "6M":  from = new Date(now.getFullYear(), now.getMonth() - 6, 1);  break;
      case "12M": from = new Date(now.getFullYear(), now.getMonth() - 12, 1); break;
      case "YTD": from = new Date(now.getFullYear(), 0, 1);                   break;
      case "1Y":  from = new Date(now.getFullYear() - 1, now.getMonth(), 1);  break;
      case "custom":
        from = customFrom ? new Date(customFrom) : new Date(2000, 0, 1);
        to   = customTo   ? new Date(customTo)   : now;
        break;
      default:    from = new Date(2000, 0, 1);
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

  const RANGES: Range[] = ["6M", "12M", "YTD", "1Y", "custom"];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b6b3a]/5 to-transparent pointer-events-none" />
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">Net Worth (excl. CPF)</p>
        <p className="text-4xl font-bold font-mono text-slate-100 mb-1">{fmtSGD(data.netWorthExclCpf)}</p>
        <div className="flex items-center gap-2">
          {change >= 0 ? <ArrowUpRight size={14} className="text-emerald-400" /> : <ArrowDownRight size={14} className="text-rose-400" />}
          <span className={`text-sm font-mono ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {change >= 0 ? "+" : "-"}{fmtSGD(change)} ({fmtPct(changePct)}) vs last month
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">Updated {data.lastUpdated}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Gross Assets"    value={fmtSGD(data.grossAssets)}        sub="before loans" />
        <MetricCard label="Loans"           value={fmtSGD(data.totalLoans)}         sub="outstanding" negative />
        <MetricCard label="incl. CPF OA"    value={fmtSGD(data.netWorthInclOa)}     positive />
        <MetricCard label="incl. Full CPF"  value={fmtSGD(data.netWorthInclFullCpf)} positive />
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
                formatter={(v: any) => [`${Number(v) >= 0 ? "+" : "-"}${fmtSGD(Number(v))}`, "Change"]}
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
            <span className="text-sm font-mono text-slate-200">{fmtSGD(item.value)}</span>
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
  const [expanded, setExpanded] = useState<number | null>(null);

  const catColor: Record<string, string> = {
    index: COLORS.index, stock: "#1fa76a", gold: "#e6b73b", crypto: "#f97316", cash: "#10b981",
  };

  const donutData = [
    { name: "Index",      value: data.categoryBreakdown.indexFunds,       color: COLORS.index,  filter: "index" },
    { name: "Stocks",     value: data.categoryBreakdown.individualStocks,  color: "#1fa76a",     filter: "stock" },
    { name: "Bonds",      value: data.categoryBreakdown.bonds,             color: COLORS.bonds,  filter: "bond" },
    { name: "Cash",       value: data.categoryBreakdown.cash,              color: "#10b981",     filter: "cash" },
    { name: "Crypto+Gold",value: data.categoryBreakdown.cryptoGold,        color: COLORS.amber,  filter: "crypto" },
  ].filter(d => d.value > 0);

  const filters = ["all", "index", "stock", "gold", "crypto", "cash"];
  const sorted = [...data.positions]
    .filter(p => filter === "all" || p.category === filter)
    .sort((a, b) => b.valueSGD - a.valueSGD);

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
      {/* Donut overview */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Holdings by category" />
        <ResponsiveContainer width="100%" height={180}>
          <RPieChart>
            <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
              dataKey="value" labelLine={false} label={renderLabel}>
              {donutData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
            </Pie>
            <Tooltip
              formatter={(v: any) => fmtSGD(Number(v ?? 0))}
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
        {filters.map(f => (
          <button key={f} onClick={() => { setFilter(f); setExpanded(null); }}
            className={`text-[10px] font-medium px-3 py-1.5 rounded-full flex-shrink-0 transition-all ${filter === f ? "bg-[#0b6b3a]/20 text-[#a5f4d4]" : "bg-white/5 text-slate-500"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Position cards — tap to expand */}
      <div className="space-y-2">
        {sorted.map((pos, i) => (
          <div key={i}
            className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 cursor-pointer active:bg-white/[0.03] transition-colors"
            onClick={() => setExpanded(expanded === i ? null : i)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: catColor[pos.category] || "#475569" }} />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{pos.ticker}</p>
                  <p className="text-xs text-slate-500">{pos.platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold text-slate-100">{fmtSGD(pos.valueSGD)}</p>
                  <p className="text-xs text-slate-500">{pos.allocationPct.toFixed(1)}%</p>
                </div>
                {expanded === i
                  ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" />
                  : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
              </div>
            </div>

            {expanded === i && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Units</p>
                  <p className="text-sm font-mono text-slate-200">{pos.units}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Price ({pos.currency})</p>
                  <p className="text-sm font-mono text-slate-200">{pos.currentPrice.toFixed(2)}</p>
                </div>
                {pos.currency !== "SGD" && (
                  <>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Value ({pos.currency})</p>
                      <p className="text-sm font-mono text-slate-200">{fmt(pos.valueLocal)}</p>
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
                  <p className="text-sm font-mono text-slate-200">{fmtSGD(pos.valueSGD)}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AllocationScreen({ data }: { data: PortfolioData }) {
  const { categoryBreakdown: cat } = data;
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
              formatter={(v: any) => fmtSGD(Number(v ?? 0))}
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
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-300">{item.label}</span>
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
            <span className="text-sm font-mono text-slate-200 w-24 text-right">{fmtSGD(value)}</span>
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

function PerformanceScreen({ data }: { data: PortfolioData }) {
  const chartData = data.snapshots.map(s => ({ date: s.date.slice(3), netWorth: s.netWorth }));
  const benchData = [
    { period: "Jun–Dec 23", portfolio: 24.1, vwra: 13.2, voo: 15.9, qqq: 33.1 },
    { period: "Full 2024",  portfolio: 23.8, vwra: 21.7, voo: 25.0, qqq: 25.6 },
    { period: "Full 2025",  portfolio: 18.6, vwra: 15.4, voo: 17.8, qqq: 20.8 },
    { period: "Jan–Jun 26", portfolio:  4.1, vwra:  4.0, voo:  9.1, qqq: 17.6 },
    { period: "ITD (ann.)", portfolio: 17.2, vwra: 18.9, voo: 22.1, qqq: 30.2 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-1">TWR (ann.)</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">+17.2%</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">±2–3%</span>
        </div>
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-1">MWR / IRR</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">+12.4%</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">±1%</span>
        </div>
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Net worth history" />
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.index} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLORS.index} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 8 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis hide domain={["dataMin - 20000", "dataMax + 10000"]} />
            <Tooltip content={<TTip />} />
            <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke={COLORS.index} fill="url(#g2)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Returns vs benchmarks" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={benchData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="period" tick={{ fill: "#475569", fontSize: 8 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip
              formatter={(v: any) => `${Number(v ?? 0).toFixed(1)}%`}
              contentStyle={{ background: "#1e1e2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
            />
            <Legend wrapperStyle={{ fontSize: "10px", color: "#475569" }} />
            <Bar dataKey="portfolio" name="Portfolio" fill={COLORS.index}  radius={[3, 3, 0, 0]} />
            <Bar dataKey="vwra"      name="VWRA"      fill="#10b981"        radius={[3, 3, 0, 0]} />
            <Bar dataKey="voo"       name="VOO"        fill="#f59e0b"        radius={[3, 3, 0, 0]} />
            <Bar dataKey="qqq"       name="QQQ"        fill="#f43f5e"        radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HistoryScreen({ data }: { data: PortfolioData }) {
  const first = data.snapshots[0];
  const last  = data.snapshots[data.snapshots.length - 1];
  const totalGain    = last && first ? last.netWorth - first.netWorth : 0;
  const totalGainPct = first?.netWorth ? (totalGain / first.netWorth) * 100 : 0;
  const monthCount   = data.snapshots.length - 1;
  const years        = monthCount / 12;
  const cagr         = years > 0 && first?.netWorth > 0
    ? (Math.pow(last.netWorth / first.netWorth, 1 / years) - 1) * 100
    : 0;

  const stackedData = data.snapshots.map(s => ({
    date: s.date.slice(3), equities: s.equities, bonds: s.bonds, cash: s.cash, crypto: s.crypto,
  }));

  const monthlyReturns = data.snapshots.slice(1).map((s, i) => {
    const prev = data.snapshots[i];
    return {
      date: s.date.slice(3),
      pct: prev.netWorth > 0 ? ((s.netWorth - prev.netWorth) / prev.netWorth) * 100 : 0,
    };
  });

  return (
    <div className="space-y-4">
      {/* Since-inception stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-3 text-center">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Started</p>
          <p className="text-xs font-mono text-slate-300">{first?.date || "—"}</p>
        </div>
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-3 text-center">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Total gain</p>
          <p className={`text-xs font-mono font-semibold ${totalGainPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtPct(totalGainPct, 1)}
          </p>
        </div>
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-3 text-center">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">CAGR</p>
          <p className={`text-xs font-mono font-semibold ${cagr >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtPct(cagr, 1)}
          </p>
        </div>
      </div>

      {/* Stacked area — asset composition over time */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Asset composition — full history" />
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stackedData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              {[["eq", COLORS.index], ["bo", "#06b6d4"], ["ca", "#10b981"], ["cr", "#e6b73b"]].map(([id, c]) => (
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

      {/* Monthly return % bars */}
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

      {/* Snapshot table */}
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Monthly snapshots" />
        <div className="space-y-0 max-h-72 overflow-y-auto">
          {[...data.snapshots].reverse().map((s, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400 w-24">{s.date}</span>
              <span className="text-xs font-mono text-slate-200">{fmtSGD(s.netWorth)}</span>
              <span className={`text-xs font-mono ${s.totalPLPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {fmtPct(s.totalPLPct)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightsScreen({ data }: { data: PortfolioData }) {
  const [tab, setTab] = useState("performance");
  return (
    <div>
      <SubTabs tabs={[{ id: "performance", label: "Performance" }, { id: "history", label: "History" }]} active={tab} onChange={setTab} />
      {tab === "performance" && <PerformanceScreen data={data} />}
      {tab === "history"     && <HistoryScreen data={data} />}
    </div>
  );
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

function LiabilitiesScreen({ data }: { data: PortfolioData }) {
  const gxs = data.loans.find(l => l.name.toLowerCase().includes("gxs") || l.name.toLowerCase().includes("msdeal"));
  const fatherLoans = data.loans.filter(l => l.name.toLowerCase().includes("father"));
  const fatherTotal = fatherLoans.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Loans" value={fmtSGD(data.totalLoanAmount || data.totalLoans)} negative />
        <MetricCard label="Net Impact" value={`-${fmtSGD(data.totalLoanAmount || data.totalLoans)}`} sub="on net worth" negative />
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
          <p className="text-2xl font-mono font-bold text-rose-400">{fmtSGD(gxs.amount)}</p>
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
        <p className="text-2xl font-mono font-bold text-slate-100">{fmtSGD(fatherTotal)}</p>
        <p className="text-xs text-slate-500 mt-1">Invested in VWRA on behalf of father (age 56)</p>
        <div className="mt-3 space-y-2">
          {fatherLoans.map((loan, i) => (
            <div key={i} className="flex justify-between py-2 border-t border-white/5">
              <div>
                <p className="text-xs text-slate-300">{loan.name.replace("Father Cash ", "Tranche ")}</p>
                {loan.refPrice && <p className="text-[10px] text-slate-600">VWRA @ ${loan.refPrice}</p>}
              </div>
              <p className="text-xs font-mono text-slate-200">{fmtSGD(loan.amount)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-[#0b6b3a]/5 border border-[#0b6b3a]/20 rounded-xl flex gap-2">
          <Info size={14} className="text-[#818cf8] flex-shrink-0 mt-0.5" />
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="OA (incl. inv.)" value={fmtSGD(totalOa)} sub="OA + POEMs + OCBC" />
        <MetricCard label="Special Account" value={fmtSGD(cpf.sa)} sub="4% p.a." positive />
        <MetricCard label="MediSave" value={fmtSGD(cpf.ma)} />
        <MetricCard label="Total CPF" value={fmtSGD(cpf.total)} positive />
      </div>
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="FRS gap — retire 2053" />
        {[
          { label: "Est. FRS @ 3.0% growth", value: cpf.estimatedFrs3,  color: "text-slate-300" },
          { label: "Est. FRS @ 3.5% growth", value: cpf.estimatedFrs35, color: "text-slate-300" },
          { label: "Current CPF total",       value: cpf.total,          color: "text-[#818cf8]" },
          { label: "Gap (@ 3.0%)",            value: frsGap,             color: "text-rose-400" },
        ].map(item => (
          <div key={item.label} className="flex justify-between py-2 border-b border-white/5">
            <span className="text-xs text-slate-400">{item.label}</span>
            <span className={`text-sm font-mono font-semibold ${item.color}`}>{fmtSGD(item.value)}</span>
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

function AIScreen({ data }: { data: PortfolioData }) {
  const [messages, setMessages]   = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [health, setHealth]       = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

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
          <div className="flex items-center justify-between mb-1">
            <SectionHeader title="Portfolio health" />
            <span className="text-2xl font-bold font-mono text-emerald-400">{health.healthScore}/10</span>
          </div>
          <p className="text-sm text-slate-300">{health.healthReason}</p>
          {health.recommendations?.length > 0 && (
            <div className="space-y-2">
              {health.recommendations.map((r: any, i: number) => (
                <div key={i} className="flex gap-2 p-2.5 bg-[#0b6b3a]/5 rounded-xl border border-[#0b6b3a]/15">
                  <span className="text-xs text-[#a5f4d4] font-bold flex-shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-xs text-slate-200 font-medium">{r.action}</p>
                    {r.detail && <p className="text-[10px] text-slate-500 mt-0.5">{r.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {health.highlight && (
            <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex gap-2">
              <CheckCircle size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-300">{health.highlight}</p>
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
                {m.content}
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
  const [result, setResult] = useState<{ ticker?: string; data?: { profile?: { companyName?: string; sector?: string; mktCap?: number; price?: number }; quote?: { changesPercentage?: number }; ratios?: { peRatioTTM?: number; priceToSalesRatioTTM?: number }; recentNews?: { title?: string; publishedDate?: string; url?: string }[] }; analysis?: { verdict?: string; bullCase?: string[]; bearCase?: string[]; portfolioFit?: string } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [watchlist, setWatchlist] = useState(["XPEV", "NVDA", "9880.HK", "UBTI", "TSLA"]);

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
              <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                <SectionHeader title="AI verdict" />
                <p className="text-sm text-slate-200">{result.analysis.verdict}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                  <SectionHeader title="Bull case" />
                  {(result.analysis.bullCase || []).map((p, i) => (
                    <div key={i} className="flex gap-1.5 mb-1.5">
                      <span className="text-emerald-400 text-xs">+</span>
                      <p className="text-xs text-slate-400">{p}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                  <SectionHeader title="Bear case" />
                  {(result.analysis.bearCase || []).map((p, i) => (
                    <div key={i} className="flex gap-1.5 mb-1.5">
                      <span className="text-rose-400 text-xs">−</span>
                      <p className="text-xs text-slate-400">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                <SectionHeader title="Portfolio fit" />
                <p className="text-xs text-slate-300">{result.analysis.portfolioFit}</p>
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
          <img src="/folio-app-logo-512.png" alt="Folio" className="w-48 h-48 rounded-3xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-100">Folio</h1>
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
        className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.04] sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-xl z-10"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Folio</p>
          <h1 className="text-lg font-semibold text-slate-100">{activeNav?.label}</h1>
        </div>
        <button onClick={() => fetchPortfolio(true)} disabled={refreshing}
          className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-slate-400 hover:bg-white/[0.1] transition-all disabled:opacity-40">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
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
          <>
            {screen === "home"      && <SnapshotScreen   data={portfolio} />}
            {screen === "portfolio" && <PortfolioScreen  data={portfolio} />}
            {screen === "insights"  && <InsightsScreen   data={portfolio} />}
            {screen === "plan"      && <PlanScreen       data={portfolio} />}
            {screen === "ai"        && <ResearchAIScreen data={portfolio} />}
          </>
        )}
      </main>

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.04] px-2 py-1 z-10"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex justify-around">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setScreen(id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-150 ${screen === id ? "text-[#818cf8]" : "text-slate-600 hover:text-slate-400"}`}>
              <Icon size={20} strokeWidth={screen === id ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
