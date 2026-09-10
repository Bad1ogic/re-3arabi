/**
 * Anime3rb - Built from nuvio/src/providers/anime3rb.js
 * Generated: 2026-09-10T19:26:24.480Z
 */
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/providers/anime3rb.js
var metadata = {
  id: "anime3rb",
  name: "Anime3rb",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://images.anime3rb.com/favicon/apple-touch-icon.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    return [];
  });
}
module.exports = { metadata, getStreams };
