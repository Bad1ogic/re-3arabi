const metadata = {
  id: "animerco",
  name: "Animerco",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://raw.githubusercontent.com/Abodabodd/Oldarabrepo/refs/heads/main/img/file_0000000042f861f49090744dc097ee2f.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Animerco scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
