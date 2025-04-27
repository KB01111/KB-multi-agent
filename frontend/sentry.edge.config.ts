// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// Sentry initialization disabled to fix build issues
/*
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://44b2fb19cc626742da2a858b9780fd1b@o4508916501970944.ingest.de.sentry.io/4509204108148816",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
*/
