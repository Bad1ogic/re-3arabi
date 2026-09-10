const { fetchText, absoluteUrl } = require("./http.js");

const DIRECT_VIDEO = /\.(m3u8|mp4|mkv|webm|avi)(\?.*)?$/i;
const M3U8_RE = /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi;
const MP4_RE = /https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi;

function cleanStreamUrl(raw) {
  return String(raw)
    .replace(/\\\//g, "/")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/&amp;/g, "&")
    .trim();
}

function stripUrls(raw) {
  return String(raw)
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");
}

function unescapeJsString(str) {
  return String(str).replace(/\\(?:x([0-9a-fA-F]{2})|[\\'"nrt])/g, (m, h) => {
    if (h) return String.fromCharCode(parseInt(h, 16));
    if (m === "\\'") return "'";
    if (m === '\\"') return '"';
    if (m === "\\\\") return "\\";
    return m === "\\n" ? "\n" : m === "\\r" ? "\r" : "\t";
  });
}

function unpackPacked(text) {
  const regex = /\}\((['"])([\s\S]*?)\1,(\d+),(\d+),(['"])([\s\S]*?)\5/;
  const match = regex.exec(String(text));
  if (!match) return text;
  const [, , payload, baseStr, countStr, , namesRaw] = match;
  const base = parseInt(baseStr, 10);
  const count = parseInt(countStr, 10);
  const names = unescapeJsString(namesRaw)
    .split("|")
    .map((n) => unescapeJsString(n));
  let out = unescapeJsString(payload);
  for (let i = count - 1; i >= 0; i--) {
    const word = names[i];
    if (word) {
      out = out.replace(new RegExp("\\b" + i.toString(base) + "\\b", "g"), word);
    }
  }
  return out;
}

function extractMediaUrls(raw) {
  const text = stripUrls(raw);
  const out = [];
  const seen = new Set();

  function push(url, quality) {
    url = cleanStreamUrl(url);
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      if (!url.startsWith("//")) return;
      url = "https:" + url;
    }
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ url, quality: quality || "auto" });
  }

  if (M3U8_RE.test(text)) {
    M3U8_RE.lastIndex = 0;
    let m;
    while ((m = M3U8_RE.exec(text)) !== null) {
      push(m[0], "auto");
    }
  }
  if (MP4_RE.test(text)) {
    MP4_RE.lastIndex = 0;
    let m;
    while ((m = MP4_RE.exec(text)) !== null) {
      push(m[0], "auto");
    }
  }
  const sourceRe = /(?:source|src|file|url)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mkv|webm|avi)[^"']*)["']/gi;
  let m;
  while ((m = sourceRe.exec(text)) !== null) {
    push(m[1], "auto");
  }
  return out;
}

function toStream(providerName, title, url, quality, headers) {
  return { provider: providerName, name: providerName, title: title || providerName, url, quality: quality || "auto", headers: headers || {} };
}

function resolveMediaUrl(base, u) {
  try {
    return new URL(u, base).href;
  } catch (e) {
    return absoluteUrl(base, u);
  }
}

function parseMasterPlaylist(text, baseUrl) {
  const variants = [];
  let current = null;
  const lines = String(text).split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const attrs = line.slice("#EXT-X-STREAM-INF:".length);
      let bandwidth = 0;
      let height = 0;
      let name = "";
      let codecs = "";
      const attrRe = /([A-Z0-9-]+)=("([^"]*)"|[^,]*)/g;
      let m;
      while ((m = attrRe.exec(attrs)) !== null) {
        if (m[1] === "BANDWIDTH") bandwidth = parseInt(m[2], 10) || 0;
        else if (m[1] === "RESOLUTION") {
          const rm = /(\d+)[xX](\d+)/.exec(m[2] || "");
          if (rm) height = parseInt(rm[2], 10) || 0;
        } else if (m[1] === "NAME") name = (m[3] || "").trim();
        else if (m[1] === "CODECS") codecs = (m[3] || "").trim();
      }
      current = { url: "", height, bandwidth, name, codecs };
    } else if (current && line.charAt(0) !== "#") {
      const url = resolveMediaUrl(baseUrl, line);
      if (url) {
        if (!current.name && current.height) current.name = current.height + "p";
        variants.push({ url, height: current.height, bandwidth: current.bandwidth, name: current.name, codecs: current.codecs });
      }
      current = null;
    }
  }
  return variants;
}

async function expandM3u8Qualities(stream) {
  if (!stream || !stream.url || !/\.m3u8(\?.*)?$/i.test(stream.url)) return [stream];
  let text;
  try {
    text = await fetchText(stream.url, { headers: stream.headers || {} });
  } catch (e) {
    return [stream];
  }
  if (!/^\s*#EXTM3U/.test(text)) return [stream];
  const variants = parseMasterPlaylist(text, stream.url);
  if (!variants.length) return [stream];

  const codecShort = (c) => {
    const s = String(c || "").toLowerCase();
    if (s.includes("av01") || s.includes("av1")) return "AV1";
    if (s.includes("avc1") || s.includes("avc") || s.includes("h264")) return "AVC";
    if (s.includes("hvc1") || s.includes("hev1") || s.includes("hevc")) return "HEVC";
    if (s.includes("vp9")) return "VP9";
    return "";
  };

  const ordered = variants.slice().sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0));
  const out = [];
  const seen = new Set();
  for (const v of ordered) {
    const code = codecShort(v.codecs);
    const base = v.name || (v.height ? v.height + "p" : v.bandwidth ? Math.round(v.bandwidth / 1000) + "kbps" : "auto");
    const label = code ? base + " " + code : base;
    const key = (v.height ? "h" + v.height : "b" + v.bandwidth) + "_" + (code || "u");
    if (seen.has(key)) continue;
    seen.add(key);
    const quality = /^\d+$/.test(v.name || "") ? v.name : v.height ? v.height + "p" : "auto";
    out.push(toStream(stream.provider, (stream.title || stream.provider) + " " + label, v.url, quality, Object.assign({}, stream.headers)));
  }
  return out.length > 1 ? out : [stream];
}

async function extractDailymotion(url, headers) {
  const idMatch = url.match(/\/video\/([a-zA-Z0-9]+)/);
  if (!idMatch) return [];
  const id = idMatch[1];
  const playHeaders = Object.assign({}, headers, {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "application/vnd.apple.mpegurl,application/x-mpegURL;q=0.9,*/*;q=0.8"
  });
  const streams = [];
  try {
    const videoPageUrl = `https://www.dailymotion.com/video/${id}`;
    const meta = await fetchText(
      `https://www.dailymotion.com/player/metadata/video/${id}?embedder=${encodeURIComponent(videoPageUrl)}&fields=qualities,stream_hls_url`,
      { headers: { Referer: videoPageUrl + "?syndication=273805", Accept: "application/json" } }
    );
    const json = JSON.parse(meta);
    if (json.error) return [];
    const qualities = json.qualities || {};
    const keys = Object.keys(qualities).sort((x, y) => {
      const nx = parseInt(x, 10) || 0;
      const ny = parseInt(y, 10) || 0;
      return ny - nx;
    });
    for (const key of keys) {
      const entries = qualities[key];
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const u = entry && entry.url;
        if (!u) continue;
        if (/geo/i.test((entry.type || "") + u)) continue;
        streams.push(toStream("Dailymotion", "Dailymotion " + (key === "auto" ? "Auto" : key + "p"), u, key === "auto" ? "auto" : key, playHeaders));
      }
    }
    if (json.stream_hls_url) {
      streams.push(toStream("Dailymotion", "Dailymotion HLS", json.stream_hls_url, "auto", playHeaders));
    }
  } catch (e) {
    return [];
  }
  return streams;
}

// ---- cipher functions (SmartPlayer style AES/CBC) -------------------------

function bufToWords(buf) {
  const words = [];
  for (let i = 0; i < buf.length; i += 1) {
    words.push(buf[i]);
  }
  return words;
}

function wordsToBuf(words) {
  const buf = [];
  for (const w of words) {
    buf.push(w & 0xff);
  }
  return buf;
}

function padHex(hex) {
  let h = String(hex || "").trim().replace(/"/g, "");
  if (h.length % 2 !== 0) h = h.slice(0, -1);
  return h;
}

function hexToBytes(hex) {
  const h = padHex(hex);
  const out = [];
  for (let i = 0; i < h.length; i += 2) {
    out.push(parseInt(h.substr(i, 2), 16) & 0xff);
  }
  return out;
}

// ---- SmartPlayer (Tuniflix / LodyNet style) -------------------------------

const SP_KEY = "kiemtienmua911ca";
const SP_KEY_WORDS = [];
for (let i = 0; i < SP_KEY.length; i++) SP_KEY_WORDS.push(SP_KEY.charCodeAt(i));
while (SP_KEY_WORDS.length % 16 !== 0) SP_KEY_WORDS.push(0);

function generateIvCandidates(domain, videoId) {
  const candidates = [];
  const dOpts = [48, 323];
  if (domain) {
    dOpts.push(domain.length * (domain.length + 2));
    const parts = domain.split(".");
    if (parts.length >= 2) {
      const shortDomain = parts[parts.length - 2] + "." + parts[parts.length - 1];
      dOpts.push(shortDomain.length * (shortDomain.length + 2));
    }
  }
  const wOpts = [0, 105, 141, 189, 63];
  if (videoId) {
    wOpts.push(3 * videoId.charCodeAt(0));
  }
  for (const d of [...new Set(dOpts)]) {
    for (const w of [...new Set(wOpts)]) {
      let part1 = "";
      for (let i = 1; i <= 9; i++) part1 += String.fromCharCode(i + d);
      const part2 = [d, 111, w, 128, 132, 97, 95].map((x) => String.fromCharCode(x)).join("");
      const ivString = part1 + part2;
      candidates.push(ivString.substr(0, 16));
    }
  }
  return candidates;
}

// ---- pure-JS AES-128-CBC (AES Rijndael; ported from crypto-js's aes.js so
//      it is byte-for-byte compatible; no external crypto dependency) ----
const SP_SBOX = [];
const SP_INV_SBOX = [];
const SP_SM0 = [];
const SP_SM1 = [];
const SP_SM2 = [];
const SP_SM3 = [];
const SP_ISM0 = [];
const SP_ISM1 = [];
const SP_ISM2 = [];
const SP_ISM3 = [];
(function () {
  const d = [];
  for (let i = 0; i < 256; i++) {
    if (i < 128) d[i] = i << 1;
    else d[i] = (i << 1) ^ 0x11b;
  }
  let x = 0;
  let xi = 0;
  for (let i = 0; i < 256; i++) {
    let sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
    sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
    SP_SBOX[x] = sx;
    SP_INV_SBOX[sx] = x;
    const x2 = d[x], x4 = d[x2], x8 = d[x4];
    let t = (d[sx] * 0x101) ^ (sx * 0x1010100);
    SP_SM0[x] = (t << 24) | (t >>> 8);
    SP_SM1[x] = (t << 16) | (t >>> 16);
    SP_SM2[x] = (t << 8) | (t >>> 24);
    SP_SM3[x] = t;
    t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
    SP_ISM0[sx] = (t << 24) | (t >>> 8);
    SP_ISM1[sx] = (t << 16) | (t >>> 16);
    SP_ISM2[sx] = (t << 8) | (t >>> 24);
    SP_ISM3[sx] = t;
    if (!x) {
      x = xi = 1;
    } else {
      x = x2 ^ d[d[d[x8 ^ x2]]];
      xi ^= d[d[xi]];
    }
  }
}());
const SP_RCON = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54];

function spExpandKey(keyWords) {
  const ks = [];
  let i;
  let t;
  for (i = 0; i < 4; i++) ks[i] = keyWords[i];
  for (; i < 44; i++) {
    t = ks[i - 1];
    if (!(i % 4)) {
      t = (t << 8) | (t >>> 24);
      t = (SP_SBOX[t >>> 24] << 24) | (SP_SBOX[(t >>> 16) & 0xff] << 16) | (SP_SBOX[(t >>> 8) & 0xff] << 8) | SP_SBOX[t & 0xff];
      t ^= SP_RCON[(i / 4) | 0] << 24;
    }
    ks[i] = ks[i - 4] ^ t;
  }
  const inv = [];
  for (let j = 0; j < 44; j++) {
    const k = 44 - j;
    t = (j % 4) ? ks[k] : ks[k - 4];
    if (j < 4 || k <= 4) inv[j] = t;
    else inv[j] = SP_ISM0[SP_SBOX[t >>> 24]] ^ SP_ISM1[SP_SBOX[(t >>> 16) & 0xff]] ^ SP_ISM2[SP_SBOX[(t >>> 8) & 0xff]] ^ SP_ISM3[SP_SBOX[t & 0xff]];
  }
  return inv;
}

function spCryptBlock(ik, s0, s1, s2, s3) {
  s0 ^= ik[0];
  s1 ^= ik[1];
  s2 ^= ik[2];
  s3 ^= ik[3];
  let ks = 4, t0, t1, t2, t3;
  for (let rnd = 1; rnd < 10; rnd++) {
    t0 = SP_ISM0[s0 >>> 24] ^ SP_ISM1[(s1 >>> 16) & 0xff] ^ SP_ISM2[(s2 >>> 8) & 0xff] ^ SP_ISM3[s3 & 0xff] ^ ik[ks++];
    t1 = SP_ISM0[s1 >>> 24] ^ SP_ISM1[(s2 >>> 16) & 0xff] ^ SP_ISM2[(s3 >>> 8) & 0xff] ^ SP_ISM3[s0 & 0xff] ^ ik[ks++];
    t2 = SP_ISM0[s2 >>> 24] ^ SP_ISM1[(s3 >>> 16) & 0xff] ^ SP_ISM2[(s0 >>> 8) & 0xff] ^ SP_ISM3[s1 & 0xff] ^ ik[ks++];
    t3 = SP_ISM0[s3 >>> 24] ^ SP_ISM1[(s0 >>> 16) & 0xff] ^ SP_ISM2[(s1 >>> 8) & 0xff] ^ SP_ISM3[s2 & 0xff] ^ ik[ks++];
    s0 = t0;
    s1 = t1;
    s2 = t2;
    s3 = t3;
  }
  t0 = ((SP_INV_SBOX[s0 >>> 24] << 24) | (SP_INV_SBOX[(s1 >>> 16) & 0xff] << 16) | (SP_INV_SBOX[(s2 >>> 8) & 0xff] << 8) | SP_INV_SBOX[s3 & 0xff]) ^ ik[ks++];
  t1 = ((SP_INV_SBOX[s1 >>> 24] << 24) | (SP_INV_SBOX[(s2 >>> 16) & 0xff] << 16) | (SP_INV_SBOX[(s3 >>> 8) & 0xff] << 8) | SP_INV_SBOX[s0 & 0xff]) ^ ik[ks++];
  t2 = ((SP_INV_SBOX[s2 >>> 24] << 24) | (SP_INV_SBOX[(s3 >>> 16) & 0xff] << 16) | (SP_INV_SBOX[(s0 >>> 8) & 0xff] << 8) | SP_INV_SBOX[s1 & 0xff]) ^ ik[ks++];
  t3 = ((SP_INV_SBOX[s3 >>> 24] << 24) | (SP_INV_SBOX[(s0 >>> 16) & 0xff] << 16) | (SP_INV_SBOX[(s1 >>> 8) & 0xff] << 8) | SP_INV_SBOX[s2 & 0xff]) ^ ik[ks++];
  return [t0, t1, t2, t3];
}

function spDecryptBlockWords(w, ik) {
  const t = w[1];
  w[1] = w[3];
  w[3] = t;
  const r = spCryptBlock(ik, w[0], w[1], w[2], w[3]);
  return [r[0], r[3], r[2], r[1]];
}

// keyWords/ivBytes/cipherBytes are byte arrays; matches crypto-js CBC behavior
function spDecryptCbcBytes(cipherBytes, keyWords, ivBytes) {
  const ik = spExpandKey(keyWords);
  const words = [];
  for (let b = 0; b + 4 <= cipherBytes.length; b += 4) {
    words.push((cipherBytes[b] << 24) | (cipherBytes[b + 1] << 16) | (cipherBytes[b + 2] << 8) | cipherBytes[b + 3]);
  }
  const prev = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) prev[i] = (ivBytes[i * 4] << 24) | (ivBytes[i * 4 + 1] << 16) | (ivBytes[i * 4 + 2] << 8) | ivBytes[i * 4 + 3];
  const out = [];
  for (let q = 0; q + 4 <= words.length; q += 4) {
    const block = [words[q], words[q + 1], words[q + 2], words[q + 3]];
    const dec = spDecryptBlockWords(block, ik);
    for (let i = 0; i < 4; i++) {
      const x = dec[i] ^ prev[i];
      out.push((x >>> 24) & 0xff, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff);
    }
    prev[0] = words[q];
    prev[1] = words[q + 1];
    prev[2] = words[q + 2];
    prev[3] = words[q + 3];
  }
  return out;
}

function decryptSmartPlayer(hex, iv) {
  try {
    const cipherBytes = hexToBytes(hex);
    if (!cipherBytes.length || cipherBytes.length % 16 !== 0) return "";
    const keyWords = [SP_KEY_WORDS[0], SP_KEY_WORDS[1], SP_KEY_WORDS[2], SP_KEY_WORDS[3]];
    const ivBytes = [];
    for (let i = 0; i < 16; i++) ivBytes.push(iv.charCodeAt(i));
    const out = spDecryptCbcBytes(cipherBytes, keyWords, ivBytes);
    const pad = out[out.length - 1];
    if (!pad || pad < 1 || pad > 16 || pad > out.length) return "";
    for (let i = out.length - pad; i < out.length; i++) if (out[i] !== pad) return "";
    let txt = "";
    const end = out.length - pad;
    for (let i = 0; i < end; i++) {
      const b0 = out[i];
      if (b0 < 0x80) {
        txt += String.fromCharCode(b0);
      } else if ((b0 & 0xe0) === 0xc0 && i + 1 < end) {
        txt += String.fromCharCode(((b0 & 0x1f) << 6) | (out[++i] & 0x3f));
      } else if ((b0 & 0xf0) === 0xe0 && i + 2 < end) {
        txt += String.fromCharCode(((b0 & 0x0f) << 12) | ((out[++i] & 0x3f) << 6) | (out[++i] & 0x3f));
      } else if ((b0 & 0xf8) === 0xf0 && i + 3 < end) {
        const cp = ((b0 & 0x07) << 18) | ((out[++i] & 0x3f) << 12) | ((out[++i] & 0x3f) << 6) | (out[++i] & 0x3f);
        txt += String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
      } else {
        txt += String.fromCharCode(b0);
      }
    }
    if (/^\{/.test(txt.trim())) return txt;
    return "";
  } catch (e) {
    return "";
  }
}

async function extractSmartPlayer(playerUrl, referer) {
  const streams = [];
  const norm = playerUrl.startsWith("//") ? "https:" + playerUrl : playerUrl;
  let domain = "";
  try {
    domain = new URL(norm).host;
  } catch (e) {
    return streams;
  }
  let videoId = "";
  if (norm.includes("#")) videoId = norm.split("#").pop().split("&")[0];
  else if (norm.includes("id=")) videoId = norm.split("id=")[1].split("&")[0];
  if (!videoId) return streams;
  const apiUrl = `https://${domain}/api/v1/video?id=${videoId}`;
  const headers = {
    Referer: `https://${domain}/`,
    Origin: `https://${domain}`,
    Accept: "application/json, text/plain, */*"
  };
  try {
    const body = await fetchText(apiUrl, { headers });
    for (const iv of generateIvCandidates(domain, videoId)) {
      const plain = decryptSmartPlayer(body, iv);
      if (plain) {
        let source = "";
        try {
          const parsed = JSON.parse(plain);
          source = parsed.source || "";
        } catch (e) {
          source = "";
        }
        if (!source) {
          const m1 = plain.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}\/[^\s",\\]+\.m3u8)/);
          const m2 = plain.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}\/[^\s",\\]+)/);
          source = m1 ? m1[1] : m2 ? m2[1] : "";
          if (source) source = "https://" + source;
        }
        if (source) {
          streams.push(toStream("SmartPlayer", "SmartPlayer", cleanStreamUrl(source), "auto", { Referer: `https://${domain}/` }));
          return streams;
        }
      }
    }
  } catch (e) {
    return streams;
  }
  return streams;
}

// ---- generic page -> streams ----------------------------------------------

const IGNORE_URLS = ["google.com/recaptcha", "google.com/ads", "googlesyndication.com", "googletagmanager.com", "doubleclick.net"];
const FILE_HOSTS = ["nitroflare.com", "bowfile.com", "1fichier.com", "ddownload.com", "mdiaload.com", "1cloudfile.com", "workupload.com", "gofile.io", "krakenfiles.com", "racaty.net", "mega.nz", "mediafire.com"];
const MAX_IFRAME_EXPANSIONS = 4;

async function collectIframes(pageUrl, html, referer, depth, visited) {
  const out = [];
  if (depth > 3 || visited.has(pageUrl)) return out;
  visited.add(pageUrl);
  const iframeRe = /<iframe[^>]*?\ssrc=["']([^"']+)["']/gi;
  let m;
  while ((m = iframeRe.exec(html)) !== null) {
    const src = m[1];
    if (FILE_HOSTS.some((h) => src.includes(h))) continue;
    out.push(absoluteUrl(pageUrl, src));
  }
  let expanded = 0;
  const globs = new Set();
  for (const src of out) {
    if (globs.has(src)) continue;
    globs.add(src);
    if (IGNORE_URLS.some((k) => src.includes(k))) continue;
    if (expanded >= MAX_IFRAME_EXPANSIONS) break;
    expanded++;
    try {
      const sub = await fetchText(src, { headers: { Referer: referer } });
      const inner = await extractStreamsFromText(sub, src, referer, depth + 1, visited);
      if (inner.length) return inner;
    } catch (e) {
      continue;
    }
  }
  return [];
}

async function extractStreamsFromText(html, pageUrl, referer, depth, visited) {
  const out = [];
  const seen = new Set();
  const pushStream = (s) => {
    if (!s || !s.url) return;
    if (seen.has(s.url)) return;
    seen.add(s.url);
    out.push(s);
  };

  const unpacked = unpackPacked(html);
  if (unpacked !== html) {
    for (const media of extractMediaUrls(unpacked)) {
      pushStream(toStream("Extractor", "Auto", media.url, media.quality, { Referer: referer }));
    }
  }

  for (const media of extractMediaUrls(html)) {
    pushStream(toStream("Extractor", "Auto", media.url, media.quality, { Referer: referer }));
  }

  const smartRe = /(["'])(https?:\/\/[^"']*\/api\/v1\/video\?id=[^"']+)\1/gi;
  let m;
  while ((m = smartRe.exec(html)) !== null) {
    for (const s of await extractSmartPlayer(m[2], referer)) pushStream(s);
  }

  const iframeStreams = await collectIframes(pageUrl, html, referer, depth || 0, visited || new Set());
  for (const s of iframeStreams) pushStream(s);

  return out;
}

async function extractFromUrl(url, referer) {
  const fixed = String(url).startsWith("//") ? "https:" + url : url;
  if (FILE_HOSTS.some((h) => fixed.includes(h))) return [];
  if (DIRECT_VIDEO.test(fixed)) {
    return [toStream("Extractor", "Direct", fixed, "auto", { Referer: referer })];
  }
  if (/(^|\.)dailymotion\.com/.test(fixed) || /dailymotion\.com\/embed/.test(fixed)) {
    return await extractDailymotion(fixed, { Referer: referer });
  }
  const pageUrl = absoluteUrl(fixed, fixed);
  try {
    const html = await fetchText(pageUrl, { headers: { Referer: referer } });
    return await extractStreamsFromText(html, pageUrl, referer, 0, new Set());
  } catch (e) {
    return [];
  }
}

module.exports = { extractFromUrl, extractStreamsFromText, extractSmartPlayer, extractDailymotion, unpackPacked, toStream, cleanStreamUrl, decryptSmartPlayer, parseMasterPlaylist, expandM3u8Qualities };