import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { isGuestMode, setGuestMode } from "@/lib/guest-mode";

/** Attach Clerk session tokens to API requests (required when API is proxied on another port). */
export function ClerkApiAuth() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      setGuestMode(false);
    }

    setAuthTokenGetter(async () => {
      if (isGuestMode() || !isSignedIn) return null;
      try {
        return await getToken();
      } catch {
        return null;
      }
    });

    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}
