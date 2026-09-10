const cheerio = require("cheerio-without-node-native");
const { HEADERS } = require("../lib/http.js");
const { getTitles } = require("../lib/tmdb.js");
const { matchTitle } = require("../lib/normalize.js");
const { extractFromUrl } = require("../lib/extractor.js");

const metadata = {
  id: "wecima",
  name: "WeCima",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://wecima.ac/static/img/favicon.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64Decode(input) {
  const clean = String(input || "").replace(/=+$/, "");
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const idx = B64.indexOf(ch);
    if (idx < 0) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

function decodeWecimaUrl(encoded) {
  if (!encoded) return null;
  const cleaned = String(encoded).replace(/\+/g, "").trim();
  const b64 = cleaned.startsWith("aHR0c") ? cleaned : "aHR0c" + cleaned;
  try {
    const decoded = base64Decode(b64);
    return decoded && decoded.startsWith("http") ? decoded : null;
  } catch (e) {
    return null;
  }
}

let BASE = "https://wecima.ac";
let baseResolved = false;

async function resolveBase() {
  if (baseResolved) return;
  try {
    const res = await fetch(BASE + "/search", { headers: HEADERS, redirect: "follow", skipSizeCheck: true });
    const finalUrl = (res.url || "").split("/search")[0];
    if (finalUrl && finalUrl.startsWith("http")) BASE = finalUrl;
  } catch (e) {
    // keep default
  }
  baseResolved = true;
}

async function performSearch(query) {
  const url = BASE + "/search";
  let text;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: Object.assign(
        { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", Referer: BASE + "/" },
        HEADERS
      ),
      body: "q=" + encodeURIComponent(query),
      skipSizeCheck: true
    });
    if (!res.ok) return [];
    text = await res.text();
  } catch (e) {
    return [];
  }
  try {
    const parsed = JSON.parse(text);
    const results = parsed.results || [];
    const out = [];
    for (const item of results) {
      const title = item.title;
      const slug = item.slug;
      if (!title || !slug) continue;
      if (item.istv === 2) continue;
      if (parseInt(item.istv, 10) === 0) continue; // movies-only search for simplicity
      const encodedSlug = slug;
      out.push({ title, url: slug.startsWith("http") ? slug : BASE + "/series/" + encodedSlug, poster: item.image });
    }
    return out;
  } catch (e) {
    return [];
  }
}

async function findPage(queryTitles) {
  await resolveBase();
  for (const t of queryTitles.slice(0, 3)) {
    const results = await performSearch(t);
    const hit = results.find((r) => matchTitle(r.title, queryTitles));
    if (hit) return hit;
  }
  return null;
}

async function fetchSeriesEpisodes(seriesUrl) {
  let html;
  try {
    const res = await fetch(seriesUrl, { headers: Object.assign({ Referer: BASE + "/" }, HEADERS), skipSizeCheck: true });
    if (!res.ok) return [];
    html = await res.text();
  } catch (e) {
    return [];
  }
  const $ = cheerio.load(html);
  const episodes = [];
  const seasonEls = $("div.List--Seasons--Episodes a.SeasonsEpisodes");
  if (seasonEls.length) {
    for (let i = 0; i < seasonEls.length; i++) {
      const el = seasonEls.eq(i);
      const seasonNum = /الموسم (\d+)/.exec(el.text());
      const dataId = el.attr("data-id");
      const dataSeason = el.attr("data-season");
      if (!dataId || !dataSeason) continue;
      let seasonHtml = "";
      try {
        const res = await fetch(BASE + "/ajax/Episode", {
          method: "POST",
          headers: Object.assign(
            { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", Referer: seriesUrl },
            HEADERS
          ),
          body: "post_id=" + encodeURIComponent(dataId) + "&season=" + encodeURIComponent(dataSeason),
          skipSizeCheck: true
        });
        if (res.ok) seasonHtml = await res.text();
      } catch (e) {
        continue;
      }
      const $s = cheerio.load(seasonHtml);
      $s("a.hoverable.activable").each(function (j, epEl) {
        const href = $s(epEl).attr("href");
        const name = ($s(epEl).find("episodetitle").first().text() || "").trim();
        const epMatch = /الحلقة (\d+)/.exec(name);
        if (href) {
          episodes.push({ url: href, name, season: seasonNum ? parseInt(seasonNum[1], 10) : undefined, episode: epMatch ? parseInt(epMatch[1], 10) : undefined });
        }
      });
    }
  } else {
    $(".EpisodesList.Full--Width a").each(function (i, el) {
      const href = $(el).attr("href");
      const name = ($(el).find("episodetitle").first().text() || "").trim();
      const epMatch = /الحلقة (\d+)/.exec(name);
      if (href) episodes.push({ url: href, name, season: 1, episode: epMatch ? parseInt(epMatch[1], 10) : undefined });
    });
  }
  return episodes;
}

async function loadLinks(url) {
  const streams = [];
  let html;
  try {
    const res = await fetch(url, { headers: Object.assign({ Referer: BASE + "/" }, HEADERS), skipSizeCheck: true });
    if (!res.ok) return streams;
    html = await res.text();
  } catch (e) {
    return streams;
  }
  const $ = cheerio.load(html);
  const candidates = [];
  $("ul.WatchServersList li btn").each(function (i, el) {
    const decoded = decodeWecimaUrl($(el).attr("data-url"));
    if (decoded) candidates.push(decoded);
  });
  $(".openLinkDown").each(function (i, el) {
    const decoded = decodeWecimaUrl($(el).attr("data-href"));
    if (decoded) candidates.push(decoded);
  });
  for (const embed of [...new Set(candidates)]) {
    const found = await extractFromUrl(embed, BASE + "/");
    for (const s of found) streams.push(s);
  }
  return streams;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  const titles = await getTitles(tmdbId, mediaType);
  if (!titles.length) return [];
  const page = await findPage(titles);
  if (!page) return [];
  await resolveBase();
  if (mediaType === "tv") {
    const episodes = await fetchSeriesEpisodes(page.url);
    const hit = episodes.find((e) => e.season === (season || 1) && e.episode === (episode || 1));
    if (!hit) return [];
    return await loadLinks(hit.url);
  }
  return await loadLinks(page.url);
}

module.exports = { metadata, getStreams, findPage, fetchSeriesEpisodes, loadLinks };