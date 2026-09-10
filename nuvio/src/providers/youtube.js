const metadata = {
  id: "youtube",
  name: "YouTube",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie", "music"],
  logo: "https://raw.githubusercontent.com/Abodabodd/Oldarabrepo/refs/heads/main/img/IMG_%D9%A2%D9%A0%D9%A5%D9%A1%D9%A2%D9%A0%D9%A6_%D9%A1%D9%A7%D9%A2%D9%A6%D9%A1%D9%A6.jpg",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port YouTube scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
