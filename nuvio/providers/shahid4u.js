/**
 * Shahid4u - Built from nuvio/src/providers/shahid4u.js
 * Generated: 2026-09-10T22:12:38.897Z
 */

// src/providers/shahid4u.js
var metadata = {
  id: "shahid4u",
  name: "Shahid4u",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3Ig85ZYdRsjDw--peeI2RsBqOWmvnmvKKsT4UONdPMQ&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
