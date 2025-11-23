import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  try {
    const supabase = await createClient();

    // You can also use getUser() which will be slower.
    const { data, error } = await supabase.auth.getClaims();

    // If there's an error or fetch failed, treat as unauthenticated
    if (error || !data?.claims) {
      return (
        <div className="flex gap-2">
          <Button asChild size="sm" variant={"outline"}>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant={"default"}>
            <Link href="/auth/sign-up">Sign up</Link>
          </Button>
        </div>
      );
    }

    const user = data.claims;

    return (
      <div className="flex items-center gap-4">
        Hey, {user.email}!
        <LogoutButton />
      </div>
    );
  } catch (error) {
    // Handle fetch failures and other errors gracefully
    // Show sign in/sign up buttons if authentication check fails
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild size="sm" variant={"default"}>
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
      </div>
    );
  }
}
