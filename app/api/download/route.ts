import { NextRequest, NextResponse } from 'next/server'
import { instagramGetUrl } from 'instagram-url-direct'
import snapinsta from 'snapinsta'

export const maxDuration = 300

const OPENUTILS_BASE = 'https://ytdl.openutils.net'

function detectPlatform(url: string): string | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram.com')) return 'instagram'
  return null
}

function sanitizeFilename(name: string): string {
  if (!name || name.trim().length === 0) return 'download'
  
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/[#@]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim()
    .slice(0, 100) || 'download'
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
    const fileExtension = format === 'flac' ? 'flac' : format === 'mp3' ? 'mp3' : 'mp4'

    if (platform === 'youtube') {
      const safeTitle = sanitizeFilename(title || 'YouTube_Video')
      
      if (format === 'mp3' || format === 'flac') {
        // Map audio quality to bitrate
        let audioBitrate = '128' // default
        if (quality.includes('FLAC') || quality.includes('Lossless')) {
          audioBitrate = 'flac'
        } else if (quality.includes('320')) {
          audioBitrate = '320'
        } else if (quality.includes('256')) {
          audioBitrate = '256'
        } else if (quality.includes('192')) {
          audioBitrate = '192'
        } else if (quality.includes('128')) {
          audioBitrate = '128'
        }
        
        if (audioBitrate === 'flac') {
          downloadUrl = `${OPENUTILS_BASE}/api/stream?url=${encodeURIComponent(url)}&fmt=flac&precise=true`
        } else {
          downloadUrl = `${OPENUTILS_BASE}/api/stream?url=${encodeURIComponent(url)}&bitrate=${audioBitrate}&precise=true`
        }
      } else {
        // Map quality to format code - use itag for precise extraction
        let itag = '22' // default 720p
        let fmt = 'mp4-720'
        
        if (quality.includes('4K') || quality.includes('2160')) {
          itag = '313' // 2160p webm or 401 for mp4
          fmt = 'mp4-2160'
        } else if (quality.includes('2K') || quality.includes('1440')) {
          itag = '308' // 1440p
          fmt = 'mp4-1440'
        } else if (quality.includes('1080')) {
          itag = '137' // 1080p mp4
          fmt = 'mp4-1080'
        } else if (quality.includes('720')) {
          itag = '22' // 720p mp4 with audio
          fmt = 'mp4-720'
        } else if (quality.includes('480')) {
          itag = '135' // 480p
          fmt = 'mp4-480'
        } else if (quality.includes('360')) {
          itag = '18' // 360p mp4 with audio
          fmt = 'mp4-360'
        }
        
        // Use the streaming endpoint with precise extraction
        downloadUrl = `${OPENUTILS_BASE}/api/stream/video?url=${encodeURIComponent(url)}&fmt=${fmt}&itag=${itag}&precise=true`
      }
      
      filename = `${safeTitle}.${fileExtension}`

      return NextResponse.json({ 
        downloadUrl,
        filename,
        platform,
        direct: true
      })
    } else {
      // Instagram - use instagram-url-direct package
      let data
      let videoUrl: string | null = null
      let ownerUsername = ''

      try {
        data = await instagramGetUrl(url)
        
        if (data && data.url_list && data.url_list.length > 0) {
          // Find a video URL from media_details or url_list
          if (data.media_details && data.media_details.length > 0) {
            const videoMedia = data.media_details.find(m => m.type === 'video')
            if (videoMedia && videoMedia.url) {
              videoUrl = videoMedia.url
            }
          }
          
          if (!videoUrl && data.url_list.length > 0) {
            videoUrl = data.url_list[0]
          }

          if (data.post_info?.owner_username) {
            ownerUsername = data.post_info.owner_username
          }
        }
      } catch {
        // instagram-url-direct failed, try fallback
      }

      // Fallback 1: Try snapinsta package
      if (!videoUrl) {
        try {
          const snapLinks = await snapinsta.getLinks(url)
          if (snapLinks && snapLinks.length > 0) {
            // Find video URL
            const videoItem = snapLinks.find((item: { url: string; type: string }) => 
              item.type === 'video/mp4' || item.url.includes('.mp4')
            ) || snapLinks[0]
            
            if (videoItem && videoItem.url) {
              videoUrl = videoItem.url
            }
          }
        } catch {
          // snapinsta failed, try next fallback
        }
      }

      // Fallback 2: Try direct page scraping
      if (!videoUrl) {
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
            
            // Try to find video URL in the page HTML
            const videoUrlPatterns = [
              /"video_url":"([^"]+)"/,
              /video_url\\?":\\?"([^"\\]+)/,
              /"contentUrl":"([^"]+\.mp4[^"]*)"/,
              /property="og:video" content="([^"]+)"/,
              /src="([^"]*instagram[^"]*\.mp4[^"]*)"/,
            ]
            
            for (const pattern of videoUrlPatterns) {
              const match = html.match(pattern)
              if (match && match[1]) {
                videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
                break
              }
            }
          }
        } catch (e2) {
          // Scraping failed, continue
        }
      }

      if (!videoUrl) {
        return NextResponse.json({ 
          error: 'Could not extract Instagram video. Please make sure the post is public and contains a video.' 
        }, { status: 400 })
      }

      downloadUrl = videoUrl

      // Create filename from title or username
      let finalTitle = title
      if (!finalTitle && ownerUsername) {
        finalTitle = `Instagram_${ownerUsername}`
      }
      if (!finalTitle) {
        finalTitle = 'Instagram_video'
      }
      
      filename = `${sanitizeFilename(finalTitle)}.${fileExtension}`

      return NextResponse.json({ 
        downloadUrl,
        filename,
        platform,
        direct: false
      })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process media'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
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
    // Determine content type based on format
    let contentType = 'video/mp4'
    if (format === 'flac') contentType = 'audio/flac'
    else if (format === 'mp3') contentType = 'audio/mpeg'
    else if (format === 'mp4') contentType = 'video/mp4'

    // Fetch with proper headers and error handling
    let response: Response | null = null
    let lastError: Error | null = null

    // Try fetching up to 2 times for reliability
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetch(downloadUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.instagram.com/',
            'Connection': 'keep-alive',
          },
          timeout: 30000,
        })

        if (response.ok) break
        lastError = new Error(`HTTP ${response.status}`)
      } catch (e) {
        lastError = e instanceof Error ? e : new Error('Unknown fetch error')
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 500)) // Wait before retry
        }
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Failed to fetch media after retries')
    }

    // Get content length if available
    const contentLength = response.headers.get('content-length')

    // Sanitize filename for header
    const safeFilename = filename
      .replace(/[^\w\s.-]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 100)
    
    const encodedFilename = encodeURIComponent(filename)

    // Create response headers
    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    })

    if (contentLength && parseInt(contentLength) > 0) {
      responseHeaders.set('Content-Length', contentLength)
    }

    // Stream the response body directly
    if (response.body) {
      return new NextResponse(response.body, {
        status: 200,
        headers: responseHeaders,
      })
    } else {
      // Fallback: read body as buffer
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        status: 200,
        headers: responseHeaders,
      })
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to download media'
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}
