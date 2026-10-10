import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Pawtner</h1>
      <p className="text-neutral-600 max-w-md text-center">
        The petshop owner&apos;s partner — POS, inventory & subscriptions for Indonesian pet shops.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="bg-neutral-900 text-white rounded px-4 py-2">Sign in</Link>
        <Link href="/register" className="border rounded px-4 py-2">Create account</Link>
      </div>
    </main>
  );
}
