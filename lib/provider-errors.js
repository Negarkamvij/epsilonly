export function providerFailure(error) {
  if (error?.status === 402) return { status: 503, message: "AI generation is unavailable because the provider’s credits are depleted. The app owner needs to update the AI provider’s billing or API key." };
  if (error?.status === 429) return { status: 429, message: "The AI provider’s usage limit has been reached. Please try again later." };
  if ([401,403].includes(error?.status)) return { status: 503, message: "The AI provider’s API key is not authorized. The app owner needs to check its configuration." };
  if (error?.name === "AbortError" || error?.status === 504) return { status: 504, message: "The AI provider took too long to respond. Please try again." };
  return { status: 502, message: "The AI provider could not create this practice session. Please try again shortly." };
}
