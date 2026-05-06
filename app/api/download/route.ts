import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 300

const COBALT_API = "https://api.cobalt.tools/api/json"

interface CobaltResponse {
  status: string
  url?: string
  urls?: string[]
  text?: string
  picker?: Array<{ url: string; type: string }>
}

export async function POST(request: NextRequest) {
  try {
    const { url, format, quality } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Determine if we want audio only
    const isAudioOnly = format === "mp3" || format === "audio"
    
    // Map quality to cobalt format
    let vQuality = "720"
    if (quality) {
      const q = quality.replace("p", "")
      if (["144", "240", "360", "480", "720", "1080", "1440", "2160", "4320"].includes(q)) {
        vQuality = q
      }
    }

    // Call Cobalt API
    const cobaltResponse = await fetch(COBALT_API, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        vCodec: "h264",
        vQuality: vQuality,
        aFormat: "mp3",
        filenamePattern: "basic",
        isAudioOnly: isAudioOnly,
        isNoTTWatermark: true,
        isTTFullAudio: true,
        disableMetadata: false,
      }),
    })

    if (!cobaltResponse.ok) {
      const errorText = await cobaltResponse.text()
      console.error("Cobalt API error:", errorText)
      return NextResponse.json(
        { error: "Failed to process media. Please try again." },
        { status: 400 }
      )
    }

    const data: CobaltResponse = await cobaltResponse.json()

    if (data.status === "error" || data.status === "rate-limit") {
      return NextResponse.json(
        { error: data.text || "Failed to process media" },
        { status: 400 }
      )
    }

    // Handle different response types
    let downloadUrl: string | null = null

    if (data.status === "redirect" || data.status === "stream") {
      downloadUrl = data.url || null
    } else if (data.status === "picker" && data.picker && data.picker.length > 0) {
      // For posts with multiple media, get the first video or image
      const video = data.picker.find(p => p.type === "video")
      downloadUrl = video?.url || data.picker[0]?.url || null
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "Could not get download URL" },
        { status: 400 }
      )
    }

    // Return the direct download URL
    return NextResponse.json({
      success: true,
      downloadUrl: downloadUrl,
      format: isAudioOnly ? "mp3" : "mp4",
    })

  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Failed to process download request" },
      { status: 500 }
    )
  }
}

// GET endpoint for direct downloads
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const downloadUrl = searchParams.get("downloadUrl")
    const filename = searchParams.get("filename") || "download"
    const format = searchParams.get("format") || "mp4"

    if (!downloadUrl) {
      return NextResponse.json({ error: "Download URL is required" }, { status: 400 })
    }

    // Fetch the actual file
    const response = await fetch(downloadUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch file")
    }

    const contentType = format === "mp3" ? "audio/mpeg" : "video/mp4"
    const sanitizedFilename = filename.replace(/[^\w\s-]/g, "").substring(0, 100)

    const headers = new Headers()
    headers.set("Content-Type", contentType)
    headers.set("Content-Disposition", `attachment; filename="${sanitizedFilename}.${format}"`)
    
    const contentLength = response.headers.get("content-length")
    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new NextResponse(response.body, { headers })

  } catch (error) {
    console.error("File fetch error:", error)
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    )
  }
}
