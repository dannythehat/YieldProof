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
  if (!res.ok || json.status_code !== 20000) {
    throw new Error(`${label}: HTTP ${res.status}; ${json.status_code ?? "?"} ${json.status_message ?? ""}`);
  }
  const taskError = (json.tasks ?? []).find((t) => t.status_code !== 20000);
  if (taskError) throw new Error(`${label}: task ${taskError.status_code} ${taskError.status_message}`);
  const cost = Number(json.cost ?? 0);
  totalCostUsd += cost;
  costLog.push({ label, path, cost, runningTotalUsd: Number(totalCostUsd.toFixed(6)) });
  return json;
}

function uniq(items) {
  return [...new Set(items.map((x) => x.trim()).filter(Boolean))];
}

function extractKeywordItem(data, source, seed = null) {
  const info = data.keyword_info ?? {};
  const props = data.keyword_properties ?? {};
  return {
    keyword: data.keyword,
    source,
    seed,
    searchVolume: info.search_volume ?? null,
    cpcUsd: info.cpc ?? null,
    competition: info.competition ?? null,
    competitionLevel: info.competition_level ?? null,
    competitionIndex: info.competition_index ?? null,
    keywordDifficulty: props.keyword_difficulty ?? null,
    intent: data.search_intent_info?.main_intent ?? null,
    monthlySearches: info.monthly_searches ?? [],
    lastUpdated: info.last_updated_time ?? null,
  };
}

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
const overviewSeeds = uniq([...broadSeeds, ...platformSeeds]);

const output = {
  generatedAt: new Date().toISOString(),
  market: "United States",
  language: "English",
  purpose: "YieldProof SEO master research and page-builder intelligence",
  platforms,
  seedCount: overviewSeeds.length,
  overview: [],
  expansions: [],
  serps: [],
  costLog: [],
  totalCostUsd: 0,
};

// Keyword Overview supports bulk keyword input. Chunk conservatively for resilient runs.
for (let i = 0; i < overviewSeeds.length; i += 200) {
  const keywords = overviewSeeds.slice(i, i + 200);
  const json = await post(
    "/dataforseo_labs/google/keyword_overview/live",
    { ...MARKET, include_serp_info: true, keywords },
    `keyword overview ${i + 1}-${i + keywords.length}`,
  );
  for (const task of json.tasks ?? []) {
    for (const row of task.result ?? []) {
      if (row?.keyword) output.overview.push(extractKeywordItem(row, "overview"));
    }
  }
}

// Expand the key market concepts using two complementary DataForSEO datasets.
const expansionRoots = [
  "high yield investment platforms", "daily return investment sites", "passive income crypto",
  "crypto yield platforms", "crypto staking platforms", "crypto lending platforms",
  "copy trading platforms", "AI trading platforms", "investment withdrawal proof", "payout proof",
  "investment recovery calculator", "crypto yield calculator", "HYIP monitor", "HYIP reviews",
  "stablecoin yield platforms", "DeFi yield platforms"
];

for (const root of expansionRoots) {
  const related = await post(
    "/dataforseo_labs/google/related_keywords/live",
    { ...MARKET, keyword: root, depth: 3, limit: 500, include_seed_keyword: true },
    `related keywords: ${root}`,
  );
  for (const task of related.tasks ?? []) {
    for (const result of task.result ?? []) {
      for (const item of result.items ?? []) {
        const data = item.keyword_data;
        if (data?.keyword) output.expansions.push(extractKeywordItem(data, "related", root));
      }
    }
  }

  const suggestions = await post(
    "/dataforseo_labs/google/keyword_suggestions/live",
    { ...MARKET, keyword: root, limit: 500, include_seed_keyword: true, include_serp_info: true },
    `keyword suggestions: ${root}`,
  );
  for (const task of suggestions.tasks ?? []) {
    for (const result of task.result ?? []) {
      for (const item of result.items ?? []) {
        const data = item.keyword_data ?? item;
        if (data?.keyword) output.expansions.push(extractKeywordItem(data, "suggestion", root));
      }
    }
  }
}

// Merge and rank the keyword universe before spending on live SERPs.
const merged = new Map();
for (const row of [...output.overview, ...output.expansions]) {
  const key = row.keyword?.toLowerCase();
  if (!key) continue;
  const current = merged.get(key);
  if (!current) merged.set(key, row);
  else {
    merged.set(key, {
      ...current,
      searchVolume: current.searchVolume ?? row.searchVolume,
      cpcUsd: current.cpcUsd ?? row.cpcUsd,
      competition: current.competition ?? row.competition,
      competitionLevel: current.competitionLevel ?? row.competitionLevel,
      competitionIndex: current.competitionIndex ?? row.competitionIndex,
      keywordDifficulty: current.keywordDifficulty ?? row.keywordDifficulty,
      intent: current.intent ?? row.intent,
      sources: uniq([...(current.sources ?? [current.source]), row.source]),
    });
  }
}
output.mergedKeywords = [...merged.values()].sort((a, b) => (b.searchVolume ?? -1) - (a.searchVolume ?? -1));

const strategicSerps = [
  "high yield investment platforms", "daily return investment sites", "passive income crypto platforms",
  "crypto yield platforms", "crypto staking platforms", "crypto lending platforms", "copy trading platforms",
  "AI trading platforms", "investment withdrawal proof", "payout proof", "investment recovery calculator",
  "crypto yield calculator", "HYIP monitor", "HYIP reviews", "Winvest review", "Winvest withdrawal",
  "TAG Markets review", "CopyX review"
];
const highVolume = output.mergedKeywords.filter((x) => (x.searchVolume ?? 0) > 0).slice(0, 25).map((x) => x.keyword);
const serpQueries = uniq([...strategicSerps, ...highVolume]).slice(0, 40);

for (const keyword of serpQueries) {
  const json = await post(
    "/serp/google/organic/live/advanced",
    { ...MARKET, keyword, device: "desktop", depth: 20 },
    `live SERP: ${keyword}`,
  );
  const task = json.tasks?.[0];
  const result = task?.result?.[0];
  const items = result?.items ?? [];
  output.serps.push({
    keyword,
    checkUrl: result?.check_url ?? null,
    itemTypes: uniq(items.map((i) => i.type)),
    organic: items.filter((i) => i.type === "organic").slice(0, 10).map((i) => ({
      position: i.rank_absolute,
      domain: i.domain,
      title: i.title,
      url: i.url,
      description: i.description,
    })),
    peopleAlsoAsk: items.filter((i) => i.type === "people_also_ask").flatMap((i) =>
      (i.items ?? []).map((x) => x.title).filter(Boolean)
    ).slice(0, 20),
    relatedSearches: items.filter((i) => i.type === "related_searches").flatMap((i) =>
      (i.items ?? []).map((x) => x.title ?? x.keyword).filter(Boolean)
    ).slice(0, 20),
  });
}

output.costLog = costLog;
output.totalCostUsd = Number(totalCostUsd.toFixed(6));
mkdirSync("research-output", { recursive: true });
writeFileSync("research-output/yieldproof-seo-master.json", JSON.stringify(output, null, 2));
writeFileSync("research-output/yieldproof-seo-cost.json", JSON.stringify({ generatedAt: output.generatedAt, totalCostUsd: output.totalCostUsd, costLog }, null, 2));
console.log(`YieldProof SEO master research complete. Keywords=${output.mergedKeywords.length}; SERPs=${output.serps.length}; API cost=$${output.totalCostUsd.toFixed(4)}`);
