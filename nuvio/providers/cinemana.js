/**
 * Shabakaty Cinemana - Built from nuvio/src/providers/cinemana.js
 * Generated: 2026-09-10T19:57:25.148Z
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

// src/providers/cinemana.js
var metadata = {
  id: "cinemana",
  name: "Shabakaty Cinemana",
  description: "\\u0644\\u0627 \\u064a\\u0639\\u0645\\u0644 \\u062e\\u0627\\u0631\\u062c \\u0627\\u0644\\u0639\\u0631\\u0627\\u0642 \\u0627\\u0648 \\u0627\\u064a \\u0634\\u0628\\u0643\\u0629 \\u063a\\u064a\\u0631 \\u0627\\u064a\\u0631\\u062b\\u0644\\u0646\\u0643",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZlAGH56cEnNEL93W3QqZWpUe8XR8i90olTA&s",
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
