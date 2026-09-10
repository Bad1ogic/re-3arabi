const metadata = {
  id: "anime3rb",
  name: "Anime3rb",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://images.anime3rb.com/favicon/apple-touch-icon.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Anime3rb scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
