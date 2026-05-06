"use client"

import { useState, useCallback } from "react"
import { UrlInput } from "./url-input"
import { MediaPreview, MediaInfo } from "./media-preview"
import { FormatSelector, FormatOption } from "./format-selector"
import { ProgressIndicator, ProgressStatus } from "./progress-indicator"
import { Button } from "@/components/ui/button"
import { AlertCircle, RotateCcw } from "lucide-react"

function detectPlatform(url: string): string | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
  if (url.includes("instagram.com")) return "instagram"
  return null
}

export function MediaDownloader() {
  const [currentUrl, setCurrentUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [media, setMedia] = useState<MediaInfo | null>(null)
  const [status, setStatus] = useState<ProgressStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null)

  const handleUrlSubmit = useCallback(async (url: string) => {
    setError(null)
    setMedia(null)
    setStatus(null)
    setIsLoading(true)
    setCurrentUrl(url)

    const platform = detectPlatform(url)

    if (!platform) {
      setError("Unsupported URL. Only YouTube and Instagram links are supported.")
      setIsLoading(false)
      return
    }

    try {
      setStatus("analyzing")
      
      const response = await fetch("/api/media-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch media information")
      }

      setStatus("fetching")
      await new Promise((r) => setTimeout(r, 300))

      setMedia({
        id: data.data.id,
        platform: data.platform,
        title: data.data.title,
        thumbnail: data.data.thumbnail,
        duration: data.data.duration,
        author: data.data.author,
      })
      
      setStatus("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch media information")
      setStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDownload = useCallback(async (format: FormatOption) => {
    if (!currentUrl || !media) return

    setIsDownloading(true)
    setDownloadingFormat(format.id)
    setStatus("converting")
    setError(null)

    try {
      // Call the download API to get the direct URL
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: currentUrl,
          format: format.format.toLowerCase(),
          quality: format.quality,
          title: media.title,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Download failed")
      }

      setStatus("preparing")

      const { downloadUrl, filename, direct, platform } = data

      if (direct && platform === "youtube") {
        // For YouTube, OpenUtils provides direct streaming URLs
        // Open in new tab for direct download
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = filename
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // For Instagram, we need to proxy through our API
        const proxyUrl = `/api/download?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}`
        
        const fileResponse = await fetch(proxyUrl)
        
        if (!fileResponse.ok) {
          throw new Error("Failed to download file")
        }

        const blob = await fileResponse.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up blob URL
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
      }

      setStatus("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed. Please try again.")
      setStatus("complete")
    } finally {
      setIsDownloading(false)
      setDownloadingFormat(null)
    }
  }, [currentUrl, media])

  const handleReset = useCallback(() => {
    setMedia(null)
    setStatus(null)
    setError(null)
    setIsLoading(false)
    setIsDownloading(false)
    setDownloadingFormat(null)
    setCurrentUrl("")
  }, [])

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance">
          Download Videos & Audio
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
          Paste any YouTube or Instagram link. Download as MP4 video or MP3 audio instantly.
        </p>
      </div>

      {/* URL Input */}
      <UrlInput onSubmit={handleUrlSubmit} isLoading={isLoading} />

      {/* Supported Platforms */}
      <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm text-muted-foreground">
        <span className="px-3 py-1.5 bg-secondary rounded-full flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          YouTube
        </span>
        <span className="px-3 py-1.5 bg-secondary rounded-full flex items-center gap-2">
          <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          Instagram
        </span>
      </div>

      {/* Error Message */}
      {error && !isLoading && (
        <div className="flex items-center justify-center gap-2 mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive">{error}</span>
          <Button variant="ghost" size="sm" onClick={handleReset} className="ml-2 flex-shrink-0">
            <RotateCcw className="h-4 w-4 mr-1" />
            Try again
          </Button>
        </div>
      )}

      {/* Processing Status */}
      {status && status !== "complete" && !error && (
        <div className="mt-8">
          <ProgressIndicator status={status} />
        </div>
      )}

      {/* Media Preview & Format Selection */}
      {media && status === "complete" && (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Ready to Download</h2>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              New Download
            </Button>
          </div>
          <MediaPreview media={media} />
          <div className="pt-4">
            <h3 className="text-base font-semibold text-foreground mb-4">Choose Format</h3>
            <FormatSelector
              platform={media.platform}
              onDownload={handleDownload}
              isDownloading={isDownloading}
              downloadingFormat={downloadingFormat}
            />
          </div>
        </div>
      )}

      {/* Features Section */}
      {!media && !isLoading && (
        <div className="mt-16 grid sm:grid-cols-3 gap-6">
          <FeatureCard
            title="No Restrictions"
            description="Download any public video or audio without limitations."
          />
          <FeatureCard
            title="Multiple Formats"
            description="Choose MP4 for video or MP3 for audio in various quality options."
          />
          <FeatureCard
            title="No Registration"
            description="Start downloading immediately. No accounts, no tracking."
          />
        </div>
      )}
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 text-center">
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
