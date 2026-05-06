import { NextRequest, NextResponse } from "next/server"
import ytdl from "@distube/ytdl-core"

export const maxDuration = 60

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

function extractInstagramId(url: string): string | null {
  const patterns = [
    /instagram\.com\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/,
    /instagram\.com\/stories\/[^/]+\/(\d+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Detect platform
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be")
    const isInstagram = url.includes("instagram.com")

    if (!isYouTube && !isInstagram) {
      return NextResponse.json(
        { error: "Invalid URL. Please enter a valid YouTube or Instagram link." },
        { status: 400 }
      )
    }

    if (isYouTube) {
      const videoId = extractYouTubeId(url)
      if (!videoId) {
        return NextResponse.json({ error: "Could not extract YouTube video ID" }, { status: 400 })
      }

      try {
        const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`)
        const videoDetails = info.videoDetails

        // Get available formats
        const formats = info.formats
          .filter((f) => f.hasVideo || f.hasAudio)
          .map((f) => ({
            itag: f.itag,
            quality: f.qualityLabel || (f.hasAudio && !f.hasVideo ? "audio" : "unknown"),
            container: f.container,
            hasVideo: f.hasVideo,
            hasAudio: f.hasAudio,
            contentLength: f.contentLength,
            mimeType: f.mimeType,
          }))

        return NextResponse.json({
          success: true,
          platform: "youtube",
          data: {
            id: videoId,
            title: videoDetails.title,
            thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url || "",
            duration: formatDuration(parseInt(videoDetails.lengthSeconds)),
            author: videoDetails.author.name,
            viewCount: videoDetails.viewCount,
            url: url,
            formats,
          },
        })
      } catch (ytError) {
        console.error("YouTube fetch error:", ytError)
        return NextResponse.json(
          { error: "Failed to fetch YouTube video info. The video may be private, age-restricted, or unavailable." },
          { status: 400 }
        )
      }
    }

    if (isInstagram) {
      const postId = extractInstagramId(url)
      if (!postId) {
        return NextResponse.json({ error: "Could not extract Instagram post ID" }, { status: 400 })
      }

      // For Instagram, we'll use a different approach since there's no reliable npm package
      // We return basic info and handle the actual download differently
      return NextResponse.json({
        success: true,
        platform: "instagram",
        data: {
          id: postId,
          title: `Instagram ${url.includes("/reel") ? "Reel" : "Post"} - ${postId}`,
          thumbnail: "",
          duration: "",
          author: "Instagram User",
          url: url,
          formats: [],
        },
      })
    }

    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 })
  } catch (error) {
    console.error("Media info error:", error)
    return NextResponse.json(
      { error: "Failed to fetch media information" },
      { status: 500 }
    )
  }
}
