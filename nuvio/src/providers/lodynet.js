const cheerio = require("cheerio-without-node-native");
const { HEADERS, fetchText } = require("../lib/http.js");
const { getTitles } = require("../lib/tmdb.js");
const { matchTitle } = require("../lib/normalize.js");
const { extractFromUrl, extractSmartPlayer, toStream } = require("../lib/extractor.js");

const metadata = {
  id: "lodynet",
  name: "LodyNet",
  description: "",
  version: "2.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://lodynet.watch/wp-content/themes/Lodynet2020/Img/Logo.webp",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

const BASE = "https://lodynet.watch";
const SEARCH_API = BASE + "/wp-content/themes/Lodynet2020/Api/RequestSearch.php";
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(input) {
  const clean = String(input || "").replace(/=+$/, "");
  if (!clean) return "";
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

function fixUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  return BASE + "/" + String(url).replace(/^\/+/, "");
}

async function searchResults(query) {
  const res = await fetch(SEARCH_API + "?value=" + encodeURIComponent(query), { headers: HEADERS, skipSizeCheck: true });
  if (!res.ok) return [];
  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return [];
  }
  if (!Array.isArray(json) || json.length < 2) return [];
  const items = json[1] || [];
  const out = [];
  for (const item of items) {
    if (!item || !item.url || !item.title) continue;
    out.push({ title: item.title, url: fixUrl(item.url), cover: item.cover || "" });
  }
  return out;
}

async function findPage(queryTitles) {
  for (const t of queryTitles.slice(0, 3)) {
    try {
      const results = await searchResults(t);
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
    let epUrl = null;
    $("#ListEpisodes .ItemEpisode, #ListEpisodes .CurrentEpisode").each(function (i, el) {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      let epNum = parseInt($(el).attr("id") && $(el).attr("id").replace("Ep", ""), 10);
      if (isNaN(epNum)) {
        const m = /\d+/.exec(name);
        epNum = m ? parseInt(m[0], 10) : undefined;
      }
      if (href && epNum === episode) {
        epUrl = fixUrl(href);
        return false;
      }
    });
    return epUrl;
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
  const currentBase = new URL(url).origin;
  const dynamicEmbedApi = currentBase + "/wp-content/themes/Lodynet2020/Api/RequestServerEmbed.php";
  const tokenVidloMatch = /"TokenVidlo"\s*:\s*"([^"]+)"/.exec(html);
  const tokenVidlo = tokenVidloMatch ? tokenVidloMatch[1] : "";
  const postIdMatch = /SeoData\.Id\s*=\s*(\d+)/.exec(html);
  const postId = postIdMatch ? postIdMatch[1] : null;

  const $ = cheerio.load(html);
  const servers = [];
  const serversJson = /ServersWatch\s*:\s*(\[\s*\{.*?\}\s*\])/s.exec(html);
  if (serversJson) {
    let parsed = [];
    try {
      parsed = JSON.parse(serversJson[1]);
    } catch (e) {
      parsed = [];
    }
    for (const s of parsed) {
      servers.push({ name: s.Name, embed: s.Embed, id: s.Id, encrypted: !!s.Encrypted });
    }
  }
  if (!servers.length) {
    $("#AllServerWatch button").each(function (i, el) {
      const onclick = $(el).attr("onclick") || "";
      const m = /SwitchServer\(this,\s*(\d+)/.exec(onclick);
      if (m) servers.push({ name: $(el).text().trim(), embed: "", id: parseInt(m[1], 10), encrypted: true });
    });
  }

  for (const server of servers) {
    try {
      let embedUrl = "";
      if (server.embed) {
        embedUrl = decodeBase64(server.embed);
      } else if (server.encrypted && server.id != null && postId) {
        const res = await fetch(dynamicEmbedApi, {
          method: "POST",
          headers: Object.assign(
            { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", Origin: currentBase, Referer: url },
            HEADERS
          ),
          body: "PostID=" + encodeURIComponent(postId) + "&ServerID=" + encodeURIComponent(server.id),
          skipSizeCheck: true
        });
        if (res.ok) {
          embedUrl = (await res.text()).trim().replace(/"/g, "").replace(/\\\//g, "/");
        }
      }
      if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;
      if (!embedUrl.startsWith("http")) continue;

      const isVidlo = (server.name && /vid\s?lo/i.test(server.name)) || /vidlo/i.test(embedUrl);
      if (isVidlo) {
        const vidloUrl = tokenVidlo ? (embedUrl.includes("?") ? embedUrl + "&" + tokenVidlo.replace(/^\?/, "") : embedUrl + tokenVidlo) : embedUrl;
        try {
          const vidloRes = await fetch(vidloUrl, { headers: Object.assign({ Referer: BASE + "/", Accept: "text/html,*/*" }, HEADERS), skipSizeCheck: true });
          if (vidloRes.ok) {
            const body = await vidloRes.text();
            const sourcesMatch = /sources\s*:\s*\[(.*?)\]/s.exec(body);
            if (sourcesMatch) {
              const src = sourcesMatch[1];
              const files = [...src.matchAll(/file\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
              for (const file of files) {
                streams.push(toStream("LodyNet", /\.m3u8/i.test(file) ? "Vidlo HLS" : "Vidlo", cleanFile(file), "auto", { Referer: BASE + "/" }));
              }
            }
          }
        } catch (e) {
          continue;
        }
        continue;
      }

      if (embedUrl.includes("lodynet") && embedUrl.includes("/embed")) {
        try {
          const embedDoc = cheerio.load(await fetchText(embedUrl, { headers: { Referer: url } }));
          const realSource = embedDoc("iframe").first().attr("src");
          if (realSource) embedUrl = fixUrl(realSource);
        } catch (e) {
          // keep original
        }
      }

      if (embedUrl.includes("#") || embedUrl.includes("id=")) {
        for (const s of await extractSmartPlayer(embedUrl, url)) streams.push(s);
      } else {
        for (const s of await extractFromUrl(embedUrl, url)) streams.push(s);
      }
    } catch (e) {
      continue;
    }
  }
  return streams;
}

function cleanFile(f) {
  return String(f || "").replace(/\\\//g, "/").trim();
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