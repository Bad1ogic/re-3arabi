const { fetchText, HEADERS, absoluteUrl } = require("../lib/http.js");
const cheerio = require("cheerio-without-node-native");
const { unpackPacked, extractFromUrl, extractDailymotion, toStream, cleanStreamUrl } = require("../lib/extractor.js");
const { matchTitle } = require("../lib/normalize.js");
const { getTitles } = require("../lib/tmdb.js");

const metadata = {
  id: "krmzy",
  name: "Krmzy",
  description: "البحث لا يعمل حاليا مشكلة من الموقع",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwTnAJOvyri3uHzHxjkEdlaBBKs8MAvIuJtFmCoo9u5qYiuFpHZjcl6tDi&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

const BASE = "https://krmzy.com";

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
  for (const q of queryTitles) {
    try {
      const results = await searchSite(q);
      for (const r of results) {
        if (matchTitle(r.title, queryTitles)) return r;
      }
    } catch (e) {
      continue;
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

async function findEpisode(pageUrl, season, episode) {
  let url = pageUrl;
  try {
    const redirected = await findSeriesUrl(url);
    if (redirected) url = redirected;
  } catch (e) {
    return null;
  }
  try {
    const html = await fetchText(url, { headers: { Referer: BASE + "/" } });
    const $ = cheerio.load(html);
    const eps = [];
    $("article.postEp").each(function (i, el) {
      const link = $(el).find("a").first();
      const href = link.attr("href");
      const epTitle = $(el).find("div.title").first().text().trim() || link.text().trim();
      const numText = $(el).find("div.episodeNum span:last-child").first().text().trim();
      const num = parseInt(numText, 10);
      if (href && !isNaN(num)) eps.push({ url: ensureHttp(href), name: epTitle, episode: num });
    });
    eps.reverse();
    const hit = eps.find((e) => e.episode === episode);
    return hit || null;
  } catch (e) {
    return null;
  }
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

async function checkWorkingStreamReferer(streamUrl, originEmbedUrl) {
  const iframeHostReferer = (() => {
    try {
      const u = new URL(originEmbedUrl);
      return u.protocol + "//" + u.host + "/";
    } catch (e) {
      return "https://qesen.net/";
    }
  })();
  const candidates = [iframeHostReferer, "https://qesen.net/", "https://newaat.com/"];
  for (const ref of candidates) {
    try {
      const res = await fetch(streamUrl, { headers: { Referer: ref, Origin: ref.trimEnd("/") }, skipSizeCheck: true, redirect: "follow" });
      if (res.status === 200) return ref;
    } catch (e) {
      continue;
    }
  }
  return iframeHostReferer;
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

  for (const item of servers) {
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
    if (!embedUrl) continue;

    if (serverType === "arab hd" || serverType === "arabhd" || serverType === "arab-hd" || serverType === "estream") {
      try {
        const extractedM3u8 = await extractLinkFromObfuscatedPage(embedUrl, [mainPageHostReferer, "https://newaat.com/"]);
        if (!extractedM3u8) continue;
        const workingReferer = await checkWorkingStreamReferer(extractedM3u8, embedUrl);
        streams.push(toStream(metadata.name, item.name || serverType, extractedM3u8, "auto", {
          Referer: workingReferer,
          Origin: workingReferer.trimEnd("/"),
          "User-Agent": HEADERS["User-Agent"] || "Mozilla/5.0",
          Accept: "*/*"
        }));
      } catch (e) {
        continue;
      }
    } else if (serverType === "youtube" || serverType === "youtube_in") {
      streams.push(toStream(metadata.name, "YouTube", embedUrl, "auto", {}));
    } else if (serverType === "dailymotion") {
      try {
        let dmUrl = embedUrl;
        if (!/^https?:\/\//i.test(dmUrl)) dmUrl = "https://www.dailymotion.com/video/" + dmUrl;
        const dStreams = /dailymotion\.com\/video/.test(dmUrl) ? await extractDailymotion(dmUrl, { Referer: "https://www.dailymotion.com/" }) : await extractFromUrl(dmUrl, mainPageHostReferer);
        for (const s of dStreams) streams.push(s);
      } catch (e) {
        continue;
      }
    } else {
      try {
        const sub = await extractFromUrl(embedUrl, mainPageHostReferer);
        for (const s of sub) streams.push(s);
      } catch (e) {
        continue;
      }
    }
  }

  return streams;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const queryTitles = await getTitles(tmdbId, mediaType);
    const page = await findPage(queryTitles);
    if (!page) return [];
    if (mediaType === "movie") return [];
    const ep = await findEpisode(page.url, season || 1, episode || 1);
    if (!ep) return [];
    return await loadLinks(ep.url);
  } catch (e) {
    return [];
  }
}

module.exports = { metadata, getStreams, findPage, findEpisode, loadLinks };