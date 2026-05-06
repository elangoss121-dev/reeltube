"use client"

import Image from "next/image"
import { Clock, Play } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MediaInfo {
  id: string
  platform: "youtube" | "instagram"
  title: string
  thumbnail: string
  duration?: string
  author?: string
}

interface MediaPreviewProps {
  media: MediaInfo
  className?: string
}

export function MediaPreview({ media, className }: MediaPreviewProps) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border overflow-hidden", className)}>
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-muted shrink-0">
          <Image
            src={media.thumbnail}
            alt={media.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-5 w-5 text-foreground fill-current ml-0.5" />
            </div>
          </div>
          {media.duration && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-medium text-white">
              {media.duration}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <PlatformIcon platform={media.platform} />
            <span className="text-sm font-medium text-muted-foreground capitalize">
              {media.platform}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground line-clamp-2 mb-2">
            {media.title}
          </h3>
          {media.author && (
            <p className="text-sm text-muted-foreground">
              {media.author}
            </p>
          )}
          {media.duration && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
              <Clock className="h-4 w-4" />
              <span>{media.duration}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlatformIcon({ platform }: { platform: "youtube" | "instagram" }) {
  if (platform === "youtube") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000" />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
      <defs>
        <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="50%" stopColor="#F56040" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}
