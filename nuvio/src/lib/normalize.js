function normalizeTitle(value) {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeTitle(value).split(" ");
}

function tokenSimilarity(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const tok of ta) {
    if (tb.has(tok)) overlap++;
  }
  return overlap / Math.max(ta.size, tb.size);
}

function matchTitle(resultTitle, queryTitles) {
  const rt = normalizeTitle(resultTitle);
  if (!rt) return false;
  for (const q of queryTitles) {
    const nq = normalizeTitle(q);
    if (!nq) continue;
    if (rt === nq) return true;
    if (rt.includes(nq) || nq.includes(rt)) return true;
    if (tokenSimilarity(rt, nq) >= 0.5) return true;
  }
  return false;
}

module.exports = { normalizeTitle, tokenSimilarity, matchTitle };