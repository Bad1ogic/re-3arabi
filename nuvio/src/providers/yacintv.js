const metadata = {
  id: "yacintv",
  name: "Yacintv",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://yt3.googleusercontent.com/ulm35tweg3do5istps0TgCjMmJSVczGUL2NIrXMwI1DDRi5ty29BIzQSUHVgqZN5CSo1PHhiA6M=s900-c-k-c0x00ffffff-no-rj",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Yacintv scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
