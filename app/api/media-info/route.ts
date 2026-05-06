import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

const RAPIDAPI_HOST = "all-media-downloader1.p.rapidapi.com"
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}/all`

interface MediaFormat {
  format_id: string
  ext: string
  filesize?: number
  url: string
}

interface ApiResponse {
  ok: boolean
  source?: string
  title?: string
  thumbnail?: string
  duration?: number
  formats?: MediaFormat[]
}

function detectPlatform(url: string): string {
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
  return "other"
}

function extractVideoId(url: string, platform: string): string {
  try {
    const urlObj = new URL(url)
    
    if (platform === "youtube") {
      const videoId = urlObj.searchParams.get("v")
      if (videoId) return videoId
      
      if (url.includes("youtu.be/")) {
        return urlObj.pathname.slice(1).split("/")[0]
      }
      if (url.includes("/shorts/")) {
        return urlObj.pathname.split("/shorts/")[1]?.split("/")[0] || ""
      }
    }
    
    return urlObj.pathname.split("/").filter(Boolean).pop() || ""
  } catch {
    return ""
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) {
      return NextResponse.json(
        { error: "API key not configured. Please add RAPIDAPI_KEY to environment variables." },
        { status: 500 }
      )
    }

    const platform = detectPlatform(url)
    const videoId = extractVideoId(url, platform)

    // Call the All Media Downloader API to get metadata
    const body = new URLSearchParams({ url })
    
    const response = await fetch(RAPIDAPI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": rapidApiKey,
      },
      body,
    })

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: "Failed to fetch media information. Please check the URL." },
        { status: 400 }
      )
    }

    const data: ApiResponse = await response.json()

    if (!data.ok) {
      return NextResponse.json(
        { error: "Could not extract information from this URL." },
        { status: 400 }
      )
    }

    // Format duration
    let durationStr = ""
    if (data.duration) {
      const mins = Math.floor(data.duration / 60)
      const secs = data.duration % 60
      durationStr = `${mins}:${secs.toString().padStart(2, "0")}`
    }

    return NextResponse.json({
      success: true,
      platform,
      data: {
        id: videoId,
        title: data.title || "Untitled",
        thumbnail: data.thumbnail || "",
        duration: durationStr,
        author: "",
        formats: data.formats?.length || 0,
      },
    })
  } catch (error) {
    console.error("Media info error:", error)
    return NextResponse.json(
      { error: "Failed to fetch media information. Please try again." },
      { status: 500 }
    )
  }
}
