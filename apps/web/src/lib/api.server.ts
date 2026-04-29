import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function serverApiGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const response = await fetch(`${API_BASE}/v1${path}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }
      return null;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Server API Get Error:", error);
    return null;
  }
}

export async function serverApiPost<T>(path: string, body: unknown): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const response = await fetch(`${API_BASE}/v1${path}`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }
      return null;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Server API Post Error:", error);
    return null;
  }
}

function isNextRedirectError(error: unknown) {
  return error instanceof Error && error.message === "NEXT_REDIRECT";
}
