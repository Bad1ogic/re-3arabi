/**
 * TopCinema - Built from nuvio/src/providers/topcinema.js
 * Generated: 2026-09-10T22:20:43.213Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/lib/http.js
var require_http = __commonJS({
  "src/lib/http.js"(exports2, module2) {
    var HEADERS2 = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ar,en-US;q=0.8,en;q=0.5"
    };
    function buildInit(options) {
      const init = {
        headers: Object.assign({}, HEADERS2, options.headers || {}),
        skipSizeCheck: true
      };
      if (options.method) init.method = options.method;
      if (options.body) init.body = options.body;
      return init;
    }
    async function fetchText2(url, options = {}) {
      const res = await fetch(url, buildInit(options));
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return await res.text();
    }
    async function fetchBuffer(url, options = {}) {
      const res = await fetch(url, buildInit(options));
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return await res.arrayBuffer();
    }
    async function fetchJson(url, options = {}) {
      const raw = await fetchText2(url, options);
      return JSON.parse(raw);
    }
    function absoluteUrl2(base, url) {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("//")) return "https:" + url;
      return base.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
    }
    module2.exports = { HEADERS: HEADERS2, fetchText: fetchText2, fetchBuffer, fetchJson, absoluteUrl: absoluteUrl2 };
  }
});

// src/lib/normalize.js
var require_normalize = __commonJS({
  "src/lib/normalize.js"(exports2, module2) {
    function isTitleChar(ch) {
      const code = ch.charCodeAt(0);
      return ch >= "a" && ch <= "z" || ch >= "0" && ch <= "9" || code >= 192 && code <= 591 || // Latin-1 Supplement..Latin Extended-B
      code >= 880 && code <= 1423 || // Greek + Armenian
      code >= 1424 && code <= 1535 || // Hebrew
      code >= 1536 && code <= 2303 || // Arabic + Arabic Supplement/Extended-A
      code >= 64285 && code <= 65023 || // Hebrew/Arabic Presentation Forms
      code >= 7680 && code <= 7935 || // Latin Extended Additional
      code >= 2304 && code <= 4095 || // Indic + Thai/Lao/Myanmar
      code >= 12352 && code <= 12543 || // Hiragana + Katakana
      code >= 19968 && code <= 40959 || // CJK Unified Ideographs
      code >= 44032 && code <= 55215;
    }
    function normalizeTitle(value) {
      if (!value) return "";
      const s = value.toString().toLowerCase().replace(/[\u064B-\u0652\u0670\u0640]/g, "");
      let out = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s.charAt(i);
        if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
          out += " ";
        } else if (isTitleChar(ch)) {
          out += ch;
        }
      }
      return out.replace(/\s+/g, " ").trim();
    }
    function tokenize(value) {
      return normalizeTitle(value).split(" ");
    }
    function tokenSimilarity(a, b) {
      const ta = new Set(tokenize(a));
      const tb = new Set(tokenize(b));
      if (ta.size === 0 || tb.size === 0) return 0;
      let overlap = 0;
      for (const tok of ta) {
        if (tb.has(tok)) overlap++;
      }
      return overlap / Math.max(ta.size, tb.size);
    }
    function matchTitle2(resultTitle, queryTitles) {
      const rt = normalizeTitle(resultTitle);
      if (!rt) return false;
      for (const q of queryTitles) {
        const nq = normalizeTitle(q);
        if (!nq) continue;
        if (rt === nq) return true;
        if (rt.includes(nq) || nq.includes(rt)) return true;
        if (tokenSimilarity(rt, nq) >= 0.5) return true;
      }
      return false;
    }
    module2.exports = { normalizeTitle, tokenSimilarity, matchTitle: matchTitle2 };
  }
});

// src/lib/tmdb.js
var require_tmdb = __commonJS({
  "src/lib/tmdb.js"(exports2, module2) {
    var { normalizeTitle } = require_normalize();
    var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
    var TMDB_BASE = "https://api.themoviedb.org/3";
    async function getMedia(tmdbId, mediaType) {
      const endpoint = mediaType === "tv" ? "tv" : "movie";
      try {
        const res = await fetch(
          TMDB_BASE + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=ar",
          { skipSizeCheck: true }
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data && (data.title || data.name)) return data;
        const resEn = await fetch(
          TMDB_BASE + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=en-US",
          { skipSizeCheck: true }
        );
        if (!resEn.ok) return null;
        return await resEn.json();
      } catch (e) {
        console.error("[TMDB] getMedia error:", e.message);
        return null;
      }
    }
    async function getTitles2(tmdbId, mediaType) {
      const d = await getMedia(tmdbId, mediaType);
      if (!d) return [];
      const titles = [];
      const primary = d.title || d.name || "";
      if (primary) titles.push(primary);
      const orig = d.original_title || d.original_name || "";
      if (orig && orig !== primary) titles.push(orig);
      try {
        const endpoint = mediaType === "tv" ? "tv" : "movie";
        const res = await fetch(
          TMDB_BASE + "/" + endpoint + "/" + tmdbId + "/alternative_titles?api_key=" + TMDB_API_KEY,
          { skipSizeCheck: true }
        );
        if (res.ok) {
          const alt = await res.json();
          const list = endpoint === "tv" ? alt.results || [] : alt.titles || [];
          for (const item of list) {
            const t = item.title;
            if (!t) continue;
            if (!titles.some((x) => normalizeTitle(x) === normalizeTitle(t))) titles.push(t);
          }
        }
      } catch (e) {
      }
      return titles;
    }
    module2.exports = { getMedia, getTitles: getTitles2, TMDB_API_KEY };
  }
});

// src/lib/extractor.js
var require_extractor = __commonJS({
  "src/lib/extractor.js"(exports2, module2) {
    var { fetchText: fetchText2, absoluteUrl: absoluteUrl2 } = require_http();
    var DIRECT_VIDEO = /\.(m3u8|mp4|mkv|webm|avi)(\?.*)?$/i;
    var M3U8_RE = /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi;
    var MP4_RE = /https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi;
    function cleanStreamUrl(raw) {
      return String(raw).replace(/\\\//g, "/").replace(/^["'\s]+|["'\s]+$/g, "").replace(/&amp;/g, "&").trim();
    }
    function stripUrls(raw) {
      return String(raw).replace(/\\\//g, "/").replace(/&amp;/g, "&");
    }
    function unescapeJsString(str) {
      return String(str).replace(/\\(?:x([0-9a-fA-F]{2})|[\\'"nrt])/g, (m, h) => {
        if (h) return String.fromCharCode(parseInt(h, 16));
        if (m === "\\'") return "'";
        if (m === '\\"') return '"';
        if (m === "\\\\") return "\\";
        return m === "\\n" ? "\n" : m === "\\r" ? "\r" : "	";
      });
    }
    function unpackPacked(text) {
      const regex = /\}\((['"])([\s\S]*?)\1,(\d+),(\d+),(['"])([\s\S]*?)\5/;
      const match = regex.exec(String(text));
      if (!match) return text;
      const [, , payload, baseStr, countStr, , namesRaw] = match;
      const base = parseInt(baseStr, 10);
      const count = parseInt(countStr, 10);
      const names = unescapeJsString(namesRaw).split("|").map((n) => unescapeJsString(n));
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
      const seen = /* @__PURE__ */ new Set();
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
        let m2;
        while ((m2 = M3U8_RE.exec(text)) !== null) {
          push(m2[0], "auto");
        }
      }
      if (MP4_RE.test(text)) {
        MP4_RE.lastIndex = 0;
        let m2;
        while ((m2 = MP4_RE.exec(text)) !== null) {
          push(m2[0], "auto");
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
        return absoluteUrl2(base, u);
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
        text = await fetchText2(stream.url, { headers: stream.headers || {} });
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
      const seen = /* @__PURE__ */ new Set();
      for (const v of ordered) {
        const code = codecShort(v.codecs);
        const base = v.name || (v.height ? v.height + "p" : v.bandwidth ? Math.round(v.bandwidth / 1e3) + "kbps" : "auto");
        const qualityBase = /^\d+$/.test(v.name || "") ? v.name : v.height ? v.height + "p" : "auto";
        const label = code ? base + " " + code : base;
        const quality = code ? qualityBase + " " + code : qualityBase;
        const key = (v.height ? "h" + v.height : "b" + v.bandwidth) + "_" + (code || "u");
        if (seen.has(key)) continue;
        seen.add(key);
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
        const meta = await fetchText2(
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
    function padHex(hex) {
      let h = String(hex || "").trim().replace(/"/g, "");
      if (h.length % 2 !== 0) h = h.slice(0, -1);
      return h;
    }
    function hexToBytes(hex) {
      const h = padHex(hex);
      const out = [];
      for (let i = 0; i < h.length; i += 2) {
        out.push(parseInt(h.substr(i, 2), 16) & 255);
      }
      return out;
    }
    var SP_KEY = "kiemtienmua911ca";
    var SP_KEY_WORDS = [];
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
    var SP_SBOX = [];
    var SP_INV_SBOX = [];
    var SP_SM0 = [];
    var SP_SM1 = [];
    var SP_SM2 = [];
    var SP_SM3 = [];
    var SP_ISM0 = [];
    var SP_ISM1 = [];
    var SP_ISM2 = [];
    var SP_ISM3 = [];
    (function() {
      const d = [];
      for (let i = 0; i < 256; i++) {
        if (i < 128) d[i] = i << 1;
        else d[i] = i << 1 ^ 283;
      }
      let x = 0;
      let xi = 0;
      for (let i = 0; i < 256; i++) {
        let sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
        sx = sx >>> 8 ^ sx & 255 ^ 99;
        SP_SBOX[x] = sx;
        SP_INV_SBOX[sx] = x;
        const x2 = d[x], x4 = d[x2], x8 = d[x4];
        let t = d[sx] * 257 ^ sx * 16843008;
        SP_SM0[x] = t << 24 | t >>> 8;
        SP_SM1[x] = t << 16 | t >>> 16;
        SP_SM2[x] = t << 8 | t >>> 24;
        SP_SM3[x] = t;
        t = x8 * 16843009 ^ x4 * 65537 ^ x2 * 257 ^ x * 16843008;
        SP_ISM0[sx] = t << 24 | t >>> 8;
        SP_ISM1[sx] = t << 16 | t >>> 16;
        SP_ISM2[sx] = t << 8 | t >>> 24;
        SP_ISM3[sx] = t;
        if (!x) {
          x = xi = 1;
        } else {
          x = x2 ^ d[d[d[x8 ^ x2]]];
          xi ^= d[d[xi]];
        }
      }
    })();
    var SP_RCON = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54];
    function spExpandKey(keyWords) {
      const ks = [];
      let i;
      let t;
      for (i = 0; i < 4; i++) ks[i] = keyWords[i];
      for (; i < 44; i++) {
        t = ks[i - 1];
        if (!(i % 4)) {
          t = t << 8 | t >>> 24;
          t = SP_SBOX[t >>> 24] << 24 | SP_SBOX[t >>> 16 & 255] << 16 | SP_SBOX[t >>> 8 & 255] << 8 | SP_SBOX[t & 255];
          t ^= SP_RCON[i / 4 | 0] << 24;
        }
        ks[i] = ks[i - 4] ^ t;
      }
      const inv = [];
      for (let j = 0; j < 44; j++) {
        const k = 44 - j;
        t = j % 4 ? ks[k] : ks[k - 4];
        if (j < 4 || k <= 4) inv[j] = t;
        else inv[j] = SP_ISM0[SP_SBOX[t >>> 24]] ^ SP_ISM1[SP_SBOX[t >>> 16 & 255]] ^ SP_ISM2[SP_SBOX[t >>> 8 & 255]] ^ SP_ISM3[SP_SBOX[t & 255]];
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
        t0 = SP_ISM0[s0 >>> 24] ^ SP_ISM1[s1 >>> 16 & 255] ^ SP_ISM2[s2 >>> 8 & 255] ^ SP_ISM3[s3 & 255] ^ ik[ks++];
        t1 = SP_ISM0[s1 >>> 24] ^ SP_ISM1[s2 >>> 16 & 255] ^ SP_ISM2[s3 >>> 8 & 255] ^ SP_ISM3[s0 & 255] ^ ik[ks++];
        t2 = SP_ISM0[s2 >>> 24] ^ SP_ISM1[s3 >>> 16 & 255] ^ SP_ISM2[s0 >>> 8 & 255] ^ SP_ISM3[s1 & 255] ^ ik[ks++];
        t3 = SP_ISM0[s3 >>> 24] ^ SP_ISM1[s0 >>> 16 & 255] ^ SP_ISM2[s1 >>> 8 & 255] ^ SP_ISM3[s2 & 255] ^ ik[ks++];
        s0 = t0;
        s1 = t1;
        s2 = t2;
        s3 = t3;
      }
      t0 = (SP_INV_SBOX[s0 >>> 24] << 24 | SP_INV_SBOX[s1 >>> 16 & 255] << 16 | SP_INV_SBOX[s2 >>> 8 & 255] << 8 | SP_INV_SBOX[s3 & 255]) ^ ik[ks++];
      t1 = (SP_INV_SBOX[s1 >>> 24] << 24 | SP_INV_SBOX[s2 >>> 16 & 255] << 16 | SP_INV_SBOX[s3 >>> 8 & 255] << 8 | SP_INV_SBOX[s0 & 255]) ^ ik[ks++];
      t2 = (SP_INV_SBOX[s2 >>> 24] << 24 | SP_INV_SBOX[s3 >>> 16 & 255] << 16 | SP_INV_SBOX[s0 >>> 8 & 255] << 8 | SP_INV_SBOX[s1 & 255]) ^ ik[ks++];
      t3 = (SP_INV_SBOX[s3 >>> 24] << 24 | SP_INV_SBOX[s0 >>> 16 & 255] << 16 | SP_INV_SBOX[s1 >>> 8 & 255] << 8 | SP_INV_SBOX[s2 & 255]) ^ ik[ks++];
      return [t0, t1, t2, t3];
    }
    function spDecryptBlockWords(w, ik) {
      const t = w[1];
      w[1] = w[3];
      w[3] = t;
      const r = spCryptBlock(ik, w[0], w[1], w[2], w[3]);
      return [r[0], r[3], r[2], r[1]];
    }
    function spDecryptCbcBytes(cipherBytes, keyWords, ivBytes) {
      const ik = spExpandKey(keyWords);
      const words = [];
      for (let b = 0; b + 4 <= cipherBytes.length; b += 4) {
        words.push(cipherBytes[b] << 24 | cipherBytes[b + 1] << 16 | cipherBytes[b + 2] << 8 | cipherBytes[b + 3]);
      }
      const prev = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) prev[i] = ivBytes[i * 4] << 24 | ivBytes[i * 4 + 1] << 16 | ivBytes[i * 4 + 2] << 8 | ivBytes[i * 4 + 3];
      const out = [];
      for (let q = 0; q + 4 <= words.length; q += 4) {
        const block = [words[q], words[q + 1], words[q + 2], words[q + 3]];
        const dec = spDecryptBlockWords(block, ik);
        for (let i = 0; i < 4; i++) {
          const x = dec[i] ^ prev[i];
          out.push(x >>> 24 & 255, x >>> 16 & 255, x >>> 8 & 255, x & 255);
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
          if (b0 < 128) {
            txt += String.fromCharCode(b0);
          } else if ((b0 & 224) === 192 && i + 1 < end) {
            txt += String.fromCharCode((b0 & 31) << 6 | out[++i] & 63);
          } else if ((b0 & 240) === 224 && i + 2 < end) {
            txt += String.fromCharCode((b0 & 15) << 12 | (out[++i] & 63) << 6 | out[++i] & 63);
          } else if ((b0 & 248) === 240 && i + 3 < end) {
            const cp = (b0 & 7) << 18 | (out[++i] & 63) << 12 | (out[++i] & 63) << 6 | out[++i] & 63;
            txt += String.fromCharCode((cp >> 10) + 55296, (cp & 1023) + 56320);
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
        const body = await fetchText2(apiUrl, { headers });
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
    var IGNORE_URLS = ["google.com/recaptcha", "google.com/ads", "googlesyndication.com", "googletagmanager.com", "doubleclick.net"];
    var FILE_HOSTS = ["nitroflare.com", "bowfile.com", "1fichier.com", "ddownload.com", "mdiaload.com", "1cloudfile.com", "workupload.com", "gofile.io", "krakenfiles.com", "racaty.net", "mega.nz", "mediafire.com"];
    var MAX_IFRAME_EXPANSIONS = 4;
    async function collectIframes(pageUrl, html, referer, depth, visited) {
      const out = [];
      if (depth > 3 || visited.has(pageUrl)) return out;
      visited.add(pageUrl);
      const iframeRe = /<iframe[^>]*?\ssrc=["']([^"']+)["']/gi;
      let m;
      while ((m = iframeRe.exec(html)) !== null) {
        const src = m[1];
        if (FILE_HOSTS.some((h) => src.includes(h))) continue;
        out.push(absoluteUrl2(pageUrl, src));
      }
      let expanded = 0;
      const globs = /* @__PURE__ */ new Set();
      for (const src of out) {
        if (globs.has(src)) continue;
        globs.add(src);
        if (IGNORE_URLS.some((k) => src.includes(k))) continue;
        if (expanded >= MAX_IFRAME_EXPANSIONS) break;
        expanded++;
        try {
          const sub = await fetchText2(src, { headers: { Referer: referer } });
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
      const seen = /* @__PURE__ */ new Set();
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
      const iframeStreams = await collectIframes(pageUrl, html, referer, depth || 0, visited || /* @__PURE__ */ new Set());
      for (const s of iframeStreams) pushStream(s);
      return out;
    }
    async function extractFromUrl2(url, referer) {
      const fixed = String(url).startsWith("//") ? "https:" + url : url;
      if (FILE_HOSTS.some((h) => fixed.includes(h))) return [];
      if (DIRECT_VIDEO.test(fixed)) {
        return [toStream("Extractor", "Direct", fixed, "auto", { Referer: referer })];
      }
      if (/(^|\.)dailymotion\.com/.test(fixed) || /dailymotion\.com\/embed/.test(fixed)) {
        return await extractDailymotion(fixed, { Referer: referer });
      }
      const pageUrl = absoluteUrl2(fixed, fixed);
      try {
        const html = await fetchText2(pageUrl, { headers: { Referer: referer } });
        return await extractStreamsFromText(html, pageUrl, referer, 0, /* @__PURE__ */ new Set());
      } catch (e) {
        return [];
      }
    }
    module2.exports = { extractFromUrl: extractFromUrl2, extractStreamsFromText, extractSmartPlayer, extractDailymotion, unpackPacked, toStream, cleanStreamUrl, decryptSmartPlayer, parseMasterPlaylist, expandM3u8Qualities };
  }
});

// src/providers/topcinema.js
var cheerio = require("cheerio-without-node-native");
var { HEADERS, fetchText, absoluteUrl } = require_http();
var { getTitles } = require_tmdb();
var { matchTitle } = require_normalize();
var { extractFromUrl } = require_extractor();
var metadata = {
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
var BASE = "https://web8.topcinema.cam";
var AJAX_URL = (BASE2) => BASE2 + "/wp-content/themes/movies2023/Ajaxat/Single/Server.php";
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
  const isMovie = title.toLowerCase().includes("\u0641\u064A\u0644\u0645");
  const isSeries = title.toLowerCase().includes("\u0645\u0633\u0644\u0633\u0644");
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
      $(".Posts--List .Small--Box").each(function(i, el) {
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
  scope.each(function(i, el) {
    const link = $(el);
    const epUrl = link.attr("href");
    const epTitle = link.find("h2").first().text().trim();
    const epText = (link.find(".epnum").first().text() || "").replace("\u0627\u0644\u062D\u0644\u0642\u0629", "").trim();
    const epNum = parseInt(epText, 10);
    if (epUrl) eps.push({ url: epUrl, title: epTitle, episode: isNaN(epNum) ? void 0 : epNum });
  });
  return eps;
}
async function findEpisodeData(pageUrl, season, episode) {
  try {
    const html = await fetchText(pageUrl, { headers: { Referer: BASE } });
    const $ = cheerio.load(html);
    const seasons = [];
    $("section.allseasonss .Small--Box.Season a").each(function(i, el) {
      const href = $(el).attr("href");
      const seasonText = ($(el).find(".epnum").first().text() || "").replace("\u0627\u0644\u0645\u0648\u0633\u0645", "").trim();
      const sn = parseInt(seasonText, 10);
      if (href) seasons.push({ url: href, season: isNaN(sn) ? void 0 : sn });
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
      const eps2 = parseEps($s, $s(".allepcont .row > a"));
      const hit2 = eps2.find((e) => e.episode === episode);
      if (hit2) return hit2.url + "/watch/||" + hit2.url + "/download/";
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
        $(".player--iframe iframe").each(function(i, el) {
          const src = $(el).attr("src");
          if (src) links[absoluteUrl(finalWatchUrl, src)] = finalWatchUrl;
        });
        const servers = [];
        $(".watch--servers--list li.server--item").each(function(i, el) {
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
              $a("iframe").each(function(i, el) {
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
        $("a.downloadsLink").each(function(i, el) {
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
  async function worker(queue2) {
    while (queue2.length) {
      const rawLink = queue2.shift();
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
