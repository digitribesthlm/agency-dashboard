import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import '../styles/globals.css'
import { GA4_MEASUREMENT_ID, isGa4Enabled, pageview } from '../lib/gtag';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();

  useEffect(() => {
    if (!isGa4Enabled()) return;
    const handleRouteChange = (url) => {
      pageview(url);
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    // Track initial load
    handleRouteChange(window.location.pathname + window.location.search);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  return (
    <SessionProvider session={session}>
      {isGa4Enabled() && (
        <>
          <Script
            id="ga4-script-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-script-inline" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);} 
              gtag('js', new Date());
              gtag('config', '${GA4_MEASUREMENT_ID}', { send_page_view: false, debug_mode: ${process.env.NODE_ENV !== 'production'} });
            `}
          </Script>
        </>
      )}
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp