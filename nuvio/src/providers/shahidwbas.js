const metadata = {
  id: "shahidwbas",
  name: "Shahidwbas",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://cdn.wccftech.com/wp-content/uploads/2018/01/Youtube-music.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Shahidwbas scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
