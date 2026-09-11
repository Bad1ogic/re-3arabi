/**
 * AnimeWitcher - Built from nuvio/src/providers/animewitcher.js
 * Generated: 2026-09-11T16:15:57.722Z
 */

// src/providers/animewitcher.js
var metadata = {
  id: "animewitcher",
  name: "AnimeWitcher",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://raw.githubusercontent.com/Abodabodd/Oldarabrepo/refs/heads/main/img/anime_witcher_round_icon.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
