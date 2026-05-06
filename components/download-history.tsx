"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, Trash2, Clock } from "lucide-react"
import { MediaInfo } from "./media-preview"

export interface HistoryItem extends MediaInfo {
  format: string
  quality: string
  downloadedAt: Date
}

interface DownloadHistoryProps {
  items: HistoryItem[]
  onRedownload: (item: HistoryItem) => void
  onClear: () => void
}

export function DownloadHistory({ items, onRedownload, onClear }: DownloadHistoryProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Recent Downloads</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-foreground">
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={`${item.id}-${item.downloadedAt.getTime()}`} className="p-3">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.format} • {item.quality} • {formatTimeAgo(item.downloadedAt)}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onRedownload(item)}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
