"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AuthGate } from "@/components/auth-gate";
import { SectionCard } from "@/components/section-card";
import { WorkspacePage } from "@/components/templates/workspace-page";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RiskCallout } from "@/components/ui/risk-callout";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type MeResponse = {
  user: {
    name: string;
    phone: string;
    preferredLanguage: "en" | "hi";
    state: string;
    district: string;
    village: string;
    profilePhotoUrl: string | null;
  };
  farmCount: number;
};

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter the farmer name."),
  preferredLanguage: z.enum(["en", "hi"]),
  state: z.string().trim().min(2, "Enter a state."),
  district: z.string().trim().min(2, "Enter a district."),
  village: z.string().trim().min(2, "Enter a village."),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { data, mutate } = useSWR("/me", () => apiGet<MeResponse>("/me"));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      preferredLanguage: "en",
      state: "",
      district: "",
      village: "",
    },
  });

  useEffect(() => {
    if (!data?.user) return;
    form.reset({
      name: data.user.name ?? "",
      preferredLanguage: data.user.preferredLanguage ?? "en",
      state: data.user.state ?? "",
      district: data.user.district ?? "",
      village: data.user.village ?? "",
    });
  }, [data, form]);

  const saveProfile = form.handleSubmit(async (values) => {
    try {
      await apiPatch("/me", values);
      await mutate();
      setMessage("Profile updated.");
    } catch {
      setMessage("Could not update the profile.");
    }
  });

  const uploadPhoto = async () => {
    if (!photoFile) {
      setMessage("Choose a photo before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", photoFile);

    try {
      await apiPost("/me/photo", formData);
      await mutate();
      setPhotoFile(null);
      setMessage("Profile photo updated.");
    } catch {
      setMessage("Could not upload the profile photo.");
    }
  };

  const logout = async () => {
    await apiPost("/auth/logout");
    router.replace("/login");
  };

  return (
    <WorkspacePage
      title="Profile and preferences"
      description="Keep account details, audio language, and location context tidy so the workspace stays trustworthy."
      eyebrow="Account"
      actions={
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <SectionCard title="Farmer identity" eyebrow="Account details">
            <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="flex items-center justify-center">
                {data?.user.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.user.profilePhotoUrl}
                    alt="Farmer profile"
                    className="h-36 w-36 rounded-[1.25rem] object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-[1.25rem] bg-[var(--brand-soft)] text-4xl font-semibold text-[var(--brand)]">
                    {(form.getValues("name") || "F").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <Field label="Profile photo" htmlFor="profilePhoto">
                  <Input
                    id="profilePhoto"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="secondary" onClick={uploadPhoto} type="button">
                    Upload photo
                  </Button>
                  {photoFile ? <p className="text-sm muted">{photoFile.name}</p> : null}
                </div>
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={(event) => event.preventDefault()}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" htmlFor="name" error={form.formState.errors.name?.message}>
                  <Input id="name" {...form.register("name")} />
                </Field>
                <Field label="Phone" htmlFor="phone" hint="Phone number is read-only for this MVP.">
                  <Input id="phone" value={data?.user.phone ?? ""} readOnly />
                </Field>
                <Field
                  label="Preferred language"
                  htmlFor="preferredLanguage"
                  hint="Used for audio and future translation support."
                  error={form.formState.errors.preferredLanguage?.message}
                >
                  <Select id="preferredLanguage" {...form.register("preferredLanguage")}>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </Select>
                </Field>
                <Field label="State" htmlFor="state" error={form.formState.errors.state?.message}>
                  <Input id="state" {...form.register("state")} />
                </Field>
                <Field
                  label="District"
                  htmlFor="district"
                  error={form.formState.errors.district?.message}
                >
                  <Input id="district" {...form.register("district")} />
                </Field>
                <Field
                  label="Village"
                  htmlFor="village"
                  error={form.formState.errors.village?.message}
                >
                  <Input id="village" {...form.register("village")} />
                </Field>
              </div>

              {message ? (
                <p className="text-sm font-medium text-[var(--brand)]" aria-live="polite">
                  {message}
                </p>
              ) : null}

              <Button onClick={saveProfile}>Save profile</Button>
            </form>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Workspace summary" eyebrow="Account context" variant="glass">
            <div className="space-y-3 text-sm leading-6 muted">
              <p>{data?.farmCount ?? 0} plot records connected to this account.</p>
              <p>Location details improve weather, market, and scheme relevance.</p>
            </div>
          </SectionCard>
          <RiskCallout title="Language expectation" tone="info">
            Hindi is stored as a preference for audio and future translation
            support. The full interface is not yet translated route by route.
          </RiskCallout>
        </aside>
      </div>
    </WorkspacePage>
  );
}
