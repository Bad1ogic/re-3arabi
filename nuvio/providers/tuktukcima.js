/**
 * Tuktukcima - Built from nuvio/src/providers/tuktukcima.js
 * Generated: 2026-09-11T16:57:40.479Z
 */

// src/providers/tuktukcima.js
var metadata = {
  id: "tuktukcima",
  name: "Tuktukcima",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ10TEG3tTtkEF9_g3IslEP3xs0wx9EVhBs7b_H5M1gpg&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
