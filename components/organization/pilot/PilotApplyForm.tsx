"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { IconBuildingStadium, IconCheck, IconUsersGroup } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type College = { id: number; name: string };
type Kind = "school_athletics" | "nil_agency";

/**
 * Pilot application for a school or NIL agency. Saves the application for BLTZ to review
 * and, for someone new, creates their account (confirmed by email). Access starts only
 * after BLTZ approves.
 */
export function PilotApplyForm({ colleges, signedInEmail }: { colleges: College[]; signedInEmail: string | null }) {
  const [kind, setKind] = useState<Kind>("school_athletics");
  const [collegeQuery, setCollegeQuery] = useState("");
  const [college, setCollege] = useState<College | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"confirm_email" | "signed_in" | null>(null);

  const matches = useMemo(() => {
    const needle = collegeQuery.trim().toLowerCase();
    if (needle.length < 2 || college?.name === collegeQuery) return [];
    return colleges.filter((row) => row.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [collegeQuery, colleges, college]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (kind === "school_athletics" && !college) { setError("Pick your school from the list."); return; }
    if (!signedInEmail && password.length < 8) { setError("Use a password of at least 8 characters."); return; }
    setBusy(true);
    const response = await fetch("/api/pilot/apply", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationKind: kind, organizationName: organizationName.trim() || (college ? `${college.name} Athletics` : ""),
        collegeDirectoryId: kind === "school_athletics" ? college?.id ?? null : null,
        applicantName: name, applicantEmail: email, applicantTitle: title || null, message: message || null, website,
      }),
    }).catch(() => null);
    if (!response?.ok) { setBusy(false); setError("We could not save your application. Check the form and try again."); return; }
    if (signedInEmail) { setBusy(false); setDone("signed_in"); return; }
    // New here: create the account. If the address already has one, this quietly does nothing and they sign in instead.
    const { error: signUpError } = await createClient().auth.signUp({
      email: email.trim().toLowerCase(), password,
      options: { emailRedirectTo: `${window.location.origin}/organization`, data: { display_name: name.trim(), account_kind: "organization" } },
    });
    setBusy(false);
    if (signUpError) { setError("Your application is saved, but the account could not be created. Try again, or sign in if you already have one."); return; }
    setDone("confirm_email");
  }

  if (done) {
    return (
      <div className="pilot-public__done">
        <span aria-hidden><IconCheck stroke={2} /></span>
        <h2>Application received</h2>
        {done === "confirm_email"
          ? <p>Check <strong>{email}</strong> for a link to confirm your email. If you already have a BLTZ account with that address, just <Link href="/auth/login?next=/organization">sign in</Link>. We review every application and email you when your workspace is ready.</p>
          : <p>We review every application and email you when your workspace is ready. You can check back at <Link href="/organization">your workspace</Link>.</p>}
      </div>
    );
  }

  return (
    <form className="pilot-public__form" onSubmit={(event) => void submit(event)}>
      <div className="pilot-public__kinds" role="radiogroup" aria-label="Organization type">
        {([["school_athletics", "School athletics", "An athletic department and its former players", IconBuildingStadium], ["nil_agency", "NIL agency or collective", "You represent athletes", IconUsersGroup]] as const).map(([value, label, hint, Icon]) => (
          <button key={value} type="button" role="radio" aria-checked={kind === value} className={cn("pilot-public__kind", kind === value && "pilot-public__kind--on")} onClick={() => setKind(value)}>
            <Icon stroke={1.5} aria-hidden /><span><strong>{label}</strong><small>{hint}</small></span>
          </button>
        ))}
      </div>

      {kind === "school_athletics" ? (
        <div className="pilot-field pilot-public__college">
          <label htmlFor="pilot-college">Your school</label>
          <input id="pilot-college" autoComplete="off" required value={collegeQuery} placeholder="Start typing your school's name" aria-controls="pilot-college-list"
            onChange={(event) => { setCollegeQuery(event.target.value); setCollege(null); }} />
          {matches.length ? (
            <ul id="pilot-college-list" className="pilot-public__matches">
              {matches.map((row) => <li key={row.id}><button type="button" onClick={() => { setCollege(row); setCollegeQuery(row.name); if (!organizationName) setOrganizationName(`${row.name} Athletics`); }}>{row.name}</button></li>)}
            </ul>
          ) : null}
          {college ? <small className="pilot-public__picked"><IconCheck stroke={2} aria-hidden />{college.name}</small> : null}
        </div>
      ) : null}

      <label className="pilot-field">{kind === "school_athletics" ? "Department name" : "Agency name"}<input required maxLength={200} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder={kind === "school_athletics" ? "e.g. California Athletics" : "e.g. Bear Territory Collective"} /></label>
      <div className="pilot-public__row">
        <label className="pilot-field">Your name<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="pilot-field">Your role<input maxLength={120} autoComplete="organization-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Director of Alumni Relations" /></label>
      </div>
      <div className="pilot-public__row">
        <label className="pilot-field">Work email<input type="email" required maxLength={254} autoComplete="email" value={email} readOnly={Boolean(signedInEmail)} onChange={(event) => setEmail(event.target.value)} /></label>
        {signedInEmail ? null : <label className="pilot-field">Create a password<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
      </div>
      {signedInEmail ? <p className="pilot-public__note">You are signed in, so this application uses your BLTZ account.</p> : null}
      <label className="pilot-field">Anything we should know? (optional)<textarea rows={3} maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <label className="pilot-public__trap" aria-hidden>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
      {error ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
      <button type="submit" className="pilot-pill pilot-pill--primary" disabled={busy}>{busy ? "Sending" : "Apply for the pilot"}</button>
      <p className="pilot-public__note">BLTZ reviews every application. Your workspace opens after approval, with your former players already listed.</p>
    </form>
  );
}
