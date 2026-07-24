"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import styles from "@/app/homepage-structure.module.css";

type SubmitState = "idle" | "submitting" | "success" | "error";

const athleteInitials = ["KM", "RJ", "AT", "DS", "LW"];

export function HeroWaitlistForm() {
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
          newsletterOptIn: true,
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
      setMessage("Your locker request is in.");
      formElement.reset();
    } catch {
      setState("error");
      setMessage("Unable to reach the waitlist. Please try again.");
    }
  }

  return (
    <div className={styles.heroConversion}>
      <form className={styles.heroForm} onSubmit={handleSubmit}>
        <label className={styles.visuallyHidden} htmlFor="hero-email">
          Email address
        </label>
        <input
          id="hero-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          required
        />
        <label className={styles.honeypot} aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <button type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? "Claiming..." : "Claim your locker"}
        </button>
      </form>

      <div className={styles.athleteStack} aria-label="Athletes joining BLTZ">
        <span className={styles.athleteAvatar}>
          <Image src="/images/Headshot.png" alt="" width={42} height={42} />
        </span>
        {athleteInitials.map((initials, index) => (
          <span className={styles.athleteAvatar} data-tone={index + 1} key={initials}>
            {initials}
          </span>
        ))}
      </div>

      {message ? (
        <p className={styles.heroFormStatus} role="status" data-state={state}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
