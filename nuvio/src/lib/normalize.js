function isTitleChar(ch) {
  const code = ch.charCodeAt(0);
  return (
    (ch >= "a" && ch <= "z") ||
    (ch >= "0" && ch <= "9") ||
    (code >= 0x00c0 && code <= 0x024f) || // Latin-1 Supplement..Latin Extended-B
    (code >= 0x0370 && code <= 0x058f) || // Greek + Armenian
    (code >= 0x0590 && code <= 0x05ff) || // Hebrew
    (code >= 0x0600 && code <= 0x08ff) || // Arabic + Arabic Supplement/Extended-A
    (code >= 0xfb1d && code <= 0xfdff) || // Hebrew/Arabic Presentation Forms
    (code >= 0x1e00 && code <= 0x1eff) || // Latin Extended Additional
    (code >= 0x0900 && code <= 0x0fff) || // Indic + Thai/Lao/Myanmar
    (code >= 0x3040 && code <= 0x30ff) || // Hiragana + Katakana
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0xac00 && code <= 0xd7af) // Hangul Syllables
  );
}

function normalizeTitle(value) {
  if (!value) return "";
  const s = value
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      out += " ";
    } else if (isTitleChar(ch)) {
      out += ch;
    }
  }
  return out.replace(/\s+/g, " ").trim();
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