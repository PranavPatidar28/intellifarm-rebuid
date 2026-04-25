"use client";

import useSWR from "swr";

import { apiGet } from "./api";

type SessionResponse = {
  user: {
    id: string;
    name: string;
    phone: string;
    preferredLanguage: "en" | "hi";
    state: string;
    district: string;
    village: string;
    profilePhotoUrl: string | null;
    role: "FARMER" | "ADMIN";
    isProfileComplete: boolean;
  };
};

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR<SessionResponse>(
    "/auth/me",
    () => apiGet<SessionResponse>("/auth/me"),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: Boolean(data?.user),
    error,
    refreshSession: mutate,
  };
}
