/**
 * Google Docs API batchUpdate request builder.
 *
 * Tracks insertion index so text and formatting requests are in correct order.
 * All content is appended sequentially starting at index 1.
 */

export class DocBuilder {
  constructor() {
    /** @type {object[]} */
    this._requests = [];
    this._index = 1;
  }

  /** Append raw request object(s). */
  push(...reqs) {
    this._requests.push(...reqs);
  }

  /** Return the final request array. */
  build() {
    return this._requests;
  }

  // ─── Convenience methods ────────────────────────────────────────────────

  heading(text, level = 1) {
    const start = this._index;
    const content = text + '\n';
    this.push(
      { insertText: { location: { index: start }, text: content } },
      {
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: start + content.length },
          paragraphStyle: { namedStyleType: `HEADING_${level}` },
          fields: 'namedStyleType',
        },
      },
    );
    this._index += content.length;
  }

  paragraph(text) {
    if (!text) return;
    const content = text + '\n';
    this.push({ insertText: { location: { index: this._index }, text: content } });
    this._index += content.length;
  }

  /** Insert a bulleted list. Each item becomes a paragraph with a bullet. */
  bulletList(items) {
    if (!items?.length) return;
    const startIndex = this._index;
    let totalLen = 0;
    for (const item of items) {
      const content = item + '\n';
      this.push({ insertText: { location: { index: this._index }, text: content } });
      this._index += content.length;
      totalLen += content.length;
    }
    this.push({
      createParagraphBullets: {
        range: { startIndex: startIndex, endIndex: startIndex + totalLen },
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
      },
    });
  }

  /** Insert a checklist (tasks with done status). */
  checklist(items) {
    if (!items?.length) return;
    const startIndex = this._index;
    let totalLen = 0;
    for (const item of items) {
      const label = typeof item === 'string' ? item : item.label || item.id || '';
      const done = typeof item === 'object' ? item.done : false;
      const prefix = done ? '\u2611 ' : '\u2610 ';
      const content = prefix + label + '\n';
      this.push({ insertText: { location: { index: this._index }, text: content } });
      this._index += content.length;
      totalLen += content.length;
    }
    this.push({
      createParagraphBullets: {
        range: { startIndex: startIndex, endIndex: startIndex + totalLen },
        bulletPreset: 'BULLET_CHECKBOX',
      },
    });
  }

  /** Insert a horizontal rule. */
  divider() {
    const content = '\u2500'.repeat(40) + '\n';
    this.push({ insertText: { location: { index: this._index }, text: content } });
    this._index += content.length;
  }

  /** Insert branded header block. */
  brandHeader(clientName, artifactTitle, date) {
    const dateLine = date || new Date().toISOString().split('T')[0];
    this.heading(artifactTitle, 1);
    if (clientName) this.paragraph(`Prepared for ${clientName}`);
    this.paragraph(`Generated ${dateLine} \u00b7 Career Concierge OS`);
    this.divider();
  }

  /** Insert a key-value summary line. */
  keyValue(key, value) {
    if (!value) return;
    const content = `${key}: ${value}\n`;
    this.push({ insertText: { location: { index: this._index }, text: content } });
    this._index += content.length;
  }

  /** Insert a section with heading + bullet list. */
  section(title, items, level = 2) {
    if (!items?.length) return;
    this.heading(title, level);
    this.bulletList(items);
  }
}
