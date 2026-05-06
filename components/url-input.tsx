"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link, Loader2 } from "lucide-react"

interface UrlInputProps {
  onSubmit: (url: string) => void
  isLoading: boolean
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onSubmit(url.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Link className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="url"
            placeholder="Paste Instagram or YouTube link here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-12 h-14 text-base bg-card border-border rounded-xl focus:ring-2 focus:ring-primary/50"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          disabled={!url.trim() || isLoading}
          className="h-14 px-8 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Download"
          )}
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Supports Instagram Reels, Posts, and YouTube Videos
      </p>
    </form>
  )
}
