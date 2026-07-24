"use client";

import { FormEvent, useState } from "react";
import styles from "@/app/homepage-structure.module.css";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          fullName: form.get("fullName"),
          sport: form.get("sport"),
          school: form.get("school"),
          playingLevel: form.get("playingLevel"),
          contentGap: form.get("contentGap"),
          newsletterOptIn: form.get("newsletterOptIn") === "on",
          website: form.get("website"),
        }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setState("error");
        setMessage(result?.error ?? "Unable to join the waitlist.");
        return;
      }

      setState("success");
      setMessage("You are on the list. We will be in touch.");
      formElement.reset();
    } catch {
      setState("error");
      setMessage("Unable to reach the waitlist. Please try again.");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>Full name</span>
        <input name="fullName" autoComplete="name" />
      </label>
      <div className={styles.formRow}>
        <label>
          <span>Sport</span>
          <input name="sport" />
        </label>
        <label>
          <span>Playing level</span>
          <select name="playingLevel" defaultValue="">
            <option value="">Select</option>
            <option value="hs">High school</option>
            <option value="cfb">College</option>
            <option value="pro">Professional</option>
            <option value="former">Former athlete</option>
          </select>
        </label>
      </div>
      <label>
        <span>School or team</span>
        <input name="school" />
      </label>
      <label>
        <span>What part of your story is hardest to find?</span>
        <textarea name="contentGap" rows={3} />
      </label>
      <label className={styles.honeypot} aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className={styles.checkbox}>
        <input name="newsletterOptIn" type="checkbox" defaultChecked />
        <span>Send me product updates and claim-access news.</span>
      </label>
      <button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Submitting..." : "Join waitlist"}
      </button>
      {message ? <p role="status" data-state={state}>{message}</p> : null}
    </form>
  );
}
