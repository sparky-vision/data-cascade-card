import { LitElement, html, css } from "https://unpkg.com/lit-element/lit-element.js?module";

class DataCascadeCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  setConfig(config) {
    if (!config.content || !Array.isArray(config.content)) {
      throw new Error("Missing `content` in card config. Content should be an array of objects.");
    }

    // Process content to ensure each item has the required properties (text, justify, line, center_position)
    const processedContent = config.content.map(item => {
        if (typeof item === 'object' && item !== null && item.text) {
            return {
                text: item.text,
                justify: item.justify || 'flex-start', // Default to flex-start
                line: item.line || 1, // Default to line 1
                center_position: item.center_position || 50, // Default to 50% for center items
            };
        }
        // In case of invalid item format, you might want to return a default object or filter it out.
        // Here, we'll create a placeholder to avoid errors, though filtering might be better.
        return { text: 'Invalid Item', justify: 'flex-start', line: 1, center_position: 50 };
    }).filter(item => item.text !== 'Invalid Item'); // Filter out invalid items

    this._config = {
      ...config,
      content: processedContent
    };
  }

  // #region Helper methods for Home Assistant-like templating
  states(entityId) {
    return this.hass.states[entityId]?.state ?? "unknown";
  }

  state_attr(entityId, attr) {
    return this.hass.states[entityId]?.attributes?.[attr];
  }

  round(value, digits) {
    if (typeof value !== "number") return value;
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  }
  // #endregion

  /**
   * Evaluates a single expression (the part inside {{...}}).
   * @param {string} expr The expression string to evaluate.
   * @returns {string} The result of the evaluation.
   */
  _evaluateExpression(expr) {
    if (!expr || expr.trim() === '') return '';
    try {
      const [funcPart, filterPart] = expr.split("|").map(s => s.trim());
      let value;
      const statesMatch = funcPart.match(/^states\(['"]([^'"]+)['"]\)$/);
      if (statesMatch) value = this.states(statesMatch[1]);
      const attrMatch = funcPart.match(/^state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)$/);
      if (attrMatch) value = this.state_attr(attrMatch[1], attrMatch[2]);
      if (value === undefined && /^[a-z_]+\.([a-z0-9_]+)$/i.test(funcPart)) value = this.states(funcPart);
      if (filterPart) {
        const roundMatch = filterPart.match(/^round\((\d+)\)$/);
        if (roundMatch) value = this.round(Number(value), parseInt(roundMatch[1], 10));
      }
      return value ?? "";
    } catch (e) {
      console.error(`Error evaluating expression "${expr}":`, e);
      return `Error: ${e.message}`;
    }
  }

  /**
   * Renders a template string by finding and evaluating all {{...}} expressions.
   * @param {string} template The template string to render.
   * @returns {string} The rendered string with evaluated expressions.
   */
  _renderTemplate(template) {
    if (typeof template !== 'string') return '';
    return template.replace(/\{\{\s*(.*?)\s*\}\}/g, (match, expr) => this._evaluateExpression(expr));
  }

  // #region Style Resolvers
  resolveCustomColor() {
    if (!this._config.cascade_color) return '';
    const colorValue = this._config.cascade_color.trim();
    const property = colorValue.startsWith('var(') ? '--data-cascade-user-override' : '--data-cascade-color-override';
    return `
      :host { ${property}: ${colorValue}; }
      .multi-line-container { --resolved-cascade-color: var(--data-cascade-user-override, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary, #ff9900)))); }
    `;
  }

  resolveFontSize() {
    if (!this._config.font_size) return '';
    const fontSize = this._config.font_size.trim();
    const validSizePattern = /^[\d.]+\s*(px|em|rem|%|ex|ch|vw|vh|vmin|vmax|pt|pc|in|cm|mm)$/i;
    if (validSizePattern.test(fontSize)) {
      return `.multi-line-container { font-size: ${fontSize} !important; }`;
    }
    console.warn(`Invalid font-size value: ${fontSize}`);
    return '';
  }
  // #endregion

  render() {
    if (!this._config || !this.hass) return html``;

    // Group content items by line number and justification
    const lines = new Map();
    (this._config.content || []).forEach(item => {
      const lineNumber = item.line || 1;
      if (!lines.has(lineNumber)) {
        lines.set(lineNumber, { start: [], center: [], end: [] });
      }
      const lineData = lines.get(lineNumber);
      const renderedText = this._renderTemplate(item.text);

      switch (item.justify) {
        case 'flex-start':
          lineData.start.push(renderedText);
          break;
        case 'center':
          lineData.center.push({
            text: renderedText,
            position: item.center_position || 50
          });
          break;
        case 'flex-end':
        case 'space-between': // For now, group these with end
        case 'space-around':
          lineData.end.push(renderedText);
          break;
        default:
          lineData.start.push(renderedText);
      }
    });

    // Sort line numbers and create the renderable templates
    const sortedLineNumbers = [...lines.keys()].sort((a, b) => a - b);
    const renderedLinesData = sortedLineNumbers.map(lineNumber => {
      const lineData = lines.get(lineNumber);
      const rowClass = `dc-row-${((lineNumber - 1) % 7) + 1}`;

      // Create positioned center elements
      const centeredElements = lineData.center.map((centerItem, index) => html`
        <div class="justify-group justify-group-center" style="left: ${centerItem.position}%;">
          ${centerItem.text}
        </div>
      `);

      return html`
        <div class="${rowClass} multi-line-container">
          <div class="justify-group justify-group-start">${lineData.start}</div>
          ${centeredElements}
          <div class="justify-group justify-group-end">${lineData.end}</div>
        </div>
      `;
    });

    const customColorStyle = this._config.cascade_color ? html`<style>${this.resolveCustomColor()}</style>` : '';
    const fontSizeStyle = this._config.font_size ? html`<style>${this.resolveFontSize()}</style>` : '';
    const rowHeight = this._config.height || "1.5em";
    const rowHeightStyle = html`
      <style>
        .multi-line-container {
          height: ${rowHeight};
          line-height: ${rowHeight};
        }
      </style>
    `;

    return html`
      ${customColorStyle}
      ${fontSizeStyle}
      ${rowHeightStyle}
      <ha-card header=${this._config.title || ""}>
        <div class="card-content data-column">
          ${renderedLinesData}
        </div>
      </ha-card>
    `;
  }

  static async getConfigElement() {
    await import("./data-cascade-card-editor.js");
    return document.createElement("data-cascade-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Data Cascade Card",
      content: [
        { text: "L1 Start: {{ states('sensor.example_left') }}", justify: "flex-start", line: 1 },
        { text: "L1 End: {{ states('sensor.example_right') }}", justify: "flex-end", line: 1 },
        { text: "L2 Center: {{ states('sensor.example_center') }}", justify: "center", line: 2, center_position: 50 },
        { text: "L3 Start: {{ states('sensor.example_left') }}", justify: "flex-start", line: 3 },
        { text: "L3 Center: {{ state_attr('weather.home', 'temperature') | round(1) }}°", justify: "center", line: 3, center_position: 45 },
        { text: "L3 End: {{ states('sensor.example_right') }}", justify: "flex-end", line: 3 },
        { text: "L4 Start", justify: "flex-start", line: 4 },
        { text: "L5 Start", justify: "flex-start", line: 5 },
        { text: "L6 Start", justify: "flex-start", line: 6 },
        { text: "L7 Start", justify: "flex-start", line: 7 },
      ],
      font_size: "1rem",
      height: "1.8em",
      cascade_color: "var(--primary-color)"
    };
  }

  static get styles() {
    return css`
      ha-card {
        background-color: var(--card-background-color, white);
        overflow: hidden;
      }
      .data-column {
        padding: 0 16px 16px;
        font-family: var(--paper-font-body1_-_font-family);
        display: grid;
        grid-template-columns: 1fr;
        color: black;
      }
      .multi-line-container {
        display: flex;
        align-items: center;
        width: 100%;
        text-box: trim-both cap alphabetic;
        position: relative;
      }
      .justify-group {
        display: flex;
        align-items: center;
        gap: 0.5em;
      }
      .justify-group-start {
        /* Start items naturally stay at the beginning */
      }
      .justify-group-center {
        position: absolute;
        z-index: 1;
        /* left position is now set inline via style attribute */
      }
      .justify-group-end {
        margin-left: auto;
      }

      /* Animations */
      @keyframes data-group-1 { 0%, 3.99% { color: black; } 4%, 45.99% { color: var(--resolved-cascade-color, #ff9900); } 46%, 49.99% { color: var(--light-color, #cccccc); } 50%, 63.99% { color: var(--resolved-cascade-color, #ff9900); } 64%, 67.99% { color: var(--light-color, #cccccc); } 68%, 100% { color: var(--resolved-cascade-color, #ff9900); } }
      @keyframes data-group-1a { 0%, 4.99% { color: black; } 5%, 45.99% { color: var(--resolved-cascade-color, #ff9900); } 46%, 49.99% { color: var(--light-color, #cccccc); } 50%, 63.99% { color: var(--resolved-cascade-color, #ff9900); } 64%, 67.99% { color: var(--light-color, #cccccc); } 68%, 100% { color: var(--resolved-cascade-color, #ff9900); } }
      @keyframes data-group-2 { 0%, 12.99% { color: black; } 13%, 49.99% { color: var(--resolved-cascade-color, #ff9900); } 50%, 53.99% { color: var(--light-color, #cccccc); } 54%, 67.99% { color: var(--resolved-cascade-color, #ff9900); } 68%, 71.99% { color: var(--light-color, #cccccc); } 72%, 100% { color: var(--resolved-cascade-color, #ff9900); } }
      @keyframes data-group-2b { 0%, 14.99% { color: black; } 15%, 49.99% { color: var(--resolved-cascade-color, #ff9900); } 50%, 53.99% { color: var(--light-color, #cccccc); } 54%, 67.99% { color: var(--resolved-cascade-color, #ff9900); } 68%, 71.99% { color: var(--light-color, #cccccc); } 72%, 81.99% { color: var(--resolved-cascade-color, #ff9900); } 82%, 100% { color: var(--light-color, #cccccc); } }
      @keyframes data-group-3 { 0%, 26.99% { color: black; } 27%, 40.99% { color: var(--light-color, #cccccc); } 41%, 53.99% { color: var(--resolved-cascade-color, #ff9900); } 54%, 57.99% { color: var(--light-color, #cccccc); } 58%, 71.99% { color: var(--resolved-cascade-color, #ff9900); } 72%, 75.99% { color: var(--light-color, #cccccc); } 76%, 100% { color: var(--resolved-cascade-color, #ff9900); } }
      .dc-row-1 { animation: data-group-1 6000ms ease 200ms infinite; }
      .dc-row-2 { animation: data-group-1a 6000ms ease 200ms infinite; }
      .dc-row-3 { animation: data-group-2 6000ms ease 200ms infinite; }
      .dc-row-4 { animation: data-group-2b 6000ms ease 200ms infinite; }
      .dc-row-5 { animation: data-group-3 6000ms ease 200ms infinite; }
      .dc-row-6 { animation: data-group-3 6000ms ease 200ms infinite; }
      .dc-row-7 { animation: data-group-3 6000ms ease 200ms infinite; }

      /* Static/frozen state */
      :host(.frozen) .multi-line-container { animation: none; }
      :host(.frozen) .dc-row-1, :host(.frozen) .dc-row-2, :host(.frozen) .dc-row-3, :host(.frozen) .dc-row-4 { color: var(--orange, #ff8800); }
      :host(.frozen) .dc-row-5, :host(.frozen) .dc-row-6, :host(.frozen) .dc-row-7 { color: var(--light-color, #cccccc); }
    `;
  }
}

customElements.define("data-cascade-card", DataCascadeCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "data-cascade-card",
  name: "Data Cascade Card",
  description: "A templated card with an LCARS data cascade effect, customizable in UI.",
});