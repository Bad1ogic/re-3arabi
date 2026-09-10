/**
 * Anime-Phoenix - Built from nuvio/src/providers/anime-phoenix.js
 * Generated: 2026-09-10T21:42:46.363Z
 */

// src/providers/anime-phoenix.js
var metadata = {
  id: "anime-phoenix",
  name: "Anime-Phoenix",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://yt3.googleusercontent.com/mBIIR5cqQC4Y-o7HaxbkJfs305X6tbHLSNPk6MRMCDJsH8xP0SfGhK-CBDpSmH95wSff9z99sg=s900-c-k-c0x00ffffff-no-rj",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
