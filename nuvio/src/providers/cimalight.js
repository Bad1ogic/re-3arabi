const metadata = {
  id: "cimalight",
  name: "Cimalight",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://yt3.googleusercontent.com/n2PDvQiQVV00JjGsg66dvMZKmyoolvCeu59Xe40pmEvhiMNE1tHqKsoEY1IpfdNNXdlle4It=s900-c-k-c0x00ffffff-no-rj",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Cimalight scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
