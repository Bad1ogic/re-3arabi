const cheerio = require("cheerio-without-node-native");
const { HEADERS, fetchText } = require("../lib/http.js");
const { getTitles } = require("../lib/tmdb.js");
const { matchTitle } = require("../lib/normalize.js");
const { extractFromUrl } = require("../lib/extractor.js");

const metadata = {
  id: "cimaclub",
  name: "CimaClub",
  description: "سيرفرات الموقع بها ضعف احيانا اذا لم يفتح غالبا المشكلة من الموقع",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQX1z-0NYyzyEiFs4q7X9c8SSBR6kJtVl7f7A&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

const BASE = "https://cimacub.com";

function toSearchResult($, el) {
  const title = $(el).find("inner--title > h2").first().text().trim();
  const href = $(el).find("a").first().attr("href");
  if (!title || !href) return null;
  const img = $(el).find("img").first();
  const poster = (img.attr("data-src") || img.attr("src") || "").trim();
  const isTv = href.includes("/series/") || href.includes("/مسلسل-") || $(el).find(".number").length > 0;
  return { title, url: href, poster, isTv: isTv || href.includes("/series/") };
}

async function findPage(queryTitles) {
  for (const t of queryTitles.slice(0, 3)) {
    try {
      const html = await fetchText(BASE + "/?s=" + encodeURIComponent(t).replace(/%20/g, "+"));
      const $ = cheerio.load(html);
      const results = [];
      $("div.BlocksHolder > div.Small--Box").each(function (i, el) {
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

async function fetchEpisodeUrl(pageUrl, season, episode) {
  let doc;
  try {
    doc = cheerio.load(await fetchText(pageUrl, { headers: { Referer: BASE } }));
  } catch (e) {
    return null;
  }
  const seasons = [];
  doc("section.allseasonss .Small--Box a").each(function (i, el) {
    const href = doc(el).attr("href");
    const seasonText = doc(el).find(".epnum span").first().next().text().trim();
    const seasonNum = parseInt(seasonText, 10);
    if (href) seasons.push({ url: href, season: isNaN(seasonNum) ? undefined : seasonNum });
  });

  const parseEps = ($) => {
    const eps = [];
    $("section.allepcont .row a").each(function (i, el) {
      const href = $(el).attr("href");
      const name = $(el).find(".ep-info h2").first().text().trim();
      const epText = $(el).find(".epnum").first().text().trim();
      const epNum = parseInt(epText, 10);
      if (href) eps.push({ url: href, name, episode: isNaN(epNum) && epText ? parseInt(epText.replace(/\D+/g, ""), 10) : epNum });
    });
    return eps;
  };

  if (seasons.length) {
    const target = seasons.filter((s) => s.season === season);
    const chosen = target[0] || seasons[0];
    let seasonDoc = doc;
    if (chosen.url && chosen.url !== pageUrl) {
      try {
        seasonDoc = cheerio.load(await fetchText(chosen.url, { headers: { Referer: pageUrl } }));
      } catch (e) {
        seasonDoc = doc;
      }
    }
    const eps = parseEps(seasonDoc);
    const hit = eps.find((e) => e.episode === episode);
    return hit ? hit.url : null;
  }
  const eps = parseEps(doc);
  const hit = eps.find((e) => e.episode === episode);
  return hit ? hit.url : null;
}

async function loadLinks(watchUrl) {
  const streams = [];
  const headers = Object.assign({ Referer: watchUrl, "X-Requested-With": "XMLHttpRequest" }, HEADERS);
  let html;
  try {
    const res = await fetch(watchUrl, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded" }, headers),
      body: "watch=1",
      skipSizeCheck: true
    });
    if (!res.ok) return streams;
    html = await res.text();
  } catch (e) {
    return streams;
  }
  const $ = cheerio.load(html);
  const embeds = [];
  $("ul#watch li").each(function (i, el) {
    const u = $(el).attr("data-watch");
    if (u) embeds.push(u);
  });
  $(".ServersList.Download a").each(function (i, el) {
    const u = $(el).attr("href");
    if (u) embeds.push(u);
  });
  for (const embed of [...new Set(embeds)]) {
    const found = await extractFromUrl(embed, watchUrl);
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
    const epUrl = await fetchEpisodeUrl(page.url, season || 1, episode || 1);
    if (!epUrl) return [];
    return await loadLinks(epUrl);
  }
  const watchUrl = page.url.replace(/\/+$/, "") + "/watch/";
  return await loadLinks(watchUrl);
}

module.exports = { metadata, getStreams, findPage, fetchEpisodeUrl, loadLinks };