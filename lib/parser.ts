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

export interface BondPosition {
  name: string;
  issueCode: string;
  amount: number;
  maturity: string;
  yieldPct: number;
}

export interface BankAccount {
  name: string;
  balance: number;
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

export interface Cashflow {
  dateMs:    number;  // ms since epoch — used for period filtering
  dateStr:   string;  // original "DD-Mon-YYYY" as in the sheet
  amountSGD: number;  // positive = deposit into portfolio; negative = withdrawal (flipped from XIRR convention)
  platform:  string;
}

export interface InvestmentMetrics {
  totalReturn: number;      // "Total P/L%" from Equities sheet — return on cost basis, inception to date
  annualisedReturn: number; // "Avg Annualised P/L%" — XIRR accounting for deposit timing
  inceptionDate: string;    // date of first transaction e.g. "10-Mar-2022"
  inceptionMonth: string;   // "YYYY-MM" form of inceptionDate for price lookups
  currentBalance: number;   // total current market value of all investments
  costBasis: number;        // total cost basis (Breakeven Balance)
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
  bondPositions: BondPosition[];
  bankAccounts: BankAccount[];

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

  cashflows: Cashflow[];
  investmentMetrics: InvestmentMetrics;
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
  // Snapshot rows only have data from col F onwards (col A is empty), so we
  // cannot skip on !row[0] — only skip rows where both A and F are empty.
  const snapshots: NetWorthSnapshot[] = [];
  let inSnapshots = false;
  for (const row of nw) {
    if (!inSnapshots && !row[0] && !row[5]) continue;
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

  // Cash sheet: row[1] = account names, row[2] = "Current Balance" + values
  const bankAccounts: BankAccount[] = [];
  const cashHeaders = cashSheet[1] || [];
  const cashBalances = cashSheet[2] || [];
  for (let i = 1; i < cashHeaders.length; i++) {
    const name = cashHeaders[i]?.trim();
    if (!name || name === "Total") continue;
    const balance = parseSGD(cashBalances[i]);
    if (balance > 0) bankAccounts.push({ name, balance });
  }

  // Investment metrics from Equities sheet summary (col 11 = label, col 12 = value)
  // The sheet pre-computes XIRR ("Avg Annualised P/L%") and total return ("Total P/L%")
  // using actual transaction cashflow timing — far more accurate than snapshot-derived returns.
  const equitiesSheet = sheets["Equities"] || [];
  let investTotalReturn = 0, investAnnualisedReturn = 0;
  let investCurrentBalance = 0, investCostBasis = 0;
  let investInceptionDate = "";
  const MO_MAP: Record<string, string> = {
    Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
    Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
  };
  for (const row of equitiesSheet) {
    // First transaction row: S/N is a positive integer, col 1 is a date string
    if (!investInceptionDate) {
      const sn = parseInt(row[0]);
      if (!isNaN(sn) && sn === 1 && row[1]?.match(/^\d{2}-[A-Za-z]{3}-\d{4}$/)) {
        investInceptionDate = row[1].trim();
      }
    }
    const label = row[11]?.trim();
    if (label === "Total Current Balance")   investCurrentBalance    = parseSGD(row[12]);
    if (label === "Total Breakeven Balance")  investCostBasis         = parseSGD(row[12]);
    if (label === "Total P/L%")              investTotalReturn       = parsePct(row[12]);
    if (label === "Avg Annualised P/L%")     investAnnualisedReturn  = parsePct(row[12]);
  }
  // Convert inception date "10-Mar-2022" → "2022-03"
  const inceptionParts = investInceptionDate.split("-");
  const investInceptionMonth = inceptionParts.length === 3
    ? `${inceptionParts[2]}-${MO_MAP[inceptionParts[1]] ?? "01"}`
    : "";

  // Parse per-platform cashflows for Modified Dietz / TWR computation.
  // Columns 18-25 hold date/amount pairs for IBKR, moomoo, Tiger, Webull.
  // Header row (col 18 = "IBKR Dates") marks where cashflow data begins.
  // Sheet sign: negative = deposit (XIRR convention) → flip to positive = money into portfolio.
  const CF_PLATFORMS = ["IBKR", "moomoo", "Tiger", "Webull"];
  const parseCFDate = (s: string): number | null => {
    if (!s?.trim()) return null;
    const parts = s.trim().split("-");
    if (parts.length !== 3) return null;
    const mo = MO_MAP[parts[1]];
    if (!mo) return null;
    return new Date(parseInt(parts[2]), parseInt(mo) - 1, parseInt(parts[0])).getTime();
  };
  const cashflows: Cashflow[] = [];
  let cfHeaderFound = false;
  for (const row of equitiesSheet) {
    if (row[18] === "IBKR Dates") { cfHeaderFound = true; continue; }
    if (!cfHeaderFound) continue;
    for (let p = 0; p < 4; p++) {
      const dateStr = row[18 + p * 2]?.trim();
      const amtStr  = row[19 + p * 2]?.trim();
      if (!dateStr || !amtStr) continue;
      const dateMs = parseCFDate(dateStr);
      if (dateMs === null) continue;
      const sheetAmt = parseFloat(amtStr.replace(/[,$\s]/g, "")) || 0;
      if (sheetAmt === 0) continue;
      cashflows.push({ dateMs, dateStr, amountSGD: -sheetAmt, platform: CF_PLATFORMS[p] });
    }
  }

  // Bond positions from Bonds sheet
  // Row 0 = headers; subsequent rows = individual SSBs until sub-total rows
  const bondsSheet = sheets["Bonds"] || [];
  const bondPositions: BondPosition[] = [];
  for (const row of bondsSheet) {
    if (!row[0] || row[0] === "Securities Name") continue;
    if (!row[1] || !row[5]) continue;
    const amount = parseSGD(row[5]);
    if (amount <= 0) continue;
    bondPositions.push({
      name: row[0].trim(),
      issueCode: row[1].trim(),
      amount,
      maturity: row[6]?.trim() || "",
      yieldPct: parsePct(row[7]),
    });
  }

  // --- Loans ---
  const loans: Loan[] = [];
  let totalLoanAmount = 0;
  for (const row of liabSheet) {
    if (!row[1] || row[1] === "Loan Name" || row[1].trim().toUpperCase() === "TOTAL") continue;
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
    cashValue,          // from Net Worth summary — authoritative (bank + platform)
    equitiesValue,
    bondsValue,
    cryptoGoldValue,
    targetEquities,
    targetBonds,
    targetCrypto,
    positions,
    bondPositions,
    bankAccounts,
    snapshots,
    loans,
    totalLoanAmount,
    cpf: { oa, sa, ma, total, poemsBalance, ocbcCpfia, combinedOaSa, estimatedFrs3, estimatedFrs35 },
    platformBreakdown,
    categoryBreakdown: {
      indexFunds,
      individualStocks,
      bonds: bondsValue,
      cash: cashValue,  // from Net Worth summary
      cryptoGold,
    },
    cashflows,
    investmentMetrics: {
      totalReturn:       investTotalReturn,
      annualisedReturn:  investAnnualisedReturn,
      inceptionDate:     investInceptionDate,
      inceptionMonth:    investInceptionMonth,
      currentBalance:    investCurrentBalance,
      costBasis:         investCostBasis,
    },
    lastUpdated,
  };
}
