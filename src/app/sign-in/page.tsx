import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-muted">Sign in to save comparisons and open them later. You don&rsquo;t need an account to compare.</p>
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
