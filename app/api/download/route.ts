import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import path from 'path'
import ytdl from '@distube/ytdl-core'

export const maxDuration = 60

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s.-]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100)
}

function getYtDlpPath(): string {
  return path.join(process.cwd(), 'bin', 'yt-dlp.exe')
}

function runYtDlp(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const binPath = getYtDlpPath()
    execFile(binPath, args, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message))
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (e) {
        reject(new Error('Failed to parse yt-dlp response'))
      }
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, format = 'mp4-720', quality = '720p', title = 'video' } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const platform = url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'instagram'
    const safeTitle = sanitizeFilename(title)
    const isAudioOnly = format.includes('mp3') || format.includes('flac')
    const fileExtension = isAudioOnly ? (format.includes('flac') ? 'flac' : 'mp3') : 'mp4'

    let downloadUrl: string | null = null

    if (platform === 'youtube') {
      // 1. Try yt-dlp first
      try {
        const formatArg = isAudioOnly ? 'bestaudio/best' : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        const data = await runYtDlp([
          '--dump-json',
          '--no-warnings',
          '--no-playlist',
          '-f', formatArg,
          url
        ])

        if (data && (data.url || data.formats)) {
          downloadUrl = data.url
          if (!downloadUrl && data.formats && data.formats.length > 0) {
            const validFormats = isAudioOnly 
              ? data.formats.filter((f: any) => f.vcodec === 'none' && f.acodec !== 'none')
              : data.formats.filter((f: any) => f.vcodec !== 'none' && f.acodec !== 'none')
            const chosen = validFormats.pop() || data.formats[data.formats.length - 1]
            if (chosen && chosen.url) downloadUrl = chosen.url
          }
        }
      } catch {
        // yt-dlp failed, fallback to ytdl-core
      }

      // 2. Fallback to @distube/ytdl-core
      if (!downloadUrl) {
        try {
          const info = await ytdl.getInfo(url)
          if (isAudioOnly) {
            const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' })
            if (audioFormat && audioFormat.url) downloadUrl = audioFormat.url
          } else {
            const videoFormat = ytdl.chooseFormat(info.formats, { filter: 'audioandvideo', quality: 'highestvideo' })
            if (videoFormat && videoFormat.url) downloadUrl = videoFormat.url
          }
        } catch {
          // ytdl-core failed
        }
      }

      if (!downloadUrl) {
        return NextResponse.json({ error: 'Could not extract YouTube download URL. Please try again.' }, { status: 400 })
      }

      const filename = `${safeTitle}.${fileExtension}`
      return NextResponse.json({
        downloadUrl,
        filename,
        platform,
        direct: true
      })
    } else {
      // Instagram
      // Try yt-dlp or direct page fetch
      try {
        const data = await runYtDlp([
          '--dump-json',
          '--no-warnings',
          '--no-playlist',
          url
        ])
        if (data && (data.url || data.formats)) {
          downloadUrl = data.url || data.formats?.[0]?.url
        }
      } catch {
        // yt-dlp failed, page scraping fallback
      }

      if (!downloadUrl) {
        // Fetch page HTML
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(6000)
          })

          if (res.ok) {
            const html = await res.text()
            const cleanHtml = html.replace(/\\u0026/g, '&').replace(/\\/g, '')

            const vMatch = cleanHtml.match(/"video_url":"([^"]+)"/) ||
                           cleanHtml.match(/video_url\\?":\\?"([^"\\]+)/) ||
                           cleanHtml.match(/"contentUrl":"([^"]+\.mp4[^"]*)"/) ||
                           cleanHtml.match(/property="og:video"\s+content="([^"]+)"/)
            if (vMatch && vMatch[1]) {
              downloadUrl = vMatch[1]
            }
          }
        } catch {
          // Scraping failed
        }
      }

      if (!downloadUrl) {
        return NextResponse.json({ 
          error: 'Could not fetch Instagram post. Please make sure the post is public and contains a video.' 
        }, { status: 400 })
      }

      const filename = `${safeTitle}.${fileExtension}`
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
    let contentType = 'video/mp4'
    if (format === 'flac') contentType = 'audio/flac'
    else if (format === 'mp3') contentType = 'audio/mpeg'
    else if (format === 'mp4') contentType = 'video/mp4'

    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': downloadUrl.includes('instagram') ? 'https://www.instagram.com/' : 'https://www.youtube.com/',
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok || !response.body) {
      throw new Error(`Failed to stream media (HTTP ${response.status})`)
    }

    const contentLength = response.headers.get('content-length')
    const safeFilename = sanitizeFilename(filename)
    const encodedFilename = encodeURIComponent(filename)

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

    return new NextResponse(response.body, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to download media'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
