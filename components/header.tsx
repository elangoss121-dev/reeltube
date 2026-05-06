"use client"

import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"
import { Download } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Download className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">MediaGrab</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/about"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            href="/privacy"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Terms
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
