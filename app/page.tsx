"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, PieChart, TrendingUp, Briefcase,
  CreditCard, Shield, History, Sparkles, Search,
  RefreshCw, Lock, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Send, Star, AlertCircle,
  CheckCircle, Info
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import type { PortfolioData } from "@/lib/parser";

const fmt = (n: number, dec = 0) =>
  new Intl.NumberFormat("en-SG", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
const fmtSGD = (n: number) => `$${fmt(Math.abs(n))}`;
const fmtPct = (n: number, dec = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(dec)}%`;

const COLORS = {
  index: "#6366f1", stock: "#8b5cf6", bonds: "#06b6d4",
  cash: "#10b981", crypto: "#f97316", amber: "#f59e0b",
  rose: "#f43f5e", emerald: "#10b981",
};

const NAV = [
  { id: "snapshot", icon: LayoutDashboard, label: "Home" },
  { id: "allocation", icon: PieChart, label: "Alloc" },
  { id: "performance", icon: TrendingUp, label: "Perf" },
  { id: "holdings", icon: Briefcase, label: "Holdings" },
  { id: "liabilities", icon: CreditCard, label: "Loans" },
  { id: "cpf", icon: Shield, label: "CPF" },
  { id: "history", icon: History, label: "History" },
  { id: "ai", icon: Sparkles, label: "AI" },
  { id: "research", icon: Search, label: "Research" },
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

const TTip = ({ active, payload, label }: { active?: boolean; payload?: {value:number;name:string;color:string}[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e2a] border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: ${fmt(p.value)}</p>)}
    </div>
  );
};

function SnapshotScreen({ data }: { data: PortfolioData }) {
  const last = data.snapshots[data.snapshots.length - 1];
  const prev = data.snapshots[data.snapshots.length - 2];
  const change = last && prev ? last.netWorth - prev.netWorth : 0;
  const changePct = prev?.netWorth ? (change / prev.netWorth) * 100 : 0;
  const chartData = data.snapshots.slice(-12).map(s => ({ date: s.date.replace(/^\d+-/, ""), value: s.netWorth }));

  return (
    <div className="space-y-4">
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/5 to-transparent pointer-events-none" />
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">Net Worth (excl. CPF)</p>
        <p className="text-4xl font-bold font-mono text-slate-100 mb-1">{fmtSGD(data.netWorthExclCpf)}</p>
        <div className="flex items-center gap-2">
          {change >= 0 ? <ArrowUpRight size={14} className="text-emerald-400" /> : <ArrowDownRight size={14} className="text-rose-400" />}
          <span className={`text-sm font-mono ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtSGD(change)} ({fmtPct(changePct)}) this month
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">Updated {data.lastUpdated}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Gross Assets" value={fmtSGD(data.grossAssets)} sub="before loans" />
        <MetricCard label="Loans" value={fmtSGD(data.totalLoans)} sub="outstanding" negative />
        <MetricCard label="incl. CPF OA" value={fmtSGD(data.netWorthInclOa)} positive />
        <MetricCard label="incl. Full CPF" value={fmtSGD(data.netWorthInclFullCpf)} positive />
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Net worth — last 12 months" />
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<TTip />} />
            <Area type="monotone" dataKey="value" name="Net Worth" stroke="#6366f1" fill="url(#g1)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <SectionHeader title="Portfolio split" />
        {[
          { label: "Equities", value: data.equitiesValue, color: COLORS.index },
          { label: "Cash", value: data.cashValue, color: COLORS.emerald },
          { label: "Bonds (SSBs)", value: data.bondsValue, color: COLORS.bonds },
          { label: "Crypto + Gold", value: data.cryptoGoldValue, color: COLORS.amber },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-sm text-slate-300 flex-1">{item.label}</span>
            <span className="text-sm font-mono text-slate-200">{fmtSGD(item.value)}</span>
            <span className="text-xs text-slate-500 w-10 text-right font-mono">{((item.value / data.grossAssets) * 100).toFixed(1)}%</span>
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
    index: (cat.indexFunds / base) * 100,
    stocks: (cat.individualStocks / base) * 100,
    bonds: (cat.bonds / base) * 100,
    crypto: (cat.cryptoGold / base) * 100,
  };
  const targets = { index: 78, stocks: 12, bonds: 5, crypto: 5 };
  const pieData = [
    { name: "Index", value: cat.indexFunds, color: COLORS.index },
    { name: "Stocks", value: cat.individualStocks, color: COLORS.stock },
    { name: "Bonds", value: cat.bonds, color: COLORS.bonds },
    { name: "Crypto+Gold", value: cat.cryptoGold, color: COLORS.amber },
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
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" labelLine={false} label={renderLabel}>
              {pieData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
            </Pie>
            <Tooltip formatter={(v) => fmtSGD(Number(v ?? 0))} contentStyle={{ background: "#1e1e2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }} />
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
          { label: "Index funds", actual: pcts.index, target: targets.index, color: COLORS.index },
          { label: "Individual stocks", actual: pcts.stocks, target: targets.stocks, color: COLORS.stock },
          { label: "Bonds (SSBs)", actual: pcts.bonds, target: targets.bonds, color: COLORS.bonds },
          { label: "Crypto + Gold", actual: pcts.crypto, target: targets.crypto, color: COLORS.amber },
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
        {Object.entries(data.platformBreakdown).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).map(([platform, value]) => (
          <div key={platform} className="flex items-center gap-3 mb-3">
            <span className="text-sm text-slate-300 w-20">{platform}</span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#6366f1]/70" style={{ width: `${(value / data.equitiesValue) * 100}%` }} />
            </div>
            <span className="text-sm font-mono text-slate-200 w-24 text-right">{fmtSGD(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceScreen({ data }: { data: PortfolioData }) {
  const chartData = data.snapshots.map(s => ({ date: s.date.slice(3), netWorth: s.netWorth }));
  const benchData = [
    { period: "Jun–Dec 23", portfolio: 24.1, vwra: 13.2, voo: 15.9, qqq: 33.1 },
    { period: "Full 2024", portfolio: 23.8, vwra: 21.7, voo: 25.0, qqq: 25.6 },
    { period: "Full 2025", portfolio: 18.6, vwra: 15.4, voo: 17.8, qqq: 20.8 },
    { period: "Jan–Jun 26", portfolio: 4.1, vwra: 4.0, voo: 9.1, qqq: 17.6 },
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
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 8 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis hide />
            <Tooltip content={<TTip />} />
            <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#6366f1" fill="url(#g2)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Returns vs benchmarks" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={benchData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="period" tick={{ fill: "#475569", fontSize: 8 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} contentStyle={{ background: "#1e1e2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "10px", color: "#475569" }} />
            <Bar dataKey="portfolio" name="Portfolio" fill="#6366f1" radius={[3,3,0,0]} />
            <Bar dataKey="vwra" name="VWRA" fill="#10b981" radius={[3,3,0,0]} />
            <Bar dataKey="voo" name="VOO" fill="#f59e0b" radius={[3,3,0,0]} />
            <Bar dataKey="qqq" name="QQQ" fill="#f43f5e" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HoldingsScreen({ data }: { data: PortfolioData }) {
  const [filter, setFilter] = useState<string>("all");
  const filters = ["all", "index", "stock", "gold", "crypto", "cash"];
  const catColor: Record<string,string> = { index: "#6366f1", stock: "#8b5cf6", gold: "#f59e0b", crypto: "#f97316", cash: "#10b981" };

  const sorted = [...data.positions]
    .filter(p => filter === "all" || p.category === filter)
    .sort((a, b) => b.valueSGD - a.valueSGD);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[10px] font-medium px-3 py-1.5 rounded-full flex-shrink-0 transition-all ${filter === f ? "bg-[#6366f1]/20 text-[#818cf8]" : "bg-white/5 text-slate-500"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {sorted.map((pos, i) => (
          <div key={i} className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: catColor[pos.category] || "#475569" }} />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{pos.ticker}</p>
                  <p className="text-xs text-slate-500">{pos.platform} · {pos.units} units</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-semibold text-slate-100">{fmtSGD(pos.valueSGD)}</p>
                <p className="text-xs text-slate-500">{pos.allocationPct.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#6366f1]/10 text-[#818cf8]">Family</span>
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
        <div className="mt-3 p-3 bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-xl flex gap-2">
          <Info size={14} className="text-[#818cf8] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#a5b4fc]">Weighted avg VWRA entry ~$183.17. Current ~$188. Up ~2.7% on this tranche.</p>
        </div>
      </div>
    </div>
  );
}

function CPFScreen({ data }: { data: PortfolioData }) {
  const cpf = data.cpf;
  const totalOa = cpf.oa + cpf.poemsBalance + cpf.ocbcCpfia;
  const frsGap = cpf.estimatedFrs3 - cpf.total;

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
          { label: "Est. FRS @ 3.0% growth", value: cpf.estimatedFrs3, color: "text-slate-300" },
          { label: "Est. FRS @ 3.5% growth", value: cpf.estimatedFrs35, color: "text-slate-300" },
          { label: "Current CPF total", value: cpf.total, color: "text-[#818cf8]" },
          { label: "Gap (@ 3.0%)", value: frsGap, color: "text-rose-400" },
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

function HistoryScreen({ data }: { data: PortfolioData }) {
  const chartData = data.snapshots.map(s => ({
    date: s.date.slice(3), equities: s.equities, bonds: s.bonds, cash: s.cash, crypto: s.crypto,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Full history — Jun 2023 to present" />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              {[["eq","#6366f1"],["bo","#06b6d4"],["ca","#10b981"],["cr","#f59e0b"]].map(([id,c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:7 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis hide />
            <Tooltip content={<TTip />} />
            <Area type="monotone" dataKey="equities" name="Equities" stroke="#6366f1" fill="url(#eq)" strokeWidth={1.5} dot={false} stackId="1" />
            <Area type="monotone" dataKey="bonds" name="Bonds" stroke="#06b6d4" fill="url(#bo)" strokeWidth={1.5} dot={false} stackId="1" />
            <Area type="monotone" dataKey="cash" name="Cash" stroke="#10b981" fill="url(#ca)" strokeWidth={1.5} dot={false} stackId="1" />
            <Area type="monotone" dataKey="crypto" name="Crypto+Gold" stroke="#f59e0b" fill="url(#cr)" strokeWidth={1.5} dot={false} stackId="1" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Monthly snapshots" />
        <div className="space-y-0 max-h-80 overflow-y-auto">
          {[...data.snapshots].reverse().map((s, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400 w-24">{s.date}</span>
              <span className="text-xs font-mono text-slate-200">{fmtSGD(s.netWorth)}</span>
              <span className={`text-xs font-mono ${s.totalPLPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtPct(s.totalPLPct)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIScreen({ data }: { data: PortfolioData }) {
  const [messages, setMessages] = useState<{role:string;content:string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{healthScore?:number;healthReason?:string;recommendations?:{action:string;detail:string;priority:string}[];risks?:string[];highlight?:string} | null>(null);
  const [aLoading, setALoading] = useState(false);

  const loadAnalysis = useCallback(async () => {
    setALoading(true);
    try {
      const res = await fetch(`/api/analyze?data=${encodeURIComponent(JSON.stringify(data))}`);
      const json = await res.json();
      if (json.ok) setAnalysis(json.analysis);
    } catch { /* ignore */ }
    setALoading(false);
  }, [data]);

  useEffect(() => { loadAnalysis(); }, [loadAnalysis]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, portfolioData: data, history: messages }),
      });
      const json = await res.json();
      if (json.ok) setMessages(p => [...p, { role: "assistant", content: json.reply }]);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const pColor = (p?: string) => p?.toLowerCase() === "high" ? "text-rose-400" : p?.toLowerCase() === "medium" ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="space-y-4">
      {aLoading ? (
        <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-8 flex flex-col items-center gap-2">
          <Sparkles size={20} className="text-[#6366f1] animate-pulse" />
          <p className="text-xs text-slate-500">Analysing your portfolio...</p>
        </div>
      ) : analysis && (
        <>
          <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/8 to-transparent pointer-events-none" />
            <div className="flex justify-between mb-2">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Portfolio health</p>
              <button onClick={loadAnalysis} className="text-slate-600 hover:text-slate-400 transition-colors"><RefreshCw size={13} /></button>
            </div>
            <div className="flex items-end gap-3 mb-2">
              <p className="text-5xl font-bold font-mono text-[#818cf8]">{analysis.healthScore}</p>
              <p className="text-slate-500 text-sm mb-2">/10</p>
            </div>
            <p className="text-sm text-slate-300">{analysis.healthReason}</p>
          </div>
          {analysis.recommendations && (
            <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
              <SectionHeader title="Top recommendations" />
              <div className="space-y-3">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-white/[0.03] rounded-xl">
                    <span className={`text-xs font-bold font-mono flex-shrink-0 mt-0.5 ${pColor(rec.priority)}`}>{String(i+1).padStart(2,"0")}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{rec.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{rec.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            {analysis.risks && (
              <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                <SectionHeader title="Key risks" />
                {analysis.risks.map((r, i) => (
                  <div key={i} className="flex gap-2 items-start mb-2">
                    <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400">{r}</p>
                  </div>
                ))}
              </div>
            )}
            {analysis.highlight && (
              <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4 flex gap-2">
                <Star size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300">{analysis.highlight}</p>
              </div>
            )}
          </div>
        </>
      )}

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Ask Folio AI" />
        <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
          {messages.length === 0 && (
            <div className="space-y-2">
              {["Should I deploy more cash now?","How is my XPEV thesis tracking?","What should I prioritise this month?"].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="w-full text-left text-xs text-slate-500 p-2.5 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] transition-all border border-white/5">
                  {q}
                </button>
              ))}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${msg.role === "user" ? "bg-[#6366f1]/20 text-[#c7d2fe] rounded-tr-sm" : "bg-white/[0.05] text-slate-300 rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" style={{ animationDelay:`${i*150}ms` }} />)}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && send()}
            placeholder="Ask about your portfolio..." className="flex-1 bg-[#1e1e2a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6366f1]/50 text-xs" />
          <button onClick={send} disabled={loading || !input.trim()}
            className="bg-[#6366f1]/20 hover:bg-[#6366f1]/30 text-[#818cf8] rounded-xl px-3 flex-shrink-0 transition-all disabled:opacity-40">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ResearchScreen() {
  const [ticker, setTicker] = useState("");
  const [result, setResult] = useState<{ticker?:string;data?:{profile?:{companyName?:string;sector?:string;mktCap?:number;price?:number};quote?:{changesPercentage?:number};ratios?:{peRatioTTM?:number;priceToSalesRatioTTM?:number};recentNews?:{title?:string;publishedDate?:string;url?:string}[]};analysis?:{verdict?:string;bullCase?:string[];bearCase?:string[];portfolioFit?:string}} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [watchlist, setWatchlist] = useState(["XPEV","NVDA","9880.HK","UBTI","TSLA"]);

  const search = async (t?: string) => {
    const q = (t || ticker).trim().toUpperCase();
    if (!q) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`/api/research?ticker=${q}`);
      const json = await res.json();
      if (json.ok) setResult(json);
      else setError("Could not find data for this ticker.");
    } catch { setError("Research failed. Check ticker and try again."); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} onKeyDown={e => e.key==="Enter" && search()}
          placeholder="Ticker (e.g. XPEV, NVDA, 9880.HK)"
          className="flex-1 bg-[#16161f] border border-white/[0.08] rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6366f1]/50 text-sm" />
        <button onClick={() => search()} disabled={loading || !ticker.trim()}
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl px-4 transition-all disabled:opacity-40">
          <Search size={16} />
        </button>
      </div>

      <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
        <SectionHeader title="Watchlist" />
        <div className="flex flex-wrap gap-2">
          {watchlist.map(t => (
            <button key={t} onClick={() => { setTicker(t); search(t); }}
              className="text-[10px] font-medium px-3 py-1.5 rounded-full bg-[#6366f1]/10 text-[#818cf8] hover:bg-[#6366f1]/20 transition-all">
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
          <Search size={20} className="text-[#6366f1] animate-pulse" />
          <p className="text-xs text-slate-500">Fetching data and running analysis...</p>
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
                <p className={`text-sm font-mono ${(result.data?.quote?.changesPercentage || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtPct(result.data?.quote?.changesPercentage || 0)}</p>
              </div>
            </div>
            <div className="flex gap-4 mt-3">
              <div><p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Mkt Cap</p><p className="text-xs font-mono text-slate-300">${((result.data?.profile?.mktCap||0)/1e9).toFixed(1)}B</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">P/E TTM</p><p className="text-xs font-mono text-slate-300">{result.data?.ratios?.peRatioTTM?.toFixed(1)||"N/A"}x</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">P/S TTM</p><p className="text-xs font-mono text-slate-300">{result.data?.ratios?.priceToSalesRatioTTM?.toFixed(1)||"N/A"}x</p></div>
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
                  {(result.analysis.bullCase||[]).map((p,i) => <div key={i} className="flex gap-1.5 mb-1.5"><span className="text-emerald-400 text-xs">+</span><p className="text-xs text-slate-400">{p}</p></div>)}
                </div>
                <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                  <SectionHeader title="Bear case" />
                  {(result.analysis.bearCase||[]).map((p,i) => <div key={i} className="flex gap-1.5 mb-1.5"><span className="text-rose-400 text-xs">−</span><p className="text-xs text-slate-400">{p}</p></div>)}
                </div>
              </div>
              <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
                <SectionHeader title="Portfolio fit" />
                <p className="text-xs text-slate-300">{result.analysis.portfolioFit}</p>
              </div>
            </>
          )}
          {(result.data?.recentNews?.length||0) > 0 && (
            <div className="bg-[#16161f] border border-white/[0.06] rounded-2xl p-4">
              <SectionHeader title="Recent news" />
              <div className="space-y-2">
                {(result.data?.recentNews||[]).slice(0,3).map((n,i) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                    className="block p-3 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] transition-all">
                    <p className="text-xs text-slate-300 line-clamp-2">{n.title}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{n.publishedDate?.slice(0,10)}</p>
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

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);

  const attempt = async () => {
    const res = await fetch("/api/auth", {
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
          <div className="w-16 h-16 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-[#818cf8]">F</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Folio</h1>
          <p className="text-sm text-slate-500 mt-1">Personal Portfolio Analyzer</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <input type={show ? "text" : "password"} value={pwd}
              onChange={e => { setPwd(e.target.value); setError(false); }}
              onKeyDown={e => e.key === "Enter" && attempt()}
              placeholder="Enter password"
              className={`w-full bg-[#16161f] border rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none pr-12 text-sm ${error ? "border-rose-500/50" : "border-white/[0.08] focus:border-[#6366f1]/50"}`}
              autoFocus />
            <button onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400 text-center">Incorrect password</p>}
          <button onClick={attempt}
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium rounded-xl px-6 py-3 transition-all flex items-center justify-center gap-2 text-sm">
            <Lock size={16} /> Unlock Folio
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FolioApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [screen, setScreen] = useState("snapshot");
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/portfolio");
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
      <header className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.04] sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-xl z-10" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Folio</p>
          <h1 className="text-lg font-semibold text-slate-100">{activeNav?.label}</h1>
        </div>
        <button onClick={() => fetchPortfolio(true)} disabled={refreshing}
          className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-slate-400 hover:bg-white/[0.1] transition-all disabled:opacity-40">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading your portfolio...</p>
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
            {screen === "snapshot" && <SnapshotScreen data={portfolio} />}
            {screen === "allocation" && <AllocationScreen data={portfolio} />}
            {screen === "performance" && <PerformanceScreen data={portfolio} />}
            {screen === "holdings" && <HoldingsScreen data={portfolio} />}
            {screen === "liabilities" && <LiabilitiesScreen data={portfolio} />}
            {screen === "cpf" && <CPFScreen data={portfolio} />}
            {screen === "history" && <HistoryScreen data={portfolio} />}
            {screen === "ai" && <AIScreen data={portfolio} />}
            {screen === "research" && <ResearchScreen />}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.04] px-2 py-1 z-10" style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex justify-around">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setScreen(id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-all duration-150 ${screen === id ? "text-[#818cf8]" : "text-slate-600 hover:text-slate-400"}`}>
              <Icon size={18} strokeWidth={screen === id ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
