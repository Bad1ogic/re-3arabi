const cheerio = require("cheerio-without-node-native");
const { HEADERS, fetchText } = require("../lib/http.js");
const { getTitles } = require("../lib/tmdb.js");
const { matchTitle } = require("../lib/normalize.js");

const metadata = {
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

let BASE = "https://ak.sv";
let baseResolved = false;

const SEASON_NUMBERS = {
  "الاول": 1, "الأول": 1, "الثاني": 2, "الثالث": 3, "الرابع": 4,
  "الخامس": 5, "السادس": 6, "السابع": 7, "الثامن": 8, "التاسع": 9,
  "العاشر": 10, "الحادي عشر": 11, "الثاني عشر": 12, "الثالث عشر": 13,
  "الرابع عشر": 14, "الخامس عشر": 15, "السادس عشر": 16, "السابع عشر": 17,
  "الثامن عشر": 18, "التاسع عشر": 19, "العشرون": 20
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
  return nums.length ? nums[nums.length - 1] : undefined;
}

function getPoster($, el) {
  const img = $(el).find("img").first();
  return (img.attr("data-src") || img.attr("src") || "").trim();
}

function parseSearch(html) {
  const $ = cheerio.load(html);
  const out = [];
  $("div.col-lg-auto.col-md-4.col-6").each(function (i, el) {
    const a = $(el).find("h3.entry-title a").first();
    const title = a.text().trim();
    const href = $(el).find("a").first().attr("href");
    if (!title || !href) return;
    out.push({ title, url: href, poster: getPoster($, el) });
  });
  return out;
}

async function resolveBase() {
  if (baseResolved) return;
  try {
    const res = await fetch(BASE + "/movies", { headers: HEADERS, redirect: "follow", skipSizeCheck: true });
    if (res.url) {
      const origin = new URL(res.url).origin;
      if (origin) BASE = origin;
    }
  } catch (e) {
    // keep default
  }
  baseResolved = true;
}

async function findPage(queryTitles) {
  await resolveBase();
  for (const t of queryTitles.slice(0, 3)) {
    try {
      const html = await fetchText(BASE + "/search?q=" + encodeURIComponent(t));
      const results = parseSearch(html);
      const hit = results.find((r) => r.title && matchTitle(r.title, queryTitles));
      if (hit) return hit;
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function findEpisode(pageUrl, season, episode) {
  const headers = { Referer: BASE };
  try {
    const mainHtml = await fetchText(pageUrl, { headers });
    const $main = cheerio.load(mainHtml);

    const seasons = [];
    $main("div.widget-body > a.btn[href*='/series/']").each(function (i, el) {
      const href = $main(el).attr("href");
      const name = $main(el).text().trim();
      if (href) seasons.push({ name: name || "موسم", url: href.startsWith("http") ? href : BASE + href });
    });
    const mainHasEpisodes = $main("div#series-episodes div[class*='col-']").length > 0;
    if (!seasons.length && !mainHasEpisodes) return null;

    const candidates = seasons.length ? seasons : [{ name: "موسم", url: pageUrl }];
    const seasonHit = candidates
      .map((s) => ({ s, n: getSeasonNumber(s.name) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => Math.abs(a.n - season) - Math.abs(b.n - season))[0];
    const seasonUrl = seasonHit ? seasonHit.s.url : candidates[0].url;

    const seasonHtml = await fetchText(seasonUrl, { headers });
    const $ = cheerio.load(seasonHtml);
    let ep = null;
    const containers = $("div#series-episodes div.col-lg-4, div#series-episodes div.col-md-6");
    containers.each(function (i, el) {
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
}

async function loadLinks(url, episodeUrl) {
  const streams = [];
  try {
    const step1 = await fetchText(url, { headers: { Referer: BASE } });
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
    const step2 = await fetchText(watchUrl, { headers: { Referer: episodeUrl } });
    const $2 = cheerio.load(step2);
    const seen = new Set();
    $2("source[src]").each(function (i, el) {
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
        quality: quality,
        headers: { Referer: episodeUrl }
      });
    });
  } catch (e) {
    return streams;
  }
  return streams;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  const titles = await getTitles(tmdbId, mediaType);
  if (!titles.length) return [];
  const page = await findPage(titles);
  if (!page) return [];
  if (mediaType === "tv") {
    const ep = await findEpisode(page.url, season || 1, episode || 1);
    if (!ep) return [];
    return await loadLinks(ep.url, ep.url);
  }
  return await loadLinks(page.url, page.url);
}

module.exports = { metadata, getStreams, findPage, findEpisode, loadLinks };