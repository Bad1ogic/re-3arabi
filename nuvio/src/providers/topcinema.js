const cheerio = require("cheerio-without-node-native");
const { HEADERS, fetchText, absoluteUrl } = require("../lib/http.js");
const { getTitles } = require("../lib/tmdb.js");
const { matchTitle } = require("../lib/normalize.js");
const { extractFromUrl } = require("../lib/extractor.js");

const metadata = {
  id: "topcinema",
  name: "TopCinema",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://web8.topcinema.cam/wp-content/uploads/2023/05/cropped-icon-32x32.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true,
  hasDownloadSupport: true
};

const BASE = "https://web8.topcinema.cam";
const AJAX_URL = BASE2 => BASE2 + "/wp-content/themes/movies2023/Ajaxat/Single/Server.php";

function baseOf(url) {
  try {
    return new URL(url).origin;
  } catch (e) {
    return BASE;
  }
}

function toSearchResult($, el) {
  const a = $(el).find("a").first();
  const href = a.attr("href");
  const title = a.attr("title") || a.text().trim();
  if (!href || !title) return null;
  const img = a.find("img").first();
  const poster = img.attr("data-src") || img.attr("src") || "";
  const isMovie = title.toLowerCase().includes("فيلم");
  const isSeries = title.toLowerCase().includes("مسلسل");
  let isTv;
  if (isMovie && !isSeries) isTv = false;
  else if (isSeries) isTv = true;
  else isTv = $(el).find(".number, .epnum").length > 0 || href.includes("/series/");
  return { title, url: href, poster, isTv };
}

async function findPage(queryTitles) {
  for (const t of queryTitles.slice(0, 3)) {
    try {
      const html = await fetchText(BASE + "/search/?query=" + encodeURIComponent(t) + "&type=all");
      const $ = cheerio.load(html);
      const results = [];
      $(".Posts--List .Small--Box").each(function (i, el) {
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

function parseEps($, scope) {
  const eps = [];
  scope.each(function (i, el) {
    const link = $(el);
    const epUrl = link.attr("href");
    const epTitle = link.find("h2").first().text().trim();
    const epText = (link.find(".epnum").first().text() || "").replace("الحلقة", "").trim();
    const epNum = parseInt(epText, 10);
    if (epUrl) eps.push({ url: epUrl, title: epTitle, episode: isNaN(epNum) ? undefined : epNum });
  });
  return eps;
}

async function findEpisodeData(pageUrl, season, episode) {
  try {
    const html = await fetchText(pageUrl, { headers: { Referer: BASE } });
    const $ = cheerio.load(html);
    const seasons = [];
    $("section.allseasonss .Small--Box.Season a").each(function (i, el) {
      const href = $(el).attr("href");
      const seasonText = ($(el).find(".epnum").first().text() || "").replace("الموسم", "").trim();
      const sn = parseInt(seasonText, 10);
      if (href) seasons.push({ url: href, season: isNaN(sn) ? undefined : sn });
    });

    if (seasons.length) {
      const target = seasons.filter((s) => s.season === season);
      const chosen = target[0] || seasons[0];
      let seasonHtml = html;
      if (chosen.url && chosen.url !== pageUrl) {
        try {
          seasonHtml = await fetchText(chosen.url, { headers: { Referer: pageUrl } });
        } catch (e) {
          seasonHtml = html;
        }
      }
      const $s = cheerio.load(seasonHtml);
      const eps = parseEps($s, $s(".allepcont .row > a"));
      const hit = eps.find((e) => e.episode === episode);
      if (hit) return hit.url + "/watch/||" + hit.url + "/download/";
      return null;
    }
    const eps = parseEps($, $(".allepcont .row > a"));
    const hit = eps.find((e) => e.episode === episode);
    if (hit) return hit.url + "/watch/||" + hit.url + "/download/";
    return null;
  } catch (e) {
    return null;
  }
}

function unwrapPlayUrl(url) {
  const idx = url.indexOf("play.php?to=");
  if (idx >= 0) {
    try {
      const decoded = decodeURIComponent(url.substring(idx + "play.php?to=".length)).trim();
      return decoded.startsWith("http") ? decoded : "https:" + decoded.trim().replace(/^:/, "");
    } catch (e) {
      return url;
    }
  }
  return url;
}

async function loadLinks(data) {
  const links = {};
  const parts = String(data).split("||").filter(Boolean);
  for (const rawUrl of parts) {
    try {
      if (rawUrl.includes("/watch/")) {
        const res = await fetch(rawUrl, { headers: Object.assign({ Referer: BASE }, HEADERS), redirect: "follow", skipSizeCheck: true });
        if (!res.ok) continue;
        const finalWatchUrl = res.url || rawUrl;
        const base = baseOf(finalWatchUrl);
        const html = await res.text();
        const $ = cheerio.load(html);
        $(".player--iframe iframe").each(function (i, el) {
          const src = $(el).attr("src");
          if (src) links[absoluteUrl(finalWatchUrl, src)] = finalWatchUrl;
        });
        const servers = [];
        $(".watch--servers--list li.server--item").each(function (i, el) {
          servers.push({ id: $(el).attr("data-id"), srv: $(el).attr("data-server") });
        });
        for (const srv of servers) {
          if (!srv.id && !srv.srv) continue;
          try {
            const ajax = await fetch(AJAX_URL(base), {
              method: "POST",
              headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", Referer: finalWatchUrl }, HEADERS),
              body: "id=" + encodeURIComponent(srv.id || "") + "&i=" + encodeURIComponent(srv.srv || ""),
              skipSizeCheck: true
            });
            if (ajax.ok) {
              const $a = cheerio.load(await ajax.text());
              $a("iframe").each(function (i, el) {
                const src = $a(el).attr("src");
                if (src) links[src] = finalWatchUrl;
              });
            }
          } catch (e) {
            continue;
          }
        }
      } else if (rawUrl.includes("/download/")) {
        const res = await fetch(rawUrl, { headers: Object.assign({ Referer: BASE }, HEADERS), redirect: "follow", skipSizeCheck: true });
        if (!res.ok) continue;
        const finalDownloadUrl = res.url || rawUrl;
        const $ = cheerio.load(await res.text());
        $("a.downloadsLink").each(function (i, el) {
          const href = $(el).attr("href");
          if (href) links[href] = finalDownloadUrl;
        });
      } else {
        links[rawUrl] = baseOf(rawUrl);
      }
    } catch (e) {
      continue;
    }
  }

  const streams = [];
  const rawLinks = Object.keys(links);
  const CONCURRENCY = 4;
  async function worker(queue) {
    while (queue.length) {
      const rawLink = queue.shift();
      const referer = links[rawLink];
      const finalLink = unwrapPlayUrl(rawLink);
      try {
        const found = await extractFromUrl(finalLink, referer);
        for (const s of found) streams.push(s);
      } catch (e) {
        continue;
      }
    }
  }
  const queue = rawLinks.slice();
  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) workers.push(worker(queue));
  await Promise.all(workers);
  return streams;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  const titles = await getTitles(tmdbId, mediaType);
  if (!titles.length) return [];
  const page = await findPage(titles);
  if (!page) return [];
  if (mediaType === "tv") {
    const data = await findEpisodeData(page.url, season || 1, episode || 1);
    if (!data) return [];
    return await loadLinks(data);
  }
  return await loadLinks(page.url + "/watch/||" + page.url + "/download/");
}

module.exports = { metadata, getStreams, findPage, findEpisodeData, loadLinks };