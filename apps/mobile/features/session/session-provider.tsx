import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { clearStoredAccessToken, getStoredAccessToken, setStoredAccessToken } from '@/lib/auth';
import { apiGet, registerUnauthorizedHandler } from '@/lib/api';
import type {
  AuthMeResponse,
  AuthUser,
  OtpVerifyResponse,
  ProfileResponse,
} from '@/lib/api-types';
import { defaultLanguage, storageKeys } from '@/lib/constants';
import { storage } from '@/lib/storage';

type OnboardingStep = 'language' | 'login' | 'profile' | 'plot' | 'season' | 'done';

type SessionContextValue = {
  bootstrapped: boolean;
  token: string | null;
  authUser: AuthUser | null;
  profile: ProfileResponse | null;
  language: string | null;
  onboardingStep: OnboardingStep;
  isAuthenticated: boolean;
  setLanguage: (language: string) => void;
  signIn: (payload: OtpVerifyResponse) => Promise<OnboardingStep>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function resolveOnboardingStep({
  token,
  language,
  authUser,
  profile,
}: {
  token: string | null;
  language: string | null;
  authUser: AuthUser | null;
  profile: ProfileResponse | null;
}): OnboardingStep {
  if (!language) {
    return 'language';
  }

  if (!token || !authUser) {
    return 'login';
  }

  if (!authUser.isProfileComplete) {
    return 'profile';
  }

  if (!profile || profile.farmCount === 0) {
    return 'plot';
  }

  const hasSeason = profile.farms.some((farm) => farm.cropSeasons.length > 0);
  if (!hasSeason) {
    return 'season';
  }

  return 'done';
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [language, setLanguageState] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    await clearStoredAccessToken();
    setToken(null);
    setAuthUser(null);
    setProfile(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const nextToken = token ?? (await getStoredAccessToken());

    if (!nextToken) {
      setToken(null);
      setAuthUser(null);
      setProfile(null);
      return;
    }

    try {
      const [authMe, me] = await Promise.all([
        apiGet<AuthMeResponse>('/auth/me', nextToken),
        apiGet<ProfileResponse>('/me', nextToken),
      ]);

      setToken(nextToken);
      setAuthUser(authMe.user);
      setProfile(me);
    } catch {
      await signOut();
    }
  }, [signOut, token]);

  useEffect(() => {
    registerUnauthorizedHandler(async () => {
      await signOut();
    });

    return () => {
      registerUnauthorizedHandler(null);
    };
  }, [signOut]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const [storedToken] = await Promise.all([getStoredAccessToken()]);
      const storedLanguage = storage.get<string | null>(storageKeys.language, null);

      if (!active) {
        return;
      }

      setLanguageState(storedLanguage);

      if (!storedToken) {
        setBootstrapped(true);
        return;
      }

      try {
        const [authMe, me] = await Promise.all([
          apiGet<AuthMeResponse>('/auth/me', storedToken),
          apiGet<ProfileResponse>('/me', storedToken),
        ]);

        if (!active) {
          return;
        }

        setToken(storedToken);
        setAuthUser(authMe.user);
        setProfile(me);
      } catch {
        await clearStoredAccessToken();
      } finally {
        if (active) {
          setBootstrapped(true);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (payload: OtpVerifyResponse) => {
    await setStoredAccessToken(payload.accessToken);
    setToken(payload.accessToken);
    setAuthUser(payload.user);

    const me = await apiGet<ProfileResponse>('/me', payload.accessToken);
    setProfile(me);
    return resolveOnboardingStep({
      token: payload.accessToken,
      language: language ?? defaultLanguage,
      authUser: payload.user,
      profile: me,
    });
  }, [language]);

  const setLanguage = useCallback((nextLanguage: string) => {
    storage.set(storageKeys.language, nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const onboardingStep = resolveOnboardingStep({
      token,
      language,
      authUser,
      profile,
    });

    return {
      bootstrapped,
      token,
      authUser,
      profile,
      language,
      onboardingStep,
      isAuthenticated: Boolean(token && authUser),
      setLanguage,
      signIn,
      signOut,
      refreshSession,
    };
  }, [
    authUser,
    bootstrapped,
    language,
    profile,
    refreshSession,
    setLanguage,
    signIn,
    signOut,
    token,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
    </QueryClientProvider>
  );
}

export function useSession() {
  const context = React.use(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside AppProviders');
  }

  return context;
}
