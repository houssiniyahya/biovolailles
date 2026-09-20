import { env } from "./env";

/** The one place the public passport URL is composed — keeps `/tracabilite/<token>` from being string-built in three places. */
export function publicPassportUrl(token: string): string {
  return `${env.APP_URL}/tracabilite/${token}`;
}
