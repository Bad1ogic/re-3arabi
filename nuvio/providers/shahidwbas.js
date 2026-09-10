/**
 * Shahidwbas - Built from nuvio/src/providers/shahidwbas.js
 * Generated: 2026-09-10T21:42:46.678Z
 */

// src/providers/shahidwbas.js
var metadata = {
  id: "shahidwbas",
  name: "Shahidwbas",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://cdn.wccftech.com/wp-content/uploads/2018/01/Youtube-music.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
