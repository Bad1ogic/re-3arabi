/**
 * Shabakaty Cinemana - Built from nuvio/src/providers/cinemana.js
 * Generated: 2026-09-10T22:20:43.022Z
 */

// src/providers/cinemana.js
var metadata = {
  id: "cinemana",
  name: "Shabakaty Cinemana",
  description: "\\u0644\\u0627 \\u064a\\u0639\\u0645\\u0644 \\u062e\\u0627\\u0631\\u062c \\u0627\\u0644\\u0639\\u0631\\u0627\\u0642 \\u0627\\u0648 \\u0627\\u064a \\u0634\\u0628\\u0643\\u0629 \\u063a\\u064a\\u0631 \\u0627\\u064a\\u0631\\u062b\\u0644\\u0646\\u0643",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZlAGH56cEnNEL93W3QqZWpUe8XR8i90olTA&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};
async function getStreams(tmdbId, mediaType, season, episode) {
  return [];
}
module.exports = { metadata, getStreams };
