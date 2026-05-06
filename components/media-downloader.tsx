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
  if (url.includes("tiktok.com")) return "tiktok"
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter"
  if (url.includes("facebook.com") || url.includes("fb.watch")) return "facebook"
  if (url.includes("vimeo.com")) return "vimeo"
  if (url.includes("reddit.com")) return "reddit"
  if (url.includes("pinterest.com") || url.includes("pin.it")) return "pinterest"
  if (url.includes("soundcloud.com")) return "soundcloud"
  if (url.includes("twitch.tv")) return "twitch"
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
      setError("Unsupported URL. Supported platforms: YouTube, Instagram, TikTok, Twitter/X, Facebook, Vimeo, Reddit, Pinterest, SoundCloud, Twitch")
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
    if (!currentUrl) return

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
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Download failed")
      }

      setStatus("preparing")

      // Trigger the download directly from the Cobalt URL
      const downloadUrl = data.downloadUrl
      const filename = media?.title || "download"
      const fileFormat = data.format || format.format.toLowerCase()

      // Create a hidden link and trigger download
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${filename.replace(/[^\w\s-]/g, "").substring(0, 50)}.${fileFormat}`
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      
      // For cross-origin downloads, we need to fetch and create a blob
      try {
        const fileResponse = await fetch(`/api/download?downloadUrl=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}&format=${fileFormat}`)
        
        if (!fileResponse.ok) {
          throw new Error("Failed to download file")
        }

        const blob = await fileResponse.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        link.href = blobUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up blob URL after a delay
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
      } catch {
        // Fallback: try direct link
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
          Paste any link from YouTube, Instagram, TikTok, Twitter, and more. Download as MP4 or MP3 instantly.
        </p>
      </div>

      {/* URL Input */}
      <UrlInput onSubmit={handleUrlSubmit} isLoading={isLoading} />

      {/* Supported Platforms */}
      <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <span className="px-2 py-1 bg-secondary rounded">YouTube</span>
        <span className="px-2 py-1 bg-secondary rounded">Instagram</span>
        <span className="px-2 py-1 bg-secondary rounded">TikTok</span>
        <span className="px-2 py-1 bg-secondary rounded">Twitter/X</span>
        <span className="px-2 py-1 bg-secondary rounded">Facebook</span>
        <span className="px-2 py-1 bg-secondary rounded">Vimeo</span>
        <span className="px-2 py-1 bg-secondary rounded">Reddit</span>
        <span className="px-2 py-1 bg-secondary rounded">Pinterest</span>
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
            description="Download from any public video or audio without limitations."
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
