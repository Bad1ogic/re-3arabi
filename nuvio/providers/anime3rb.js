/**
 * Anime3rb - Built from nuvio/src/providers/anime3rb.js
 * Generated: 2026-09-10T22:12:38.599Z
 */

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
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
