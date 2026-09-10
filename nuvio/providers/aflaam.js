/**
 * Aflaam - Built from nuvio/src/providers/aflaam.js
 * Generated: 2026-09-10T21:42:46.198Z
 */

// src/providers/aflaam.js
var metadata = {
  id: "aflaam",
  name: "Aflaam",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://aflaam.com/style/assets/images/logo.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
