// Google Analytics 4 (gtag.js) helper
// Expects NEXT_PUBLIC_GA_MEASUREMENT_ID (preferred) or NEXT_PUBLIC_GA4_ID in env

export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA4_ID;

export const isGa4Enabled = () => typeof GA4_MEASUREMENT_ID === 'string' && GA4_MEASUREMENT_ID.length > 0;

export const pageview = (url) => {
  if (!isGa4Enabled()) return;
  if (typeof window === 'undefined') return;
  const params = {
    page_path: url,
  };
  if (process.env.NODE_ENV !== 'production') {
    params.debug_mode = true;
    // eslint-disable-next-line no-console
    console.log('[GA4] Pageview', { url });
  }
  window.gtag && window.gtag('config', GA4_MEASUREMENT_ID, params);
};

export const event = ({ action, category, label, value }) => {
  if (!isGa4Enabled()) return;
  if (typeof window === 'undefined') return;
  const payload = {
    event_category: category,
    event_label: label,
    value,
  };
  if (process.env.NODE_ENV !== 'production') {
    payload.debug_mode = true;
    // eslint-disable-next-line no-console
    console.log('[GA4] Event', { action, payload });
  }
  window.gtag && window.gtag('event', action, payload);
};


