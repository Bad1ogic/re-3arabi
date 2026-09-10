const metadata = {
  id: "arabseed",
  name: "Arabseed",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjXYRCgXdHTs-hdcOKs1ooTW5plsBI7CWbsA&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Arabseed scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
