import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

const OPENUTILS_BASE = 'https://ytdl.openutils.net'

function detectPlatform(url: string): string | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram.com')) return 'instagram'
  return null
}

function extractInstagramShortcode(url: string): string | null {
  const patterns = [
    /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/stories\/[^/]+\/(\d+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function getInstagramVideoUrl(url: string): Promise<{ videoUrl: string; title: string }> {
  const shortcode = extractInstagramShortcode(url)
  if (!shortcode) {
    throw new Error('Invalid Instagram URL')
  }

  // Method 1: Try Instagram's embed endpoint
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`
    const embedResponse = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (embedResponse.ok) {
      const html = await embedResponse.text()
      
      // Look for video URL in embed page
      const videoMatch = html.match(/"video_url":"([^"]+)"/) ||
                        html.match(/class="EmbeddedMediaVideo"[^>]*src="([^"]+)"/) ||
                        html.match(/video[^>]*src="([^"]+\.mp4[^"]*)"/i)
      
      if (videoMatch) {
        const videoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
        return { videoUrl, title: `Instagram_${shortcode}` }
      }
    }
  } catch {
    // Continue to next method
  }

  // Method 2: Try direct page scraping with different headers
  try {
    const response = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    })

    if (response.ok) {
      const html = await response.text()
      
      // Try multiple patterns
      const patterns = [
        /"video_url":"([^"]+)"/,
        /property="og:video" content="([^"]+)"/,
        /property="og:video:secure_url" content="([^"]+)"/,
        /"contentUrl":"([^"]+)"/,
        /video_versions.*?"url":"([^"]+)"/,
      ]

      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match) {
          const videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
          return { videoUrl, title: `Instagram_${shortcode}` }
        }
      }
    }
  } catch {
    // Continue to next method
  }

  // Method 3: Try reels URL format
  try {
    const reelResponse = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (reelResponse.ok) {
      const html = await reelResponse.text()
      const videoMatch = html.match(/"video_url":"([^"]+)"/) ||
                        html.match(/property="og:video" content="([^"]+)"/)
      
      if (videoMatch) {
        const videoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
        return { videoUrl, title: `Instagram_Reel_${shortcode}` }
      }
    }
  } catch {
    // Continue
  }

  throw new Error('Could not extract video. The post may be private, not a video, or Instagram has blocked the request.')
}

export async function POST(request: NextRequest) {
  try {
    const { url, format, quality } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const platform = detectPlatform(url)
    if (!platform) {
      return NextResponse.json({ error: 'Unsupported platform. Only YouTube and Instagram are supported.' }, { status: 400 })
    }

    let downloadUrl: string
    let filename: string

    if (platform === 'youtube') {
      // Use OpenUtils YTDL API for YouTube - completely free, no API key needed
      if (format === 'mp3') {
        downloadUrl = `${OPENUTILS_BASE}/api/stream?url=${encodeURIComponent(url)}`
        filename = `youtube_audio_${Date.now()}.mp3`
      } else {
        const fmt = quality === '1080p' ? 'mp4-1080' : 'mp4-720'
        downloadUrl = `${OPENUTILS_BASE}/api/stream/video?url=${encodeURIComponent(url)}&fmt=${fmt}`
        filename = `youtube_video_${Date.now()}.mp4`
      }

      return NextResponse.json({ 
        downloadUrl,
        filename,
        platform,
        direct: true // Flag to indicate direct download
      })
    } else {
      // Instagram
      const igData = await getInstagramVideoUrl(url)
      downloadUrl = igData.videoUrl
      filename = `${igData.title}_${Date.now()}.mp4`

      return NextResponse.json({ 
        downloadUrl,
        filename,
        platform,
        direct: false // Need to proxy Instagram downloads
      })
    }

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process media' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const downloadUrl = searchParams.get('url')
  const filename = searchParams.get('filename') || 'download.mp4'

  if (!downloadUrl) {
    return NextResponse.json({ error: 'Download URL is required' }, { status: 400 })
  }

  try {
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || 'video/mp4'
    const contentLength = response.headers.get('content-length')

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    })

    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Stream error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download media' },
      { status: 500 }
    )
  }
}
