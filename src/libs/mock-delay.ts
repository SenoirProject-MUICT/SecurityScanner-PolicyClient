const MOCK_LOADING_DELAY_MS = 500

export function simulateMockLoading() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, MOCK_LOADING_DELAY_MS))
}
