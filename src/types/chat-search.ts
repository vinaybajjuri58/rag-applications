export type TChatSearchRequest = {
  query: string
  limit?: number
}

export type TChatSearchResult = {
  results: Array<{
    score: number
    url: string | null
    title: string | null
    pageContent: string | null
  }>
  answer?: string
  error?: string
}
