/**
 * Anime3rb - Built from nuvio/src/providers/anime3rb.js
 * Generated: 2026-09-11T15:50:56.296Z
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
