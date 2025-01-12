import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user } = await validateRequest()
  if (!user) {
      return redirect('/auth/login')
  }
  return children
}