/**
 * Dima toon - Built from nuvio/src/providers/dima-toon.js
 * Generated: 2026-09-10T22:20:43.034Z
 */

// src/providers/dima-toon.js
var metadata = {
  id: "dima-toon",
  name: "Dima toon",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://www.dima-toon.com/wp-content/uploads/2025/10/DimaToonlogo11.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
