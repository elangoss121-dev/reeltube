import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MediaDownloader } from "@/components/media-downloader"

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <MediaDownloader />
      </main>
      <Footer />
    </>
  )
}
