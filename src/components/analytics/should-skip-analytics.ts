export function shouldSkipAnalytics(): boolean {
  return process.env.NODE_ENV === "development" || Boolean(process.env.DEBUG);
}
