/**
 * VIU - Built from nuvio/src/providers/viu.js
 * Generated: 2026-09-10T22:03:19.623Z
 */

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
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
