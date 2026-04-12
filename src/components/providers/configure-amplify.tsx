"use client";

import { ensureAmplifyConfigured } from "@/lib/api/config";

// Call Amplify.configure() at module scope so it runs once on import,
// BEFORE any component renders or useEffect fires.
ensureAmplifyConfigured();

export default function ConfigureAmplify() {
  // This component doesn't render anything — it only exists so that
  // importing it from a client boundary triggers the top-level call above.
  return null;
}
