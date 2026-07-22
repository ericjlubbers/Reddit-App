import type {RssItem} from '../../shared/types.ts'

/** Substitutes `{title}`, `{link}`, `{summary}`, `{guid}`, `{publishedAt}`. */
export function renderComment(item: RssItem, template: string): string {
  return template
    .replaceAll('{title}', item.title)
    .replaceAll('{link}', item.link)
    .replaceAll('{summary}', item.summary)
    .replaceAll('{guid}', item.guid)
    .replaceAll('{publishedAt}', item.publishedAt)
}
