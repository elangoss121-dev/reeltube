"use client"

import { useState, useCallback, useEffect } from "react"
import { UrlInput } from "./url-input"
import { MediaPreview, MediaInfo } from "./media-preview"
import { FormatSelector, FormatOption } from "./format-selector"
import { ProgressIndicator, ProgressStatus } from "./progress-indicator"
import { DownloadHistory, HistoryItem } from "./download-history"
import { Button } from "@/components/ui/button"
import { AlertCircle, RotateCcw } from "lucide-react"

// Demo data for showcasing the UI
const demoMedia: Record<string, MediaInfo> = {
  youtube: {
    id: "yt-demo",
    platform: "youtube",
    title: "Amazing Nature Documentary - 4K Ultra HD Wildlife Footage",
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640&h=360&fit=crop",
    duration: "12:34",
    author: "Nature Channel",
  },
  instagram: {
    id: "ig-demo",
    platform: "instagram",
    title: "Incredible sunset timelapse from the mountains",
    thumbnail: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=640&h=360&fit=crop",
    duration: "0:45",
    author: "@nature_photography",
  },
}

function detectPlatform(url: string): "youtube" | "instagram" | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube"
  }
  if (url.includes("instagram.com")) {
    return "instagram"
  }
  return null
}

export function MediaDownloader() {
  const [isLoading, setIsLoading] = useState(false)
  const [media, setMedia] = useState<MediaInfo | null>(null)
  const [status, setStatus] = useState<ProgressStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("download-history")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setHistory(parsed.map((item: HistoryItem) => ({
          ...item,
          downloadedAt: new Date(item.downloadedAt)
        })))
      } catch {
        // Invalid data, ignore
      }
    }
  }, [])

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("download-history", JSON.stringify(history))
    }
  }, [history])

  const handleUrlSubmit = useCallback(async (url: string) => {
    setError(null)
    setMedia(null)
    setStatus(null)
    setIsLoading(true)

    const platform = detectPlatform(url)

    if (!platform) {
      setError("Invalid URL. Please enter a valid YouTube or Instagram link.")
      setIsLoading(false)
      return
    }

    // Simulate processing stages
    setStatus("analyzing")
    await new Promise((r) => setTimeout(r, 800))

    setStatus("fetching")
    await new Promise((r) => setTimeout(r, 1000))

    // Use demo data based on platform
    setMedia(demoMedia[platform])
    setStatus("complete")
    setIsLoading(false)
  }, [])

  const handleDownload = useCallback(async (format: FormatOption) => {
    if (!media) return

    setIsDownloading(true)
    setDownloadingFormat(format.id)
    setStatus("converting")

    await new Promise((r) => setTimeout(r, 1500))

    setStatus("preparing")
    await new Promise((r) => setTimeout(r, 800))

    // Add to history
    const historyItem: HistoryItem = {
      ...media,
      format: format.format,
      quality: format.quality,
      downloadedAt: new Date(),
    }
    setHistory((prev) => [historyItem, ...prev.slice(0, 9)])

    setStatus("complete")
    setIsDownloading(false)

    // Simulate download (in a real app, this would trigger actual file download)
    const link = document.createElement("a")
    link.href = media.thumbnail
    link.download = `${media.title.slice(0, 50)}.${format.format.toLowerCase()}`
    link.click()
  }, [media])

  const handleRedownload = useCallback((item: HistoryItem) => {
    setMedia(item)
    setStatus("complete")
    setError(null)
  }, [])

  const handleClearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem("download-history")
  }, [])

  const handleReset = useCallback(() => {
    setMedia(null)
    setStatus(null)
    setError(null)
    setIsLoading(false)
    setIsDownloading(false)
    setDownloadingFormat(null)
  }, [])

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance">
          Download Videos & Audio
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
          Paste any Instagram or YouTube link to download in MP4 or MP3 format. Fast, free, and easy to use.
        </p>
      </div>

      {/* URL Input */}
      <UrlInput onSubmit={handleUrlSubmit} isLoading={isLoading} />

      {/* Error Message */}
      {error && !isLoading && (
        <div className="flex items-center justify-center gap-2 mt-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={handleReset}>
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
            <h2 className="text-lg font-semibold text-foreground">Media Found</h2>
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

      {/* Download History */}
      <DownloadHistory
        items={history}
        onRedownload={handleRedownload}
        onClear={handleClearHistory}
      />

      {/* Features Section */}
      {!media && !isLoading && (
        <div className="mt-16 grid sm:grid-cols-3 gap-6">
          <FeatureCard
            title="Lightning Fast"
            description="Our servers process your downloads in seconds, not minutes."
          />
          <FeatureCard
            title="Multiple Formats"
            description="Choose from various quality options for video and audio."
          />
          <FeatureCard
            title="No Registration"
            description="Start downloading immediately. No account needed."
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
