/**
 * Cimatn - Built from nuvio/src/providers/cimatn.js
 * Generated: 2026-09-10T22:36:41.317Z
 */

// src/providers/cimatn.js
var metadata = {
  id: "cimatn",
  name: "Cimatn",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-7OxHmLaqTWIj7eJv55zxus1xKVp5ssQPAKYjydt7Lg&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
