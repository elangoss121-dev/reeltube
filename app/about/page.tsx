import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Download, Zap, Shield, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">About MediaGrab</h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            MediaGrab is a free, fast, and reliable tool for downloading videos and audio from 
            Instagram and YouTube. Our mission is to provide a simple, user-friendly experience 
            for saving your favorite content for personal use.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Lightning Fast"
              description="Our optimized servers ensure your downloads start within seconds. No waiting, no delays."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Safe & Secure"
              description="We don&apos;t store your data or downloaded files. Your privacy is our priority."
            />
            <FeatureCard
              icon={<Download className="h-6 w-6" />}
              title="Multiple Formats"
              description="Choose from various quality options for both video (MP4) and audio (MP3) downloads."
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Works Everywhere"
              description="Fully responsive design works perfectly on desktop, tablet, and mobile devices."
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground mb-8">
            <li>Copy the URL of the Instagram or YouTube content you want to download</li>
            <li>Paste the link into the input box on our homepage</li>
            <li>Click the Download button to analyze the content</li>
            <li>Select your preferred format and quality</li>
            <li>Your download will start automatically</li>
          </ol>

          <h2 className="text-2xl font-bold text-foreground mb-4">Supported Platforms</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-2">YouTube</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Standard video URLs</li>
                <li>Short links (youtu.be)</li>
                <li>Multiple quality options</li>
                <li>Audio extraction (MP3)</li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-2">Instagram</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Reels</li>
                <li>Posts (video content)</li>
                <li>Public content only</li>
                <li>Audio extraction (MP3)</li>
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-3">Important Notice</h2>
            <p className="text-muted-foreground">
              MediaGrab is intended for personal use only. Please respect copyright laws and the 
              terms of service of content platforms. We do not encourage or support the unauthorized 
              distribution of copyrighted material.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-primary">{icon}</div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
