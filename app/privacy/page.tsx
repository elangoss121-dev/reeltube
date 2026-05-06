import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose prose-invert">
          <h1 className="text-4xl font-bold text-foreground mb-6">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
            <p className="text-muted-foreground mb-4">
              ReelTube (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information 
              when you use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect minimal information necessary to provide our service:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>URLs you submit for downloading (temporarily processed, not stored)</li>
              <li>Basic usage analytics (page views, feature usage)</li>
              <li>Device information (browser type, operating system)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Information We Do Not Collect</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Personal identification information (name, email, address)</li>
              <li>Payment information</li>
              <li>Downloaded content (files are processed and delivered directly to you)</li>
              <li>Account credentials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">How We Use Information</h2>
            <p className="text-muted-foreground mb-4">
              The limited information we collect is used to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Process your download requests</li>
              <li>Improve our service and user experience</li>
              <li>Monitor for abuse and ensure service availability</li>
              <li>Analyze usage patterns to enhance features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Cookies and Local Storage</h2>
            <p className="text-muted-foreground mb-4">
              We use local storage to remember your preferences (such as theme selection and 
              recent downloads). This data is stored only on your device and is not transmitted 
              to our servers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              We may use third-party services for analytics and performance monitoring. 
              These services may collect anonymous usage data in accordance with their 
              own privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement appropriate technical and organizational measures to protect 
              any data we process. However, no method of transmission over the Internet 
              is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              Since we do not collect personal information, there is no personal data 
              to access, modify, or delete. You can clear your local storage data at 
              any time through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground mb-4">
              We may update this Privacy Policy from time to time. We will notify you 
              of any changes by posting the new Privacy Policy on this page and updating 
              the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us 
              through our website.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
