/**
 * Syrialive - Built from nuvio/src/providers/syrialive.js
 * Generated: 2026-09-10T19:26:24.933Z
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

// src/providers/syrialive.js
var metadata = {
  id: "syrialive",
  name: "Syrialive",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSF607wnarFL8Ob8KLPahUPJzcLjbtg1pEH0A&s",
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
