/**
 * VIU - Built from nuvio/src/providers/viu.js
 * Generated: 2026-09-10T19:57:25.409Z
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

// src/providers/viu.js
var metadata = {
  id: "viu",
  name: "VIU",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://img.utdstc.com/icon/a99/c9e/a99c9ee56e731144b335282e9981a54a7584be93fc9644ad7a03b45552307876:200",
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
