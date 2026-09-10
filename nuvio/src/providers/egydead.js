const metadata = {
  id: "egydead",
  name: "Egydead",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://yt3.googleusercontent.com/ytc/AIdro_kgVTM6DJtx3tcS4gkPOOPnwFXKNhsrFyMRigWOlWomuQ=s900-c-k-c0x00ffffff-no-rj",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Egydead scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
