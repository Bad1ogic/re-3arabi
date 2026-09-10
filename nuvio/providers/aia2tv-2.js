/**
 * Asia2tv 2 - Built from nuvio/src/providers/aia2tv-2.js
 * Generated: 2026-09-10T17:06:11.270Z
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

// src/providers/aia2tv-2.js
var metadata = {
  id: "aia2tv-2",
  name: "Asia2tv 2",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://media.licdn.com/dms/image/v2/C4D0BAQEhyYSi351HRw/company-logo_200_200/company-logo_200_200/0/1630489719119?e=2147483647&v=beta&t=Br69OJ2AwT5vdJHgl-DTvliEqOmp6VQLYwUWcFqG4u4",
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
