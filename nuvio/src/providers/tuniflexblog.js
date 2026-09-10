const metadata = {
  id: "tuniflexblog",
  name: "TuniflexBlog",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["tv", "movie"],
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSo47ccjaIfUnxJjGujQd6qTKTZH70W6LFeaFXht5TE8w&s",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port TuniflexBlog scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
