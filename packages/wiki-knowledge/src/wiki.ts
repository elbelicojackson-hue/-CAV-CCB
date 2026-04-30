import { readdir, readFile, writeFile, unlink, mkdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import type { Article, ArticleMeta, SearchResult, WikiConfig } from './types.js'

const DEFAULT_CONFIG: WikiConfig = {
  articlesDir: join(import.meta.dir ?? process.cwd(), '..', 'articles'),
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildFrontmatter(title: string, tags: string[], createdAt: string, updatedAt: string): string {
  return [
    '---',
    `title: "${title}"`,
    `tags: [${tags.map(t => `"${t}"`).join(', ')}]`,
    `created: "${createdAt}"`,
    `updated: "${updatedAt}"`,
    '---',
    '',
  ].join('\n')
}

function parseFrontmatter(raw: string): { meta: Omit<Article, 'content' | 'filePath'>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return {
      meta: { title: '', tags: [], createdAt: '', updatedAt: '' },
      body: raw,
    }
  }

  const [, fmBlock, body] = match
  const title = fmBlock.match(/title:\s*"(.+)"/)?.[1] ?? ''
  const tagsRaw = fmBlock.match(/tags:\s*\[(.+)\]/)?.[1] ?? ''
  const tags = tagsRaw
    .split(',')
    .map(t => t.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
  const createdAt = fmBlock.match(/created:\s*"(.+)"/)?.[1] ?? ''
  const updatedAt = fmBlock.match(/updated:\s*"(.+)"/)?.[1] ?? ''

  return { meta: { title, tags, createdAt, updatedAt }, body }
}

export class Wiki {
  private config: WikiConfig

  constructor(config: Partial<WikiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private articlePath(title: string): string {
    return join(this.config.articlesDir, `${slugify(title)}.md`)
  }

  async ensureDir(): Promise<void> {
    try {
      await stat(this.config.articlesDir)
    } catch {
      await mkdir(this.config.articlesDir, { recursive: true })
    }
  }

  async createArticle(title: string, content: string, tags: string[] = []): Promise<Article> {
    await this.ensureDir()
    const now = new Date().toISOString()
    const filePath = this.articlePath(title)

    try {
      await stat(filePath)
      throw new Error(`Article already exists: "${title}"`)
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('already exists')) throw e
    }

    const raw = buildFrontmatter(title, tags, now, now) + content + '\n'
    await writeFile(filePath, raw, 'utf-8')

    return { title, content, tags, filePath, createdAt: now, updatedAt: now }
  }

  async getArticle(title: string): Promise<Article | null> {
    const filePath = this.articlePath(title)
    try {
      const raw = await readFile(filePath, 'utf-8')
      const { meta, body } = parseFrontmatter(raw)
      return { ...meta, content: body, filePath }
    } catch {
      return null
    }
  }

  async updateArticle(title: string, content: string, tags?: string[]): Promise<Article> {
    const filePath = this.articlePath(title)
    const now = new Date().toISOString()

    let existing: Article | null = null
    try {
      const raw = await readFile(filePath, 'utf-8')
      const { meta, body } = parseFrontmatter(raw)
      existing = { ...meta, content: body, filePath }
    } catch {
      // Article doesn't exist yet — create it
    }

    const finalTags = tags ?? existing?.tags ?? []
    const finalTitle = existing?.title || title
    const createdAt = existing?.createdAt || now
    const raw = buildFrontmatter(finalTitle, finalTags, createdAt, now) + content + '\n'
    await writeFile(filePath, raw, 'utf-8')

    return { title: finalTitle, content, tags: finalTags, filePath, createdAt, updatedAt: now }
  }

  async deleteArticle(title: string): Promise<boolean> {
    const filePath = this.articlePath(title)
    try {
      await unlink(filePath)
      return true
    } catch {
      return false
    }
  }

  async listArticles(tag?: string): Promise<ArticleMeta[]> {
    await this.ensureDir()
    const files = await readdir(this.config.articlesDir)
    const mdFiles = files.filter(f => extname(f) === '.md')
    const results: ArticleMeta[] = []

    for (const file of mdFiles) {
      try {
        const raw = await readFile(join(this.config.articlesDir, file), 'utf-8')
        const { meta, body } = parseFrontmatter(raw)
        if (tag && !meta.tags.includes(tag)) continue
        results.push({
          ...meta,
          filePath: join(this.config.articlesDir, file),
          excerpt: body.slice(0, 200).replace(/\n/g, ' ').trim(),
        })
      } catch {
        // skip unreadable files
      }
    }

    return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async searchArticles(query: string): Promise<SearchResult[]> {
    const all = await this.listArticles()
    const lowerQuery = query.toLowerCase()
    const results: SearchResult[] = []

    for (const meta of all) {
      try {
        const raw = await readFile(meta.filePath, 'utf-8')
        const { body } = parseFrontmatter(raw)
        const fullText = `${meta.title} ${body}`.toLowerCase()

        if (!fullText.includes(lowerQuery)) continue

        // Simple relevance scoring
        let score = 0
        if (meta.title.toLowerCase().includes(lowerQuery)) score += 10
        const occurrences = fullText.split(lowerQuery).length - 1
        score += Math.min(occurrences, 20)

        // Extract matching lines
        const lines = body.split('\n')
        const matchedLines = lines
          .filter(l => l.toLowerCase().includes(lowerQuery))
          .slice(0, 5)
          .map(l => l.trim())

        results.push({ article: meta, score, matchedLines })
      } catch {
        // skip
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }
}
