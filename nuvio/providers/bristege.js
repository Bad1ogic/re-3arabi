/**
 * Brstej - Built from nuvio/src/providers/bristege.js
 * Generated: 2026-09-11T15:50:56.357Z
 */

// src/providers/bristege.js
var metadata = {
  id: "bristege",
  name: "Brstej",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://amd.brstej.com/22.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
