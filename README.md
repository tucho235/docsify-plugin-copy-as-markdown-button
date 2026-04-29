# docsify-plugin-copy-as-markdown-button

![version](https://img.shields.io/badge/version-1.0.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)

A [Docsify](https://docsify.js.org) plugin that adds a **Copy as Markdown** button to every heading. Clicking it copies that section's raw Markdown to the clipboard — ideal for pasting into AI chats, where Markdown is understood far better than plain text or HTML.

## Features

- Appears on hover next to every `h1`–`h6` heading
- Copies the heading and all its content as raw Markdown
- Nested sections are included (content stops at the next heading of equal or higher level)
- Headings inside fenced code blocks are correctly ignored
- Light/dark mode aware via `light-dark()`
- Visual feedback: checkmark on success, × on failure
- Styles injected automatically — no separate CSS file needed
- No dependencies, single file

## Installation

### Via CDN

Add the script after the Docsify script tag in your `index.html`:

```html
<!-- minified (recommended) -->
<script src="//cdn.jsdelivr.net/gh/tucho235/docsify-plugin-copy-as-markdown-button@1.0.0/docsify-plugin-copy-as-markdown.min.js"></script>

<!-- unminified -->
<script src="//cdn.jsdelivr.net/gh/tucho235/docsify-plugin-copy-as-markdown-button@1.0.0/docsify-plugin-copy-as-markdown.js"></script>
```

### Manual

Download `docsify-plugin-copy-as-markdown.js` and place it in your project:

```html
<script src="docsify-plugin-copy-as-markdown.js"></script>
```

No configuration needed. The plugin registers itself automatically.

## Usage

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Docs</title>
  <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify/themes/vue.css">
</head>
<body>
  <div id="app"></div>
  <script>
    window.$docsify = { name: 'My Docs' };
  </script>
  <script src="//cdn.jsdelivr.net/npm/docsify/lib/docsify.min.js"></script>
  <!-- Copy as Markdown plugin -->
  <script src="//cdn.jsdelivr.net/gh/tucho235/docsify-plugin-copy-as-markdown-button@1.0.0/docsify-plugin-copy-as-markdown.js"></script>
</body>
</html>
```

## How sections work

Each button copies the heading it belongs to plus everything that follows it, up to (but not including) the next heading at the same level or higher. For example:

```markdown
## Installation        ← button copies from here…

Some text.

### Step 1             ← …down to here (level 2 ends when next level 2 starts)
### Step 2

## Usage               ← next level-2 heading, not included in "Installation"
```

Clicking the button on **Installation** copies:

```markdown
## Installation

Some text.

### Step 1
### Step 2
```

## Configuration

Pass options via `window.$docsify.copyMarkdown` before loading the plugin:

```js
window.$docsify = {
  copyMarkdown: {
    buttonLabel:   'Copy section as Markdown', // button tooltip and aria-label
    flashDuration: 1500,                        // feedback duration in ms
  }
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `buttonLabel` | `string` | `'Copy section as Markdown'` | Button tooltip and `aria-label` |
| `flashDuration` | `number` | `1500` | How long (ms) the success/error icon stays visible |

## Customization

The plugin injects its own styles, which you can override in your site's CSS. All relevant selectors:

```css
/* Button base */
.copy-md-btn { }

/* Hover state on the button itself */
.copy-md-btn:hover { }

/* Success feedback (shown for 2 s after a successful copy) */
.copy-md-btn.copy-md-ok { }

/* Error feedback */
.copy-md-btn.copy-md-error { }
```

## Browser support

Uses `navigator.clipboard.writeText` with a `document.execCommand('copy')` fallback for older browsers and non-HTTPS environments.

## License

MIT
