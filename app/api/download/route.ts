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
  if (!name || name.trim().length === 0) return 'download'
  
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid filename chars
    .replace(/[#@]/g, '') // Remove hashtags and mentions
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_+|_+$/g, '') // Trim underscores from start/end
    .trim()
    .slice(0, 100) || 'download'
}

async function getInstagramVideoUrl(url: string, shortcode: string): Promise<{ videoUrl: string; title: string }> {
  const defaultTitle = `Instagram_Reel_${shortcode}`
  
  // Method 1: Using sssinstagram API (most reliable as of 2025)
  try {
    const formData = new URLSearchParams()
    formData.append('link', url)
    formData.append('token', '')

    const response = await fetch('https://sssinstagram.com/api/v1/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://sssinstagram.com',
        'Referer': 'https://sssinstagram.com/',
      },
      body: formData.toString(),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.data && data.data.length > 0) {
        const video = data.data.find((item: { type: string }) => item.type === 'video') || data.data[0]
        if (video && video.url) {
          return { 
            videoUrl: video.url, 
            title: data.title || defaultTitle 
          }
        }
      }
    }
  } catch (e) {
    // Silent fail, try next method
  }

  // Method 2: Using fastdl API
  try {
    const formData = new URLSearchParams()
    formData.append('url', url)

    const response = await fetch('https://fastdl.app/api/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.url) {
        return { videoUrl: data.url, title: data.title || defaultTitle }
      }
    }
  } catch (e) {
    // Silent fail, try next method
  }

  // Method 3: Using SnapSave API
  try {
    const response = await fetch('https://snapsave.app/action.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Origin': 'https://snapsave.app',
        'Referer': 'https://snapsave.app/',
      },
      body: `url=${encodeURIComponent(url)}`,
    })

    if (response.ok) {
      const html = await response.text()
      // Look for video URL in response
      const urlMatch = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/i) ||
                       html.match(/"url":"(https:[^"]+)"/i) ||
                       html.match(/downloadUrlVideo":"(https:[^"]+)"/i)
      if (urlMatch) {
        const videoUrl = urlMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
        return { videoUrl, title: defaultTitle }
      }
    }
  } catch (e) {
    // Silent fail, try next method
  }

  // Method 4: Using ddinstagram proxy
  try {
    const ddUrl = url.replace('instagram.com', 'ddinstagram.com')
    const response = await fetch(ddUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    if (response.ok) {
      const html = await response.text()
      const videoMatch = html.match(/<source[^>]+src="([^"]+)"/i) ||
                        html.match(/property="og:video"[^>]+content="([^"]+)"/i) ||
                        html.match(/"video_url":"([^"]+)"/i)
      if (videoMatch) {
        const videoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
        return { videoUrl, title: defaultTitle }
      }
    }
  } catch (e) {
    // Silent fail, try next method
  }

  // Method 5: Direct Instagram embed scraping with different approach
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    })

    if (response.ok) {
      const html = await response.text()
      
      // Multiple patterns to find video URL
      const patterns = [
        /"video_url":"([^"]+)"/,
        /video_url\\?":\\?"([^"\\]+)/,
        /"contentUrl":"([^"]+)"/,
        /property="og:video"[^>]+content="([^"]+)"/,
        /data-video-url="([^"]+)"/,
        /<video[^>]+src="([^"]+)"/,
      ]

      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match) {
          const videoUrl = match[1]
            .replace(/\\u0026/g, '&')
            .replace(/\\u003C/g, '<')
            .replace(/\\u003E/g, '>')
            .replace(/\\/g, '')
          
          if (videoUrl.includes('http')) {
            return { videoUrl, title: defaultTitle }
          }
        }
      }
    }
  } catch (e) {
    // Silent fail, try next method
  }

  // Method 6: Using igram API
  try {
    const response = await fetch('https://igram.world/api/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://igram.world',
        'Referer': 'https://igram.world/',
      },
      body: `url=${encodeURIComponent(url)}`,
    })

    if (response.ok) {
      const data = await response.json()
      if (data.url) {
        return { videoUrl: data.url, title: data.meta?.title || defaultTitle }
      }
      if (data.items && data.items.length > 0) {
        const video = data.items.find((i: { url: string }) => i.url?.includes('.mp4')) || data.items[0]
        if (video?.url) {
          return { videoUrl: video.url, title: defaultTitle }
        }
      }
    }
  } catch (e) {
    // Silent fail
  }

  // Method 7: Using saveinsta API
  try {
    const formData = new URLSearchParams()
    formData.append('q', url)
    formData.append('t', 'media')
    formData.append('lang', 'en')

    const response = await fetch('https://v3.saveinsta.app/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://saveinsta.app',
        'Referer': 'https://saveinsta.app/',
      },
      body: formData.toString(),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.data) {
        // Parse HTML response
        const htmlData = data.data
        const videoMatch = htmlData.match(/href="([^"]*?\.mp4[^"]*?)"/i) ||
                          htmlData.match(/href="(https:\/\/[^"]+)"/i)
        if (videoMatch) {
          const videoUrl = videoMatch[1].replace(/&amp;/g, '&')
          return { videoUrl, title: defaultTitle }
        }
      }
    }
  } catch (e) {
    // Silent fail
  }

  throw new Error('Unable to extract video from Instagram. The post may be private or the service is temporarily unavailable. Please try again later.')
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
    const fileExtension = format === 'mp3' ? 'mp3' : 'mp4'

    if (platform === 'youtube') {
      const safeTitle = sanitizeFilename(title || 'YouTube_Video')
      
      if (format === 'mp3') {
        downloadUrl = `${OPENUTILS_BASE}/api/stream?url=${encodeURIComponent(url)}`
      } else {
        const fmt = quality === '1080p' ? 'mp4-1080' : quality === '480p' ? 'mp4-480' : 'mp4-720'
        downloadUrl = `${OPENUTILS_BASE}/api/stream/video?url=${encodeURIComponent(url)}&fmt=${fmt}`
      }
      
      filename = `${safeTitle}.${fileExtension}`

      return NextResponse.json({ 
        downloadUrl,
        filename,
        platform,
        direct: true
      })
    } else {
      // Instagram
      const shortcode = extractInstagramShortcode(url)
      if (!shortcode) {
        return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 })
      }

      const igData = await getInstagramVideoUrl(url, shortcode)
      downloadUrl = igData.videoUrl
      
      // Use provided title, or extracted title, or fallback
      const finalTitle = title || igData.title || `Instagram_${shortcode}`
      filename = `${sanitizeFilename(finalTitle)}.${fileExtension}`

      return NextResponse.json({ 
        downloadUrl,
        filename,
        platform,
        direct: false
      })
    }

  } catch (error) {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status}`)
    }

    const contentType = format === 'mp3' ? 'audio/mpeg' : (response.headers.get('content-type') || 'video/mp4')
    const contentLength = response.headers.get('content-length')

    // Properly encode filename for Content-Disposition header
    const safeFilename = filename.replace(/[^\x20-\x7E]/g, '_') // ASCII only for basic filename
    const encodedFilename = encodeURIComponent(filename)
    
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download media' },
      { status: 500 }
    )
  }
}
