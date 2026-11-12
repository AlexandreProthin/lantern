import { describe, expect, it } from 'vitest';
import { markdownHtml } from './markdown';
import { newLearnSubject } from '../rooms/learn/rules';

const visit = newLearnSubject('Tides').rooms.learn;
const html = (text: string) => markdownHtml(text, visit);

describe('collapsible blocks (NP-75, NP-76)', () => {
  it('renders the authoring form with markdown, math and code inside', () => {
    const out = html('Try it first.\n\n<details>\n<summary>Solution</summary>\n\nThe answer is **$x^2$**.\n\n```python\nprint(1)\n```\n\n</details>\n\nAfter.');
    expect(out).toContain('<details class="md-details"><summary>Solution</summary>');
    expect(out).toContain('<strong><span class="katex">');
    expect(out).toContain('class="code-block"');
    expect(out).toMatch(/<\/details>\n<p>After\.<\/p>/);
    expect(out).not.toContain('&lt;details');
  });

  it('takes the summary on the opening line, needs no blank lines, and keeps `open`', () => {
    const out = html('<details open><summary>Hint *one*</summary>\nUse the chain rule.\n</details>');
    expect(out).toContain('<details class="md-details" open><summary>Hint <em>one</em></summary>');
    expect(out).toContain('<p>Use the chain rule.</p>');
  });

  it('labels a block with no summary, and nests', () => {
    const out = html('<details>\nOuter\n\n<details>\n<summary>Inner</summary>\nDeep\n</details>\n\nStill outer\n</details>');
    expect(out.match(/<details/g)).toHaveLength(2);
    expect(out).toContain('<summary>Details</summary>');
    expect(out.indexOf('Still outer')).toBeGreaterThan(out.indexOf('Deep'));
    expect(out.trimEnd().endsWith('</details>')).toBe(true);
  });

  it('ignores a closing line inside a code fence', () => {
    const out = html('<details>\n<summary>Code</summary>\n\n```html\n</details>\n```\n\n</details>');
    expect(out.match(/<\/details>/g)).toHaveLength(1);
    expect(out).toContain('<span class="hljs-name">details</span>');
  });

  it('leaves an unclosed block, other tags and attributes as escaped text', () => {
    expect(html('<details>\n<summary>Solution</summary>\nhalf streamed')).toContain('&lt;details&gt;');
    expect(html('<details onclick="x()">\nhi\n</details>')).not.toContain('<details');
    expect(html('<summary>alone</summary>')).toContain('&lt;summary&gt;');
    expect(html('A `List<T>` and List<T> stay.')).toContain('List&lt;T&gt; stay');
    expect(html('<details>\n<b>bold</b>\n</details>')).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('keeps an indented opening line as code', () => {
    expect(html('    <details>\n    x\n    </details>')).toContain('<pre><code>&lt;details&gt;');
  });
});
