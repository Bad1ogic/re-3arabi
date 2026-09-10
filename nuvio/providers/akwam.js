/**
 * Akwam - Built from nuvio/src/providers/akwam.js
 * Generated: 2026-09-10T17:06:11.401Z
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
    function absoluteUrl(base, url) {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("//")) return "https:" + url;
      return base.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
    }
    module2.exports = { HEADERS: HEADERS2, fetchText: fetchText2, fetchBuffer, fetchJson, absoluteUrl };
  }
});

// src/lib/normalize.js
var require_normalize = __commonJS({
  "src/lib/normalize.js"(exports2, module2) {
    function normalizeTitle(value) {
      if (!value) return "";
      return value.toString().toLowerCase().replace(/[\u064B-\u0652\u0670\u0640]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
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

// src/providers/akwam.js
var cheerio = require("cheerio-without-node-native");
var { HEADERS, fetchText } = require_http();
var { getTitles } = require_tmdb();
var { matchTitle } = require_normalize();
var metadata = {
  id: "akwam",
  name: "Akwam",
  description: "",
  version: "3.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2vuGLv4zY3XpoN2jza2unCQ95xFfypfe-h3k3xteMbGxl7taw-ziXyNg&s=10",
  contentLanguage: ["ar"],
  formats: ["mp4"],
  limited: true
};
var BASE = "https://ak.sv";
var baseResolved = false;
var SEASON_NUMBERS = {
  "\u0627\u0644\u0627\u0648\u0644": 1,
  "\u0627\u0644\u0623\u0648\u0644": 1,
  "\u0627\u0644\u062B\u0627\u0646\u064A": 2,
  "\u0627\u0644\u062B\u0627\u0644\u062B": 3,
  "\u0627\u0644\u0631\u0627\u0628\u0639": 4,
  "\u0627\u0644\u062E\u0627\u0645\u0633": 5,
  "\u0627\u0644\u0633\u0627\u062F\u0633": 6,
  "\u0627\u0644\u0633\u0627\u0628\u0639": 7,
  "\u0627\u0644\u062B\u0627\u0645\u0646": 8,
  "\u0627\u0644\u062A\u0627\u0633\u0639": 9,
  "\u0627\u0644\u0639\u0627\u0634\u0631": 10,
  "\u0627\u0644\u062D\u0627\u062F\u064A \u0639\u0634\u0631": 11,
  "\u0627\u0644\u062B\u0627\u0646\u064A \u0639\u0634\u0631": 12,
  "\u0627\u0644\u062B\u0627\u0644\u062B \u0639\u0634\u0631": 13,
  "\u0627\u0644\u0631\u0627\u0628\u0639 \u0639\u0634\u0631": 14,
  "\u0627\u0644\u062E\u0627\u0645\u0633 \u0639\u0634\u0631": 15,
  "\u0627\u0644\u0633\u0627\u062F\u0633 \u0639\u0634\u0631": 16,
  "\u0627\u0644\u0633\u0627\u0628\u0639 \u0639\u0634\u0631": 17,
  "\u0627\u0644\u062B\u0627\u0645\u0646 \u0639\u0634\u0631": 18,
  "\u0627\u0644\u062A\u0627\u0633\u0639 \u0639\u0634\u0631": 19,
  "\u0627\u0644\u0639\u0634\u0631\u0648\u0646": 20
};
function getSeasonNumber(name) {
  if (!name) return 0;
  const lower = name.toLowerCase();
  for (let i = 1; i <= 30; i++) {
    const words = Object.keys(SEASON_NUMBERS).filter((k) => SEASON_NUMBERS[k] === i);
    if (words.some((k) => lower.includes(k))) return i;
  }
  const nums = (name.match(/\d+/g) || []).map((n) => parseInt(n, 10));
  return nums.length ? nums[nums.length - 1] : 0;
}
function getEpisodeNumber(name) {
  const nums = (name.match(/\d+/g) || []).map((n) => parseInt(n, 10));
  return nums.length ? nums[nums.length - 1] : void 0;
}
function getPoster($, el) {
  const img = $(el).find("img").first();
  return (img.attr("data-src") || img.attr("src") || "").trim();
}
function parseSearch(html) {
  const $ = cheerio.load(html);
  const out = [];
  $("div.col-lg-auto.col-md-4.col-6").each(function(i, el) {
    const a = $(el).find("h3.entry-title a").first();
    const title = a.text().trim();
    const href = $(el).find("a").first().attr("href");
    if (!title || !href) return;
    out.push({ title, url: href, poster: getPoster($, el) });
  });
  return out;
}
function resolveBase() {
  return __async(this, null, function* () {
    if (baseResolved) return;
    try {
      const res = yield fetch(BASE + "/movies", { headers: HEADERS, redirect: "follow", skipSizeCheck: true });
      if (res.url) {
        const origin = new URL(res.url).origin;
        if (origin) BASE = origin;
      }
    } catch (e) {
    }
    baseResolved = true;
  });
}
function findPage(queryTitles) {
  return __async(this, null, function* () {
    yield resolveBase();
    for (const t of queryTitles.slice(0, 3)) {
      try {
        const html = yield fetchText(BASE + "/search?q=" + encodeURIComponent(t));
        const results = parseSearch(html);
        const hit = results.find((r) => r.title && matchTitle(r.title, queryTitles));
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
    const headers = { Referer: BASE };
    try {
      const mainHtml = yield fetchText(pageUrl, { headers });
      const $main = cheerio.load(mainHtml);
      const seasons = [];
      $main("div.widget-body > a.btn[href*='/series/']").each(function(i, el) {
        const href = $main(el).attr("href");
        const name = $main(el).text().trim();
        if (href) seasons.push({ name: name || "\u0645\u0648\u0633\u0645", url: href.startsWith("http") ? href : BASE + href });
      });
      const mainHasEpisodes = $main("div#series-episodes div[class*='col-']").length > 0;
      if (!seasons.length && !mainHasEpisodes) return null;
      const candidates = seasons.length ? seasons : [{ name: "\u0645\u0648\u0633\u0645", url: pageUrl }];
      const seasonHit = candidates.map((s) => ({ s, n: getSeasonNumber(s.name) })).filter((x) => x.n > 0).sort((a, b) => Math.abs(a.n - season) - Math.abs(b.n - season))[0];
      const seasonUrl = seasonHit ? seasonHit.s.url : candidates[0].url;
      const seasonHtml = yield fetchText(seasonUrl, { headers });
      const $ = cheerio.load(seasonHtml);
      let ep = null;
      const containers = $("div#series-episodes div.col-lg-4, div#series-episodes div.col-md-6");
      containers.each(function(i, el) {
        const link = $(el).find("a[href*='/episode/']").first();
        const href = link.attr("href");
        const name = (link.find("h2").first().text() || link.text() || "").trim();
        if (href) {
          const e = getEpisodeNumber(name);
          if (e === episode) {
            ep = { url: href, name };
            return false;
          }
        }
      });
      return ep;
    } catch (e) {
      return null;
    }
  });
}
function loadLinks(url, episodeUrl) {
  return __async(this, null, function* () {
    const streams = [];
    try {
      const step1 = yield fetchText(url, { headers: { Referer: BASE } });
      const $1 = cheerio.load(step1);
      const watchEl = $1("a.link-show").first();
      const rawWatch = watchEl.attr("abs:href") || watchEl.attr("href") || "";
      if (!rawWatch) return streams;
      let watchUrl;
      try {
        const u = new URL(rawWatch);
        watchUrl = BASE.replace(/\/+$/, "") + "/" + u.pathname.replace(/^\/+/, "");
      } catch (e) {
        watchUrl = rawWatch;
      }
      if (!/^https?:/.test(watchUrl)) watchUrl = BASE + "/" + watchUrl.replace(/^\/+/, "");
      const step2 = yield fetchText(watchUrl, { headers: { Referer: episodeUrl } });
      const $2 = cheerio.load(step2);
      const seen = /* @__PURE__ */ new Set();
      $2("source[src]").each(function(i, el) {
        let videoUrl = ($2(el).attr("abs:src") || $2(el).attr("src") || "").trim();
        if (!videoUrl) return;
        videoUrl = videoUrl.replace(/ /g, "%20").replace("https://", "http://");
        if (seen.has(videoUrl)) return;
        seen.add(videoUrl);
        const quality = ($2(el).attr("size") || $2(el).attr("label") || "direct").trim();
        streams.push({
          provider: "Akwam",
          name: "Akwam",
          title: "Akwam",
          url: videoUrl,
          quality,
          headers: { Referer: episodeUrl }
        });
      });
    } catch (e) {
      return streams;
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
      const ep = yield findEpisode(page.url, season || 1, episode || 1);
      if (!ep) return [];
      return yield loadLinks(ep.url, ep.url);
    }
    return yield loadLinks(page.url, page.url);
  });
}
module.exports = { metadata, getStreams, findPage, findEpisode, loadLinks };
