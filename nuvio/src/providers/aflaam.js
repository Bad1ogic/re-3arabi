const metadata = {
  id: "aflaam",
  name: "Aflaam",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://aflaam.com/style/assets/images/logo.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Aflaam scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
