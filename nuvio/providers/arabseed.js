/**
 * Arabseed - Built from nuvio/src/providers/arabseed.js
 * Generated: 2026-09-10T22:36:41.245Z
 */

// src/providers/arabseed.js
var metadata = {
  id: "arabseed",
  name: "Arabseed",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjXYRCgXdHTs-hdcOKs1ooTW5plsBI7CWbsA&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
