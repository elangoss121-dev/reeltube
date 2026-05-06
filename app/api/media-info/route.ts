import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

function detectPlatform(url: string): string | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
  if (url.includes("instagram.com")) return "instagram"
  if (url.includes("tiktok.com")) return "tiktok"
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter"
  if (url.includes("facebook.com") || url.includes("fb.watch")) return "facebook"
  if (url.includes("vimeo.com")) return "vimeo"
  if (url.includes("reddit.com")) return "reddit"
  if (url.includes("pinterest.com") || url.includes("pin.it")) return "pinterest"
  if (url.includes("soundcloud.com")) return "soundcloud"
  if (url.includes("twitch.tv")) return "twitch"
  return null
}

function extractVideoId(url: string, platform: string): string {
  if (platform === "youtube") {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
  }
  
  if (platform === "instagram") {
    const match = url.match(/instagram\.com\/(?:p|reel|reels|stories\/[^/]+)\/([a-zA-Z0-9_-]+)/)
    if (match) return match[1]
  }

  // Return a hash of the URL as fallback
  return btoa(url).substring(0, 12)
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const platform = detectPlatform(url)

    if (!platform) {
      return NextResponse.json(
        { error: "Unsupported platform. Supported: YouTube, Instagram, TikTok, Twitter/X, Facebook, Vimeo, Reddit, Pinterest, SoundCloud, Twitch" },
        { status: 400 }
      )
    }

    const videoId = extractVideoId(url, platform)

    // For YouTube, try to get thumbnail
    let thumbnail = ""
    if (platform === "youtube" && videoId.length === 11) {
      thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }

    // Return basic info - the actual media details come from Cobalt during download
    return NextResponse.json({
      success: true,
      platform: platform,
      data: {
        id: videoId,
        title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Media`,
        thumbnail: thumbnail,
        duration: "",
        author: "",
        url: url,
      },
    })

  } catch (error) {
    console.error("Media info error:", error)
    return NextResponse.json(
      { error: "Failed to fetch media information" },
      { status: 500 }
    )
  }
}
