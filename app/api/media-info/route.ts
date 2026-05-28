import { NextRequest, NextResponse } from 'next/server'
import { instagramGetUrl } from 'instagram-url-direct'
import snapinsta from 'snapinsta'

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

  let hasVideo = false
  let thumbnail = ''
  let username = 'Instagram'
  let fullname = 'Instagram User'

  // Try instagram-url-direct package first
  try {
    const data = await instagramGetUrl(url)
    
    if (data && data.url_list && data.url_list.length > 0) {
      hasVideo = data.media_details?.some(m => m.type === 'video') || true

      if (data.media_details && data.media_details.length > 0) {
        const videoMedia = data.media_details.find(m => m.type === 'video')
        if (videoMedia && videoMedia.thumbnail) {
          thumbnail = videoMedia.thumbnail
        } else if (data.media_details[0].thumbnail) {
          thumbnail = data.media_details[0].thumbnail
        }
      }

      if (data.post_info?.owner_username) {
        username = data.post_info.owner_username
      }
      if (data.post_info?.owner_fullname) {
        fullname = data.post_info.owner_fullname
      }
    }
  } catch {
    // instagram-url-direct failed, try fallback
  }

  // Fallback 1: Try snapinsta package
  if (!hasVideo) {
    try {
      const snapLinks = await snapinsta.getLinks(url)
      if (snapLinks && snapLinks.length > 0) {
        const videoItem = snapLinks.find((item: { url: string; type: string }) => 
          item.type === 'video/mp4' || item.url.includes('.mp4')
        )
        if (videoItem) {
          hasVideo = true
        }
      }
    } catch {
      // snapinsta failed, try next fallback
    }
  }

  // Fallback 2: Try direct page scraping
  if (!hasVideo) {
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      
      if (pageResponse.ok) {
        const html = await pageResponse.text()
        
        // Check if page contains video content
        if (html.includes('video_url') || html.includes('"video"') || html.includes('og:video')) {
          hasVideo = true
        }
        
        // Try to extract thumbnail
        const thumbMatch = html.match(/property="og:image" content="([^"]+)"/)
        if (thumbMatch && thumbMatch[1]) {
          thumbnail = thumbMatch[1]
        }
        
        // Try to extract username
        const userMatch = html.match(/@([a-zA-Z0-9_.]+)/)
        if (userMatch && userMatch[1] && userMatch[1] !== 'instagram') {
          username = userMatch[1]
        }
      }
    } catch {
      // Scraping failed, continue
    }
  }

  if (!hasVideo) {
    throw new Error('Could not fetch Instagram post. Please make sure the post is public and contains a video.')
  }

  const title = `${username}_video`

  return {
    id: shortcode,
    title: title,
    thumbnail: thumbnail,
    duration: '',
    author: fullname,
    platform: 'instagram',
    hasVideo: hasVideo,
  }
}

async function getYouTubeInfo(url: string) {
  try {
    // Extract video ID from URL
    let videoId = ''
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        videoId = match[1]
        break
      }
    }

    if (!videoId) {
      throw new Error('Invalid YouTube URL format')
    }

    const response = await fetch(`${OPENUTILS_BASE}/api/info?url=${encodeURIComponent(url)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    })
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }

    // Format duration from seconds
    let durationStr = ''
    if (data.duration) {
      const totalSeconds = Math.round(data.duration)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const secs = totalSeconds % 60
      
      if (hours > 0) {
        durationStr = `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      } else {
        durationStr = `${minutes}:${secs.toString().padStart(2, '0')}`
      }
    }

    return {
      id: data.id || videoId,
      title: data.title || 'YouTube Video',
      thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: durationStr,
      author: data.uploader || data.channel || 'YouTube Creator',
      platform: 'youtube',
      hasVideo: true
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch YouTube info'
    throw new Error(`YouTube error: ${errorMsg}`)
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
