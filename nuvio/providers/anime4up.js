/**
 * Anime4up - Built from nuvio/src/providers/anime4up.js
 * Generated: 2026-09-11T16:15:57.699Z
 */

// src/providers/anime4up.js
var metadata = {
  id: "anime4up",
  name: "Anime4up",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkVDfHjqUpRyrWJjW8wUHH87BhSO6B9uxI-B80sAy_AQ&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
