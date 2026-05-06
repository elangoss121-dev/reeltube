import Link from "next/link"
import { Download } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Download className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">MediaGrab</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Use
            </Link>
          </nav>
        </div>
        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Download for personal use only. We do not store any media on our servers.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            MediaGrab {new Date().getFullYear()}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
