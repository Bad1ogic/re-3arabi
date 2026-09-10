const metadata = {
  id: "mycima",
  name: "Mycima",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxoF3lscri32oVf0iQlhbjFEoUn2xg3OmQIx4wYdDmqw&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Mycima scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
