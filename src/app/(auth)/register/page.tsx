"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/schemas";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    setServerError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setServerError(body.error ?? "Registration failed.");
      return;
    }

    router.push("/login?registered=1");
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Create account</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Get started with Task Manager Pro</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Full name
          </label>
          <input
            {...register("name")}
            type="text"
            placeholder="John Doe"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
          />
          {errors.name && <p className="text-xs mt-1" style={{ color: "var(--priority-critical)" }}>{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Email
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
          />
          {errors.email && <p className="text-xs mt-1" style={{ color: "var(--priority-critical)" }}>{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Password
          </label>
          <input
            {...register("password")}
            type="password"
            placeholder="Min. 8 characters"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
          />
          {errors.password && <p className="text-xs mt-1" style={{ color: "var(--priority-critical)" }}>{errors.password.message}</p>}
        </div>

        {serverError && (
          <div className="px-3 py-2 rounded-lg text-sm" style={{ background: "color-mix(in srgb, var(--priority-critical) 15%, transparent)", color: "var(--priority-critical)", border: "1px solid color-mix(in srgb, var(--priority-critical) 30%, transparent)" }}>
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ background: "var(--status-todo)", color: "var(--accent-contrast)" }}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-medium" style={{ color: "var(--status-todo)" }}>
          Sign in
        </Link>
      </p>
    </>
  );
}
