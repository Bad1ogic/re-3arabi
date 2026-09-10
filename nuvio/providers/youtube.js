/**
 * YouTube - Built from nuvio/src/providers/youtube.js
 * Generated: 2026-09-10T17:30:13.763Z
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

// src/providers/youtube.js
var metadata = {
  id: "youtube",
  name: "YouTube",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie", "music"],
  logo: "https://raw.githubusercontent.com/Abodabodd/Oldarabrepo/refs/heads/main/img/IMG_%D9%A2%D9%A0%D9%A5%D9%A1%D9%A2%D9%A0%D9%A6_%D9%A1%D9%A7%D9%A2%D9%A6%D9%A1%D9%A6.jpg",
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
