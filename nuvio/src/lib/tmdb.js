const { normalizeTitle } = require("./normalize.js");

// Public TMDB v3 API key (community key, used by several Nuvio provider repos)
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const TMDB_BASE = "https://api.themoviedb.org/3";

async function getMedia(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  try {
    const [resAr, resEn] = await Promise.all([
      fetch(TMDB_BASE + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=ar", { skipSizeCheck: true }),
      fetch(TMDB_BASE + "/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=en-US", { skipSizeCheck: true })
    ]);
    if (resAr.ok) {
      const data = await resAr.json();
      if (data && (data.title || data.name)) return data;
    }
    if (resEn.ok) return await resEn.json();
    return null;
  } catch (e) {
    console.error("[TMDB] getMedia error:", e.message);
    return null;
  }
}

async function fetchAlternativeTitles(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  try {
    const res = await fetch(
      TMDB_BASE + "/" + endpoint + "/" + tmdbId + "/alternative_titles?api_key=" + TMDB_API_KEY,
      { skipSizeCheck: true }
    );
    if (!res.ok) return [];
    const alt = await res.json();
    const list = endpoint === "tv" ? alt.results || [] : alt.titles || [];
    return list.map((i) => i.title).filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function getTitles(tmdbId, mediaType) {
  const [d, alts] = await Promise.all([
    getMedia(tmdbId, mediaType),
    fetchAlternativeTitles(tmdbId, mediaType)
  ]);
  if (!d) return [];
  const titles = [];
  const primary = d.title || d.name || "";
  if (primary) titles.push(primary);
  const orig = d.original_title || d.original_name || "";
  if (orig && orig !== primary) titles.push(orig);
  for (const t of alts) {
    if (typeof t !== "string" || !t) continue;
    if (!titles.some((x) => normalizeTitle(x) === normalizeTitle(t))) titles.push(t);
  }
  return titles;
}

// Per-season episode counts for a TV show (seasons numbered >= 1, i.e.
// excluding the "specials" season 0). Used by providers whose site numbers
// episodes continuously across seasons (no season separation).
async function getSeasonCounts(tmdbId, mediaType) {
  if (mediaType === "movie") return [];
  try {
    const res = await fetch(
      TMDB_BASE + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=en-US",
      { skipSizeCheck: true }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const seasons = data.seasons || [];
    return seasons
      .filter((s) => s.season_number >= 1)
      .map((s) => ({ season: s.season_number, count: s.episode_count || 0 }));
  } catch (e) {
    return [];
  }
}

module.exports = { getMedia, getTitles, getSeasonCounts, TMDB_API_KEY };