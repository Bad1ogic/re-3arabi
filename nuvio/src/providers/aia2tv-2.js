const metadata = {
  id: "aia2tv-2",
  name: "Asia2tv 2",
  description: "",
  version: "1.0.0",
  author: "Abodabodd",
  supportedTypes: ["movie", "tv"],
  logo: "https://media.licdn.com/dms/image/v2/C4D0BAQEhyYSi351HRw/company-logo_200_200/company-logo_200_200/0/1630489719119?e=2147483647&v=beta&t=Br69OJ2AwT5vdJHgl-DTvliEqOmp6VQLYwUWcFqG4u4",
  contentLanguage: ["ar"],
  formats: ["m3u8", "mp4"],
  limited: true
};

async function getStreams(tmdbId, mediaType, season, episode) {
  // TODO: port Asia2tv 2 scraping logic to Nuvio
  return [];
}

module.exports = { metadata, getStreams };
