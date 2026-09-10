const cheerio = require("cheerio-without-node-native");
const { HEADERS, fetchText, absoluteUrl } = require("../lib/http.js");
const { getTitles } = require("../lib/tmdb.js");
const { matchTitle } = require("../lib/normalize.js");
const { extractFromUrl } = require("../lib/extractor.js");

const metadata = {
  id: "faselhd",
  name: "FaselHD",
  description: "",
  version: "3.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ03aoQBNDy_Hkm5MUGGvluPvK7To7BdGiSnzQn7WJ3fQ&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

const BASE = "https://web31312x.faselhdx.bid";
const BLOCKED = ["google.com/recaptcha", "google.com/ads", "googlesyndication.com", "googletagmanager.com", "doubleclick.net"];

async function smartGet(url, referer) {
  const res = await fetch(url, {
    headers: Object.assign({ Referer: referer || BASE }, HEADERS),
    redirect: "follow",
    skipSizeCheck: true
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return { html: await res.text(), url: res.url || url };
}

async function findPage(queryTitles) {
  await smartGet(BASE + "/main", BASE).catch(() => null);
  for (const t of queryTitles.slice(0, 3)) {
    try {
      const { html } = await smartGet(BASE + "/?s=" + encodeURIComponent(t), BASE);
      const res = await fetch(BASE + "/?s=" + encodeURIComponent(t), { headers: HEADERS, redirect: "follow", skipSizeCheck: true });
      const final = res.url || BASE;
      const $ = cheerio.load(html);
      const results = [];
      $("div#postList div.postDiv, div.postDiv, article").each(function (i, el) {
        const a = $(el).find("a").first();
        const href = (a.attr("href") || "").trim();
        const title = ($(el).find(".h1, .h4, .h5").first().text() || "").trim();
        const img = $(el).find("img").first();
        const poster = (img.attr("data-src") || img.attr("src") || "").trim();
        if (href && title) results.push({ title, url: absoluteUrl(final, href), poster });
      });
      const hit = results.find((r) => matchTitle(r.title, queryTitles));
      if (hit) return hit;
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function extractIframeSources(html, pageUrl) {
  const results = new Set();
  const add = (u) => {
    const fixed = absoluteUrl(pageUrl, u);
    if (BLOCKED.some((k) => fixed.includes(k))) return;
    results.add(fixed);
  };
  const $ = cheerio.load(html);
  $("iframe[src]").each(function (i, el) {
    const src = $(el).attr("src");
    if (src && src.trim()) add(src.trim());
  });
  $("[onclick]").each(function (i, el) {
    const onclick = $(el).attr("onclick") || "";
    const m = /player_iframe\.location\.href\s*=\s*['"]([^'"]+)['"]/.exec(onclick);
    if (m) add(m[1]);
  });
  const scriptRe = /https?:\/\/[^\s"'<>]+/g;
  $("script").each(function (i, el) {
    const data = $(el).html() || "";
    if (!data.trim()) return;
    let m;
    while ((m = scriptRe.exec(data)) !== null) {
      const u = m[0];
      if (u.includes("player") || u.includes("embed")) add(u);
    }
  });
  $("div.shortLink, span#liskSh, a[data-src]").each(function (i, el) {
    const t = $(el).text().trim();
    if (t.startsWith("http")) add(t);
  });
  return [...results];
}

async function loadLinks(url) {
  const streams = [];
  let html;
  try {
    const res = await fetch(url, { headers: Object.assign({ Referer: BASE }, HEADERS), redirect: "follow", skipSizeCheck: true });
    if (!res.ok) return streams;
    html = await res.text();
  } catch (e) {
    return streams;
  }
  const finalUrl = (await fetch(url, { headers: HEADERS, redirect: "follow", skipSizeCheck: true }).then((r) => r.url).catch(() => url));
  const iframes = await extractIframeSources(html, finalUrl || url);
  for (const iframeUrl of iframes) {
    try {
      const found = await extractFromUrl(iframeUrl, url);
      for (const s of found) streams.push(s);
    } catch (e) {
      continue;
    }
  }
  return streams;
}

async function findEpisode(pageUrl, episode) {
  try {
    const res = await fetch(pageUrl, { headers: Object.assign({ Referer: BASE }, HEADERS), redirect: "follow", skipSizeCheck: true });
    if (!res.ok) return null;
    const $ = cheerio.load(await res.text());
    let epUrl = null;
    $("div#epAll a").each(function (i, el) {
      const hrefRaw = ($(el).attr("href") || "").trim();
      if (!hrefRaw) return;
      const epTitle = $(el).text().trim();
      if (epTitle.includes("باقي الحلقات") || epTitle.includes("المزيد")) return;
      const m = /\d+/.exec(epTitle);
      const epNum = m ? parseInt(m[0], 10) : undefined;
      if (epNum === episode) {
        epUrl = absoluteUrl(res.url || pageUrl, hrefRaw);
        return false;
      }
    });
    return epUrl;
  } catch (e) {
    return null;
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  const titles = await getTitles(tmdbId, mediaType);
  if (!titles.length) return [];
  const page = await findPage(titles);
  if (!page) return [];
  if (mediaType === "tv") {
    const epUrl = await findEpisode(page.url, episode || 1);
    if (!epUrl) return [];
    return await loadLinks(epUrl);
  }
  return await loadLinks(page.url);
}

module.exports = { metadata, getStreams, findPage, findEpisode, extractIframeSources, loadLinks };