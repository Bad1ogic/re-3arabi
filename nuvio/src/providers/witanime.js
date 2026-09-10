const metadata = {
  id: "witanime",
  name: "Witanime",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7AH2oC7LwumXRpHM8_WLpIFvDIfmS67jkjlhsCKpPaZdqcneigzUQX4g&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Witanime scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
