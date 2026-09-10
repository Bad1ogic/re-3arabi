const cheerio = require("cheerio-without-node-native");
const { HEADERS, fetchText, absoluteUrl } = require("../lib/http.js");
const { getTitles } = require("../lib/tmdb.js");
const { matchTitle } = require("../lib/normalize.js");
const { extractFromUrl, extractSmartPlayer } = require("../lib/extractor.js");

const metadata = {
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

const BASE = "https://tuniflix.site";

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
  const isTv = href.includes("/serie/") || ($(el).find(".TpTv").text().toLowerCase().includes("serie"));
  return { title, url: href, poster, isTv };
}

async function findPage(queryTitles) {
  for (const t of queryTitles.slice(0, 3)) {
    try {
      const html = await fetchText(BASE + "/?s=" + encodeURIComponent(t), { headers: { Referer: BASE } });
      const $ = cheerio.load(html);
      const results = [];
      $("article.TPost.B").each(function (i, el) {
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
}

async function findEpisode(pageUrl, season, episode) {
  try {
    const html = await fetchText(pageUrl, { headers: { Referer: BASE } });
    const $ = cheerio.load(html);
    const seasonUrls = [];
    $(".SeasonBx .Title a").each(function (i, el) {
      const href = $(el).attr("href");
      if (href) seasonUrls.push(href);
    });
    const urls = seasonUrls.length ? seasonUrls : [pageUrl];
    for (const seasonUrl of urls) {
      let seasonHtml = seasonUrl === pageUrl ? html : await fetchText(seasonUrl, { headers: { Referer: pageUrl } });
      const $s = cheerio.load(seasonHtml);
      const seasonTitle = ($s("h1.Title").first().text() || "").trim();
      const snMatch = /Season\s*(\d+)/i.exec(seasonTitle);
      let sn = snMatch ? parseInt(snMatch[1], 10) : 1;
      let ep = null;
      $s(".TPTblCn table tr").each(function (i, tr) {
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
}

async function deepSearchIframes(pageUrl, depth, visited) {
  if (depth > 3 || visited.has(pageUrl)) return [];
  visited.add(pageUrl);
  const found = [];
  let html;
  try {
    html = await fetchText(pageUrl, { headers: { Referer: BASE } });
  } catch (e) {
    return found;
  }
  const $ = cheerio.load(html);
  const iframes = [];
  $("iframe").each(function (i, el) {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (src.trim()) iframes.push(fixUrl(src.trim()));
  });
  for (const src of iframes) {
    if (src.includes(BASE) || src.includes("trembed") || src.includes("trid")) {
      const nested = await deepSearchIframes(src, depth + 1, visited);
      for (const n of nested) found.push(n);
    } else {
      found.push(src);
    }
  }
  return [...new Set(found)];
}

async function loadLinks(url) {
  const streams = [];
  const iframes = await deepSearchIframes(url, 0, new Set());
  for (const playerUrl of iframes) {
    let found = [];
    if (playerUrl.includes("#") || playerUrl.includes("id=")) {
      found = await extractSmartPlayer(playerUrl, BASE);
    } else {
      found = await extractFromUrl(playerUrl, BASE);
    }
    for (const s of found) streams.push(s);
  }
  return streams;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  const titles = await getTitles(tmdbId, mediaType);
  if (!titles.length) return [];
  const page = await findPage(titles);
  if (!page) return [];
  if (mediaType === "tv") {
    const epUrl = await findEpisode(page.url, season || 1, episode || 1);
    if (!epUrl) return [];
    return await loadLinks(epUrl);
  }
  return await loadLinks(page.url);
}

module.exports = { metadata, getStreams, findPage, findEpisode, deepSearchIframes, loadLinks };