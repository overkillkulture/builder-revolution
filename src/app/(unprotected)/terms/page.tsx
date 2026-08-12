export const metadata = {
  title: 'Builder Revolution Chat | Terms of Service',
};

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-4 text-sm text-muted-foreground">Last updated: June 2026</p>

      <div className="flex flex-col gap-6 text-foreground/90 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_li]:leading-relaxed">

        <section>
          <h2>1. This is a Builder Community</h2>
          <p>
            Builder Revolution Chat is part of the Consciousness Revolution platform. We exist to help builders
            connect, share work, and level up. By using this platform you agree to these terms.
          </p>
        </section>

        <section>
          <h2>2. Zero Tolerance for Destruction</h2>
          <p>
            We will remove you immediately and without warning if you:
          </p>
          <ul className="ml-4 mt-2 list-disc">
            <li>Harass, threaten, or target other members</li>
            <li>Post illegal content, spam, or malware</li>
            <li>Attempt to damage, exploit, or disrupt the platform</li>
            <li>Impersonate other users or organizations</li>
            <li>Use the platform to harm children or vulnerable people</li>
          </ul>
          <p className="mt-2">
            There is no appeals process for destructive behavior. Builders build — destroyers get removed.
          </p>
        </section>

        <section>
          <h2>3. Your Data &amp; How We Use It</h2>
          <p>
            By using Builder Revolution Chat, you grant us a worldwide, royalty-free, non-exclusive license to use,
            display, reproduce, modify, and distribute any content you post — including but not limited to:
          </p>
          <ul className="ml-4 mt-2 list-disc">
            <li>Posts, comments, messages, and conversations</li>
            <li>Profile information, skills, and portfolio links</li>
            <li>Usage patterns and interaction data</li>
            <li>Bug reports and feedback</li>
          </ul>
          <p className="mt-2">
            We use this data to operate and improve the platform, train AI systems (including ARAYA),
            build marketplace features, create analytics, and develop new products. We may aggregate
            and anonymize data for research and business purposes.
          </p>
          <p className="mt-2">
            <strong>Plain English:</strong> Everything you post here is public or semi-public.
            We will use conversations, posts, and data to make the platform better and build AI features.
            Don&apos;t post anything you wouldn&apos;t want us to use.
          </p>
        </section>

        <section>
          <h2>4. Your Content</h2>
          <p>
            You own your original content. By posting it here, you give us the license described above.
            You are responsible for ensuring you have the right to post what you post.
            Don&apos;t upload copyrighted material that isn&apos;t yours.
          </p>
        </section>

        <section>
          <h2>5. No Guarantees</h2>
          <p>
            This platform is provided &quot;as is.&quot; We make no warranties about uptime, data preservation,
            or fitness for any particular purpose. We may change features, remove content, or shut down
            services at any time. Back up anything important to you.
          </p>
        </section>

        <section>
          <h2>6. Age Requirement</h2>
          <p>
            You must be at least 13 years old to use this platform. If you are under 18, you need
            parental consent.
          </p>
        </section>

        <section>
          <h2>7. Changes to These Terms</h2>
          <p>
            We may update these terms at any time. Continued use of the platform after changes
            constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2>8. Contact</h2>
          <p>
            Questions about these terms? Reach out at{' '}
            <a href="mailto:darrickpreble@proton.me" className="text-primary hover:underline">
              darrickpreble@proton.me
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
