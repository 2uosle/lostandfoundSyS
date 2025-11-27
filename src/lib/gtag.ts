export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// Declare gtag on window for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const pageview = (url: string) => {
  if (!GA_TRACKING_ID) return;
  try {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  } catch {
    // noop
  }
};

export const gaEvent = (options: {
  action: string;
  category?: string;
  label?: string;
  value?: number;
}) => {
  if (!GA_TRACKING_ID) return;
  try {
    window.gtag('event', options.action, {
      event_category: options.category,
      event_label: options.label,
      value: options.value,
    });
  } catch {
    // noop
  }
};
