import { LitElement, html, css } from "https://unpkg.com/lit-element/lit-element.js?module";

class DataCascadeCardEditor extends LitElement {
  static get properties() {
    return {
      _config: { type: Object },
    };
  }

  setConfig(config) {
    this._config = { content: [], ...config };
  }

  get contentLines() {
    const c = this._config.content;
    return Array.isArray(c) ? c : (typeof c === "string" ? c.split("\n") : []);
  }

  _valueChanged(index, e) {
    const newLines = [...this.contentLines];
    newLines[index] = e.target.value;
    this._config.content = newLines;
    this._emitChange();
  }

  _addLine() {
    this._config.content = [...this.contentLines, ""];
    this._emitChange();
  }

  _removeLine(index) {
    const lines = [...this.contentLines];
    lines.splice(index, 1);
    this._config.content = lines;
    this._emitChange();
  }

  _emitChange() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
    });
    this.dispatchEvent(event);
  }

  render() {
  if (!this._config) return html`<div></div>`;

  return html`
    <div class="editor">
      <label>Title:</label>
      <input
        type="text"
        .value=${this._config.title || ""}
        @input=${e => {
          this._config.title = e.target.value;
          this._emitChange();
        }}
      />

      <label>Content Lines:</label>
      <small>Supports device.entity or Jinja2 templates.</small>
      ${this.contentLines.map((line, index) => html`
        <div class="line-item">
          <input
            type="text"
            .value=${line}
            @input=${e => this._valueChanged(index, e)}
          />
          <button @click=${() => this._removeLine(index)}>✖</button>
        </div>
      `)}
      <button @click=${this._addLine}>➕ Add an entry</button>

      <label>Cascade Color Override:</label>
      <input
        type="text"
        placeholder="Leave empty for theme default"
        .value=${this._config.cascade_color || ""}
        @input=${e => {
          this._config.cascade_color = e.target.value;
          this._emitChange();
        }}
      />
      <small>Override the cascade animation color. Leave empty to use theme default.</small>

      <label>Font Size (e.g., 14px, 1em):</label>
      <input
        type="text"
        placeholder="Leave empty for default"
        .value=${this._config.font_size || ""}
        @input=${e => {
          this._config.font_size = e.target.value;
          this._emitChange();
        }}
      />
      <small>CSS font size value (e.g., <code>14px</code>, <code>1em</code>, <code>medium</code>). Leave empty for default.</small>

      <label>Row Height (e.g., 14px, 1.2em):</label>
      <input
        type="text"
        placeholder="e.g. 1.2em, 24px"
        .value=${this._config.height || ""}
        @input=${e => {
          this._config.height = e.target.value;
          this._emitChange();
        }}
      />
      <small>Controls the height of each line. Accepts absolute or unitless values (e.g. <code>20px</code>, <code>1.5em</code>).</small>
    </div>
  `;
}


  static get styles() {
    return css`
      .editor {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .line-item {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      input[type="text"] {
        flex: 1;
      }
      button {
        background: #ddd;
        border: none;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 2px;
      }
      button:hover {
        background: #ccc;
      }
      small {
        color: #666;
        font-size: 0.9em;
      }
      label {
        font-weight: bold;
        margin-top: 8px;
      }
    `;
  }
}

customElements.define("data-cascade-card-editor", DataCascadeCardEditor);