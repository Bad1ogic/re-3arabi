const metadata = {
  id: "syrialive",
  name: "Syrialive",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSF607wnarFL8Ob8KLPahUPJzcLjbtg1pEH0A&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Syrialive scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
