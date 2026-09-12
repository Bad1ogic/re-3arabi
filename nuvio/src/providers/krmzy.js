const { fetchText, HEADERS, absoluteUrl } = require("../lib/http.js");
const cheerio = require("cheerio-without-node-native");
const { unpackPacked, extractFromUrl, extractDailymotion, extractMailRuPublic, toStream, cleanStreamUrl, expandFromMasterText, expandM3u8Qualities, expandArtRkUrlset } = require("../lib/extractor.js");
const { matchTitle } = require("../lib/normalize.js");
const { getTitles, getSeasonCounts } = require("../lib/tmdb.js");

const metadata = {
  id: "krmzy",
  name: "Krmzy",
  description: "مسلسلات - قرمزي",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwTnAJOvyri3uHzHxjkEdlaBBKs8MAvIuJtFmCoo9u5qYiuFpHZjcl6tDi&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

const BASE = "https://krmzy.com";

// Foreign-origin shows whose TMDB title has no Arabic equivalent (the site
// lists them under their Arabic title only). Map a Latin-normalized pattern in
// the TMDB title -> the Arabic title krmzy uses. Add a line per such show.
const TITLE_ALIASES = [
  { match: /karaday/, arabic: "القبضاي" },
  { match: /eskiya|edho|hukumdar/, arabic: "قطاع الطرق" }
];

// Lowercase + fold common Turkish diacritics to ASCII so alias patterns match
// titles like "Eşkıya" / "Hükümdar" regardless of diacritic form.
function normalizeLatin(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/\s+/g, " ")
    .trim();
}

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(String(s || ""));
}

function titleAliases(queryTitles) {
  const out = [];
  const seen = new Set();
  for (const t of queryTitles || []) {
    const norm = normalizeLatin(t);
    if (!norm) continue;
    for (const a of TITLE_ALIASES) {
      if (a.match.test(norm) && !seen.has(a.arabic)) {
        seen.add(a.arabic);
        out.push(a.arabic);
      }
    }
  }
  return out;
}

// Ordered, de-duplicated search queries. Aliases (Arabic, precise) come first,
// then each TMDB title full, then front prefixes (2-3 words) for Arabic titles
// so extra trailing words in a TMDB title don't break the site's AND search.
function buildSearchCandidates(queryTitles, aliases) {
  const cands = [];
  const seen = new Set();
  const push = (c) => {
    const key = String(c || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    cands.push(key);
  };
  for (const a of aliases || []) push(a);
  for (const t of queryTitles || []) {
    push(t);
    if (hasArabic(t)) {
      const words = String(t).trim().split(/\s+/).filter(Boolean);
      if (words.length > 2) {
        push(words.slice(0, Math.min(3, words.length)).join(" "));
        push(words.slice(0, 2).join(" "));
      }
    }
  }
  return cands;
}

function ensureHttp(u) {
  if (!u) return u;
  if (u.startsWith("//")) return "https:" + u;
  if (/^https?:\/\//i.test(u)) return u;
  return "https://" + u;
}

function base64Decode(input) {
  const norm = String(input).replace(/-/g, "+").replace(/_/g, "/");
  const padded = norm + "=".repeat((4 - (norm.length % 4)) % 4);
  if (typeof Buffer !== "undefined") return Buffer.from(padded, "base64").toString("utf8");
  const b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of padded.replace(/[^A-Za-z0-9+/]/g, "")) {
    buffer = (buffer << 6) | b64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  let text = "";
  for (const b of out) text += String.fromCharCode(b);
  return decodeURIComponent(escape(text));
}

function toSearchResult($, el) {
  const link = $(el).find("a").first();
  const href = link.attr("href");
  const title = link.find("div.title").first().text().trim() || link.attr("title") || "";
  const style = link.find("div.imgSer, div.imgBg").first().attr("style") || "";
  const posterMatch = style.match(/url\(['"]?([^'")]+)/);
  if (!href || !title) return null;
  return { title, url: ensureHttp(href), poster: posterMatch ? posterMatch[1] : "", isTv: true };
}

async function searchSite(query) {
  const url = BASE + "/?s=" + encodeURIComponent(query);
  const html = await fetchText(url, { headers: { Referer: BASE + "/" } });
  const $ = cheerio.load(html);
  const items = [];
  $("div.block-post").each(function (i, el) {
    const r = toSearchResult($, el);
    if (r) items.push(r);
  });
  return items;
}

async function findPage(queryTitles) {
  const qts = (queryTitles || []).filter(Boolean);
  const aliases = titleAliases(qts);
  // A site result is valid if it matches any TMDB title OR a known alias.
  const matchTitles = [...new Set([...qts, ...aliases])];
  for (const q of buildSearchCandidates(qts, aliases)) {
    try {
      const results = await searchSite(q);
      for (const r of results) {
        if (matchTitle(r.title, matchTitles)) return r;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

function seriesSlug(title) {
  const t = String(title || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return encodeURIComponent(t.replace(/ /g, "-")).toLowerCase();
}

async function tryDirectSeries(title, queryTitles) {
  const slug = seriesSlug(title);
  if (!slug) return null;
  const url = BASE + "/series/" + slug + "/";
  try {
    const html = await fetchText(url, { headers: { Referer: BASE + "/" } });
    if (!html || html.length < 1500) return null;
    const $ = cheerio.load(html);
    const h1 = $("h1").first().text().trim();
    if (!h1 || $("article.postEp").length === 0) return null;
    if (!matchTitle(h1, queryTitles)) return null;
    const img = $("div.singleSeries div.info img, div.singleSeries img, .imgSer, .imgBg").first();
    let poster = img.attr("src") || img.attr("data-src") || "";
    if (!poster) {
      const style = img.attr("style") || "";
      const m = style.match(/url\(['"]?([^'")]+)/);
      if (m) poster = m[1];
    }
    return { title: h1, url, poster: poster ? ensureHttp(poster) : "", isTv: true };
  } catch (e) {
    return null;
  }
}

async function resolveSeriesPage(queryTitles) {
  const qts = (queryTitles || []).filter(Boolean);
  const aliases = titleAliases(qts);
  const matchTitles = [...new Set([...qts, ...aliases])];
  // Fast/fuzzy path: the site search (?s=) over robust candidates.
  const fromSearch = await findPage(qts);
  if (fromSearch) return fromSearch;
  // Robust path: deterministic direct series URLs. krmzy slugs are
  // "مسلسل <name>" (or just "<name>") with spaces as hyphens. This resolves shows
  // that exist on the site but are missing from (or not yet in) the search index.
  const top = [...new Set([...aliases, ...qts.slice(0, 3)])];
  const tried = new Set();
  for (const t of top) {
    for (const cand of ["مسلسل " + t, t]) {
      const slug = seriesSlug(cand);
      if (!slug || tried.has(slug)) continue;
      tried.add(slug);
      const page = await tryDirectSeries(cand, matchTitles);
      if (page) return page;
    }
  }
  return null;
}

async function findSeriesUrl(url) {
  const html = await fetchText(url, { headers: { Referer: BASE + "/" } });
  const $ = cheerio.load(html);
  const seriesAnchor = $("div.singleSeries div.info h1 a").first().attr("href");
  if (seriesAnchor) return ensureHttp(seriesAnchor);
  return null;
}

// krmzy numbers episodes continuously from the series start (1..N) and does
// not separate seasons. Map a TMDB (season, episode) pair to that continuous
// number by summing the episode counts of all earlier seasons (season >= 1).
// Season 1 yields an offset of 0, so it behaves exactly as before.
function seasonOffset(seasonCounts, season) {
  let off = 0;
  for (const sc of seasonCounts || []) {
    if (sc && typeof sc.season === "number" && sc.season < season) off += sc.count || 0;
  }
  return off;
}

async function findEpisode(pageUrl, season, episode) {
  let url = pageUrl;
  if (!/\/series\/[\s\S]*\/?$/.test(url)) {
    try {
      const redirected = await findSeriesUrl(url);
      if (redirected) url = redirected;
    } catch (e) {
      return null;
    }
  }
  try {
    const html = await fetchText(url, { headers: { Referer: BASE + "/" } });
    const $ = cheerio.load(html);
    const eps = [];
    $("article.postEp").each(function (i, el) {
      const link = $(el).find("a").first();
      const href = link.attr("href");
      const epTitle = $(el).find("div.title").first().text().trim() || link.text().trim();
      // Episode number is the numeric span inside div.episodeNum (the other
      // span holds a label like "حلقة"). Pick the numeric one so it works
      // regardless of span order or :last-child support in the host runtime.
      let num = NaN;
      $(el).find("div.episodeNum span").each(function (i, sEl) {
        const n = parseInt($(sEl).text().trim(), 10);
        if (!isNaN(n)) num = n;
      });
      if (href && !isNaN(num)) eps.push({ url: ensureHttp(href), name: epTitle, episode: num });
    });
    eps.reverse();
    const target = typeof episode === "number" ? episode : parseInt(episode, 10);
    if (isNaN(target)) return null;
    const hit = eps.find((e) => e.episode === target);
    return hit || null;
  } catch (e) {
    return null;
  }
}

function labelStreams(label, streams) {
  if (!streams || !streams.length) return streams || [];
  return streams.map((s) => {
    if (!s || !s.url) return s;
    const q = s.quality || "auto";
    return Object.assign({}, s, {
      provider: metadata.name,
      name: metadata.name,
      title: label + " " + q
    });
  });
}

function extractLinkFromObfuscatedPage(url, referers) {
  return new Promise(async (resolve) => {
    let pageText = null;
    for (const ref of referers) {
      try {
        const text = await fetchText(url, { headers: { Referer: ref } });
        if (text.includes("eval(function")) {
          pageText = text;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    if (pageText === null) return resolve(null);
    const unpacked = unpackPacked(pageText);
    const fileRegex = /["']?file["']?\s*:\s*["']([^"']+)["']/;
    const m = fileRegex.exec(unpacked !== pageText ? unpacked : pageText);
    if (!m) return resolve(null);
    resolve(cleanStreamUrl(m[1]));
  });
}

async function resolveHlsRefererAndExpand(streamUrl, originEmbedUrl, baseTitle) {
  const iframeHostReferer = (() => {
    try {
      const u = new URL(originEmbedUrl);
      return u.protocol + "//" + u.host + "/";
    } catch (e) {
      return "https://qesen.net/";
    }
  })();
  const defaultHdr = {
    Referer: iframeHostReferer,
    Origin: iframeHostReferer.replace(/\/$/, ""),
    "User-Agent": HEADERS["User-Agent"] || "Mozilla/5.0",
    Accept: "*/*"
  };
  const urlsetStreams = expandArtRkUrlset(toStream(metadata.name, baseTitle, streamUrl, "auto", defaultHdr));
  if (urlsetStreams) return urlsetStreams;
  const candidates = [iframeHostReferer, "https://qesen.net/"];
  for (const ref of candidates) {
    try {
      const hdr = {
        Referer: ref,
        Origin: ref.replace(/\/$/, ""),
        "User-Agent": HEADERS["User-Agent"] || "Mozilla/5.0",
        Accept: "*/*"
      };
      const text = await fetchText(streamUrl, { headers: hdr });
      return expandFromMasterText(toStream(metadata.name, baseTitle, streamUrl, "auto", hdr), text);
    } catch (e) {
      continue;
    }
  }
  const fallbackHdr = {
    Referer: iframeHostReferer,
    Origin: iframeHostReferer.replace(/\/$/, ""),
    "User-Agent": HEADERS["User-Agent"] || "Mozilla/5.0",
    Accept: "*/*"
  };
  return [toStream(metadata.name, baseTitle, streamUrl, "auto", fallbackHdr)];
}

async function loadLinks(episodeUrl) {
  const streams = [];
  const mainPageHostReferer = (() => {
    try {
      const u = new URL(episodeUrl);
      return u.protocol + "//" + u.host + "/";
    } catch (e) {
      return BASE;
    }
  })();

  let html;
  try {
    html = await fetchText(episodeUrl, { headers: { Referer: mainPageHostReferer } });
  } catch (e) {
    return [];
  }

  const $ = cheerio.load(html);
  const extractorUrl = ($("a.fullscreen-clickable").first().attr("href") || "").trim();
  if (!extractorUrl) return [];

  if (/\.m3u8$/i.test(extractorUrl) || /\.mp4$/i.test(extractorUrl)) {
    streams.push(toStream(metadata.name, metadata.name, extractorUrl, "auto", { Referer: mainPageHostReferer }));
    return streams;
  }

  let servers = [];
  const postParam = extractorUrl.match(/[?&]post=([^&"']+)/);
  if (postParam) {
    try {
      const payload = JSON.parse(base64Decode(postParam[1]));
      const arr = payload.servers || [];
      servers = arr.map((s) => ({ name: s.name || "", id: s.id || "", codeHref: null }));
    } catch (e) {
      servers = [];
    }
  } else {
    try {
      const qesenSince = extractorUrl.includes("krmzi") && /^https?:\/\//i.test(extractorUrl);
      const pageUrl = qesenSince
        ? extractorUrl.replace("qesen.net/krmzi?", "qesen.net/krmzi/?")
        : ensureHttp(extractorUrl);
      const qesenHtml = await fetchText(pageUrl, { headers: { Referer: episodeUrl } });
      const $q = cheerio.load(qesenHtml);
      $q("ul.serversList li").each(function (i, el) {
        const li = $q(el);
        const id = (li.attr("data-server") || li.attr("data-server-id") || "").trim();
        const name = (li.attr("data-name") || li.attr("data-type") || "").trim();
        const codeHref = li.find("code a").first().attr("href") || "";
        servers.push({ name, id, codeHref });
      });
    } catch (e) {
      servers = [];
    }
  }

  const probed = new Set();
  const serverResults = await Promise.all(
    servers.map(async (item) => {
      const serverType = (item.name || "").toLowerCase().trim();
      const serverIdRaw = item.id || "";

      let embedUrl = "";
      switch (serverType) {
        case "youtube": embedUrl = "https://www.youtube.com/watch?v=" + serverIdRaw; break;
        case "youtube_in": embedUrl = "https://www.youtube.com/embed/" + serverIdRaw; break;
        case "express": embedUrl = serverIdRaw; break;
        case "dailymotion": embedUrl = item.codeHref || serverIdRaw; break;
        case "facebook": embedUrl = "https://app.videas.fr/embed/media/" + serverIdRaw; break;
        case "estream": embedUrl = "https://arabveturk.com/embed-" + serverIdRaw + ".html"; break;
        case "arab hd":
        case "arabhd":
        case "arab-hd": embedUrl = "https://v.turkvearab.com/embed-" + serverIdRaw + ".html"; break;
        case "box": embedUrl = "https://youdboox.com/embed-" + serverIdRaw + ".html"; break;
        case "now": embedUrl = "https://extreamnow.org/embed-" + serverIdRaw + ".html"; break;
        case "ok": embedUrl = ensureHttp("//ok.ru/videoembed/" + serverIdRaw); break;
        case "red hd":
        case "redhd":
        case "red-hd": embedUrl = "https://iplayerhls.com/e/" + serverIdRaw; break;
        case "pro hd":
        case "prohd":
        case "pro-hd": embedUrl = "https://ebtv.upns.live/#" + serverIdRaw; break;
        case "pro": embedUrl = "https://mdna.upns.online/#" + serverIdRaw; break;
        default: embedUrl = item.codeHref || serverIdRaw;
      }
      if (!embedUrl) return [];

      if (serverType === "arab hd" || serverType === "arabhd" || serverType === "arab-hd" || serverType === "estream") {
        try {
          const extractedM3u8 = await extractLinkFromObfuscatedPage(embedUrl, [mainPageHostReferer, "https://newaat.com/"]);
          if (!extractedM3u8) return [];
          probed.add(extractedM3u8);
          return await resolveHlsRefererAndExpand(extractedM3u8, embedUrl, item.name || serverType);
        } catch (e) {
          return [];
        }
      } else if (serverType === "youtube" || serverType === "youtube_in") {
        return [toStream(metadata.name, "YouTube", embedUrl, "auto", {})];
      } else if (serverType === "express") {
        try {
          if (/cloud\.mail\.ru\/public/.test(embedUrl)) {
            return labelStreams(item.name || "Express", await extractMailRuPublic(embedUrl, { Referer: mainPageHostReferer }));
          }
          return labelStreams(item.name || "Express", await extractFromUrl(embedUrl, mainPageHostReferer));
        } catch (e) {
          return [];
        }
      } else if (serverType === "dailymotion") {
        try {
          let dmUrl = embedUrl;
          if (!/^https?:\/\//i.test(dmUrl)) dmUrl = "https://www.dailymotion.com/video/" + dmUrl;
          return /dailymotion\.com\/video/.test(dmUrl) ? await extractDailymotion(dmUrl, { Referer: "https://www.dailymotion.com/" }) : await extractFromUrl(dmUrl, mainPageHostReferer);
        } catch (e) {
          return [];
        }
      } else {
        try {
          return labelStreams(item.name || serverType, await extractFromUrl(embedUrl, mainPageHostReferer));
        } catch (e) {
          return [];
        }
      }
    })
  );
  for (const r of serverResults) for (const s of r) streams.push(s);

  const tasks = streams.map(async (s) => {
    if (s.quality === "auto" && s.provider !== "Extractor" && /\.m3u8(\?.*)?$/i.test(s.url) && !probed.has(s.url)) {
      return await expandM3u8Qualities(s);
    }
    return [s];
  });
  const result = [].concat(...(await Promise.all(tasks)));
  return result;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const queryTitles = await getTitles(tmdbId, mediaType);
    const page = await resolveSeriesPage(queryTitles);
    if (!page) return [];
    if (mediaType === "movie") return [];
    let s = parseInt(season, 10);
    if (isNaN(s) || s < 1) s = 1;
    let e = parseInt(episode, 10);
    if (isNaN(e) || e < 1) e = 1;
    // The site has no seasons, so resolve the continuous episode number.
    const counts = await getSeasonCounts(tmdbId, mediaType);
    const continuous = seasonOffset(counts, s) + e;
    const ep = await findEpisode(page.url, s, continuous);
    if (!ep) return [];
    return await loadLinks(ep.url);
  } catch (e) {
    return [];
  }
}

module.exports = {
  metadata,
  getStreams,
  findPage,
  resolveSeriesPage,
  tryDirectSeries,
  searchSite,
  titleAliases,
  buildSearchCandidates,
  findEpisode,
  loadLinks
};