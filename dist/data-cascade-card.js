import { LitElement, html, css } from "https://unpkg.com/lit-element/lit-element.js?module";

class DataCascadeCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  setConfig(config) {
    if (!config.content) {
      throw new Error("Missing `content` in card config");
    }
    this._config = config;
  }

  // Helper methods for Home Assistant-like templating
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

  evaluateExpression(expr) {
    try {
      const [funcPart, filterPart] = expr.split("|").map(s => s.trim());
      let value;

      const statesMatch = funcPart.match(/^states\(['"]([^'"]+)['"]\)$/);
      if (statesMatch) {
        value = this.states(statesMatch[1]);
      }

      const attrMatch = funcPart.match(/^state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)$/);
      if (attrMatch) {
        value = this.state_attr(attrMatch[1], attrMatch[2]);
      }

      if (filterPart) {
        const roundMatch = filterPart.match(/^round\((\d+)\)$/);
        if (roundMatch) {
          value = this.round(Number(value), parseInt(roundMatch[1], 10));
        }
      }

      return value ?? "";
    } catch (e) {
      return `Error: ${e.message}`;
    }
  }

  // Handle color resolution for both direct colors and CSS variables
  resolveCustomColor() {
    if (!this._config.cascade_color) return '';
    
    const colorValue = this._config.cascade_color.trim();
    
    // If it starts with 'var(', we need special handling for CSS variables
    if (colorValue.startsWith('var(')) {
      return `
        :host {
          --data-cascade-user-override: ${colorValue};
        }
        
        /* Set up resolved color that can handle nested variables */
        .dc-row-1, .dc-row-2, .dc-row-3, .dc-row-4, .dc-row-5, .dc-row-6, .dc-row-7 {
          --resolved-cascade-color: var(--data-cascade-user-override, var(--data-cascade-color, var(--lcars-ui-primary, #ff9900)));
        }
      `;
    } else {
      // Direct color value (named color, hex, rgb, etc.)
      return `
        :host {
          --data-cascade-color-override: ${colorValue};
        }
        
        /* Set up resolved color for direct values */
        .dc-row-1, .dc-row-2, .dc-row-3, .dc-row-4, .dc-row-5, .dc-row-6, .dc-row-7 {
          --resolved-cascade-color: var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary, #ff9900)));
        }
      `;
    }
  }

  // Handle font-size override for both relative and absolute units
  resolveFontSize() {
    if (!this._config.font_size) return '';
    
    const fontSize = this._config.font_size.trim();
    
    // Basic validation - check if it looks like a valid CSS size
    const validSizePattern = /^[\d.]+\s*(px|em|rem|%|ex|ch|vw|vh|vmin|vmax|pt|pc|in|cm|mm)$/i;
    
    if (validSizePattern.test(fontSize)) {
      return `
        .data-column {
          font-size: ${fontSize} !important;
        }
      `;
    } else {
      console.warn(`Invalid font-size value: ${fontSize}`);
      return '';
    }
  }

  render() {
  if (!this._config || !this.hass) return html``;

  let inputContent = this._config.content;

  // Support both single string and array of lines
  if (Array.isArray(inputContent)) {
    inputContent = inputContent.join("\n");
  }

  // Normalize to array of lines
  const lines = Array.isArray(inputContent)
    ? inputContent
    : inputContent.split("\n");

  // Process each line with inline Jinja evaluation and entity shorthand
  const renderedLinesData = lines.map((line, index) => {
    const trimmed = line.trim();

    // Replace all jinja-style expressions {{ ... }} inside the line
    let rendered = line.replace(/\{\{(.*?)\}\}/g, (_match, expr) => {
      return this.evaluateExpression(expr.trim());
    });

    // If the entire trimmed line is just an entity like domain.entity_id,
    // and no replacements were made by above, replace rendered with the entity state
    if (/^[a-z_]+\.([a-z0-9_]+)$/i.test(trimmed) && rendered === line) {
      rendered = this.states(trimmed);
    }

    // Cycle through dc-row-1 to dc-row-7
    const rowClass = `dc-row-${(index % 7) + 1}`;
    return html`<div class="${rowClass}">${rendered}</div>`;
  });

  // Apply the enhanced color override that handles both direct colors and CSS variables
  const customColorStyle = this._config.cascade_color ? 
    html`<style>${this.resolveCustomColor()}</style>` : '';

  // Apply font-size override if provided
  const fontSizeStyle = this._config.font_size ? 
    html`<style>${this.resolveFontSize()}</style>` : '';

  // Apply line-height override if provided, otherwise fallback to a safe default (1.4)
  const lineHeight = this._config.line_height || "1.4";
  const lineHeightStyle = html`
    <style>
      .data-column > div {
        line-height: ${lineHeight};
      }
    </style>
  `;

  return html`
    ${customColorStyle}
    ${fontSizeStyle}
    ${lineHeightStyle}
    <ha-card header=${this._config.title || ""}>
      <div class="content data-column">
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
      content: ["Example: {{ states('sensor.example') }}"],
      font_size: "0.938rem"
    };
  }

  static get styles() {
    return css`
      ha-card {
        background-color: var(--card-background-color, white);
        animation: fadeIn 0.3s ease-out;
      }

      .content {
        padding: 16px;
        font-family: var(--paper-font-body1_-_font-family);
        font-size: var(--paper-font-body1_-_font-size);
        line-height: 1.4;
      }

      /* Data Cascade 2025 Animations */
      .data-column {
        display: grid;  
        grid-template-columns: 1fr;
        margin-top: 1px;
        text-align: right;
        font-size: var(--dc-font-size, 0.938rem);
        line-height: 1;
        color: black;
      }

      .dc-row-1,
      .dc-row-2,
      .dc-row-3,
      .dc-row-4,
      .dc-row-5,
      .dc-row-6,
      .dc-row-7 {
        text-box: trim-both cap alphabetic;
        height: var(--dc-row-height, auto);
      }

      @keyframes data-group-1 {
        0%, 3.99% {
          color: black;
        }
        4%, 45.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        46%, 49.99% {
          color: var(--light-color, #cccccc);
        }
        50%, 63.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        64%, 67.99% {
          color: var(--light-color, #cccccc);
        }
        68%, 100% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
      }

      @keyframes data-group-1a {
        0%, 4.99% {
          color: black;
        }
        5%, 45.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        46%, 49.99% {
          color: var(--light-color, #cccccc);
        }
        50%, 63.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        64%, 67.99% {
          color: var(--light-color, #cccccc);
        }
        68%, 100% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
      }

      @keyframes data-group-2 {
        0%, 12.99% {
          color: black;
        }
        13%, 49.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        50%, 53.99% {
          color: var(--light-color, #cccccc);
        }
        54%, 67.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        68%, 71.99% {
          color: var(--light-color, #cccccc);
        }
        72%, 100% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
      }

      @keyframes data-group-2b {
        0%, 14.99% {
          color: black;
        }
        15%, 49.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        50%, 53.99% {
          color: var(--light-color, #cccccc);
        }
        54%, 67.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        68%, 71.99% {
          color: var(--light-color, #cccccc);
        }
        72%, 81.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        82%, 100% {
          color: var(--light-color, #cccccc);
        }
      }

      @keyframes data-group-3 {
        0%, 26.99% {
          color: black;
        }
        27%, 40.99% {
          color: var(--light-color, #cccccc);
        }
        41%, 53.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        54%, 57.99% {
          color: var(--light-color, #cccccc);
        }
        58%, 71.99% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
        72%, 75.99% {
          color: var(--light-color, #cccccc);
        }
        76%, 100% {
          color: var(--resolved-cascade-color, var(--data-cascade-color-override, var(--data-cascade-color, var(--lcars-ui-primary))));
        }
      }

      .dc-row-1 {
        animation: data-group-1 6000ms ease 200ms infinite;
      }

      .dc-row-2 {
        animation: data-group-1a 6000ms ease 200ms infinite;
      }

      .dc-row-3 {
        animation: data-group-2 6000ms ease 200ms infinite;
      }

      .dc-row-4 {
        animation: data-group-2b 6000ms ease 200ms infinite;
      }

      .dc-row-5 {
        animation: data-group-3 6000ms ease 200ms infinite;
      }

      .dc-row-6 {
        animation: data-group-3 6000ms ease 200ms infinite;
      }

      .dc-row-7 {
        animation: data-group-3 6000ms ease 200ms infinite;
      }

      /* Static data cascade - can be activated by adding 'frozen' class to ha-card */
      :host(.frozen) .dc-row-1 {
        animation: none;
        color: var(--orange, #ff8800);
      }

      :host(.frozen) .dc-row-2 {
        animation: none;
        color: var(--orange, #ff8800);
      }

      :host(.frozen) .dc-row-3 {
        animation: none;
        color: var(--orange, #ff8800);
      }

      :host(.frozen) .dc-row-4 {
        animation: none;
        color: var(--orange, #ff8800);
      }

      :host(.frozen) .dc-row-5 {
        animation: none;
        color: var(--light-color, #cccccc);
      }

      :host(.frozen) .dc-row-6 {
        animation: none;
        color: var(--light-color, #cccccc);
      }

      :host(.frozen) .dc-row-7 {
        animation: none;
        color: var(--light-color, #cccccc);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 780px) {
        :host {
          display: none;
        }
      }
    `;
  }
}

customElements.define("data-cascade-card", DataCascadeCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "data-cascade-card",
  name: "Data Cascade Card",
  description: "A templated card with array‑content, customizable in UI.",
});