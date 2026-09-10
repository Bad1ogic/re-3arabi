const metadata = {
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
  // TODO: port Cimatn scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
