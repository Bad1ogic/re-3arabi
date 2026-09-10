/**
 * Cee - Built from nuvio/src/providers/cee.js
 * Generated: 2026-09-10T22:03:19.281Z
 */

// src/providers/cee.js
var metadata = {
  id: "cee",
  name: "Cee",
  description: "\\u0644\\u0627 \\u064a\\u0639\\u0645\\u0644 \\u062e\\u0627\\u0631\\u062c \\u0627\\u0644\\u0639\\u0631\\u0627\\u0642",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNEnHalnMz2EfG48BZUI6iC86seq09uafFngG8gz1OWQ&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
