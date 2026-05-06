import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 300

const RAPIDAPI_HOST = "all-media-downloader1.p.rapidapi.com"
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}/all`

interface MediaFormat {
  format_id: string
  ext: string
  filesize?: number
  url: string
  quality?: string
  resolution?: string
  acodec?: string
  vcodec?: string
}

interface ApiResponse {
  ok: boolean
  source?: string
  title?: string
  thumbnail?: string
  duration?: number
  formats?: MediaFormat[]
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { url, format, quality } = await request.json()

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

    // Call the All Media Downloader API
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
        { error: "Failed to process media. Please check the URL and try again." },
        { status: 400 }
      )
    }

    const data: ApiResponse = await response.json()

    if (!data.ok || !data.formats || data.formats.length === 0) {
      return NextResponse.json(
        { error: "Could not extract download links from this URL." },
        { status: 400 }
      )
    }

    // Determine if we want audio only
    const isAudioOnly = format === "mp3" || format === "audio"

    // Find the best matching format
    let downloadFormat: MediaFormat | undefined

    if (isAudioOnly) {
      // Look for audio formats
      downloadFormat = data.formats.find(
        (f) => f.ext === "mp3" || f.ext === "m4a" || f.acodec !== "none"
      )
      // If no audio format, get the first available
      if (!downloadFormat) {
        downloadFormat = data.formats[0]
      }
    } else {
      // Look for video formats matching requested quality
      const qualityNum = quality?.replace("p", "") || "720"
      
      // Try to find exact quality match
      downloadFormat = data.formats.find(
        (f) =>
          (f.format_id?.includes(qualityNum) ||
            f.quality?.includes(qualityNum) ||
            f.resolution?.includes(qualityNum)) &&
          (f.ext === "mp4" || f.ext === "webm")
      )

      // If no exact match, find best available video
      if (!downloadFormat) {
        downloadFormat = data.formats.find(
          (f) => f.ext === "mp4" || f.ext === "webm" || f.vcodec !== "none"
        )
      }

      // Fallback to first format
      if (!downloadFormat) {
        downloadFormat = data.formats[0]
      }
    }

    if (!downloadFormat?.url) {
      return NextResponse.json(
        { error: "No suitable download format found." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      downloadUrl: downloadFormat.url,
      format: isAudioOnly ? "mp3" : downloadFormat.ext || "mp4",
      title: data.title || "download",
      thumbnail: data.thumbnail,
      duration: data.duration,
      filesize: downloadFormat.filesize,
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Failed to process download request. Please try again." },
      { status: 500 }
    )
  }
}

// GET endpoint for proxying downloads
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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Encoding": "identity",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch file")
    }

    const contentType =
      format === "mp3" || format === "m4a" ? "audio/mpeg" : "video/mp4"
    const sanitizedFilename = filename
      .replace(/[^\w\s-]/g, "")
      .substring(0, 100)
      .trim() || "download"

    const headers = new Headers()
    headers.set("Content-Type", contentType)
    headers.set(
      "Content-Disposition",
      `attachment; filename="${sanitizedFilename}.${format}"`
    )

    const contentLength = response.headers.get("content-length")
    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new NextResponse(response.body, { headers })
  } catch (error) {
    console.error("File fetch error:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
