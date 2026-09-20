import { redirect } from "next/navigation";
import { getCurrentSession } from "@/services/auth/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getCurrentSession();
  const params = await searchParams;
  const nextParam = params.next;
  const next = typeof nextParam === "string" && nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (session) {
    redirect(next);
  }

  return <LoginForm next={next} />;
}
