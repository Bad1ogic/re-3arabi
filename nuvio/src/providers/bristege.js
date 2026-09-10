const metadata = {
  id: "bristege",
  name: "Brstej",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://amd.brstej.com/22.png",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Brstej scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
