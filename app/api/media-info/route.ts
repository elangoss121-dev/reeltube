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

  let title = `Instagram_Reel_${shortcode}`
  let thumbnail = ''
  let author = 'Instagram User'

  // Try multiple methods to get Instagram metadata
  
  // Method 1: Try Instagram's oEmbed endpoint (works for public posts)
  try {
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data.title) {
        title = data.title.slice(0, 100)
      }
      if (data.thumbnail_url) {
        thumbnail = data.thumbnail_url
      }
      if (data.author_name) {
        author = `@${data.author_name}`
      }
    }
  } catch (e) {
    // Silent fail, continue with other methods
  }

  // Method 2: Try scraping main page for metadata
  try {
    const pageResponse = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (pageResponse.ok) {
      const html = await pageResponse.text()
      
      // Extract og:title
      const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/) ||
                          html.match(/content="([^"]+)"\s+property="og:title"/)
      if (ogTitleMatch && ogTitleMatch[1].length > 5) {
        title = ogTitleMatch[1]
          .replace(/ on Instagram:.*$/i, '')
          .replace(/ \| Instagram$/i, '')
          .slice(0, 100)
      }

      // Extract og:image for thumbnail
      const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/) ||
                          html.match(/content="([^"]+)"\s+property="og:image"/)
      if (ogImageMatch && !thumbnail) {
        thumbnail = ogImageMatch[1].replace(/&amp;/g, '&')
      }

      // Extract author from meta or script
      const authorMatch = html.match(/"username":"([^"]+)"/) ||
                         html.match(/@([a-zA-Z0-9_.]+)/) 
      if (authorMatch && author === 'Instagram User') {
        author = `@${authorMatch[1]}`
      }
    }
  } catch (e) {
    // Silent fail
  }

  // Method 3: Try embed page as last resort
  if (title === `Instagram_Reel_${shortcode}` || !thumbnail) {
    try {
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      })

      if (response.ok) {
        const html = await response.text()
        
        // Extract caption/title from embed
        const captionMatch = html.match(/"caption":"([^"]{1,200})"/) ||
                            html.match(/class="Caption"[^>]*>([^<]{1,200})</)
        if (captionMatch && title === `Instagram_Reel_${shortcode}`) {
          title = captionMatch[1]
            .replace(/\\n/g, ' ')
            .replace(/\\u[0-9a-fA-F]{4}/g, '')
            .trim()
            .slice(0, 100) || title
        }

        // Extract thumbnail from embed
        const thumbMatch = html.match(/"display_url":"([^"]+)"/) ||
                          html.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/)
        if (thumbMatch && !thumbnail) {
          thumbnail = thumbMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
        }

        // Extract username
        const userMatch = html.match(/"username":"([^"]+)"/)
        if (userMatch && author === 'Instagram User') {
          author = `@${userMatch[1]}`
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  // Clean up title
  title = title
    .replace(/[#@]\S+/g, '') // Remove hashtags and mentions
    .replace(/\s+/g, ' ')
    .trim() || `Instagram_Reel_${shortcode}`

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
