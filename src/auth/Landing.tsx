export function Landing() {
  return (
    <section className="card landing" aria-labelledby="landing-title">
      <h2 id="landing-title">A dream journal only you can read</h2>
      <ul>
        <li>
          <strong>Encrypted on your device.</strong> Your dreams are locked with a passphrase before
          they leave the browser. The server stores ciphertext only, so we cannot read them.
        </li>
        <li>
          <strong>Patterns, worked out locally.</strong> People, places, moods, recurring dreams and
          trends are found in your browser. Nothing is sent anywhere.
        </li>
        <li>
          <strong>AI only if you ask.</strong> &ldquo;Analyze with AI&rdquo; is optional, uses your
          own key, and shows exactly what will leave your device.
        </li>
        <li>
          <strong>Open source.</strong> Read the code, rebuild it, and check that the site you are
          using matches it.
        </li>
      </ul>
      <p className="links">
        <a href="/verify.html">Verify this build</a> ·{' '}
        <a href="https://github.com/shivapkarnekanti-svg/dreamlog">Source code</a> ·{' '}
        <a href="https://github.com/shivapkarnekanti-svg/dreamlog/blob/main/docs/crypto.md">
          How the encryption works
        </a>
      </p>
      <p className="muted">
        Forget your passphrase and your dreams cannot be recovered, by you or by us. Save your
        recovery key when you set up.
      </p>
    </section>
  )
}
