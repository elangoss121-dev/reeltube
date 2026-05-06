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

  // Try to scrape the page for metadata
  try {
    const response = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (response.ok) {
      const html = await response.text()
      
      const titleMatch = html.match(/property="og:title" content="([^"]+)"/)
      const thumbnailMatch = html.match(/property="og:image" content="([^"]+)"/)
      const hasVideo = html.includes('"video_url"') || html.includes('og:video') || html.includes('"is_video":true')
      
      return {
        id: shortcode,
        title: titleMatch ? titleMatch[1].slice(0, 100) : `Instagram Video`,
        thumbnail: thumbnailMatch ? thumbnailMatch[1] : '',
        duration: '',
        author: 'Instagram',
        platform: 'instagram',
        hasVideo: hasVideo
      }
    }
  } catch {
    // Fallback to basic info
  }

  // Return basic info - we'll attempt download anyway
  return {
    id: shortcode,
    title: `Instagram Video`,
    thumbnail: '',
    duration: '',
    author: 'Instagram',
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
    console.error('Media info error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch media info' },
      { status: 500 }
    )
  }
}

// Also support GET for direct URL passing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Reuse POST logic
  const fakeRequest = {
    json: async () => ({ url })
  } as NextRequest
  
  return POST(fakeRequest)
}
