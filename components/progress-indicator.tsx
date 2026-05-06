"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ProgressStatus = "analyzing" | "fetching" | "converting" | "preparing" | "complete" | "error"

interface ProgressIndicatorProps {
  status: ProgressStatus
  error?: string
}

const statusMessages: Record<ProgressStatus, string> = {
  analyzing: "Analyzing link...",
  fetching: "Fetching media...",
  converting: "Converting file...",
  preparing: "Preparing download...",
  complete: "Download ready!",
  error: "Something went wrong",
}

const statusProgress: Record<ProgressStatus, number> = {
  analyzing: 20,
  fetching: 45,
  converting: 70,
  preparing: 90,
  complete: 100,
  error: 0,
}

export function ProgressIndicator({ status, error }: ProgressIndicatorProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const targetProgress = statusProgress[status]
    const timer = setTimeout(() => setProgress(targetProgress), 100)
    return () => clearTimeout(timer)
  }, [status])

  const isComplete = status === "complete"
  const isError = status === "error"

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-3">
        {isError ? (
          <AlertCircle className="h-5 w-5 text-destructive animate-pulse" />
        ) : isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        <span
          className={cn(
            "text-sm font-medium",
            isError && "text-destructive",
            isComplete && "text-green-500"
          )}
        >
          {isError && error ? error : statusMessages[status]}
        </span>
      </div>
      <Progress
        value={progress}
        className={cn(
          "h-2",
          isError && "[&>div]:bg-destructive",
          isComplete && "[&>div]:bg-green-500"
        )}
      />
    </div>
  )
}
