import { LitElement, html, css } from "https://unpkg.com/lit-element/lit-element.js?module";

class DataCascadeCardEditor extends LitElement {
  static get properties() {
    return {
      _config: { type: Object },
    };
  }

  setConfig(config) {
    // Ensure content is always an array of objects with text, justify, line, and center_position properties
    const processedContent = Array.isArray(config.content)
      ? config.content.map(item => {
          if (typeof item === 'string') {
            // Old format: just a string - convert to new format
            return { text: item, justify: 'flex-start', line: 1, center_position: 50 };
          } else if (typeof item === 'object' && item !== null) {
            // New format: object with text, justify, line, and center_position
            return {
              text: item.text || '',
              justify: item.justify || 'flex-start',
              line: item.line || 1,
              center_position: item.center_position || 50
            };
          }
          return { text: '', justify: 'flex-start', line: 1, center_position: 50 }; // Fallback for unexpected item type
        })
      : []; // Fallback to empty array if content is not an array

    this._config = {
      content: [], // Default to empty array
      ...config,
      content: processedContent
    };
  }

  // contentItems now returns an array of objects { text: string, justify: string, line: number, center_position: number }
  get contentItems() {
    return this._config.content || [];
  }

  // Get a preview of how items will be grouped by line
  get linePreview() {
    const lines = new Map();
    this.contentItems.forEach((item, index) => {
      const lineNumber = item.line || 1;
      if (!lines.has(lineNumber)) {
        lines.set(lineNumber, { start: [], center: [], end: [] });
      }
      const lineData = lines.get(lineNumber);
      const itemWithIndex = { ...item, originalIndex: index };

      switch (item.justify) {
        case 'flex-start':
          lineData.start.push(itemWithIndex);
          break;
        case 'center':
          lineData.center.push(itemWithIndex);
          break;
        case 'flex-end':
        case 'space-between':
        case 'space-around':
        case 'space-evenly':
          lineData.end.push(itemWithIndex);
          break;
        default:
          lineData.start.push(itemWithIndex);
      }
    });
    return lines;
  }

  // _valueChanged now takes the field name ('text', 'justify', 'line', or 'center_position')
  _valueChanged(index, field, e) {
    const newItems = [...this.contentItems];
    let value = e.target.value;
    
    // Convert line number and center_position to appropriate types
    if (field === 'line') {
      value = parseInt(value, 10) || 1;
    } else if (field === 'center_position') {
      value = parseFloat(value) || 50;
      // Clamp value between 0 and 100
      value = Math.max(0, Math.min(100, value));
    }
    
    newItems[index] = {
      ...newItems[index], // Copy existing item properties
      [field]: value // Update the specific field
    };
    this._config.content = newItems;
    this._emitChange();
  }

  _addItem() {
    // Add a new item object with default values
    this._config.content = [...this.contentItems, { 
      text: "", 
      justify: "flex-start", 
      line: 1,
      center_position: 50
    }];
    this._emitChange();
  }

  _removeItem(index) {
    const items = [...this.contentItems];
    items.splice(index, 1);
    this._config.content = items;
    this._emitChange();
  }

  _moveItem(index, direction) {
    const items = [...this.contentItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < items.length) {
      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      this._config.content = items;
      this._emitChange();
    }
  }

  _emitChange() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this._config) return html`<div></div>`;

    const justifyOptions = [
      { value: 'flex-start', label: 'Start (Left)' },
      { value: 'center', label: 'Center' },
      { value: 'flex-end', label: 'End (Right)' },
      { value: 'space-between', label: 'Space Between' },
      { value: 'space-around', label: 'Space Around' },
      { value: 'space-evenly', label: 'Space Evenly' }
    ];

    const linePreview = this.linePreview;
    const sortedLineNumbers = [...linePreview.keys()].sort((a, b) => a - b);

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

        <label>Content Items:</label>
        <small>Each item can be placed on any line with its own justification. Text field accepts templates, Line# specifies the line, Justification controls positioning. For center items, Position% controls horizontal placement (0-100%).</small>
        
        <div class="items-section">
          ${this.contentItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === this.contentItems.length - 1;
            
            return html`
              <div class="item-row">
                <div class="item-controls">
                  <button 
                    class="control-btn ${isFirst ? 'disabled' : ''}"
                    @click=${() => !isFirst && this._moveItem(index, 'up')}
                    title="Move up">↑</button>
                  <button 
                    class="control-btn ${isLast ? 'disabled' : ''}"
                    @click=${() => !isLast && this._moveItem(index, 'down')}
                    title="Move down">↓</button>
                  <button 
                    class="control-btn delete-btn"
                    @click=${() => this._removeItem(index)}
                    title="Remove item">✖</button>
                </div>
                
                <input
                  class="item-text"
                  type="text"
                  placeholder="Content (e.g. {{ states('sensor.temp') }})"
                  .value=${item.text || ""}
                  @input=${e => this._valueChanged(index, 'text', e)}
                />
                
                <input
                  class="item-line"
                  type="number"
                  min="1"
                  .value=${item.line || 1}
                  @input=${e => this._valueChanged(index, 'line', e)}
                  title="Line number"
                />
                
                <select
                  class="item-justify"
                  .value=${item.justify || 'flex-start'}
                  @change=${e => this._valueChanged(index, 'justify', e)}
                  title="Justification"
                >
                  ${justifyOptions.map(option => html`
                    <option value=${option.value} ?selected=${(item.justify || 'flex-start') === option.value}>${option.label}</option>
                  `)}
                </select>
                
                ${(item.justify === 'center') ? html`
                  <input
                    class="item-position"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    .value=${item.center_position || 50}
                    @input=${e => this._valueChanged(index, 'center_position', e)}
                    title="Center position percentage (0-100)"
                  />
                  <span class="position-label">%</span>
                ` : ''}
              </div>
            `;
          })}
        </div>
        
        <button class="add-btn" @click=${this._addItem}>➕ Add New Item</button>

        ${sortedLineNumbers.length > 0 ? html`
          <div class="preview-section">
            <label>Line Preview:</label>
            <small>Shows how items will be arranged on each line</small>
            ${sortedLineNumbers.map(lineNumber => {
              const lineData = linePreview.get(lineNumber);
              return html`
                <div class="line-preview">
                  <div class="line-number">Line ${lineNumber}:</div>
                  <div class="line-layout">
                    <div class="justify-preview start">
                      ${lineData.start.map(item => html`<span class="item-preview">${item.text || '(empty)'}</span>`)}
                    </div>
                    <div class="justify-preview center">
                      ${lineData.center.map(item => html`<span class="item-preview center-item" style="position: relative;">${item.text || '(empty)'}<span class="position-indicator">${item.center_position || 50}%</span></span>`)}
                    </div>
                    <div class="justify-preview end">
                      ${lineData.end.map(item => html`<span class="item-preview">${item.text || '(empty)'}</span>`)}
                    </div>
                  </div>
                </div>
              `;
            })}
          </div>
        ` : ''}

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
        gap: 12px;
      }

      .items-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .item-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 4px);
        background: var(--secondary-background-color, var(--card-background-color));
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .item-controls {
        display: flex;
        gap: 2px;
      }

      .control-btn {
        width: 28px;
        height: 28px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        border-radius: var(--ha-card-border-radius, 4px);
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .control-btn:hover:not(.disabled) {
        background: var(--secondary-background-color, #f0f0f0);
      }

      .control-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }

      .delete-btn {
        color: var(--error-color, #db4437);
      }

      .delete-btn:hover:not(.disabled) {
        background: var(--error-color, #db4437);
        color: white;
      }

      .item-text {
        flex: 1;
        min-width: 200px;
      }

      .item-line {
        width: 60px;
        text-align: center;
      }

      .item-justify {
        min-width: 120px;
      }

      .item-position {
        width: 60px;
        text-align: center;
      }

      .position-label {
        color: var(--secondary-text-color);
        font-size: 0.9em;
        min-width: 15px;
      }

      input[type="text"], input[type="number"] {
        padding: 6px 8px;
        border: 1px solid var(--input-outlined-idle-border-color, var(--primary-color));
        border-radius: var(--ha-card-border-radius, 4px);
        font-size: 0.9em;
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }

      input[type="text"]:focus, input[type="number"]:focus {
        border-color: var(--primary-color);
        outline: none;
        box-shadow: 0 0 0 1px var(--primary-color);
      }

      select {
        padding: 6px 8px;
        border: 1px solid var(--input-outlined-idle-border-color, var(--primary-color));
        border-radius: var(--ha-card-border-radius, 4px);
        font-size: 0.9em;
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }

      select:focus {
        border-color: var(--primary-color);
        outline: none;
        box-shadow: 0 0 0 1px var(--primary-color);
      }

      .add-btn {
        background: var(--primary-color);
        color: var(--text-primary-color, white);
        border: none;
        cursor: pointer;
        padding: 8px 16px;
        border-radius: var(--ha-card-border-radius, 4px);
        font-size: 0.9em;
        align-self: flex-start;
      }

      .add-btn:hover {
        opacity: 0.9;
      }

      .preview-section {
        border-top: 1px solid var(--divider-color);
        padding-top: 12px;
        margin-top: 8px;
      }

      .line-preview {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 4px);
        margin-bottom: 6px;
        background: var(--card-background-color);
      }

      .line-number {
        font-weight: 500;
        min-width: 60px;
        color: var(--secondary-text-color);
        font-size: 0.9em;
      }

      .line-layout {
        flex: 1;
        display: flex;
        align-items: center;
        min-height: 24px;
      }

      .justify-preview {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .justify-preview.start {
        margin-right: auto;
      }

      .justify-preview.center {
        margin-left: auto;
        margin-right: auto;
      }

      .justify-preview.end {
        margin-left: auto;
      }

      .item-preview {
        background: var(--primary-color);
        color: var(--text-primary-color);
        padding: 2px 6px;
        border-radius: var(--ha-card-border-radius, 3px);
        font-size: 0.8em;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0.8;
      }

      .item-preview.center-item {
        position: relative;
      }

      .position-indicator {
        position: absolute;
        top: -12px;
        right: -8px;
        background: var(--orange-color, #ff8800);
        color: white;
        padding: 1px 3px;
        border-radius: 2px;
        font-size: 0.7em;
        line-height: 1;
        white-space: nowrap;
      }

      small {
        color: var(--secondary-text-color);
        font-size: 0.85em;
        line-height: 1.3;
      }

      label {
        font-weight: bold;
        margin-top: 4px;
        margin-bottom: 4px;
        color: var(--primary-text-color);
      }

      code {
        background: var(--code-background-color, var(--divider-color));
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 0.9em;
      }
    `;
  }
}

customElements.define("data-cascade-card-editor", DataCascadeCardEditor);