const metadata = {
  id: "3isk",
  name: "3isk",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://3esk.onl/wp-content/uploads/2021/01/3isk-logo.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port 3isk scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
