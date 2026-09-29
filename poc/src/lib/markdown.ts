import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ linkify: true, typographer: true });

export function render(text: string): string {
  return DOMPurify.sanitize(md.render(text));
}
