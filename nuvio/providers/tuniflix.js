/**
 * Tuniflix - Built from nuvio/src/providers/tuniflix.js
 * Generated: 2026-09-10T17:45:05.835Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/lib/http.js
var require_http = __commonJS({
  "src/lib/http.js"(exports2, module2) {
    var HEADERS2 = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ar,en-US;q=0.8,en;q=0.5"
    };
    function buildInit(options) {
      const init = {
        headers: Object.assign({}, HEADERS2, options.headers || {}),
        skipSizeCheck: true
      };
      if (options.method) init.method = options.method;
      if (options.body) init.body = options.body;
      return init;
    }
    function fetchText2(_0) {
      return __async(this, arguments, function* (url, options = {}) {
        const res = yield fetch(url, buildInit(options));
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
        return yield res.text();
      });
    }
    function fetchBuffer(_0) {
      return __async(this, arguments, function* (url, options = {}) {
        const res = yield fetch(url, buildInit(options));
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
        return yield res.arrayBuffer();
      });
    }
    function fetchJson(_0) {
      return __async(this, arguments, function* (url, options = {}) {
        const raw = yield fetchText2(url, options);
        return JSON.parse(raw);
      });
    }
    function absoluteUrl2(base, url) {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("//")) return "https:" + url;
      return base.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
    }
    module2.exports = { HEADERS: HEADERS2, fetchText: fetchText2, fetchBuffer, fetchJson, absoluteUrl: absoluteUrl2 };
  }
});

// src/lib/normalize.js
var require_normalize = __commonJS({
  "src/lib/normalize.js"(exports2, module2) {
    function isTitleChar(ch) {
      const code = ch.charCodeAt(0);
      return ch >= "a" && ch <= "z" || ch >= "0" && ch <= "9" || code >= 192 && code <= 591 || // Latin-1 Supplement..Latin Extended-B
      code >= 880 && code <= 1423 || // Greek + Armenian
      code >= 1424 && code <= 1535 || // Hebrew
      code >= 1536 && code <= 2303 || // Arabic + Arabic Supplement/Extended-A
      code >= 64285 && code <= 65023 || // Hebrew/Arabic Presentation Forms
      code >= 7680 && code <= 7935 || // Latin Extended Additional
      code >= 2304 && code <= 4095 || // Indic + Thai/Lao/Myanmar
      code >= 12352 && code <= 12543 || // Hiragana + Katakana
      code >= 19968 && code <= 40959 || // CJK Unified Ideographs
      code >= 44032 && code <= 55215;
    }
    function normalizeTitle(value) {
      if (!value) return "";
      const s = value.toString().toLowerCase().replace(/[\u064B-\u0652\u0670\u0640]/g, "");
      let out = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s.charAt(i);
        if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
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
    function matchTitle2(resultTitle, queryTitles) {
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
    module2.exports = { normalizeTitle, tokenSimilarity, matchTitle: matchTitle2 };
  }
});

// src/lib/tmdb.js
var require_tmdb = __commonJS({
  "src/lib/tmdb.js"(exports2, module2) {
    var { normalizeTitle } = require_normalize();
    var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
    var TMDB_BASE = "https://api.themoviedb.org/3";
    function getMedia(tmdbId, mediaType) {
      return __async(this, null, function* () {
        const endpoint = mediaType === "tv" ? "tv" : "movie";
        try {
          const res = yield fetch(
            TMDB_BASE + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=ar",
            { skipSizeCheck: true }
          );
          if (!res.ok) return null;
          const data = yield res.json();
          if (data && (data.title || data.name)) return data;
          const resEn = yield fetch(
            TMDB_BASE + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=en-US",
            { skipSizeCheck: true }
          );
          if (!resEn.ok) return null;
          return yield resEn.json();
        } catch (e) {
          console.error("[TMDB] getMedia error:", e.message);
          return null;
        }
      });
    }
    function getTitles2(tmdbId, mediaType) {
      return __async(this, null, function* () {
        const d = yield getMedia(tmdbId, mediaType);
        if (!d) return [];
        const titles = [];
        const primary = d.title || d.name || "";
        if (primary) titles.push(primary);
        const orig = d.original_title || d.original_name || "";
        if (orig && orig !== primary) titles.push(orig);
        try {
          const endpoint = mediaType === "tv" ? "tv" : "movie";
          const res = yield fetch(
            TMDB_BASE + "/" + endpoint + "/" + tmdbId + "/alternative_titles?api_key=" + TMDB_API_KEY,
            { skipSizeCheck: true }
          );
          if (res.ok) {
            const alt = yield res.json();
            const list = endpoint === "tv" ? alt.results || [] : alt.titles || [];
            for (const item of list) {
              const t = item.title;
              if (!t) continue;
              if (!titles.some((x) => normalizeTitle(x) === normalizeTitle(t))) titles.push(t);
            }
          }
        } catch (e) {
        }
        return titles;
      });
    }
    module2.exports = { getMedia, getTitles: getTitles2, TMDB_API_KEY };
  }
});

// src/lib/extractor.js
var require_extractor = __commonJS({
  "src/lib/extractor.js"(exports2, module2) {
    var { fetchText: fetchText2, absoluteUrl: absoluteUrl2 } = require_http();
    var DIRECT_VIDEO = /\.(m3u8|mp4|mkv|webm|avi)(\?.*)?$/i;
    var M3U8_RE = /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi;
    var MP4_RE = /https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi;
    function cleanStreamUrl(raw) {
      return String(raw).replace(/\\\//g, "/").replace(/^["'\s]+|["'\s]+$/g, "").replace(/&amp;/g, "&").trim();
    }
    function stripUrls(raw) {
      return String(raw).replace(/\\\//g, "/").replace(/&amp;/g, "&");
    }
    function unescapeJsString(str) {
      return String(str).replace(/\\(?:x([0-9a-fA-F]{2})|[\\'"nrt])/g, (m, h) => {
        if (h) return String.fromCharCode(parseInt(h, 16));
        if (m === "\\'") return "'";
        if (m === '\\"') return '"';
        if (m === "\\\\") return "\\";
        return m === "\\n" ? "\n" : m === "\\r" ? "\r" : "	";
      });
    }
    function unpackPacked(text) {
      const regex = /\}\((['"])([\s\S]*?)\1,(\d+),(\d+),(['"])([\s\S]*?)\5/;
      const match = regex.exec(String(text));
      if (!match) return text;
      const [, , payload, baseStr, countStr, , namesRaw] = match;
      const base = parseInt(baseStr, 10);
      const count = parseInt(countStr, 10);
      const names = unescapeJsString(namesRaw).split("|").map((n) => unescapeJsString(n));
      let out = unescapeJsString(payload);
      for (let i = count - 1; i >= 0; i--) {
        const word = names[i];
        if (word) {
          out = out.replace(new RegExp("\\b" + i.toString(base) + "\\b", "g"), word);
        }
      }
      return out;
    }
    function extractMediaUrls(raw) {
      const text = stripUrls(raw);
      const out = [];
      const seen = /* @__PURE__ */ new Set();
      function push(url, quality) {
        url = cleanStreamUrl(url);
        if (!url) return;
        if (!/^https?:\/\//.test(url)) {
          if (!url.startsWith("//")) return;
          url = "https:" + url;
        }
        if (seen.has(url)) return;
        seen.add(url);
        out.push({ url, quality: quality || "auto" });
      }
      if (M3U8_RE.test(text)) {
        M3U8_RE.lastIndex = 0;
        let m2;
        while ((m2 = M3U8_RE.exec(text)) !== null) {
          push(m2[0], "auto");
        }
      }
      if (MP4_RE.test(text)) {
        MP4_RE.lastIndex = 0;
        let m2;
        while ((m2 = MP4_RE.exec(text)) !== null) {
          push(m2[0], "auto");
        }
      }
      const sourceRe = /(?:source|src|file|url)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mkv|webm|avi)[^"']*)["']/gi;
      let m;
      while ((m = sourceRe.exec(text)) !== null) {
        push(m[1], "auto");
      }
      return out;
    }
    function toStream(providerName, title, url, quality, headers) {
      return { provider: providerName, name: providerName, title: title || providerName, url, quality: quality || "auto", headers: headers || {} };
    }
    function extractDailymotion(url, headers) {
      return __async(this, null, function* () {
        const idMatch = url.match(/\/video\/([a-zA-Z0-9]+)/);
        if (!idMatch) return [];
        const id = idMatch[1];
        const streams = [];
        try {
          const videoPageUrl = `https://www.dailymotion.com/video/${id}`;
          const meta = yield fetchText2(
            `https://www.dailymotion.com/player/metadata/video/${id}?embedder=${encodeURIComponent(videoPageUrl)}&fields=qualities,stream_hls_url`,
            { headers: { Referer: videoPageUrl + "?syndication=273805", Accept: "application/json" } }
          );
          const json = JSON.parse(meta);
          if (json.error) return [];
          const qualities = json.qualities || {};
          const keys = Object.keys(qualities).sort((x, y) => {
            const nx = parseInt(x, 10) || 0;
            const ny = parseInt(y, 10) || 0;
            return ny - nx;
          });
          for (const key of keys) {
            const entries = qualities[key];
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
              const u = entry && entry.url;
              if (!u) continue;
              if (/geo/i.test((entry.type || "") + u)) continue;
              streams.push(toStream("Dailymotion", "Dailymotion " + (key === "auto" ? "Auto" : key + "p"), u, key === "auto" ? "auto" : key, headers));
            }
          }
          if (streams.length === 0 && json.stream_hls_url) {
            streams.push(toStream("Dailymotion", "Dailymotion", json.stream_hls_url, "auto", headers));
          }
        } catch (e) {
          return [];
        }
        return streams;
      });
    }
    function padHex(hex) {
      let h = String(hex || "").trim().replace(/"/g, "");
      if (h.length % 2 !== 0) h = h.slice(0, -1);
      return h;
    }
    var SP_KEY = "kiemtienmua911ca";
    var SP_KEY_WORDS = [];
    for (let i = 0; i < SP_KEY.length; i++) SP_KEY_WORDS.push(SP_KEY.charCodeAt(i));
    while (SP_KEY_WORDS.length % 16 !== 0) SP_KEY_WORDS.push(0);
    function generateIvCandidates(domain, videoId) {
      const candidates = [];
      const dOpts = [48, 323];
      if (domain) {
        dOpts.push(domain.length * (domain.length + 2));
        const parts = domain.split(".");
        if (parts.length >= 2) {
          const shortDomain = parts[parts.length - 2] + "." + parts[parts.length - 1];
          dOpts.push(shortDomain.length * (shortDomain.length + 2));
        }
      }
      const wOpts = [0, 105, 141, 189, 63];
      if (videoId) {
        wOpts.push(3 * videoId.charCodeAt(0));
      }
      for (const d of [...new Set(dOpts)]) {
        for (const w of [...new Set(wOpts)]) {
          let part1 = "";
          for (let i = 1; i <= 9; i++) part1 += String.fromCharCode(i + d);
          const part2 = [d, 111, w, 128, 132, 97, 95].map((x) => String.fromCharCode(x)).join("");
          const ivString = part1 + part2;
          candidates.push(ivString.substr(0, 16));
        }
      }
      return candidates;
    }
    function decryptSmartPlayer(hex, iv) {
      try {
        const CJS = require("crypto-js");
        const encrypted = CJS.enc.Hex.parse(padHex(hex));
        const key = CJS.lib.WordArray.create(SP_KEY_WORDS.slice(), 16);
        const ivWA = CJS.enc.Utf8.parse(iv);
        const cfg = { iv: ivWA, mode: CJS.mode.CBC, padding: CJS.pad.Pkcs7 };
        let decrypted;
        try {
          decrypted = CJS.AES.decrypt({ ciphertext: encrypted }, key, cfg);
        } catch (e) {
          decrypted = null;
        }
        if (!decrypted) return "";
        const txt = decrypted.toString(CJS.enc.Utf8);
        if (/^\{/.test(txt.trim())) return txt;
        return "";
      } catch (e) {
        return "";
      }
    }
    function extractSmartPlayer2(playerUrl, referer) {
      return __async(this, null, function* () {
        const streams = [];
        const norm = playerUrl.startsWith("//") ? "https:" + playerUrl : playerUrl;
        let domain = "";
        try {
          domain = new URL(norm).host;
        } catch (e) {
          return streams;
        }
        let videoId = "";
        if (norm.includes("#")) videoId = norm.split("#").pop().split("&")[0];
        else if (norm.includes("id=")) videoId = norm.split("id=")[1].split("&")[0];
        if (!videoId) return streams;
        const apiUrl = `https://${domain}/api/v1/video?id=${videoId}`;
        const headers = {
          Referer: `https://${domain}/`,
          Origin: `https://${domain}`,
          Accept: "application/json, text/plain, */*"
        };
        try {
          const body = yield fetchText2(apiUrl, { headers });
          for (const iv of generateIvCandidates(domain, videoId)) {
            const plain = decryptSmartPlayer(body, iv);
            if (plain) {
              let source = "";
              try {
                const parsed = JSON.parse(plain);
                source = parsed.source || "";
              } catch (e) {
                source = "";
              }
              if (!source) {
                const m1 = plain.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}\/[^\s",\\]+\.m3u8)/);
                const m2 = plain.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}\/[^\s",\\]+)/);
                source = m1 ? m1[1] : m2 ? m2[1] : "";
                if (source) source = "https://" + source;
              }
              if (source) {
                streams.push(toStream("SmartPlayer", "SmartPlayer", cleanStreamUrl(source), "auto", { Referer: `https://${domain}/` }));
                return streams;
              }
            }
          }
        } catch (e) {
          return streams;
        }
        return streams;
      });
    }
    var IGNORE_URLS = ["google.com/recaptcha", "google.com/ads", "googlesyndication.com", "googletagmanager.com", "doubleclick.net"];
    var FILE_HOSTS = ["nitroflare.com", "bowfile.com", "1fichier.com", "ddownload.com", "mdiaload.com", "1cloudfile.com", "workupload.com", "gofile.io", "krakenfiles.com", "racaty.net", "mega.nz", "mediafire.com"];
    var MAX_IFRAME_EXPANSIONS = 4;
    function collectIframes(pageUrl, html, referer, depth, visited) {
      return __async(this, null, function* () {
        const out = [];
        if (depth > 3 || visited.has(pageUrl)) return out;
        visited.add(pageUrl);
        const iframeRe = /<iframe[^>]*?\ssrc=["']([^"']+)["']/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
          const src = m[1];
          if (FILE_HOSTS.some((h) => src.includes(h))) continue;
          out.push(absoluteUrl2(pageUrl, src));
        }
        let expanded = 0;
        const globs = /* @__PURE__ */ new Set();
        for (const src of out) {
          if (globs.has(src)) continue;
          globs.add(src);
          if (IGNORE_URLS.some((k) => src.includes(k))) continue;
          if (expanded >= MAX_IFRAME_EXPANSIONS) break;
          expanded++;
          try {
            const sub = yield fetchText2(src, { headers: { Referer: referer } });
            const inner = yield extractStreamsFromText(sub, src, referer, depth + 1, visited);
            if (inner.length) return inner;
          } catch (e) {
            continue;
          }
        }
        return [];
      });
    }
    function extractStreamsFromText(html, pageUrl, referer, depth, visited) {
      return __async(this, null, function* () {
        const out = [];
        const seen = /* @__PURE__ */ new Set();
        const pushStream = (s) => {
          if (!s || !s.url) return;
          if (seen.has(s.url)) return;
          seen.add(s.url);
          out.push(s);
        };
        const unpacked = unpackPacked(html);
        if (unpacked !== html) {
          for (const media of extractMediaUrls(unpacked)) {
            pushStream(toStream("Extractor", "Auto", media.url, media.quality, { Referer: referer }));
          }
        }
        for (const media of extractMediaUrls(html)) {
          pushStream(toStream("Extractor", "Auto", media.url, media.quality, { Referer: referer }));
        }
        const smartRe = /(["'])(https?:\/\/[^"']*\/api\/v1\/video\?id=[^"']+)\1/gi;
        let m;
        while ((m = smartRe.exec(html)) !== null) {
          for (const s of yield extractSmartPlayer2(m[2], referer)) pushStream(s);
        }
        const iframeStreams = yield collectIframes(pageUrl, html, referer, depth || 0, visited || /* @__PURE__ */ new Set());
        for (const s of iframeStreams) pushStream(s);
        return out;
      });
    }
    function extractFromUrl2(url, referer) {
      return __async(this, null, function* () {
        const fixed = String(url).startsWith("//") ? "https:" + url : url;
        if (FILE_HOSTS.some((h) => fixed.includes(h))) return [];
        if (DIRECT_VIDEO.test(fixed)) {
          return [toStream("Extractor", "Direct", fixed, "auto", { Referer: referer })];
        }
        if (/(^|\.)dailymotion\.com/.test(fixed) || /dailymotion\.com\/embed/.test(fixed)) {
          return yield extractDailymotion(fixed, { Referer: referer });
        }
        const pageUrl = absoluteUrl2(fixed, fixed);
        try {
          const html = yield fetchText2(pageUrl, { headers: { Referer: referer } });
          return yield extractStreamsFromText(html, pageUrl, referer, 0, /* @__PURE__ */ new Set());
        } catch (e) {
          return [];
        }
      });
    }
    module2.exports = { extractFromUrl: extractFromUrl2, extractStreamsFromText, extractSmartPlayer: extractSmartPlayer2, extractDailymotion, unpackPacked, toStream, cleanStreamUrl };
  }
});

// src/providers/tuniflix.js
var cheerio = require("cheerio-without-node-native");
var { HEADERS, fetchText, absoluteUrl } = require_http();
var { getTitles } = require_tmdb();
var { matchTitle } = require_normalize();
var { extractFromUrl, extractSmartPlayer } = require_extractor();
var metadata = {
  id: "tuniflix",
  name: "Tuniflix",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTe95deIIAAbyR9ArSievPWdM2QwiVG9bbQ6Y1uDIbRBpathzSs45b8uQ4&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
var BASE = "https://tuniflix.site";
function fixUrl(url) {
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE + url;
  return url;
}
function toSearchResult($, el) {
  const a = $(el).find("a").first();
  const href = a.attr("href");
  const title = ($(el).find(".Title").first().text() || "").trim();
  if (!href || !title) return null;
  const img = $(el).find(".Image img").first();
  let poster = img.attr("data-src") || img.attr("src") || "";
  if (poster.startsWith("//")) poster = "https:" + poster;
  const isTv = href.includes("/serie/") || $(el).find(".TpTv").text().toLowerCase().includes("serie");
  return { title, url: href, poster, isTv };
}
function findPage(queryTitles) {
  return __async(this, null, function* () {
    for (const t of queryTitles.slice(0, 3)) {
      try {
        const html = yield fetchText(BASE + "/?s=" + encodeURIComponent(t), { headers: { Referer: BASE } });
        const $ = cheerio.load(html);
        const results = [];
        $("article.TPost.B").each(function(i, el) {
          const r = toSearchResult($, el);
          if (r) results.push(r);
        });
        const hit = results.find((r) => matchTitle(r.title, queryTitles));
        if (hit) return hit;
      } catch (e) {
        continue;
      }
    }
    return null;
  });
}
function findEpisode(pageUrl, season, episode) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(pageUrl, { headers: { Referer: BASE } });
      const $ = cheerio.load(html);
      const seasonUrls = [];
      $(".SeasonBx .Title a").each(function(i, el) {
        const href = $(el).attr("href");
        if (href) seasonUrls.push(href);
      });
      const urls = seasonUrls.length ? seasonUrls : [pageUrl];
      for (const seasonUrl of urls) {
        let seasonHtml = seasonUrl === pageUrl ? html : yield fetchText(seasonUrl, { headers: { Referer: pageUrl } });
        const $s = cheerio.load(seasonHtml);
        const seasonTitle = ($s("h1.Title").first().text() || "").trim();
        const snMatch = /Season\s*(\d+)/i.exec(seasonTitle);
        let sn = snMatch ? parseInt(snMatch[1], 10) : 1;
        let ep = null;
        $s(".TPTblCn table tr").each(function(i, tr) {
          const link = $s(tr).find("a").first();
          const href = link.attr("href");
          const epNum = parseInt(($s(tr).find(".Num").first().text() || "").trim(), 10);
          if (href && epNum === episode) {
            ep = href;
            return false;
          }
        });
        if (ep && sn === season) return ep;
        if (ep && seasonUrls.length === 0) return ep;
      }
      return null;
    } catch (e) {
      return null;
    }
  });
}
function deepSearchIframes(pageUrl, depth, visited) {
  return __async(this, null, function* () {
    if (depth > 3 || visited.has(pageUrl)) return [];
    visited.add(pageUrl);
    const found = [];
    let html;
    try {
      html = yield fetchText(pageUrl, { headers: { Referer: BASE } });
    } catch (e) {
      return found;
    }
    const $ = cheerio.load(html);
    const iframes = [];
    $("iframe").each(function(i, el) {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (src.trim()) iframes.push(fixUrl(src.trim()));
    });
    for (const src of iframes) {
      if (src.includes(BASE) || src.includes("trembed") || src.includes("trid")) {
        const nested = yield deepSearchIframes(src, depth + 1, visited);
        for (const n of nested) found.push(n);
      } else {
        found.push(src);
      }
    }
    return [...new Set(found)];
  });
}
function loadLinks(url) {
  return __async(this, null, function* () {
    const streams = [];
    const iframes = yield deepSearchIframes(url, 0, /* @__PURE__ */ new Set());
    for (const playerUrl of iframes) {
      let found = [];
      if (playerUrl.includes("#") || playerUrl.includes("id=")) {
        found = yield extractSmartPlayer(playerUrl, BASE);
      } else {
        found = yield extractFromUrl(playerUrl, BASE);
      }
      for (const s of found) streams.push(s);
    }
    return streams;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const titles = yield getTitles(tmdbId, mediaType);
    if (!titles.length) return [];
    const page = yield findPage(titles);
    if (!page) return [];
    if (mediaType === "tv") {
      const epUrl = yield findEpisode(page.url, season || 1, episode || 1);
      if (!epUrl) return [];
      return yield loadLinks(epUrl);
    }
    return yield loadLinks(page.url);
  });
}
module.exports = { metadata, getStreams, findPage, findEpisode, deepSearchIframes, loadLinks };
