
package com.krmzy

import com.lagradost.cloudstream3.*
import com.lagradost.cloudstream3.utils.ExtractorLink
import com.lagradost.cloudstream3.utils.loadExtractor
import org.jsoup.nodes.Element
import com.lagradost.cloudstream3.*
import com.lagradost.cloudstream3.utils.Qualities
import com.lagradost.cloudstream3.utils.newExtractorLink
import com.lagradost.cloudstream3.network.CloudflareKiller
import okhttp3.Interceptor
import com.lagradost.cloudstream3.utils.M3u8Helper
import java.net.URI

class krmzyProvider : MainAPI() {
    override var mainUrl = "https://krmzy.com"
    override var name = "قرمزي"
    override val hasMainPage = true
    override var lang = "ar"
    override val supportedTypes = setOf(
        TvType.TvSeries
    )

    override val mainPage = mainPageOf(
        "$mainUrl/series-list/page/" to "جميع المسلسلات",
    )

    private val cloudflareKiller by lazy { CloudflareKiller() }
    private val cfInterceptor: Interceptor get() = cloudflareKiller


    private fun Element.toSearchResponse(): SearchResponse? {
        val link = this.selectFirst("a") ?: return null
        val href = link.attr("href")
        val title = link.selectFirst("div.title")?.text()?.trim() ?: link.attr("title")
        val posterUrl = link.selectFirst("div.imgSer, div.imgBg")?.attr("style")?.let {
            Regex("""url\(['"]?(.*?)['"]?\)""").find(it)?.groupValues?.get(1)
        }

        return newTvSeriesSearchResponse(title, href, TvType.TvSeries) {
            this.posterUrl = posterUrl
        }
    }
    override suspend fun getMainPage(
        page: Int,
        request: MainPageRequest
    ): HomePageResponse {

        val document = app.get(request.data + page, interceptor = cfInterceptor).document
        val home = document.select("div.block-post").mapNotNull {
            it.toSearchResponse()
        }
        return newHomePageResponse(request.name, home)
    }

    override suspend fun search(query: String): List<SearchResponse> {
        return search(query, 1)?.items ?: emptyList()
    }

    override suspend fun search(query: String, page: Int): SearchResponseList? {

        val url = if (page > 1) {

            "$mainUrl/search/$query/page/$page/"
        } else {

            "$mainUrl/?s=$query"
        }

        val document = app.get(url, interceptor = cfInterceptor).document

        val items = document.select("div.block-post").mapNotNull {
            it.toSearchResponse()
        }






        return newSearchResponseList(items, items.isNotEmpty())
    }

    override suspend fun load(url: String): LoadResponse {
        val document = app.get(url, interceptor = cfInterceptor).document

        val seriesUrl = document.selectFirst("div.singleSeries div.info h1 a")?.attr("href")
        if (seriesUrl != null) {

            return load(seriesUrl)
        }

        val title = document.selectFirst("div.info h1")?.text()?.trim() ?: ""
        val poster = document.selectFirst("div.cover div.img")?.attr("style")
            ?.substringAfter("url(")?.substringBefore(")")
        val description = document.selectFirst("div.story")?.text()?.trim()

        if (url.contains("/movies/")) {
            return newMovieLoadResponse(title, url, TvType.Movie, url) {
                this.posterUrl = poster
                this.plot = description
            }
        } else {
            val episodes = document.select("article.postEp").mapNotNull {
                val epUrl = it.selectFirst("a")?.attr("href") ?: return@mapNotNull null
                val epTitle = it.selectFirst("div.title")?.text()?.trim()
                val epNum = it.selectFirst("div.episodeNum span:last-child")?.text()?.toIntOrNull()

                val epPoster = it.selectFirst("div.imgSer")
                    ?.attr("style")
                    ?.substringAfter("url(")?.substringBefore(")")

                newEpisode(epUrl) {
                    name = epTitle
                    episode = epNum
                    posterUrl = epPoster // إضافة الصورة لكل حلقة
                }
            }.reversed()

            return newTvSeriesLoadResponse(title, url, TvType.TvSeries, episodes) {
                this.posterUrl = poster
                this.plot = description
            }
        }
    }

    private suspend fun extractLinkFromObfuscatedPage(
        url: String,
        referer: String,
        logCallback: (String) -> Unit
    ): String? {
        val pageText = try {
            logCallback("Custom Extractor: Fetching page $url with referer $referer")

            app.get(url, referer = referer, interceptor = cfInterceptor).text
        } catch (e: Exception) {
            logCallback("Custom Extractor ERROR: Failed to fetch page $url. Exception: ${e.message}")
            return null
        }

        val evalRegex = Regex("""eval\s*\(\s*function\s*\(.*?\)\s*\{.*?\}\s*\((.*)\)\s*\)""")
        val evalMatch = evalRegex.find(pageText)
        if (evalMatch == null) {
            logCallback("Custom Extractor ERROR: evalRegex did not find a match.")


            return null
        }

        val paramsString = evalMatch.groupValues.getOrNull(1) ?: return null

        val paramsRegex = Regex("""['"](.*?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"](.*?)['"]\.split\s*\(['"]\|['"]\)""")
        val paramMatch = paramsRegex.find(paramsString)
        if (paramMatch == null) {
            logCallback("Custom Extractor ERROR: paramsRegex failed on: '${paramsString.take(100)}...'")
            return null
        }

        val (packedCode, baseStr, countStr, dictionaryStr) = paramMatch.destructured
        val base = baseStr.toInt()
        val count = countStr.toInt()
        val keywords = dictionaryStr.split('|')

        fun deobfuscate(p: String, a: Int, c: Int, k: List<String>): String {

            fun toBase(num: Int, radix: Int): String {
                val chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
                if (num == 0) return "0"
                var n = num
                val sb = StringBuilder()
                while (n > 0) {
                    sb.append(chars[n % radix])
                    n /= radix
                }
                return sb.reverse().toString()
            }

            val replaceMap = mutableMapOf<String, String>()
            for (i in 0 until c) {
                val keyword = k.getOrNull(i)
                if (!keyword.isNullOrEmpty()) {
                    replaceMap[toBase(i, a)] = keyword
                }
            }


            return Regex("""\b\w+\b""").replace(p) { matchResult ->
                replaceMap[matchResult.value] ?: matchResult.value
            }
        }

        val deobfuscatedJs = deobfuscate(packedCode, base, count, keywords)

        logCallback("Custom Extractor: Deobfuscated JS start: ${deobfuscatedJs.take(100)}")

        val fileRegex = Regex("""["']?file["']?\s*:\s*["']([^"']+)["']""")
        val fileMatch = fileRegex.find(deobfuscatedJs)

        if (fileMatch == null) {
            logCallback("Custom Extractor ERROR: fileRegex did not find a match.")

            return null
        }

        val finalUrl = fileMatch.groupValues[1]

        val cleanUrl = finalUrl.replace("\\/", "/")

        logCallback("Custom Extractor: Success! Found URL: $cleanUrl")
        return cleanUrl
    }



    /**
     * دالة مساعدة لمحاكاة منطق البايثون في فحص الريفير المناسب للتشغيل.
     * تتحقق من: رابط الـ Iframe نفسه، ثم qesen، ثم newaat.
     */
    private suspend fun checkWorkingStreamReferer(
        streamUrl: String,
        originEmbedUrl: String,
        logCallback: (String) -> Unit
    ): String {


        val iframeHostReferer = try {
            val uri = URI(originEmbedUrl)
            "${uri.scheme}://${uri.host}/"
        } catch (e: Exception) {
            "https://qesen.net/" // Fallback
        }

        val candidates = listOf(
            iframeHostReferer,
            "https://qesen.net/",
            "https://newaat.com/"
        )

        logCallback("Checking working referer for stream. Candidates: $candidates")

        for (ref in candidates) {
            try {


                val code = app.get(
                    streamUrl,
                    referer = ref,
                    interceptor = cfInterceptor
                ).code

                if (code == 200) {
                    logCallback("Referer works: $ref")
                    return ref
                } else {
                    logCallback("Referer failed ($code): $ref")
                }
            } catch (e: Exception) {
                logCallback("Referer check error for $ref: ${e.message}")
            }
        }

        logCallback("All checks failed. Defaulting to: $iframeHostReferer")
        return iframeHostReferer
    }

    /**
     * تم تعديل الدالة لتقبل قائمة من الـ Referers وتجربها بالتتابع
     */
    private suspend fun extractLinkFromObfuscatedPage(
        url: String,
        referers: List<String>,
        logCallback: (String) -> Unit
    ): String? {
        var pageText: String? = null

        for (ref in referers) {
            try {
                logCallback("Custom Extractor: Trying to fetch page with referer: $ref")
                val text = app.get(url, referer = ref, interceptor = cfInterceptor).text

                if (text.contains("eval(function")) {
                    pageText = text
                    logCallback("Success fetching with referer: $ref")
                    break
                } else {
                    logCallback("Fetched page but no 'eval' found with referer: $ref")
                }
            } catch (e: Exception) {
                logCallback("Failed to fetch with referer $ref: ${e.message}")
            }
        }

        if (pageText == null) {
            logCallback("Custom Extractor ERROR: Failed to fetch valid page with all provided referers.")
            return null
        }

        val evalRegex = Regex("""eval\s*\(\s*function\s*\(.*?\)\s*\{.*?\}\s*\((.*)\)\s*\)""")
        val evalMatch = evalRegex.find(pageText)
        if (evalMatch == null) {
            logCallback("Custom Extractor ERROR: evalRegex did not find a match.")
            return null
        }

        val paramsString = evalMatch.groupValues.getOrNull(1) ?: return null

        val paramsRegex = Regex("""['"](.*?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"](.*?)['"]\.split\s*\(['"]\|['"]\)""")
        val paramMatch = paramsRegex.find(paramsString)
        if (paramMatch == null) {
            logCallback("Custom Extractor ERROR: paramsRegex failed.")
            return null
        }

        val (packedCode, baseStr, countStr, dictionaryStr) = paramMatch.destructured
        val base = baseStr.toInt()
        val count = countStr.toInt()
        val keywords = dictionaryStr.split('|')

        fun deobfuscate(p: String, a: Int, c: Int, k: List<String>): String {
            fun toBase(num: Int, radix: Int): String {
                val chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
                if (num == 0) return "0"
                var n = num
                val sb = StringBuilder()
                while (n > 0) {
                    sb.append(chars[n % radix])
                    n /= radix
                }
                return sb.reverse().toString()
            }

            val replaceMap = mutableMapOf<String, String>()
            for (i in 0 until c) {
                val keyword = k.getOrNull(i)
                if (!keyword.isNullOrEmpty()) {
                    replaceMap[toBase(i, a)] = keyword
                }
            }

            return Regex("""\b\w+\b""").replace(p) { matchResult ->
                replaceMap[matchResult.value] ?: matchResult.value
            }
        }

        val deobfuscatedJs = deobfuscate(packedCode, base, count, keywords)

        val fileRegex = Regex("""["']?file["']?\s*:\s*["']([^"']+)["']""")
        val fileMatch = fileRegex.find(deobfuscatedJs)

        if (fileMatch == null) {
            logCallback("Custom Extractor ERROR: fileRegex did not find a match.")
            return null
        }

        val finalUrl = fileMatch.groupValues[1]
        val cleanUrl = finalUrl.replace("\\/", "/")

        logCallback("Custom Extractor: Success! Found URL: $cleanUrl")
        return cleanUrl
    }

    private fun videoCodecName(codecs: String): String {
        val c = codecs.lowercase()
        return when {
            c.contains("av01") -> "AV1"
            c.contains("hvc1") || c.contains("hev1") -> "HEVC"
            c.contains("avc") -> "H.264"
            c.contains("vp9") || c.contains("vp09") -> "VP9"
            c.contains("av1") -> "AV1"
            else -> ""
        }
    }

    private fun parseStreamInfAttributes(line: String): Map<String, String> {
        val result = mutableMapOf<String, String>()
        val attrRegex = Regex("""([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))""")
        attrRegex.findAll(line.substringAfter(":").trim()).forEach { m ->
            val key = m.groupValues[1]
            val value = if (m.groupValues[2].isNotEmpty()) m.groupValues[2] else m.groupValues[3]
            if (key.isNotEmpty()) result[key] = value
        }
        return result
    }

    private fun stripQuery(u: String): String =
        try {
            java.net.URI(u).let { java.net.URI(it.scheme, it.authority, it.path, null, null).toString() }
        } catch (t: Throwable) {
            u.substringBefore("?")
        }

    private suspend fun fetchVariantCodecs(masterUrl: String): Map<String, String> {
        val result = mutableMapOf<String, String>()
        val masterText = try {
            app.get(
                masterUrl,
                referer = "https://www.dailymotion.com/",
                headers = mapOf(
                    "Origin" to "https://www.dailymotion.com/",
                    "Referer" to "https://www.dailymotion.com/"
                ),
                interceptor = cfInterceptor
            ).text
        } catch (t: Throwable) {
            return result
        }

        var pendingAttrs: Map<String, String>? = null
        masterText.lines().forEach { rawLine ->
            val line = rawLine.trim()
            if (line.startsWith("#EXT-X-STREAM-INF:")) {
                pendingAttrs = parseStreamInfAttributes(line)
            } else if (pendingAttrs != null && line.isNotEmpty() && !line.startsWith("#")) {
                val attrs = pendingAttrs ?: return@forEach
                pendingAttrs = null
                val codec = videoCodecName(attrs["CODECS"] ?: "")
                if (codec.isNotEmpty()) {
                    val uri = try {
                        java.net.URI(masterUrl).resolve(line).toString()
                    } catch (t: Throwable) {
                        line
                    }
                    result[uri] = codec
                    result[stripQuery(uri)] = codec
                }
            }
        }
        return result
    }

    private suspend fun loadDailymotion(
        input: String,
        subtitleCallback: (SubtitleFile) -> Unit,
        callback: (ExtractorLink) -> Unit,
        log: (String) -> Unit
    ) {
        val id = Regex("""dailymotion\.com/(?:embed/)?video/([a-zA-Z0-9_-]+)""")
            .find(input)?.groupValues?.get(1) ?: input.trim()
        if (id.isBlank()) {
            log("Dailymotion ERROR: could not extract video id from $input")
            return
        }

        val videoPageUrl = "https://www.dailymotion.com/video/$id"
        val metadataUrl = "https://www.dailymotion.com/player/metadata/video/$id?embedder=" +
            java.net.URLEncoder.encode(videoPageUrl, "UTF-8")

        try {
            log("Dailymotion: fetching metadata $metadataUrl")
            val json = org.json.JSONObject(
                app.get(metadataUrl, interceptor = cfInterceptor).text
            )

            val qualities = json.optJSONObject("qualities")
            if (qualities == null) {
                log("Dailymotion ERROR: no qualities in metadata. ${json.opt("error")}")
                loadExtractor(videoPageUrl, "https://www.dailymotion.com/", subtitleCallback, callback)
                return
            }

            var emitted = false
            val groups = qualities.keys()
            while (groups.hasNext()) {
                val groupName = groups.next()
                val entries = qualities.optJSONArray(groupName) ?: continue
                for (i in 0 until entries.length()) {
                    val entry = entries.optJSONObject(i) ?: continue
                    val streamUrl = entry.optString("url").trim()
                    val type = entry.optString("type")
                    if (streamUrl.isBlank()) continue

                    if (type.contains("mpegURL", ignoreCase = true) || streamUrl.contains(".m3u8")) {
                        val qualityLinks = com.lagradost.cloudstream3.utils.M3u8Helper.generateM3u8(
                            source = this.name,
                            streamUrl = streamUrl,
                            referer = "https://www.dailymotion.com/",
                            headers = mapOf("Origin" to "https://www.dailymotion.com/")
                        )
                        if (qualityLinks.isNotEmpty()) {
                            emitted = true
                            val codecs = fetchVariantCodecs(streamUrl)
                            qualityLinks.forEach { link ->
                                val codec = codecs[link.url] ?: codecs[stripQuery(link.url)] ?: ""
                                val linkName = if (codec.isNotEmpty()) {
                                    "Dailymotion - ${link.name} $codec"
                                } else {
                                    "Dailymotion - ${link.name}"
                                }
                                callback.invoke(
                                    newExtractorLink(
                                        source = link.source,
                                        name = linkName,
                                        url = link.url
                                    ) {
                                        this.referer = link.referer
                                        this.quality = link.quality
                                        this.headers = link.headers
                                    }
                                )
                            }
                        } else {
                            emitted = true
                            callback.invoke(
                                newExtractorLink(source = this.name, name = "Dailymotion", url = streamUrl) {
                                    this.quality = Qualities.Unknown.value
                                    this.referer = "https://www.dailymotion.com/"
                                    this.headers = mapOf(
                                        "Origin" to "https://www.dailymotion.com/",
                                        "Referer" to "https://www.dailymotion.com/"
                                    )
                                }
                            )
                        }
                    } else if (type.contains("mp4", ignoreCase = true)) {
                        emitted = true
                        callback.invoke(
                            newExtractorLink(source = this.name, name = "Dailymotion", url = streamUrl) {
                                this.referer = "https://www.dailymotion.com/"
                            }
                        )
                    }
                }
            }

            if (!emitted) {
                log("Dailymotion: no usable stream entries, falling back to built-in extractor")
                loadExtractor(videoPageUrl, "https://www.dailymotion.com/", subtitleCallback, callback)
            }
        } catch (t: Throwable) {
            log("Dailymotion error: ${t.message}")
            try {
                loadExtractor(videoPageUrl, "https://www.dailymotion.com/", subtitleCallback, callback)
            } catch (_: Throwable) {
            }
        }
    }

    override suspend fun loadLinks(
        data: String,
        isCasting: Boolean,
        subtitleCallback: (SubtitleFile) -> Unit,
        callback: (ExtractorLink) -> Unit
    ): Boolean {
        val logBuilder = StringBuilder()
        fun log(line: String) {
            val ts = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ", java.util.Locale.US)
                .apply { timeZone = java.util.TimeZone.getDefault() }
                .format(java.util.Date())
            val l = "[$ts] $line"
            println(l)
            logBuilder.append(l).append("\n")
        }

        log("START loadLinks for page: $data")

        val mainPageHostReferer = try {
            val uri = java.net.URI(data)
            "${uri.scheme}://${uri.host}/"
        } catch (e: Exception) {
            data
        }

        val episodePage = try {
            app.get(data, interceptor = cfInterceptor).document
        } catch (t: Throwable) {
            log("ERROR: failed to fetch episode page: ${t.message}")
            return false
        }

        val extractorUrl = episodePage.selectFirst("a.fullscreen-clickable")?.attr("href")
        if (extractorUrl.isNullOrBlank()) {
            log("No <a.fullscreen-clickable> found.")
            return false
        }

        if (extractorUrl.endsWith(".m3u8", ignoreCase = true) || extractorUrl.endsWith(".mp4", ignoreCase = true)) {
            callback.invoke(
                newExtractorLink(source = this.name, name = this.name, url = extractorUrl) {
                    this.quality = Qualities.Unknown.value
                }
            )
            return true
        }

        data class ServerItem(
            val name: String?,
            val id: String?,
            val codeHref: String?
        )

        fun ensureHttp(u: String): String =
            when {
                u.startsWith("//") -> "https:$u"
                u.startsWith("http") -> u
                else -> "https://$u"
            }

        suspend fun serversFromEpisodePayload(href: String): List<ServerItem> {
            val b64 = Regex("""[?&]post=([^&"']+)""").find(href)?.groupValues?.get(1) ?: return emptyList()
            val jsonText = try {
                val normalized = b64.replace('-', '+').replace('_', '/')
                val padded = normalized + "=".repeat((4 - normalized.length % 4) % 4)
                String(android.util.Base64.decode(padded, android.util.Base64.DEFAULT), Charsets.UTF_8)
            } catch (t: Throwable) {
                log("Payload decode error: ${t.message}")
                return emptyList()
            }
            return try {
                val servers = org.json.JSONObject(jsonText).optJSONArray("servers") ?: return emptyList()
                (0 until servers.length()).mapNotNull { i ->
                    val s = servers.optJSONObject(i) ?: return@mapNotNull null
                    ServerItem(s.optString("name"), s.optString("id"), null)
                }
            } catch (t: Throwable) {
                log("Payload parse error: ${t.message}")
                emptyList()
            }
        }

        suspend fun serversFromQesenPage(url: String): List<ServerItem> {
            val normalizedUrl = url.replace("qesen.net/krmzi?", "qesen.net/krmzi/?")
            val extractorPage = try {
                app.get(normalizedUrl, referer = data, interceptor = cfInterceptor).document
            } catch (t: Throwable) {
                log("ERROR: failed to fetch extractor page: ${t.message}")
                return emptyList()
            }
            return extractorPage.select("ul.serversList li").mapNotNull { li ->
                val id = li.attr("data-server").ifBlank { li.attr("data-server-id") }.trim()
                ServerItem(
                    name = li.attr("data-name").ifBlank { li.attr("data-type") }.trim(),
                    id = id.ifBlank { null },
                    codeHref = li.selectFirst("code a")?.attr("href")
                )
            }
        }

        val serverItems = serversFromEpisodePayload(extractorUrl).ifEmpty {
            serversFromQesenPage(extractorUrl)
        }
        if (serverItems.isEmpty()) {
            log("No servers found on episode page payload or extractor page.")
            return false
        }
        log("Found ${serverItems.size} server(s)")

        for (item in serverItems) {
            val serverTypeRaw = (item.name ?: "").trim()
            val serverType = serverTypeRaw.lowercase().trim()
            val serverIdRaw = item.id ?: ""

            var embedUrl: String? = null
            try {
                embedUrl = when (serverType) {
                    "youtube" -> "https://www.youtube.com/watch?v=$serverIdRaw"
                    "youtube_in" -> "https://www.youtube.com/embed/$serverIdRaw"
                    "express" -> serverIdRaw.ifBlank { null }
                    "dailymotion" -> item.codeHref ?: serverIdRaw.ifBlank { null }
                    "facebook" -> "https://app.videas.fr/embed/media/$serverIdRaw"
                    "estream" -> "https://arabveturk.com/embed-$serverIdRaw.html"
                    "arab hd", "arabhd", "arab-hd" -> "https://v.turkvearab.com/embed-$serverIdRaw.html"
                    "box" -> "https://youdboox.com/embed-$serverIdRaw.html"
                    "now" -> "https://extreamnow.org/embed-$serverIdRaw.html"
                    "ok" -> ensureHttp("//ok.ru/videoembed/$serverIdRaw")
                    "red hd", "redhd", "red-hd" -> "https://iplayerhls.com/e/$serverIdRaw"
                    "pro hd", "prohd", "pro-hd" -> "https://ebtv.upns.live/#$serverIdRaw"
                    "pro" -> "https://mdna.upns.online/#$serverIdRaw"
                    else -> item.codeHref ?: serverIdRaw.ifBlank { null }
                }

                if (!embedUrl.isNullOrBlank()) {
                    when (serverType) {
                        "arab hd", "arabhd", "arab-hd", "estream" -> {
                            log("Processing custom server: $serverType ($embedUrl)")
                            try {
                                val fetchReferers = listOf(mainPageHostReferer, "https://newaat.com/")
                                val extractedM3u8 = extractLinkFromObfuscatedPage(embedUrl, fetchReferers, ::log)

                                if (!extractedM3u8.isNullOrBlank()) {
                                    val workingReferer = checkWorkingStreamReferer(extractedM3u8, embedUrl, ::log)
                                    val qualityLinks = com.lagradost.cloudstream3.utils.M3u8Helper.generateM3u8(
                                        source = this.name,
                                        streamUrl = extractedM3u8,
                                        referer = workingReferer,
                                        headers = mapOf("Origin" to workingReferer.trimEnd('/'))
                                    )

                                    if (qualityLinks.isNotEmpty()) {
                                        qualityLinks.forEach { link ->
                                            callback.invoke(
                                                newExtractorLink(
                                                    source = link.source,
                                                    name = "$serverTypeRaw - ${link.name}",
                                                    url = link.url
                                                ) {
                                                    this.referer = link.referer
                                                    this.quality = link.quality
                                                    this.headers = link.headers
                                                }
                                            )
                                        }
                                    } else {
                                        callback.invoke(
                                            newExtractorLink(source = this.name, name = serverTypeRaw, url = extractedM3u8) {
                                                this.quality = Qualities.Unknown.value
                                                this.referer = workingReferer
                                            }
                                        )
                                    }
                                }
                            } catch (t: Throwable) {
                                log("Error in custom extraction: ${t.message}")
                            }
                        }

                        "youtube" -> {
                            callback.invoke(
                                newExtractorLink(source = this.name, name = "YouTube", url = embedUrl) {
                                    this.quality = Qualities.Unknown.value
                                }
                            )
                        }

                        "dailymotion" -> {
                            log("Processing Dailymotion server: $embedUrl")
                            try {
                                loadDailymotion(embedUrl, subtitleCallback, callback, ::log)
                            } catch (t: Throwable) {
                                log("Error in Dailymotion extraction: ${t.message}")
                            }
                        }

                        else -> {
                            try {
                                loadExtractor(embedUrl, mainPageHostReferer, subtitleCallback, callback)
                            } catch (t: Throwable) {
                            }
                        }
                    }
                }
            } catch (t: Throwable) {
                log("Exception processing server: ${t.message}")
            }
        }

        try {
            java.io.File("server_log_${System.currentTimeMillis()}.txt").writeText(logBuilder.toString())
        } catch (_: Exception) {}

        return true
    }
}