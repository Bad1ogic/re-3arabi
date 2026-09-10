/**
 * Alooytv - Built from nuvio/src/providers/alooytv.js
 * Generated: 2026-09-10T22:03:19.184Z
 */

// src/providers/alooytv.js
var metadata = {
  id: "alooytv",
  name: "Alooytv",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://fitnur.com/uploads/avatars/c5ae8dadf88bcea9549657ec451a1563.jpg",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
