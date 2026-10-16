// GoldThinker: limited genuine DataForSEO SEO research on the owner's existing secret.
// This isolated YieldProof research branch does not modify YieldProof production.
// Never print, save or expose the BASIC auth secret or account login.
import { mkdirSync, writeFileSync } from "node:fs";
const secret = process.env.DATAFORSEO_BASIC_AUTH?.trim();
if (!secret) throw new Error("Existing repository DATAFORSEO_BASIC_AUTH secret unavailable");
const pageSeeds = {
  home: ["gold trading bot", "automated gold trading", "gold trading system", "gold trading robot", "xauusd trading bot", "gold algorithmic trading"],
  how_it_works: ["how to test trading bots", "gold trading backtest", "how to backtest gold trading strategy", "trading bot backtesting", "forward testing trading strategies", "how to evaluate a trading bot"],
  systems: ["best gold trading bots", "best gold ea mt5", "best xauusd ea", "xauusd expert advisor", "gold expert advisor", "gold automated trading system"],
  system_profile: ["gold trading strategy performance", "gold ea verified results", "gold trading bot performance", "gold trading robot drawdown", "mt5 ea trading history"],
  premium_10: ["gold trading bots portfolio", "multi strategy trading bot", "automated gold trading portfolio", "mt5 portfolio trading", "gold copy trading"],
  results: ["verified gold trading results", "forex trading bot track record", "gold ea live results", "gold ea backtest results", "xauusd backtest results", "mt5 trading bot performance"],
  research_lab: ["xauusd historical data", "gold backtesting data", "gold trading risk management", "gold trading strategy research", "mt5 strategy tester gold"],
  submit_strategy: ["test my trading strategy", "trading strategy backtesting service", "independent trading strategy backtesting", "submit trading strategy for testing", "backtest expert advisor"],
  mt5_connections: ["connect mt5 account", "mt5 automated trading", "mt5 copy trading", "how to connect mt5 trading bot", "metatrader 5 trading bot"],
  risk_and_faq: ["how risky are trading bots", "trading bot max drawdown", "gold trading bot scam", "are gold trading bots profitable", "gold expert advisor slippage"],
  research_journal: ["best xauusd trading strategies", "gold trading strategy bull bear market", "gold trading bot real account", "gold ea forward test", "how to verify forex trading results"]
};
const unique = [...new Set(Object.values(pageSeeds).flat())];
const markets = [
  { name: "United States", code: 2840 },
  { name: "United Kingdom", code: 2826 }
];
const records = [];
const costs = [];
let spent = 0;
for (const market of markets) {
  if (spent > 0.50) throw new Error("Protective live API spending cap reached");
  const res = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live", {
    method: "POST",
    headers: { "Authorization": "Basic " + secret, "Content-Type": "application/json" },
    body: JSON.stringify([{location_code: market.code, language_code: "en", keywords: unique, include_serp_info: true}])
  });
  const payload = await res.json();
  if (!res.ok || payload.status_code !== 20000 ||
      (payload.tasks ?? []).some(t => t.status_code !== 20000)) {
    throw new Error("DataForSEO live keyword API failed: HTTP "+res.status+" / code "+
      payload.status_code+" / task "+(payload.tasks?.[0]?.status_code ?? "unknown"));
  }
  const cost = Number(payload.cost ?? 0);
  spent += cost;
  costs.push({market: market.name, costUsd: cost});
  for (const task of payload.tasks ?? []) {
    for (const result of task.result ?? []) {
      for (const item of result.items ?? (result.keyword ? [result] : [])) {
        const r = item.keyword_data ?? item;
        if (!r?.keyword) continue;
      const info = r.keyword_info ?? {};
      records.push({
        keyword: r.keyword,
        country: market.name,
        intendedPages: Object.entries(pageSeeds).filter(([, words]) =>
          words.includes(r.keyword)).map(([page]) => page),
        searchVolume: info.search_volume ?? null,
        competitionLevel: info.competition_level ?? null,
        cpcUsd: info.cpc ?? null,
        keywordDifficulty: r.keyword_properties?.keyword_difficulty ?? null,
        searchIntent: r.search_intent_info?.main_intent ?? null,
        lastUpdated: info.last_updated_time ?? null
        });
      }
    }
  }
}
if (records.length === 0) throw new Error('Provider returned no extracted keyword rows; preserve fail-closed status');
const report = {
  vendor: "DataForSEO", endpoint: "dataforseo_labs/google/keyword_overview/live",
  requestedAtUtc: new Date().toISOString(),
  markets: markets.map(m => m.name), language: "en",
  brand: "GoldThinker", samplePageClusters: pageSeeds,
  keywordCount: unique.length, returnedRows: records.length,
  seoApiCostUsd: Number(spent.toFixed(6)), costs,
  note: "Measured third-party figures where non-null. No invented volume, CPC or difficulty. Keyword intent requires human review; the vendor's numeric CPC relates to ads, not organic difficulty.",
  records
};
mkdirSync("goldthinker-seo-output", {recursive:true});
writeFileSync("goldthinker-seo-output/dataforseo-goldthinker-us-uk.json", JSON.stringify(report,null,2)+"\n");
console.log("DATAFORSEO_GOLDTHINKER_RESEARCH_PASS " + JSON.stringify({
  keywordCount: report.keywordCount, returnedRows: records.length,
  costs, markets: report.markets
}));
for (const page of Object.keys(pageSeeds)) {
  const relevant=records.filter(r=>r.intendedPages.includes(page));
  console.log("PAGE_CLUSTER " + JSON.stringify({
    page, rows: relevant.sort((a,b)=>(b.searchVolume??-1)-(a.searchVolume??-1))
  }));
}
