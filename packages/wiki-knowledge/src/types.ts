export interface Article {
  title: string
  content: string
  tags: string[]
  filePath: string
  createdAt: string
  updatedAt: string
}

export interface ArticleMeta {
  title: string
  tags: string[]
  filePath: string
  createdAt: string
  updatedAt: string
  excerpt: string
}

export interface SearchResult {
  article: ArticleMeta
  score: number
  matchedLines: string[]
}

export interface WikiConfig {
  articlesDir: string
}
