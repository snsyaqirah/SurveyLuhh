import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://bdff12efc0c74b80ac22bf9afe74ccf5@o4511411898548224.ingest.us.sentry.io/4511411910213632",
  tracesSampleRate: 0.1,
  debug: false,
});
