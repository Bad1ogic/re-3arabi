/**
 * Brstej - Built from nuvio/src/providers/bristege.js
 * Generated: 2026-09-11T16:57:40.175Z
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
