import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import path from 'path'
import ytdl from '@distube/ytdl-core'

export const maxDuration = 60

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim())
    // Keep base path, strip tracking params if needed, but preserve essential query params like v for youtube
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      return url.trim()
    }
    // For Instagram, strip query params
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.trim()
  }
}

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

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return ''
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function getYtDlpPath(): string {
  return path.join(process.cwd(), 'bin', 'yt-dlp.exe')
}

function runYtDlp(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const binPath = getYtDlpPath()
    execFile(binPath, args, { timeout: 25000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message))
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (e) {
        reject(new Error('Failed to parse yt-dlp JSON response'))
      }
    })
  })
}

async function getYouTubeInfo(url: string) {
  // Method 1: Try local yt-dlp binary (Fastest & Most Reliable)
  try {
    const data = await runYtDlp([
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
      url
    ])

    return {
      id: data.id,
      title: data.title || 'YouTube Video',
      thumbnail: data.thumbnail || (data.id ? `https://img.youtube.com/vi/${data.id}/maxresdefault.jpg` : ''),
      duration: formatDuration(data.duration),
      author: data.uploader || data.channel || 'YouTube Creator',
      platform: 'youtube',
      hasVideo: true,
      directUrl: data.url || (data.formats ? data.formats.find((f: any) => f.vcodec !== 'none' && f.acodec !== 'none')?.url : null)
    }
  } catch (err) {
    // Method 2: Fallback to @distube/ytdl-core
    try {
      const info = await ytdl.getInfo(url)
      const videoDetails = info.videoDetails
      
      return {
        id: videoDetails.videoId,
        title: videoDetails.title || 'YouTube Video',
        thumbnail: videoDetails.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoDetails.videoId}/maxresdefault.jpg`,
        duration: formatDuration(parseInt(videoDetails.lengthSeconds)),
        author: videoDetails.author?.name || 'YouTube Creator',
        platform: 'youtube',
        hasVideo: true,
      }
    } catch (fallbackErr) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch YouTube info'
      throw new Error(`YouTube fetch error: ${msg}`)
    }
  }
}

async function getInstagramInfo(url: string) {
  const cleanUrl = sanitizeUrl(url)
  const shortcode = extractInstagramShortcode(cleanUrl)
  if (!shortcode) {
    throw new Error('Invalid Instagram URL')
  }

  let title = `Instagram Video (${shortcode})`
  let thumbnail = ''
  let username = 'Instagram User'
  let fullname = 'Instagram Creator'
  let videoUrl: string | null = null

  // Strategy 1: Try Instagram Web REST/GraphQL API with Guest Session
  try {
    const pageRes = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(5000)
    })

    const cookies = pageRes.headers.getSetCookie ? pageRes.headers.getSetCookie() : []
    const cookieMap: Record<string, string> = {}
    cookies.forEach(c => {
      const parts = c.split(';')[0].split('=')
      if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim()
    })

    const csrfToken = cookieMap['csrftoken'] || ''
    const cookieHeader = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ')

    // Try GraphQL doc_id
    const body = new URLSearchParams()
    body.append('variables', JSON.stringify({ shortcode }))
    body.append('doc_id', '8845758582119845')

    const gRes = await fetch('https://www.instagram.com/graphql/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'X-IG-App-ID': '936619743392459',
        'X-ASBD-ID': '198387',
        'X-CSRFToken': csrfToken,
        'Cookie': cookieHeader,
        'Origin': 'https://www.instagram.com',
        'Referer': `https://www.instagram.com/p/${shortcode}/`
      },
      body: body.toString(),
      signal: AbortSignal.timeout(5000)
    })

    if (gRes.ok) {
      const data = await gRes.json()
      const media = data?.data?.xdt_shortcode_media || data?.data?.shortcode_media
      if (media) {
        if (media.video_url) videoUrl = media.video_url
        if (media.display_url) thumbnail = media.display_url
        if (media.owner?.username) username = media.owner.username
        if (media.owner?.full_name) fullname = media.owner.full_name
      }
    }
  } catch {
    // Strategy 1 failed, continue to fallbacks
  }

  // Strategy 2: Try Page Scraping with Multiple User-Agents
  if (!videoUrl || !thumbnail) {
    const userAgents = [
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.40 Mobile Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    ]

    for (const ua of userAgents) {
      if (videoUrl && thumbnail) break
      try {
        const pageRes = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(4000)
        })

        if (pageRes.ok) {
          const html = await pageRes.text()
          const cleanHtml = html.replace(/\\u0026/g, '&').replace(/\\/g, '')

          if (!videoUrl) {
            const vMatch = cleanHtml.match(/"video_url":"([^"]+)"/) ||
                           cleanHtml.match(/video_url\\?":\\?"([^"\\]+)/) ||
                           cleanHtml.match(/"contentUrl":"([^"]+\.mp4[^"]*)"/) ||
                           cleanHtml.match(/property="og:video"\s+content="([^"]+)"/) ||
                           cleanHtml.match(/property="og:video:secure_url"\s+content="([^"]+)"/)
            if (vMatch && vMatch[1]) {
              videoUrl = vMatch[1]
            }
          }

          if (!thumbnail) {
            const tMatch = cleanHtml.match(/property="og:image"\s+content="([^"]+)"/) ||
                           cleanHtml.match(/"display_url":"([^"]+)"/) ||
                           cleanHtml.match(/"thumbnail_src":"([^"]+)"/)
            if (tMatch && tMatch[1]) {
              thumbnail = tMatch[1]
            }
          }

          const uMatch = cleanHtml.match(/"username":"([^"]+)"/) || cleanHtml.match(/@([a-zA-Z0-9_.]+)/)
          if (uMatch && uMatch[1] && uMatch[1] !== 'instagram') {
            username = uMatch[1]
          }
        }
      } catch {
        // continue to next UA
      }
    }
  }

  // Strategy 3: Try local yt-dlp binary
  if (!videoUrl) {
    try {
      const data = await runYtDlp([
        '--dump-json',
        '--no-warnings',
        '--no-playlist',
        cleanUrl
      ])
      if (data) {
        if (data.url) videoUrl = data.url
        if (data.thumbnail) thumbnail = data.thumbnail
        if (data.uploader) username = data.uploader
        if (data.title) title = data.title
      }
    } catch {
      // yt-dlp failed
    }
  }

  if (username && username !== 'Instagram User') {
    title = `${username}_video`
    fullname = username
  }

  return {
    id: shortcode,
    title: title,
    thumbnail: thumbnail,
    duration: '',
    author: fullname,
    platform: 'instagram',
    hasVideo: true,
    videoUrl: videoUrl
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const cleanUrl = sanitizeUrl(url)
    const platform = detectPlatform(cleanUrl)
    
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported platform. Only YouTube and Instagram are supported.' },
        { status: 400 }
      )
    }

    let info

    if (platform === 'youtube') {
      info = await getYouTubeInfo(cleanUrl)
    } else {
      info = await getInstagramInfo(cleanUrl)
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
