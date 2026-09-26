import { mkdirSync, writeFileSync } from "node:fs";

const auth = process.env.DATAFORSEO_BASIC_AUTH?.trim();
if (!auth) throw new Error("DATAFORSEO_BASIC_AUTH is not configured");

const BASE = "https://api.dataforseo.com/v3";
const headers = { Authorization: `Basic ${auth}`, "Content-Type": "application/json" };
const MARKET = { location_code: 2840, language_code: "en" };
let totalCostUsd = 0;
const costLog = [];

async function post(path, task, label) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify([task]) });
  const json = await res.json();
  if (!res.ok || json.status_code !== 20000) throw new Error(`${label}: HTTP ${res.status}; ${json.status_code ?? "?"} ${json.status_message ?? ""}`);
  const taskError = (json.tasks ?? []).find((t) => t.status_code !== 20000);
  if (taskError) throw new Error(`${label}: task ${taskError.status_code} ${taskError.status_message}`);
  const cost = Number(json.cost ?? 0);
  totalCostUsd += cost;
  costLog.push({ label, path, cost, runningTotalUsd: Number(totalCostUsd.toFixed(6)) });
  return json;
}

const uniq = (items) => [...new Set(items.map((x) => x.trim()).filter(Boolean))];
const extract = (data) => {
  const info = data.keyword_info ?? {};
  const props = data.keyword_properties ?? {};
  return {
    keyword: data.keyword,
    searchVolume: info.search_volume ?? null,
    cpcUsd: info.cpc ?? null,
    competition: info.competition ?? null,
    competitionLevel: info.competition_level ?? null,
    competitionIndex: info.competition_index ?? null,
    keywordDifficulty: props.keyword_difficulty ?? null,
    intent: data.search_intent_info?.main_intent ?? null,
    monthlySearches: info.monthly_searches ?? [],
    lastUpdated: info.last_updated_time ?? null,
    serpInfo: data.serp_info ? {
      itemTypes: data.serp_info.serp_item_types ?? [],
      resultsCount: data.serp_info.se_results_count ?? null,
      lastUpdated: data.serp_info.last_updated_time ?? null,
    } : null,
    avgBacklinks: data.avg_backlinks_info ? {
      backlinks: data.avg_backlinks_info.backlinks ?? null,
      referringDomains: data.avg_backlinks_info.referring_domains ?? null,
      rank: data.avg_backlinks_info.rank ?? null,
      mainDomainRank: data.avg_backlinks_info.main_domain_rank ?? null,
    } : null,
  };
};

const platforms = [
  "Aimex", "Avavalite", "Botronix", "Cashpayu", "Mitrola", "SwapSol", "SwapLite", "Meses",
  "Voryqa", "Zentex", "Rosenberg Systems", "Procash", "BitoMax", "PairBots", "Aevos", "Road Rise",
  "Zuidos", "WantonsGroup", "Elementex", "Elementex Pro", "Marsses", "Winvest", "Mooner", "Stable Grow",
  "Bityx", "HashRanchoGPU", "Hedger", "DogeJam", "Apex Capital Rewards", "Atlas System", "InvestAIPays",
  "Polygate", "Rnavest", "T Hawkeye", "NOKYC", "StakerX", "Universe Pro", "Oxustech", "Saluno",
  "Crypto Flex Limited", "TAG Markets", "CopyX"
];

const platformModifiers = [
  "review", "legit", "scam", "withdrawal", "withdrawal proof", "withdrawal time", "payout",
  "payment proof", "minimum deposit", "returns", "problems", "complaints", "alternatives", "login"
];

const broadSeeds = [
  "high yield investment platforms", "high yield investment sites", "high yield crypto platforms",
  "best high yield investment platforms", "best high yield crypto platforms", "online investment platforms high returns",
  "daily return investment sites", "daily return investment platforms", "daily paying investment sites",
  "investment platforms that pay daily", "crypto platforms that pay daily", "daily passive income crypto",
  "passive income crypto platforms", "best crypto passive income platforms", "crypto income platforms",
  "crypto yield platforms", "best crypto yield platforms", "highest crypto yield platforms",
  "crypto staking platforms", "best crypto staking platforms", "highest yield staking platforms",
  "crypto lending platforms", "best crypto lending platforms", "crypto interest platforms",
  "copy trading platforms", "best copy trading platforms", "gold copy trading platform", "forex copy trading platform",
  "AI trading platforms", "AI crypto trading platforms", "automated crypto trading platforms",
  "investment withdrawal proof", "crypto withdrawal proof", "payout proof", "payment proof investment site",
  "does investment platform pay", "fast withdrawal investment platform", "fastest withdrawal crypto platform",
  "investment platform withdrawal time", "crypto platform withdrawal time", "withdrawal pending investment platform",
  "investment platform scam", "crypto investment scam", "is crypto investment platform legit",
  "high yield investment scam", "daily return investment scam", "crypto passive income scam",
  "investment recovery calculator", "principal recovery calculator", "capital recovery calculator",
  "how long to recover investment", "ROI recovery calculator", "investment payback period calculator",
  "daily ROI calculator", "daily return calculator", "crypto yield calculator", "compound daily interest calculator",
  "daily compound interest calculator", "APY calculator crypto", "APR to daily rate calculator",
  "best passive income investments", "best passive income crypto", "best daily income investments",
  "best online investment platforms", "best crypto earning platforms", "best crypto income sites",
  "high yield investment review", "high yield platform reviews", "crypto platform reviews",
  "investment site reviews", "investment payout monitor", "HYIP monitor", "HYIP reviews", "HYIP paying sites",
  "best HYIP sites", "HYIP investment", "HYIP withdrawal proof", "HYIP payment proof",
  "crypto arbitrage platforms", "AI crypto arbitrage platform", "crypto mining investment platforms",
  "cloud mining platforms", "best cloud mining platforms", "crypto mining passive income",
  "DeFi yield platforms", "best DeFi yield platforms", "DeFi passive income", "DeFi vaults",
  "real world asset yield crypto", "RWA yield platforms", "stablecoin yield platforms", "best stablecoin yield",
  "USDT earning platforms", "USDT daily income", "USDT passive income platforms",
  "TRX earning platforms", "Litecoin investment platform", "Dogecoin earning platform",
  "platform payout history", "platform score history", "investment platform reliability score",
  "crypto platform reliability", "investment platform risk score", "crypto yield risk score"
];

const platformSeeds = platforms.flatMap((name) => [name, ...platformModifiers.map((m) => `${name} ${m}`)]);
const seeds = uniq([...broadSeeds, ...platformSeeds]);
const rows = [];

for (let i = 0; i < seeds.length; i += 200) {
  const keywords = seeds.slice(i, i + 200);
  const json = await post(
    "/dataforseo_labs/google/keyword_overview/live",
    { ...MARKET, include_serp_info: true, keywords },
    `keyword overview ${i + 1}-${i + keywords.length}`,
  );
  for (const task of json.tasks ?? []) {
    for (const result of task.result ?? []) {
      for (const item of result.items ?? []) {
        if (item?.keyword) rows.push(extract(item));
      }
    }
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  market: "United States",
  language: "English",
  seedCount: seeds.length,
  returnedCount: rows.length,
  rows,
  totalCostUsd: Number(totalCostUsd.toFixed(6)),
  costLog,
};
mkdirSync("research-output", { recursive: true });
writeFileSync("research-output/yieldproof-seo-overview.json", JSON.stringify(output, null, 2));
writeFileSync("research-output/yieldproof-seo-overview-cost.json", JSON.stringify({ generatedAt: output.generatedAt, totalCostUsd: output.totalCostUsd, costLog }, null, 2));
console.log(`YieldProof keyword-overview repair complete. Seeds=${seeds.length}; returned=${rows.length}; cost=$${output.totalCostUsd.toFixed(4)}`);
