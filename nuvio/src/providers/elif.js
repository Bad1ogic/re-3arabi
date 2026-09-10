const cheerio = require("cheerio-without-node-native");
const { HEADERS, fetchText, absoluteUrl } = require("../lib/http.js");
const { getTitles } = require("../lib/tmdb.js");
const { matchTitle } = require("../lib/normalize.js");
const { extractFromUrl } = require("../lib/extractor.js");

const metadata = {
  id: "elif",
  name: "Elif",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQq14Sk88U37tIhiRndbNczqn0ectswZly90f1oCa_zbg&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

const BASE = "https://n.elif.news";

function fixUrl(url) {
  if (!url) return "";
  return absoluteUrl(BASE, url);
}

async function findPage(queryTitles) {
  for (const t of queryTitles.slice(0, 3)) {
    try {
      const res = await fetch(BASE + "/search.php?keywords=" + encodeURIComponent(t), {
        headers: Object.assign({ Referer: BASE }, HEADERS),
        redirect: "follow",
        skipSizeCheck: true
      });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);
      const results = [];
      $("ul#pm-grid li").each(function (i, el) {
        const titleEl = $(el).find(".caption h3 a").first();
        const title = titleEl.text().trim();
        const href = titleEl.attr("href");
        if (!title || !href) return;
        const thumb = ($(el).find(".pm-video-thumb img").first().attr("src") || "").trim();
        results.push({ title, url: absoluteUrl(res.url || BASE, href), poster: fixUrl(thumb) });
      });
      const hit = results.find((r) => matchTitle(r.title, queryTitles));
      if (hit) return hit;
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function findEpisode(pageUrl, episode) {
  try {
    const html = await fetchText(pageUrl, { headers: { Referer: BASE } });
    const $ = cheerio.load(html);
    const episodes = [];
    const epEls = $("#Season0 a, .tabcontent a");
    const arr = [];
    epEls.each(function (i, el) {
      arr.push(el);
    });
    arr.reverse().forEach((el, index) => {
      const href = $(el).attr("href");
      const epTitle = $(el).attr("title") || "الحلقة " + (index + 1);
      if (href) episodes.push({ url: absoluteUrl(BASE, href), title: epTitle.trim(), episode: index + 1 });
    });
    const hit = episodes.find((e) => e.episode === episode);
    return hit ? hit.url : (episodes.length ? episodes[episodes.length - 1].url : pageUrl);
  } catch (e) {
    return null;
  }
}

async function loadLinks(url) {
  const streams = [];
  let html;
  try {
    const res = await fetch(url, { headers: Object.assign({ Referer: BASE }, HEADERS), skipSizeCheck: true });
    if (!res.ok) return streams;
    html = await res.text();
  } catch (e) {
    return streams;
  }
  const $ = cheerio.load(html);

  const embed = $("link[itemprop=embedUrl]").first().attr("href");
  if (embed) {
    for (const s of await extractFromUrl(absoluteUrl(BASE, embed), url)) streams.push(s);
  }

  let xtgoUrl = $("a.xtgo").first().attr("href");
  if (xtgoUrl && !xtgoUrl.startsWith("http") && !xtgoUrl.startsWith("//")) {
    xtgoUrl = absoluteUrl(BASE, xtgoUrl);
  }
  if (xtgoUrl) {
    try {
      const playerHtml = await fetchText(xtgoUrl, { headers: { Referer: url } });
      const $p = cheerio.load(playerHtml);
      const servers = [];
      $p(".embeding ul li").each(function (i, el) {
        const src = $p(el).attr("data-embed");
        if (src) servers.push(src);
      });
      for (const serverUrl of servers) {
        const found = await extractFromUrl(absoluteUrl(BASE, serverUrl), xtgoUrl);
        for (const s of found) streams.push(s);
      }
    } catch (e) {
      // best effort
    }
  }
  return streams;
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

module.exports = { metadata, getStreams, findPage, findEpisode, loadLinks };