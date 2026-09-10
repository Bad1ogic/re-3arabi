const metadata = {
  id: "viu",
  name: "VIU",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://img.utdstc.com/icon/a99/c9e/a99c9ee56e731144b335282e9981a54a7584be93fc9644ad7a03b45552307876:200",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port VIU scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
