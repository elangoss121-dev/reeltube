"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, FileVideo, FileAudio, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FormatOption {
  id: string
  type: "video" | "audio"
  quality: string
  format: string
  size?: string
}

interface FormatSelectorProps {
  platform: "youtube" | "instagram"
  onDownload: (format: FormatOption) => void
  isDownloading: boolean
  downloadingFormat: string | null
}

const youtubeFormats: FormatOption[] = [
  { id: "mp4-1080", type: "video", quality: "1080p", format: "MP4", size: "~50MB" },
  { id: "mp4-720", type: "video", quality: "720p", format: "MP4", size: "~30MB" },
  { id: "mp4-480", type: "video", quality: "480p", format: "MP4", size: "~15MB" },
  { id: "mp4-360", type: "video", quality: "360p", format: "MP4", size: "~8MB" },
  { id: "mp3-320", type: "audio", quality: "320kbps", format: "MP3", size: "~5MB" },
  { id: "mp3-192", type: "audio", quality: "192kbps", format: "MP3", size: "~3MB" },
  { id: "mp3-128", type: "audio", quality: "128kbps", format: "MP3", size: "~2MB" },
]

const instagramFormats: FormatOption[] = [
  { id: "mp4-hd", type: "video", quality: "HD", format: "MP4", size: "~20MB" },
  { id: "mp4-sd", type: "video", quality: "SD", format: "MP4", size: "~8MB" },
  { id: "mp3-audio", type: "audio", quality: "Audio", format: "MP3", size: "~2MB" },
]

export function FormatSelector({ platform, onDownload, isDownloading, downloadingFormat }: FormatSelectorProps) {
  const [selectedType, setSelectedType] = useState<"video" | "audio">("video")
  const formats = platform === "youtube" ? youtubeFormats : instagramFormats
  const filteredFormats = formats.filter((f) => f.type === selectedType)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={selectedType === "video" ? "default" : "outline"}
          onClick={() => setSelectedType("video")}
          className="flex-1 sm:flex-none"
        >
          <FileVideo className="mr-2 h-4 w-4" />
          Video (MP4)
        </Button>
        <Button
          variant={selectedType === "audio" ? "default" : "outline"}
          onClick={() => setSelectedType("audio")}
          className="flex-1 sm:flex-none"
        >
          <FileAudio className="mr-2 h-4 w-4" />
          Audio (MP3)
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredFormats.map((format) => (
          <Card
            key={format.id}
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-primary/50",
              downloadingFormat === format.id && "border-primary"
            )}
            onClick={() => !isDownloading && onDownload(format)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {format.type === "video" ? (
                  <FileVideo className="h-8 w-8 text-primary" />
                ) : (
                  <FileAudio className="h-8 w-8 text-accent" />
                )}
                <div>
                  <p className="font-semibold text-foreground">{format.quality}</p>
                  <p className="text-sm text-muted-foreground">
                    {format.format} {format.size && `• ${format.size}`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                disabled={isDownloading}
                className="shrink-0"
              >
                {isDownloading && downloadingFormat === format.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : downloadingFormat === format.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
