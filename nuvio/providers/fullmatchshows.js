/**
 * FullMatchShows - Built from nuvio/src/providers/fullmatchshows.js
 * Generated: 2026-09-10T22:20:43.118Z
 */

// src/providers/fullmatchshows.js
var metadata = {
  id: "fullmatchshows",
  name: "FullMatchShows",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://fullmatchshows.com/wp-content/uploads/2024/04/LOGOSASO.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
