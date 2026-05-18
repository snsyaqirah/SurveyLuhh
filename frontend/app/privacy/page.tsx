import Link from 'next/link';

const LAST_UPDATED = '19 May 2026';
const YEAR = new Date().getFullYear();

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold" style={{ color: '#282F41' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: '#5A6280' }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen" style={{ background: '#FAF8FF' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E2DFF0' }}
      >
        <Link href="/" className="font-bold text-base" style={{ color: '#282F41' }}>
          SurveyLuhh
        </Link>
        <span className="text-sm font-medium" style={{ color: '#5A6280' }}>Privacy Policy</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: '#282F41' }}>Privacy Policy</h1>
          <p className="text-xs" style={{ color: '#9DA3B8' }}>Last updated: {LAST_UPDATED}</p>
          <p className="text-sm leading-relaxed pt-1" style={{ color: '#5A6280' }}>
            SurveyLuhh is a free personal project built to help Malaysian house hunters compare
            property listings together. This page explains what information we collect, why, and
            what your rights are — in plain language, not legal jargon.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-6 divide-y"
          style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
        >
          <Section title="1. What we collect">
            <p>We collect the minimum needed to make the app work:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Nickname</strong> — the name you type when you join a session. This is how other members in the session see you.</li>
              <li><strong>Session activity</strong> — which properties you added, your shortlist/reject votes, and bracket tournament results.</li>
              <li><strong>Timestamps</strong> — when you joined and when you were last active in a session.</li>
              <li><strong>Feedback messages</strong> — if you submit feedback via the feedback button, we store your message and category.</li>
              <li><strong>Agent contact data</strong> — when we scrape a property listing, the agent&apos;s name, phone number, and agency are extracted from the public listing page and stored alongside the property in your session.</li>
            </ul>
            <p>We do <strong>not</strong> collect your email address, phone number, IC number, payment information, or any location data.</p>
          </Section>

          <Section title="2. Why we collect it">
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Nickname + activity</strong> — so everyone in a shared session can see who added which property and how people voted.</li>
              <li><strong>Timestamps</strong> — to show who is currently online and to automatically delete sessions after 7 days.</li>
              <li><strong>Feedback</strong> — so we can read and respond to bug reports and suggestions.</li>
              <li><strong>Agent data</strong> — so you can contact the property agent directly from the app without going back to the listing site.</li>
            </ul>
          </Section>

          <Section title="3. How long we keep it">
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Session data</strong> (nickname, properties, votes) — automatically deleted after <strong>7 days</strong> via a database TTL index. You cannot extend this.</li>
              <li><strong>Feedback messages</strong> — kept indefinitely so we can refer back to them. We aim to review and clean these periodically.</li>
            </ul>
          </Section>

          <Section title="4. Who we share it with">
            <p>We do not sell or share your data with advertisers or third parties for marketing. However, the following services process data as part of running the app:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                <strong>MongoDB Atlas</strong> — our database is hosted on MongoDB Atlas, a cloud provider whose servers are located outside Malaysia (typically Singapore or US regions). Your session data, nicknames, and feedback are stored there.
              </li>
              <li>
                <strong>Google reCAPTCHA v3</strong> — when you scrape a property listing, your browser sends a reCAPTCHA token to Google to verify you&apos;re not a bot. Google processes your IP address and browser behaviour for this check. See{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#265CE4' }}>Google&apos;s Privacy Policy</a>.
              </li>
              <li>
                <strong>Sentry</strong> — we use Sentry for error monitoring. If the app crashes or throws an exception, Sentry captures technical details (error message, stack trace, browser/OS type) and sends them to Sentry&apos;s servers in the US. We have disabled personal data collection in Sentry (<code style={{ background: '#F3F0FF', borderRadius: 4, padding: '1px 5px', fontSize: 12 }}>send_default_pii=false</code>), so your nickname and session content are not included in error reports. See{' '}
                <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: '#265CE4' }}>Sentry&apos;s Privacy Policy</a>.
              </li>
            </ul>
            <p>
              By using SurveyLuhh, you acknowledge that some data is processed outside Malaysia.
              Under Malaysia&apos;s PDPA, we disclose this transfer to you here.
            </p>
          </Section>

          <Section title="5. Your rights">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Access</strong> your data — your session data is visible to you (and anyone with your session link) at any time while the session is active.</li>
              <li><strong>Delete</strong> your data — session data auto-deletes after 7 days. If you want it deleted sooner, email us and we will remove it manually.</li>
              <li><strong>Correct</strong> your data — if your nickname is wrong, you can re-join the session with the correct name.</li>
              <li><strong>Object</strong> — if you do not agree to your nickname being stored, do not enter one. Without a nickname you cannot participate in a shared session, but you can still view shared links.</li>
            </ul>
          </Section>

          <Section title="6. Session links and sharing">
            <p>
              Your session URL (e.g. <code style={{ background: '#F3F0FF', borderRadius: 4, padding: '1px 5px', fontSize: 12 }}>/hunt/abc-123</code>) is the only access control for your session.
              Anyone with that link can see all properties, member nicknames, and votes. Do not share the link with people you do not want to see your session.
            </p>
          </Section>

          <Section title="7. Cookies & local storage">
            <p>
              We use your browser&apos;s <strong>localStorage</strong> to remember your nickname between page refreshes so you do not have to re-enter it. No tracking cookies are set. No analytics scripts are loaded.
            </p>
          </Section>

          <Section title="8. Contact & data requests">
            <p>
              For any privacy-related requests — data access, deletion, corrections, or questions — email us at{' '}
              <a href="mailto:snsyaqirah@gmail.com" style={{ color: '#265CE4' }}>snsyaqirah@gmail.com</a>.
              We will respond within 14 days.
            </p>
          </Section>
        </div>

        <p className="text-xs text-center pb-8" style={{ color: '#C2C8D8' }}>
          &copy; {YEAR}{' '}
          <a href="https://syaqi.dev" target="_blank" rel="noopener noreferrer" style={{ color: '#9DA3B8' }}>Syaqirah</a>
          {' · '}
          <Link href="/changelog" style={{ color: '#9DA3B8' }}>Changelog</Link>
        </p>
      </div>
    </main>
  );
}
