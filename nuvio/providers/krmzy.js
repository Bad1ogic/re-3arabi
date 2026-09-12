/**
 * Krmzy - Built from nuvio/src/providers/krmzy.js
 * Generated: 2026-09-12T16:46:55.780Z
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

// src/lib/extractor.js
var require_extractor = __commonJS({
  "src/lib/extractor.js"(exports2, module2) {
    var { fetchText: fetchText2, absoluteUrl: absoluteUrl2 } = require_http();
    var DIRECT_VIDEO = /\.(m3u8|mp4|mkv|webm|avi)(\?.*)?$/i;
    var M3U8_RE = /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi;
    var MP4_RE = /https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi;
    function cleanStreamUrl2(raw) {
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
    function unpackPacked2(text) {
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
        url = cleanStreamUrl2(url);
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
    function toStream2(providerName, title, url, quality, headers) {
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
    function expandFromMasterText2(stream, text) {
      if (!text || !/^\s*#EXTM3U/.test(text)) return [stream];
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
        out.push(toStream2(stream.provider, (stream.title || stream.provider) + " " + label, v.url, quality, Object.assign({}, stream.headers)));
      }
      return out.length > 1 ? out : [stream];
    }
    var ARTRK_LETTER_HEIGHT = { l: 360, n: 480, h: 720, f: 1080 };
    var ARTRK_LETTER_BW = { l: 32e4, n: 6e5, h: 13e5, f: 25e5 };
    function expandArtRkUrlset2(stream) {
      const url = String(stream.url || "");
      const m = /^(.+)_([a-z,]+)\.urlset\/master\.m3u8(\?.*)?$/i.exec(url);
      if (!m) return null;
      const letters = (m[2] || "").split(",").map((c) => c.toLowerCase()).filter((c) => ARTRK_LETTER_HEIGHT[c] !== void 0);
      if (!letters.length) return null;
      const base = m[1];
      const query = m[3] || "";
      const out = [];
      const seen = /* @__PURE__ */ new Set();
      for (const c of letters.sort((x, y) => (ARTRK_LETTER_BW[y] || 0) - (ARTRK_LETTER_BW[x] || 0))) {
        if (seen.has(c)) continue;
        seen.add(c);
        const height = ARTRK_LETTER_HEIGHT[c];
        const quality = height + "p AVC";
        out.push(toStream2(stream.provider, (stream.title || stream.provider) + " " + height + "p AVC", base + "_" + c + "/index-v1-a1.m3u8" + query, quality, Object.assign({}, stream.headers)));
      }
      return out.length > 1 ? out : null;
    }
    async function expandM3u8Qualities2(stream) {
      if (!stream || !stream.url || !/\.m3u8(\?.*)?$/i.test(stream.url)) return [stream];
      let text;
      try {
        text = await fetchText2(stream.url, { headers: stream.headers || {} });
      } catch (e) {
        return [stream];
      }
      return expandFromMasterText2(stream, text);
    }
    var B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function base64Encode(input) {
      const bytes = [];
      const s = String(input);
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        bytes.push(c & 255);
      }
      let out = "";
      for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i];
        const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
        out += B64_CHARS[b0 >> 2];
        out += B64_CHARS[(b0 & 3) << 4 | b1 >> 4];
        out += i + 1 < bytes.length ? B64_CHARS[(b1 & 15) << 2 | b2 >> 6] : "=";
        out += i + 2 < bytes.length ? B64_CHARS[b2 & 63] : "=";
      }
      return out;
    }
    var MAILRU_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    async function extractMailRuPublic2(url, headers) {
      const idMatch = String(url).match(/cloud\.mail\.ru\/public\/([A-Za-z0-9/_-]+)\/?$/) || String(url).match(/cloud\.mail\.ru\/public\/([A-Za-z0-9/_-]+)\/?\?/);
      if (!idMatch) return [];
      const id = String(idMatch[1]).replace(/\/+$/, "");
      const hdr = { Referer: "https://cloud.mail.ru/", "User-Agent": MAILRU_UA };
      try {
        const page = await fetchText2("https://cloud.mail.ru/public/" + id, { headers: hdr });
        const m = /"videowl_view":\{"count":"\d+","url":"([^"]+)"/.exec(page);
        const idToken = m ? m[1] : null;
        if (!idToken) return [];
        const masterUrl = idToken + "/0p/" + base64Encode(id) + ".m3u8?double_encode=1";
        let text;
        try {
          text = await fetchText2(masterUrl, { headers: hdr });
        } catch (e) {
          text = "";
        }
        if (!/^\s*#EXTM3U/.test(text || "")) return [];
        return expandFromMasterText2(toStream2("MailRu", "MailRu", masterUrl, "auto", hdr), text);
      } catch (e) {
        return [];
      }
    }
    async function extractDailymotion2(url, headers) {
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
            streams.push(toStream2("Dailymotion", "Dailymotion " + (key === "auto" ? "Auto" : key + "p"), u, key === "auto" ? "auto" : key, playHeaders));
          }
        }
        if (json.stream_hls_url) {
          streams.push(toStream2("Dailymotion", "Dailymotion HLS", json.stream_hls_url, "auto", playHeaders));
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
              streams.push(toStream2("SmartPlayer", "SmartPlayer", cleanStreamUrl2(source), "auto", { Referer: `https://${domain}/` }));
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
      const unpacked = unpackPacked2(html);
      if (unpacked !== html) {
        for (const media of extractMediaUrls(unpacked)) {
          pushStream(toStream2("Extractor", "Auto", media.url, media.quality, { Referer: referer }));
        }
      }
      for (const media of extractMediaUrls(html)) {
        pushStream(toStream2("Extractor", "Auto", media.url, media.quality, { Referer: referer }));
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
        return [toStream2("Extractor", "Direct", fixed, "auto", { Referer: referer })];
      }
      if (/(^|\.)dailymotion\.com/.test(fixed) || /dailymotion\.com\/embed/.test(fixed)) {
        return await extractDailymotion2(fixed, { Referer: referer });
      }
      const pageUrl = absoluteUrl2(fixed, fixed);
      try {
        const html = await fetchText2(pageUrl, { headers: { Referer: referer } });
        return await extractStreamsFromText(html, pageUrl, referer, 0, /* @__PURE__ */ new Set());
      } catch (e) {
        return [];
      }
    }
    module2.exports = { extractFromUrl: extractFromUrl2, extractStreamsFromText, extractSmartPlayer, extractDailymotion: extractDailymotion2, extractMailRuPublic: extractMailRuPublic2, base64Encode, unpackPacked: unpackPacked2, toStream: toStream2, cleanStreamUrl: cleanStreamUrl2, decryptSmartPlayer, parseMasterPlaylist, expandM3u8Qualities: expandM3u8Qualities2, expandFromMasterText: expandFromMasterText2, expandArtRkUrlset: expandArtRkUrlset2 };
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
        const [resAr, resEn] = await Promise.all([
          fetch(TMDB_BASE + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=ar", { skipSizeCheck: true }),
          fetch(TMDB_BASE + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=en-US", { skipSizeCheck: true })
        ]);
        if (resAr.ok) {
          const data = await resAr.json();
          if (data && (data.title || data.name)) return data;
        }
        if (resEn.ok) return await resEn.json();
        return null;
      } catch (e) {
        console.error("[TMDB] getMedia error:", e.message);
        return null;
      }
    }
    async function fetchAlternativeTitles(tmdbId, mediaType) {
      const endpoint = mediaType === "tv" ? "tv" : "movie";
      try {
        const res = await fetch(
          TMDB_BASE + "/" + endpoint + "/" + tmdbId + "/alternative_titles?api_key=" + TMDB_API_KEY,
          { skipSizeCheck: true }
        );
        if (!res.ok) return [];
        const alt = await res.json();
        const list = endpoint === "tv" ? alt.results || [] : alt.titles || [];
        return list.map((i) => i.title).filter(Boolean);
      } catch (e) {
        return [];
      }
    }
    async function getTitles2(tmdbId, mediaType) {
      const [d, alts] = await Promise.all([
        getMedia(tmdbId, mediaType),
        fetchAlternativeTitles(tmdbId, mediaType)
      ]);
      if (!d) return [];
      const titles = [];
      const primary = d.title || d.name || "";
      if (primary) titles.push(primary);
      const orig = d.original_title || d.original_name || "";
      if (orig && orig !== primary) titles.push(orig);
      for (const t of alts) {
        if (typeof t !== "string" || !t) continue;
        if (!titles.some((x) => normalizeTitle(x) === normalizeTitle(t))) titles.push(t);
      }
      return titles;
    }
    async function getSeasonCounts2(tmdbId, mediaType) {
      if (mediaType === "movie") return [];
      try {
        const res = await fetch(
          TMDB_BASE + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=en-US",
          { skipSizeCheck: true }
        );
        if (!res.ok) return [];
        const data = await res.json();
        const seasons = data.seasons || [];
        return seasons.filter((s) => s.season_number >= 1).map((s) => ({ season: s.season_number, count: s.episode_count || 0 }));
      } catch (e) {
        return [];
      }
    }
    module2.exports = { getMedia, getTitles: getTitles2, getSeasonCounts: getSeasonCounts2, TMDB_API_KEY };
  }
});

// src/providers/krmzy.js
var { fetchText, HEADERS, absoluteUrl } = require_http();
var cheerio = require("cheerio-without-node-native");
var { unpackPacked, extractFromUrl, extractDailymotion, extractMailRuPublic, toStream, cleanStreamUrl, expandFromMasterText, expandM3u8Qualities, expandArtRkUrlset } = require_extractor();
var { matchTitle } = require_normalize();
var { getTitles, getSeasonCounts } = require_tmdb();
var metadata = {
  id: "krmzy",
  name: "Krmzy",
  description: "\u0645\u0633\u0644\u0633\u0644\u0627\u062A - \u0642\u0631\u0645\u0632\u064A",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwTnAJOvyri3uHzHxjkEdlaBBKs8MAvIuJtFmCoo9u5qYiuFpHZjcl6tDi&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
var BASE = "https://krmzy.com";
var TITLE_ALIASES = [
  { match: /karaday/, arabic: "\u0627\u0644\u0642\u0628\u0636\u0627\u064A" },
  { match: /eskiya|edho|hukumdar/, arabic: "\u0642\u0637\u0627\u0639 \u0627\u0644\u0637\u0631\u0642" }
];
function normalizeLatin(s) {
  return String(s || "").toLowerCase().replace(/ş/g, "s").replace(/ı/g, "i").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/\s+/g, " ").trim();
}
function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(String(s || ""));
}
function titleAliases(queryTitles) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const t of queryTitles || []) {
    const norm = normalizeLatin(t);
    if (!norm) continue;
    for (const a of TITLE_ALIASES) {
      if (a.match.test(norm) && !seen.has(a.arabic)) {
        seen.add(a.arabic);
        out.push(a.arabic);
      }
    }
  }
  return out;
}
function buildSearchCandidates(queryTitles, aliases) {
  const cands = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (c) => {
    const key = String(c || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    cands.push(key);
  };
  for (const a of aliases || []) push(a);
  for (const t of queryTitles || []) {
    push(t);
    if (hasArabic(t)) {
      const words = String(t).trim().split(/\s+/).filter(Boolean);
      if (words.length > 2) {
        push(words.slice(0, Math.min(3, words.length)).join(" "));
        push(words.slice(0, 2).join(" "));
      }
    }
  }
  return cands;
}
function ensureHttp(u) {
  if (!u) return u;
  if (u.startsWith("//")) return "https:" + u;
  if (/^https?:\/\//i.test(u)) return u;
  return "https://" + u;
}
function base64Decode(input) {
  const norm = String(input).replace(/-/g, "+").replace(/_/g, "/");
  const padded = norm + "=".repeat((4 - norm.length % 4) % 4);
  if (typeof Buffer !== "undefined") return Buffer.from(padded, "base64").toString("utf8");
  const b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of padded.replace(/[^A-Za-z0-9+/]/g, "")) {
    buffer = buffer << 6 | b64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push(buffer >> bits & 255);
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
  $("div.block-post").each(function(i, el) {
    const r = toSearchResult($, el);
    if (r) items.push(r);
  });
  return items;
}
async function findPage(queryTitles) {
  const qts = (queryTitles || []).filter(Boolean);
  const aliases = titleAliases(qts);
  const matchTitles = [.../* @__PURE__ */ new Set([...qts, ...aliases])];
  for (const q of buildSearchCandidates(qts, aliases)) {
    try {
      const results = await searchSite(q);
      for (const r of results) {
        if (matchTitle(r.title, matchTitles)) return r;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}
function seriesSlug(title) {
  const t = String(title || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return encodeURIComponent(t.replace(/ /g, "-")).toLowerCase();
}
async function tryDirectSeries(title, queryTitles) {
  const slug = seriesSlug(title);
  if (!slug) return null;
  const url = BASE + "/series/" + slug + "/";
  try {
    const html = await fetchText(url, { headers: { Referer: BASE + "/" } });
    if (!html || html.length < 1500) return null;
    const $ = cheerio.load(html);
    const h1 = $("h1").first().text().trim();
    if (!h1 || $("article.postEp").length === 0) return null;
    if (!matchTitle(h1, queryTitles)) return null;
    const img = $("div.singleSeries div.info img, div.singleSeries img, .imgSer, .imgBg").first();
    let poster = img.attr("src") || img.attr("data-src") || "";
    if (!poster) {
      const style = img.attr("style") || "";
      const m = style.match(/url\(['"]?([^'")]+)/);
      if (m) poster = m[1];
    }
    return { title: h1, url, poster: poster ? ensureHttp(poster) : "", isTv: true };
  } catch (e) {
    return null;
  }
}
async function resolveSeriesPage(queryTitles) {
  const qts = (queryTitles || []).filter(Boolean);
  const aliases = titleAliases(qts);
  const matchTitles = [.../* @__PURE__ */ new Set([...qts, ...aliases])];
  const fromSearch = await findPage(qts);
  if (fromSearch) return fromSearch;
  const top = [.../* @__PURE__ */ new Set([...aliases, ...qts.slice(0, 3)])];
  const tried = /* @__PURE__ */ new Set();
  for (const t of top) {
    for (const cand of ["\u0645\u0633\u0644\u0633\u0644 " + t, t]) {
      const slug = seriesSlug(cand);
      if (!slug || tried.has(slug)) continue;
      tried.add(slug);
      const page = await tryDirectSeries(cand, matchTitles);
      if (page) return page;
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
function seasonOffset(seasonCounts, season) {
  let off = 0;
  for (const sc of seasonCounts || []) {
    if (sc && typeof sc.season === "number" && sc.season < season) off += sc.count || 0;
  }
  return off;
}
async function findEpisode(pageUrl, season, episode) {
  let url = pageUrl;
  if (!/\/series\/[\s\S]*\/?$/.test(url)) {
    try {
      const redirected = await findSeriesUrl(url);
      if (redirected) url = redirected;
    } catch (e) {
      return null;
    }
  }
  try {
    const html = await fetchText(url, { headers: { Referer: BASE + "/" } });
    const $ = cheerio.load(html);
    const eps = [];
    $("article.postEp").each(function(i, el) {
      const link = $(el).find("a").first();
      const href = link.attr("href");
      const epTitle = $(el).find("div.title").first().text().trim() || link.text().trim();
      let num = NaN;
      $(el).find("div.episodeNum span").each(function(i2, sEl) {
        const n = parseInt($(sEl).text().trim(), 10);
        if (!isNaN(n)) num = n;
      });
      if (href && !isNaN(num)) eps.push({ url: ensureHttp(href), name: epTitle, episode: num });
    });
    eps.reverse();
    const target = typeof episode === "number" ? episode : parseInt(episode, 10);
    if (isNaN(target)) return null;
    const hit = eps.find((e) => e.episode === target);
    return hit || null;
  } catch (e) {
    return null;
  }
}
function labelStreams(label, streams) {
  if (!streams || !streams.length) return streams || [];
  return streams.map((s) => {
    if (!s || !s.url) return s;
    const q = s.quality || "auto";
    return Object.assign({}, s, {
      provider: metadata.name,
      name: metadata.name,
      title: label + " " + q
    });
  });
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
async function resolveHlsRefererAndExpand(streamUrl, originEmbedUrl, baseTitle) {
  const iframeHostReferer = (() => {
    try {
      const u = new URL(originEmbedUrl);
      return u.protocol + "//" + u.host + "/";
    } catch (e) {
      return "https://qesen.net/";
    }
  })();
  const defaultHdr = {
    Referer: iframeHostReferer,
    Origin: iframeHostReferer.replace(/\/$/, ""),
    "User-Agent": HEADERS["User-Agent"] || "Mozilla/5.0",
    Accept: "*/*"
  };
  const urlsetStreams = expandArtRkUrlset(toStream(metadata.name, baseTitle, streamUrl, "auto", defaultHdr));
  if (urlsetStreams) return urlsetStreams;
  const candidates = [iframeHostReferer, "https://qesen.net/"];
  for (const ref of candidates) {
    try {
      const hdr = {
        Referer: ref,
        Origin: ref.replace(/\/$/, ""),
        "User-Agent": HEADERS["User-Agent"] || "Mozilla/5.0",
        Accept: "*/*"
      };
      const text = await fetchText(streamUrl, { headers: hdr });
      return expandFromMasterText(toStream(metadata.name, baseTitle, streamUrl, "auto", hdr), text);
    } catch (e) {
      continue;
    }
  }
  const fallbackHdr = {
    Referer: iframeHostReferer,
    Origin: iframeHostReferer.replace(/\/$/, ""),
    "User-Agent": HEADERS["User-Agent"] || "Mozilla/5.0",
    Accept: "*/*"
  };
  return [toStream(metadata.name, baseTitle, streamUrl, "auto", fallbackHdr)];
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
      const pageUrl = qesenSince ? extractorUrl.replace("qesen.net/krmzi?", "qesen.net/krmzi/?") : ensureHttp(extractorUrl);
      const qesenHtml = await fetchText(pageUrl, { headers: { Referer: episodeUrl } });
      const $q = cheerio.load(qesenHtml);
      $q("ul.serversList li").each(function(i, el) {
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
  const probed = /* @__PURE__ */ new Set();
  const serverResults = await Promise.all(
    servers.map(async (item) => {
      const serverType = (item.name || "").toLowerCase().trim();
      const serverIdRaw = item.id || "";
      let embedUrl = "";
      switch (serverType) {
        case "youtube":
          embedUrl = "https://www.youtube.com/watch?v=" + serverIdRaw;
          break;
        case "youtube_in":
          embedUrl = "https://www.youtube.com/embed/" + serverIdRaw;
          break;
        case "express":
          embedUrl = serverIdRaw;
          break;
        case "dailymotion":
          embedUrl = item.codeHref || serverIdRaw;
          break;
        case "facebook":
          embedUrl = "https://app.videas.fr/embed/media/" + serverIdRaw;
          break;
        case "estream":
          embedUrl = "https://arabveturk.com/embed-" + serverIdRaw + ".html";
          break;
        case "arab hd":
        case "arabhd":
        case "arab-hd":
          embedUrl = "https://v.turkvearab.com/embed-" + serverIdRaw + ".html";
          break;
        case "box":
          embedUrl = "https://youdboox.com/embed-" + serverIdRaw + ".html";
          break;
        case "now":
          embedUrl = "https://extreamnow.org/embed-" + serverIdRaw + ".html";
          break;
        case "ok":
          embedUrl = ensureHttp("//ok.ru/videoembed/" + serverIdRaw);
          break;
        case "red hd":
        case "redhd":
        case "red-hd":
          embedUrl = "https://iplayerhls.com/e/" + serverIdRaw;
          break;
        case "pro hd":
        case "prohd":
        case "pro-hd":
          embedUrl = "https://ebtv.upns.live/#" + serverIdRaw;
          break;
        case "pro":
          embedUrl = "https://mdna.upns.online/#" + serverIdRaw;
          break;
        default:
          embedUrl = item.codeHref || serverIdRaw;
      }
      if (!embedUrl) return [];
      if (serverType === "arab hd" || serverType === "arabhd" || serverType === "arab-hd" || serverType === "estream") {
        try {
          const extractedM3u8 = await extractLinkFromObfuscatedPage(embedUrl, [mainPageHostReferer, "https://newaat.com/"]);
          if (!extractedM3u8) return [];
          probed.add(extractedM3u8);
          return await resolveHlsRefererAndExpand(extractedM3u8, embedUrl, item.name || serverType);
        } catch (e) {
          return [];
        }
      } else if (serverType === "youtube" || serverType === "youtube_in") {
        return [toStream(metadata.name, "YouTube", embedUrl, "auto", {})];
      } else if (serverType === "express") {
        try {
          if (/cloud\.mail\.ru\/public/.test(embedUrl)) {
            return labelStreams(item.name || "Express", await extractMailRuPublic(embedUrl, { Referer: mainPageHostReferer }));
          }
          return labelStreams(item.name || "Express", await extractFromUrl(embedUrl, mainPageHostReferer));
        } catch (e) {
          return [];
        }
      } else if (serverType === "dailymotion") {
        try {
          let dmUrl = embedUrl;
          if (!/^https?:\/\//i.test(dmUrl)) dmUrl = "https://www.dailymotion.com/video/" + dmUrl;
          return /dailymotion\.com\/video/.test(dmUrl) ? await extractDailymotion(dmUrl, { Referer: "https://www.dailymotion.com/" }) : await extractFromUrl(dmUrl, mainPageHostReferer);
        } catch (e) {
          return [];
        }
      } else {
        try {
          return labelStreams(item.name || serverType, await extractFromUrl(embedUrl, mainPageHostReferer));
        } catch (e) {
          return [];
        }
      }
    })
  );
  for (const r of serverResults) for (const s of r) streams.push(s);
  const tasks = streams.map(async (s) => {
    if (s.quality === "auto" && s.provider !== "Extractor" && /\.m3u8(\?.*)?$/i.test(s.url) && !probed.has(s.url)) {
      return await expandM3u8Qualities(s);
    }
    return [s];
  });
  const result = [].concat(...await Promise.all(tasks));
  return result;
}
async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const queryTitles = await getTitles(tmdbId, mediaType);
    const page = await resolveSeriesPage(queryTitles);
    if (!page) return [];
    if (mediaType === "movie") return [];
    let s = parseInt(season, 10);
    if (isNaN(s) || s < 1) s = 1;
    let e = parseInt(episode, 10);
    if (isNaN(e) || e < 1) e = 1;
    const counts = await getSeasonCounts(tmdbId, mediaType);
    const continuous = seasonOffset(counts, s) + e;
    const ep = await findEpisode(page.url, s, continuous);
    if (!ep) return [];
    return await loadLinks(ep.url);
  } catch (e) {
    return [];
  }
}
module.exports = {
  metadata,
  getStreams,
  findPage,
  resolveSeriesPage,
  tryDirectSeries,
  searchSite,
  titleAliases,
  buildSearchCandidates,
  findEpisode,
  loadLinks
};
