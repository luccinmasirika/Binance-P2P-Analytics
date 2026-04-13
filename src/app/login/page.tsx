import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_VALUE,
} from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    redirect("/login?error=1");
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-mono text-[11px] font-bold"
              aria-hidden="true"
            >
              P2P
            </div>
            <CardTitle>P2P Analyzer</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Connectez-vous pour accéder au tableau de bord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="username"
                className="text-xs font-medium text-muted-foreground"
              >
                Nom d&apos;utilisateur
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-muted-foreground"
              >
                Mot de passe
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {error ? (
              <p
                className="text-xs text-destructive"
                role="alert"
                aria-live="polite"
              >
                Identifiants invalides
              </p>
            ) : null}
            <Button type="submit" className="mt-2">
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
