import { NextRequest, NextResponse } from "next/server"
import ytdl from "@distube/ytdl-core"

export const maxDuration = 300

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get("url")
    const format = searchParams.get("format") || "mp4"
    const quality = searchParams.get("quality") || "720p"

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be")
    const isInstagram = url.includes("instagram.com")

    if (isYouTube) {
      const videoId = extractYouTubeId(url)
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
      }

      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
      const info = await ytdl.getInfo(youtubeUrl)
      const title = info.videoDetails.title.replace(/[^\w\s-]/g, "").substring(0, 50)

      if (format === "mp3") {
        // Audio only
        const audioFormat = ytdl.chooseFormat(info.formats, { 
          quality: "highestaudio",
          filter: "audioonly" 
        })

        if (!audioFormat) {
          return NextResponse.json({ error: "No audio format available" }, { status: 400 })
        }

        const response = await fetch(audioFormat.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch audio stream")
        }

        const headers = new Headers()
        headers.set("Content-Type", "audio/mpeg")
        headers.set("Content-Disposition", `attachment; filename="${title}.mp3"`)
        if (audioFormat.contentLength) {
          headers.set("Content-Length", audioFormat.contentLength)
        }

        return new NextResponse(response.body, { headers })
      } else {
        // Video - find best format matching quality
        const qualityMap: Record<string, string> = {
          "1080p": "137",
          "720p": "136",
          "480p": "135",
          "360p": "134",
        }

        // Try to get video with audio combined, or fall back to best available
        let videoFormat = info.formats.find(
          (f) => f.hasVideo && f.hasAudio && f.qualityLabel === quality
        )

        if (!videoFormat) {
          // Try to get any format with the desired quality
          videoFormat = info.formats.find(
            (f) => f.hasVideo && f.qualityLabel === quality
          )
        }

        if (!videoFormat) {
          // Fall back to best available with audio
          videoFormat = ytdl.chooseFormat(info.formats, { 
            quality: "highest",
            filter: (format) => format.hasVideo && format.hasAudio
          })
        }

        if (!videoFormat) {
          // Last resort - any video
          videoFormat = ytdl.chooseFormat(info.formats, { quality: "highest" })
        }

        if (!videoFormat || !videoFormat.url) {
          return NextResponse.json({ error: "No suitable video format available" }, { status: 400 })
        }

        const response = await fetch(videoFormat.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch video stream")
        }

        const headers = new Headers()
        headers.set("Content-Type", videoFormat.mimeType || "video/mp4")
        headers.set("Content-Disposition", `attachment; filename="${title}.mp4"`)
        if (videoFormat.contentLength) {
          headers.set("Content-Length", videoFormat.contentLength)
        }

        return new NextResponse(response.body, { headers })
      }
    }

    if (isInstagram) {
      // Instagram downloads require a different approach
      // For now, we'll use a third-party API or scraping method
      // This is a simplified implementation
      
      try {
        // Try to fetch the Instagram page and extract the video URL
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch Instagram page")
        }

        const html = await response.text()
        
        // Try to find video URL in the HTML
        const videoUrlMatch = html.match(/"video_url":"([^"]+)"/) || 
                             html.match(/content="([^"]+\.mp4[^"]*)"/) ||
                             html.match(/property="og:video"\s+content="([^"]+)"/)
        
        if (videoUrlMatch && videoUrlMatch[1]) {
          let videoUrl = videoUrlMatch[1].replace(/\\u0026/g, "&")
          
          const videoResponse = await fetch(videoUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          })

          if (!videoResponse.ok) {
            throw new Error("Failed to fetch Instagram video")
          }

          const headers = new Headers()
          headers.set("Content-Type", "video/mp4")
          headers.set("Content-Disposition", `attachment; filename="instagram_video.mp4"`)

          return new NextResponse(videoResponse.body, { headers })
        }

        return NextResponse.json(
          { error: "Could not extract video from Instagram. The post may be private or not contain a video." },
          { status: 400 }
        )
      } catch (igError) {
        console.error("Instagram download error:", igError)
        return NextResponse.json(
          { error: "Failed to download Instagram content. Please make sure the post is public and contains a video." },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Failed to process download request" },
      { status: 500 }
    )
  }
}
