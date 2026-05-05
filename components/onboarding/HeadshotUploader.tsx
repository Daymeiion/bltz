"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  initialUrl?: string | null;
  onUploaded: (url: string) => void;
}

export function HeadshotUploader({ userId, initialUrl, onUploaded }: Props) {
  const [url, setUrl] = React.useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setErr(null);
    if (!file.type.startsWith("image/")) {
      setErr("Pick an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Keep it under 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const sb = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await sb.storage
        .from("headshots")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = sb.storage.from("headshots").getPublicUrl(path);
      setUrl(data.publicUrl);
      onUploaded(data.publicUrl);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        className={cn(
          "group relative mx-auto flex h-36 w-36 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-black/40",
          "hover:border-bltz-gold focus:outline-none focus-visible:border-bltz-gold focus-visible:ring-2 focus-visible:ring-bltz-gold/40",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Your headshot" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-white/50 group-hover:text-white">
            <Upload className="h-6 w-6" />
            <span className="text-xs uppercase tracking-wider">Headshot</span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-6 w-6 animate-spin text-bltz-gold" />
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {err ? <p className="text-center text-xs text-red-400">{err}</p> : null}
      {url ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mx-auto block text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          Replace
        </button>
      ) : null}
    </div>
  );
}
