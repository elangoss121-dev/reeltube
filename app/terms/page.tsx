import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">Terms of Use</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing and using MediaGrab, you accept and agree to be bound by these 
              Terms of Use. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              MediaGrab provides a tool for downloading publicly available video and audio 
              content from supported platforms (Instagram and YouTube) for personal, 
              non-commercial use only.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Permitted Use</h2>
            <p className="text-muted-foreground mb-4">You may use our service to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Download content for personal, offline viewing</li>
              <li>Download content you have the right to download</li>
              <li>Download content that is publicly available</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Prohibited Use</h2>
            <p className="text-muted-foreground mb-4">You may NOT use our service to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Download copyrighted content without permission</li>
              <li>Redistribute, sell, or commercially exploit downloaded content</li>
              <li>Download private or restricted content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Abuse, overload, or interfere with our service</li>
              <li>Attempt to bypass any limitations or security measures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              MediaGrab does not claim ownership of any content downloaded through our service. 
              All content remains the property of its respective owners. Users are responsible 
              for ensuring they have the right to download and use any content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">6. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground mb-4">
              Our service is provided &quot;as is&quot; and &quot;as available&quot; without any warranties of any 
              kind, either express or implied. We do not guarantee that the service will be 
              uninterrupted, secure, or error-free.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              To the maximum extent permitted by law, MediaGrab shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages resulting 
              from your use of or inability to use the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">8. User Responsibility</h2>
            <p className="text-muted-foreground mb-4">
              You are solely responsible for your use of the service and any content you 
              download. You agree to comply with all applicable laws and respect the rights 
              of content creators.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">9. Service Modifications</h2>
            <p className="text-muted-foreground mb-4">
              We reserve the right to modify, suspend, or discontinue any part of our service 
              at any time without notice. We may also update these Terms of Use from time to time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">10. Termination</h2>
            <p className="text-muted-foreground mb-4">
              We reserve the right to terminate or restrict your access to our service at any 
              time, without notice, for any reason, including violation of these Terms of Use.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">11. Contact</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms of Use, please contact us through 
              our website.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
