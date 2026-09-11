/**
 * Eshek - Built from nuvio/src/providers/eshek.js
 * Generated: 2026-09-11T15:50:56.491Z
 */

// src/providers/eshek.js
var metadata = {
  id: "eshek",
  name: "Eshek",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://gesseh.net/wp-content/uploads/2024/10/keesatlogo.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
