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

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100)
}

async function getInstagramVideoUrl(url: string): Promise<{ videoUrl: string; title: string }> {
  const shortcode = extractInstagramShortcode(url)
  if (!shortcode) {
    throw new Error('Invalid Instagram URL')
  }

  // Method 1: Use saveig.app API (most reliable)
  try {
    const apiUrl = `https://v3.saveig.app/api/ajaxSearch`
    const formData = new URLSearchParams()
    formData.append('q', url)
    formData.append('t', 'media')
    formData.append('lang', 'en')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://saveig.app',
        'Referer': 'https://saveig.app/',
      },
      body: formData.toString(),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.status === 'ok' && data.data) {
        // Parse HTML response to get video URL
        const html = data.data
        const videoMatch = html.match(/href="([^"]*\.mp4[^"]*)"/i) || 
                          html.match(/href="(https:\/\/[^"]+)"/i)
        if (videoMatch) {
          const videoUrl = videoMatch[1].replace(/&amp;/g, '&')
          return { videoUrl, title: `Instagram_${shortcode}` }
        }
      }
    }
  } catch (e) {
    console.log('[v0] saveig.app failed:', e)
  }

  // Method 2: Use snapinsta API
  try {
    const apiUrl = 'https://snapinsta.app/api/ajaxSearch'
    const formData = new URLSearchParams()
    formData.append('q', url)
    formData.append('t', 'media')
    formData.append('lang', 'en')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://snapinsta.app',
        'Referer': 'https://snapinsta.app/',
      },
      body: formData.toString(),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.status === 'ok' && data.data) {
        const html = data.data
        const videoMatch = html.match(/href="([^"]*\.mp4[^"]*)"/i) ||
                          html.match(/download-btn[^>]*href="([^"]+)"/i)
        if (videoMatch) {
          const videoUrl = videoMatch[1].replace(/&amp;/g, '&')
          return { videoUrl, title: `Instagram_${shortcode}` }
        }
      }
    }
  } catch (e) {
    console.log('[v0] snapinsta failed:', e)
  }

  // Method 3: Use igdownloader.app API
  try {
    const apiUrl = 'https://igdownloader.app/api/ajaxSearch'
    const formData = new URLSearchParams()
    formData.append('q', url)
    formData.append('t', 'media')
    formData.append('lang', 'en')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: formData.toString(),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.status === 'ok' && data.data) {
        const html = data.data
        const videoMatch = html.match(/href="([^"]*\.mp4[^"]*)"/i) ||
                          html.match(/href="(https:\/\/[^"]+)"/i)
        if (videoMatch) {
          const videoUrl = videoMatch[1].replace(/&amp;/g, '&')
          return { videoUrl, title: `Instagram_${shortcode}` }
        }
      }
    }
  } catch (e) {
    console.log('[v0] igdownloader failed:', e)
  }

  // Method 4: Try direct Instagram API endpoint
  try {
    const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables=${encodeURIComponent(JSON.stringify({ shortcode }))}`
    
    const response = await fetch(graphqlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json',
        'X-IG-App-ID': '936619743392459',
      },
    })

    if (response.ok) {
      const data = await response.json()
      const media = data?.data?.shortcode_media
      if (media?.video_url) {
        return { 
          videoUrl: media.video_url, 
          title: media.title || media.edge_media_to_caption?.edges?.[0]?.node?.text?.slice(0, 50) || `Instagram_${shortcode}`
        }
      }
    }
  } catch (e) {
    console.log('[v0] Instagram GraphQL failed:', e)
  }

  // Method 5: Try embed page scraping
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (response.ok) {
      const html = await response.text()
      const videoMatch = html.match(/"video_url":"([^"]+)"/)
      if (videoMatch) {
        const videoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
        return { videoUrl, title: `Instagram_${shortcode}` }
      }
    }
  } catch (e) {
    console.log('[v0] Instagram embed failed:', e)
  }

  throw new Error('Could not extract Instagram video. Please make sure the post is public and contains a video.')
}

export async function POST(request: NextRequest) {
  try {
    const { url, format, quality, title } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const platform = detectPlatform(url)
    if (!platform) {
      return NextResponse.json({ error: 'Unsupported platform. Only YouTube and Instagram are supported.' }, { status: 400 })
    }

    let downloadUrl: string
    let filename: string
    const safeTitle = sanitizeFilename(title || 'download')

    if (platform === 'youtube') {
      if (format === 'mp3') {
        downloadUrl = `${OPENUTILS_BASE}/api/stream?url=${encodeURIComponent(url)}`
        filename = `${safeTitle}.mp3`
      } else {
        const fmt = quality === '1080p' ? 'mp4-1080' : quality === '480p' ? 'mp4-480' : 'mp4-720'
        downloadUrl = `${OPENUTILS_BASE}/api/stream/video?url=${encodeURIComponent(url)}&fmt=${fmt}`
        filename = `${safeTitle}.mp4`
      }

      return NextResponse.json({ 
        downloadUrl,
        filename,
        platform,
        direct: true
      })
    } else {
      // Instagram
      const igData = await getInstagramVideoUrl(url)
      downloadUrl = igData.videoUrl
      const igTitle = title || igData.title
      filename = format === 'mp3' ? `${sanitizeFilename(igTitle)}.mp3` : `${sanitizeFilename(igTitle)}.mp4`

      return NextResponse.json({ 
        downloadUrl,
        filename,
        platform,
        direct: false
      })
    }

  } catch (error) {
    console.error('[v0] Download error:', error)
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
  const format = searchParams.get('format') || 'mp4'

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

    const contentType = format === 'mp3' ? 'audio/mpeg' : (response.headers.get('content-type') || 'video/mp4')
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
    console.error('[v0] Stream error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download media' },
      { status: 500 }
    )
  }
}
