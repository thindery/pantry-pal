/**
 * Google AdSense: site-verification meta + auto-ads loader.
 *
 * Render this ONLY from public marketing pages (home, pricing, guides,
 * privacy, terms). Never from the logged-in app, account, checkout, or auth
 * pages. React 19 hoists the <meta> and the async <script> into <head>.
 */
export const ADSENSE_CLIENT = "ca-pub-5710716295420357";

export function AdSense() {
  return (
    <>
      <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
      <script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        crossOrigin="anonymous"
      />
    </>
  );
}
