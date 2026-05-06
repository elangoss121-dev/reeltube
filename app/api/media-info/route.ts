import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

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

async function getInstagramInfo(url: string) {
  const shortcode = extractInstagramShortcode(url)
  if (!shortcode) {
    throw new Error('Invalid Instagram URL')
  }

  let title = `Instagram_${shortcode}`
  let thumbnail = ''
  let author = 'Instagram'

  // Try to get metadata from Instagram embed page
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
      
      // Extract caption/title
      const captionMatch = html.match(/class="Caption"[^>]*>([^<]+)</) ||
                          html.match(/"caption":"([^"]+)"/) ||
                          html.match(/"text":"([^"]+)"/)
      if (captionMatch) {
        title = captionMatch[1].slice(0, 100).replace(/\\n/g, ' ').trim() || title
      }

      // Extract thumbnail
      const thumbMatch = html.match(/"display_url":"([^"]+)"/) ||
                        html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/) ||
                        html.match(/poster="([^"]+)"/)
      if (thumbMatch) {
        thumbnail = thumbMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
      }

      // Extract author
      const authorMatch = html.match(/"username":"([^"]+)"/) ||
                         html.match(/class="UsernameText"[^>]*>([^<]+)</)
      if (authorMatch) {
        author = `@${authorMatch[1]}`
      }
    }
  } catch (e) {
    console.log('[v0] Instagram embed fetch failed:', e)
  }

  // Also try main page for better metadata
  try {
    const pageResponse = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html',
      },
    })

    if (pageResponse.ok) {
      const html = await pageResponse.text()
      
      const ogTitleMatch = html.match(/property="og:title" content="([^"]+)"/)
      if (ogTitleMatch && ogTitleMatch[1].length > 5) {
        title = ogTitleMatch[1].slice(0, 100)
      }

      const ogImageMatch = html.match(/property="og:image" content="([^"]+)"/)
      if (ogImageMatch && !thumbnail) {
        thumbnail = ogImageMatch[1]
      }
    }
  } catch (e) {
    console.log('[v0] Instagram page fetch failed:', e)
  }

  return {
    id: shortcode,
    title,
    thumbnail,
    duration: '',
    author,
    platform: 'instagram',
    hasVideo: true
  }
}

async function getYouTubeInfo(url: string) {
  const response = await fetch(`${OPENUTILS_BASE}/api/info?url=${encodeURIComponent(url)}`, {
    headers: {
      'Accept': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch YouTube video info')
  }

  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error)
  }

  // Format duration from seconds
  let durationStr = ''
  if (data.duration) {
    const mins = Math.floor(data.duration / 60)
    const secs = data.duration % 60
    durationStr = `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return {
    id: data.id || '',
    title: data.title || 'YouTube Video',
    thumbnail: data.thumbnail || '',
    duration: durationStr,
    author: data.uploader || data.channel || 'YouTube',
    platform: 'youtube',
    hasVideo: true
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const platform = detectPlatform(url)
    
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported platform. Only YouTube and Instagram are supported.' },
        { status: 400 }
      )
    }

    let info

    if (platform === 'youtube') {
      info = await getYouTubeInfo(url)
    } else {
      info = await getInstagramInfo(url)
    }

    return NextResponse.json({
      success: true,
      platform,
      data: info
    })
  } catch (error) {
    console.error('[v0] Media info error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch media info' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const fakeRequest = {
    json: async () => ({ url })
  } as NextRequest
  
  return POST(fakeRequest)
}
