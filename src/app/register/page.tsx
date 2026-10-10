"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, storeName }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || !json.ok) {
      setError(json.error || "Failed to create account");
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/products");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm space-y-4">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <div>
          <label className="block text-sm text-neutral-600">Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-neutral-600">Store name</label>
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-neutral-600">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-neutral-600">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required className="mt-1 w-full border rounded px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white rounded px-3 py-2 disabled:opacity-50">
          {loading ? "Creating..." : "Create account"}
        </button>
        <p className="text-sm text-neutral-500">
          Already have an account? <a href="/login" className="text-neutral-900 underline">Sign in</a>
        </p>
      </form>
    </main>
  );
}
