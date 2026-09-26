const auth = process.env.DATAFORSEO_BASIC_AUTH?.trim();
if (!auth) {
  console.error("DATAFORSEO_BASIC_AUTH is not configured.");
  process.exit(1);
}

const BASE = "https://api.dataforseo.com/v3";
const headers = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

async function getJson(path) {
  const response = await fetch(`${BASE}${path}`, { headers });
  const json = await response.json();
  if (!response.ok || json.status_code !== 20000) {
    throw new Error(`${path}: HTTP ${response.status}; ${json.status_code ?? "?"} ${json.status_message ?? ""}`);
  }
  return json;
}

async function postJson(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok || json.status_code !== 20000) {
    throw new Error(`${path}: HTTP ${response.status}; ${json.status_code ?? "?"} ${json.status_message ?? ""}`);
  }
  return json;
}

const userData = await getJson("/appendix/user_data");
const account = userData.tasks?.[0]?.result?.[0] ?? {};
console.log("AUTH_OK status=20000");
console.log(`ACCOUNT_LOGIN=${account.login ?? "available"}`);
console.log(`ACCOUNT_BALANCE=${account.money?.balance ?? account.balance ?? "not-returned"}`);
console.log(`AUTH_TEST_COST=${Number(userData.cost ?? 0).toFixed(6)}`);

const keywords = [
  "high yield investment platforms",
  "crypto passive income platforms",
  "investment withdrawal proof",
  "daily return investment sites",
  "crypto yield calculator",
];

const keywordOverview = await postJson(
  "/dataforseo_labs/google/keyword_overview/live",
  [{
    location_code: 2840,
    language_code: "en",
    include_serp_info: true,
    keywords,
  }],
);

const task = keywordOverview.tasks?.[0];
const result = task?.result ?? [];
console.log(`PAID_TEST_OK status=${task?.status_code ?? keywordOverview.status_code}`);
console.log(`PAID_TEST_COST=${Number(keywordOverview.cost ?? 0).toFixed(6)}`);
console.log("KEYWORD_TEST_RESULTS_START");
for (const row of result) {
  console.log(JSON.stringify({
    keyword: row.keyword,
    search_volume: row.keyword_info?.search_volume ?? null,
    cpc: row.keyword_info?.cpc ?? null,
    competition: row.keyword_info?.competition ?? null,
    keyword_difficulty: row.keyword_properties?.keyword_difficulty ?? null,
    intent: row.search_intent_info?.main_intent ?? null,
  }));
}
console.log("KEYWORD_TEST_RESULTS_END");
