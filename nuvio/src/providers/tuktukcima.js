const metadata = {
  id: "tuktukcima",
  name: "Tuktukcima",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ10TEG3tTtkEF9_g3IslEP3xs0wx9EVhBs7b_H5M1gpg&s=10",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Tuktukcima scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
