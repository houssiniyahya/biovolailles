import { getMutableIronSession } from "./session";

export async function logout(): Promise<void> {
  const session = await getMutableIronSession();
  session.destroy();
}
