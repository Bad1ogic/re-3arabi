/**
 * TVgarden - Built from nuvio/src/providers/tvgarden.js
 * Generated: 2026-09-11T15:50:56.703Z
 */

// src/providers/tvgarden.js
var metadata = {
  id: "tvgarden",
  name: "TVgarden",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9Lci-tXtOtWaHcEp9An7bqIkXs4yzH7EcfA&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
