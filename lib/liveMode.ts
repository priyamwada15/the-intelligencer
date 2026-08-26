export function shouldUseLiveData(
  apiKey: string | undefined,
  liveModeFlag: string | undefined,
): boolean {
  return Boolean(apiKey) && liveModeFlag === "true";
}
