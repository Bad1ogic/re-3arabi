const metadata = {
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
  // TODO: port TVgarden scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
