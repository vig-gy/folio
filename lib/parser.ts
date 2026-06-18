// Parses raw Google Sheets data into structured portfolio objects

export interface NetWorthSnapshot {
  date: string;
  equities: number;
  equitiesPL: number;
  bonds: number;
  bondsPL: number;
  cash: number;
  cashPL: number;
  crypto: number;
  cryptoPL: number;
  loans: number;
  netWorth: number;
  totalPL: number;
  totalPLPct: number;
}

export interface Position {
  sn: number;
  ticker: string;
  platform: string;
  currency: string;
  units: number;
  currentPrice: number;
  valueLocal: number;
  fxRate: number;
  valueSGD: number;
  allocationPct: number;
  category: "index" | "stock" | "gold" | "crypto" | "cash";
}

export interface Loan {
  name: string;
  issuer: string;
  amount: number;
  eir?: string;
  date?: string;
  refPrice?: number;
  fxRate?: number;
}

export interface CPFData {
  oa: number;
  sa: number;
  ma: number;
  total: number;
  poemsBalance: number;
  ocbcCpfia: number;
  combinedOaSa: number;
  estimatedFrs3: number;
  estimatedFrs35: number;
}

export interface PortfolioData {
  // Net Worth
  netWorthExclCpf: number;
  netWorthInclOa: number;
  netWorthInclFullCpf: number;
  grossAssets: number;
  totalLoans: number;

  // Asset Values
  cashValue: number;
  equitiesValue: number;
  bondsValue: number;
  cryptoGoldValue: number;

  // Allocation targets
  targetEquities: number;
  targetBonds: number;
  targetCrypto: number;

  // Positions
  positions: Position[];

  // Snapshots for charts
  snapshots: NetWorthSnapshot[];

  // Loans
  loans: Loan[];
  totalLoanAmount: number;

  // CPF
  cpf: CPFData;

  // Platform breakdown
  platformBreakdown: Record<string, number>;

  // Category breakdown
  categoryBreakdown: {
    indexFunds: number;
    individualStocks: number;
    bonds: number;
    cash: number;
    cryptoGold: number;
  };

  lastUpdated: string;
}

function parseSGD(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[$,\s]/g, "").replace(/[()]/g, "")) || 0;
}

function parsePct(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/%/g, "")) || 0;
}

function parseDate(val: string | undefined): string {
  if (!val) return "";
  return val.trim();
}

const INDEX_TICKERS = ["VWRA", "VOO", "VTI", "SPY", "QQQ"];
const GOLD_TICKERS = ["IAU", "GLD"];
const CRYPTO_TICKERS = ["IBIT", "ETHA", "BTC", "ETH"];
const CASH_KEYWORDS = ["Cash", "cash", "MMF"];

function categorize(ticker: string): Position["category"] {
  if (INDEX_TICKERS.some((t) => ticker.includes(t))) return "index";
  if (GOLD_TICKERS.some((t) => ticker.includes(t))) return "gold";
  if (CRYPTO_TICKERS.some((t) => ticker.includes(t))) return "crypto";
  if (CASH_KEYWORDS.some((t) => ticker.includes(t))) return "cash";
  return "stock";
}

export function parsePortfolioData(
  sheets: Record<string, string[][]>
): PortfolioData {
  const nw = sheets["Net Worth"] || [];
  const alloc = sheets["Portfolio Allocation"] || [];
  const dashboard = sheets["Dashboard"] || [];
  const cpfSheet = sheets["CPF"] || [];
  const liabSheet = sheets["Liabilities"] || [];
  const cashSheet = sheets["Cash"] || [];

  // --- Net Worth Summary ---
  let netWorthExclCpf = 0;
  let netWorthInclOa = 0;
  let netWorthInclFullCpf = 0;
  let cashValue = 0;
  let equitiesValue = 0;
  let bondsValue = 0;
  let cryptoGoldValue = 0;
  let totalLoans = 0;
  let targetEquities = 0.9;
  let targetBonds = 0.05;
  let targetCrypto = 0.05;

  for (const row of nw) {
    if (!row[0]) continue;
    const label = row[0].trim();
    if (label.includes("Net Value of Cash")) cashValue = parseSGD(row[1]);
    if (label.includes("Net Value of Equities")) equitiesValue = parseSGD(row[1]);
    if (label.includes("Net Value of Bonds")) bondsValue = parseSGD(row[1]);
    if (label.includes("Net Value of Crypto")) cryptoGoldValue = parseSGD(row[1]);
    if (label.includes("NET WORTH (excl. CPF)")) netWorthExclCpf = parseSGD(row[1]);
    if (label.includes("NET WORTH (incl. CPF OA)")) netWorthInclOa = parseSGD(row[1]);
    if (label.includes("NET WORTH (incl. full CPF)")) netWorthInclFullCpf = parseSGD(row[1]);
    if (label.includes("Net Value of Loans")) totalLoans = parseSGD(row[1]);
    if (label.includes("NET ASSETS")) {
      // gross assets
    }
    // Target allocation
    if (label.includes("Net Value of Equities") && row[3]) {
      targetEquities = parsePct(row[3]) / 100 || 0.9;
    }
    if (label.includes("Net Value of Bonds") && row[3]) {
      targetBonds = parsePct(row[3]) / 100 || 0.05;
    }
    if (label.includes("Net Value of Crypto") && row[3]) {
      targetCrypto = parsePct(row[3]) / 100 || 0.05;
    }
  }

  const grossAssets = cashValue + equitiesValue + bondsValue + cryptoGoldValue;

  // --- Net Worth Snapshots ---
  const snapshots: NetWorthSnapshot[] = [];
  let inSnapshots = false;
  for (const row of nw) {
    if (!row[0]) continue;
    if (row[5] === "Date") { inSnapshots = true; continue; }
    if (!inSnapshots) continue;
    const dateVal = row[5];
    if (!dateVal || dateVal === "Date") continue;
    const snap: NetWorthSnapshot = {
      date: parseDate(dateVal),
      equities: parseSGD(row[6]),
      equitiesPL: parsePct(row[7]),
      bonds: parseSGD(row[8]),
      bondsPL: parsePct(row[9]),
      cash: parseSGD(row[10]),
      cashPL: parsePct(row[11]),
      crypto: parseSGD(row[12]),
      cryptoPL: parsePct(row[13]),
      loans: parseSGD(row[14]),
      netWorth: parseSGD(row[15]),
      totalPL: parseSGD(row[16]),
      totalPLPct: parsePct(row[17]),
    };
    if (snap.date && snap.netWorth > 0) snapshots.push(snap);
  }

  // --- Positions from Portfolio Allocation ---
  const positions: Position[] = [];
  let platformBreakdown: Record<string, number> = {
    IBKR: 0, moomoo: 0, Tiger: 0, Webull: 0,
  };

  let inPositions = false;
  for (const row of alloc) {
    if (!row[1]) continue;
    if (row[1] === "S/N") { inPositions = true; continue; }
    if (!inPositions) continue;
    const sn = parseInt(row[1]);
    if (isNaN(sn)) continue;

    const ticker = row[2]?.trim() || "";
    const platform = row[3]?.trim() || "";
    const currency = row[5]?.trim() || "SGD";
    const units = parseFloat(row[6]) || 0;
    const currentPrice = parseFloat(row[7]?.replace(/,/g, "")) || 0;
    const valueLocal = parseFloat(row[8]?.replace(/,/g, "")) || 0;
    const fxRate = parseFloat(row[9]) || 1;
    const valueSGD = parseSGD(row[10]);
    const allocationPct = parsePct(row[11]);

    if (!ticker || valueSGD === 0) continue;

    const category = categorize(ticker);
    positions.push({
      sn, ticker, platform, currency, units,
      currentPrice, valueLocal, fxRate, valueSGD,
      allocationPct, category,
    });

    if (platform in platformBreakdown) {
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + valueSGD;
    }
  }

  // --- Category Breakdown ---
  let indexFunds = 0, individualStocks = 0, cryptoGold = 0;
  for (const pos of positions) {
    if (pos.category === "index") indexFunds += pos.valueSGD;
    else if (pos.category === "stock") individualStocks += pos.valueSGD;
    else if (pos.category === "gold" || pos.category === "crypto") cryptoGold += pos.valueSGD;
  }

  // Cash from Cash sheet
  let totalBankCash = 0;
  if (cashSheet[1]) {
    for (let i = 1; i < cashSheet[1].length - 1; i++) {
      totalBankCash += parseSGD(cashSheet[1][i]);
    }
  }

  // Brokerage cash from positions
  const brokerageCash = positions
    .filter((p) => p.category === "cash")
    .reduce((sum, p) => sum + p.valueSGD, 0);

  const totalCash = totalBankCash + brokerageCash;

  // --- Loans ---
  const loans: Loan[] = [];
  let totalLoanAmount = 0;
  for (const row of liabSheet) {
    if (!row[1] || row[1] === "Loan Name") continue;
    const amount = parseSGD(row[8]);
    if (amount > 0) {
      loans.push({
        name: row[1].trim(),
        issuer: row[2]?.trim() || "",
        amount,
        eir: row[5]?.trim(),
        date: row[2]?.trim(),
        refPrice: parseFloat(row[6]) || undefined,
        fxRate: parseFloat(row[7]) || undefined,
      });
      totalLoanAmount += amount;
    }
  }

  // --- CPF ---
  let oa = 0, sa = 0, ma = 0, total = 0;
  let poemsBalance = 0, ocbcCpfia = 0;
  let combinedOaSa = 0, estimatedFrs3 = 0, estimatedFrs35 = 0;

  for (const row of cpfSheet) {
    if (!row[0]) continue;
    const label = row[0].trim();
    if (label.includes("OA Current Balance")) oa = parseSGD(row[1]);
    if (label.includes("Poems Current Balance")) poemsBalance = parseSGD(row[1]);
    if (label.includes("OCBC CPFIA")) ocbcCpfia = parseSGD(row[1]);
    if (label.includes("Subtotal")) {
      oa = parseSGD(row[1]) || oa;
      sa = parseSGD(row[2]);
      ma = parseSGD(row[3]);
      total = parseSGD(row[4]);
    }
    if (label.includes("Combined OA + SA")) combinedOaSa = parseSGD(row[1]);
    if (label.includes("Estimated FRS") && label.includes("3.0%")) estimatedFrs3 = parseSGD(row[1]);
    if (label.includes("Estimated FRS") && label.includes("3.5%")) estimatedFrs35 = parseSGD(row[1]);
  }

  const lastUpdated = snapshots.length > 0
    ? snapshots[snapshots.length - 1].date
    : new Date().toLocaleDateString("en-SG");

  return {
    netWorthExclCpf,
    netWorthInclOa,
    netWorthInclFullCpf,
    grossAssets,
    totalLoans: totalLoanAmount || totalLoans,
    cashValue: totalCash || cashValue,
    equitiesValue,
    bondsValue,
    cryptoGoldValue,
    targetEquities,
    targetBonds,
    targetCrypto,
    positions,
    snapshots,
    loans,
    totalLoanAmount,
    cpf: { oa, sa, ma, total, poemsBalance, ocbcCpfia, combinedOaSa, estimatedFrs3, estimatedFrs35 },
    platformBreakdown,
    categoryBreakdown: {
      indexFunds,
      individualStocks,
      bonds: bondsValue,
      cash: totalCash || cashValue,
      cryptoGold,
    },
    lastUpdated,
  };
}
