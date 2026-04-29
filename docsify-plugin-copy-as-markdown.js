/**
 * docsify-copy-markdown
 * Adds a copy button to each heading that copies that section's raw Markdown
 * to the clipboard — useful for pasting into AI chats.
 *
 * @version 1.0.0
 * @license MIT
 */
(function () {
  'use strict';


  // ── Icons ──────────────────────────────────────────────────────────────────


  const ICON_COPY  = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const ICON_OK    = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const ICON_ERROR = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';


  // ── Markdown section parser ────────────────────────────────────────────────


  /**
   * Strips fenced code blocks from markdown so that headings inside them
   * are not mistakenly treated as section delimiters.
   */
  function stripCodeBlocks(markdown) {
    // Line-by-line parser avoids regex backtracking: a greedy `{3,} capture
    // can re-try with fewer backticks when no closer is found, violating the
    // CommonMark rule that the closing fence needs >= opener backtick count.
    const lines  = markdown.split('\n');
    let fenceLen = 0; // 0 = outside a code block


    for (let i = 0; i < lines.length; i++) {
      if (fenceLen === 0) {
        const m = lines[i].match(/^(`{3,})/);
        if (m) {
          fenceLen  = m[1].length;
          lines[i]  = lines[i].replace(/\S/g, ' ');
        }
      } else {
        const m = lines[i].match(/^(`+)[ \t]*$/);
        if (m && m[1].length >= fenceLen) fenceLen = 0;
        lines[i] = lines[i].replace(/\S/g, ' ');
      }
    }


    return lines.join('\n');
  }


  /**
   * Parses a markdown string into an array of sections.
   * Each section = { level, text, markdown }
   * A section includes its heading plus all content down to (but not including)
   * the next heading at the same level or higher (lower level number).
   */
  function parseMarkdownSections(markdown) {
    const stripped     = stripCodeBlocks(markdown);
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let   match;
    const headings     = [];


    while ((match = headingRegex.exec(stripped)) !== null) {
      headings.push({
        level: match[1].length,
        text:  match[2].trim(),
        index: match.index
      });
    }


    const sections = [];
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      let endIndex = markdown.length;


      for (let j = i + 1; j < headings.length; j++) {
        if (headings[j].level <= h.level) {
          endIndex = headings[j].index;
          break;
        }
      }


      sections.push({
        level:    h.level,
        text:     h.text,
        markdown: markdown.slice(h.index, endIndex).replace(/\s+$/, '')
      });
    }


    return sections;
  }


  // ── Text normalization for heading matching ────────────────────────────────


  function normalise(text) {
    return text
        .replace(/!\[(.+?)]\([^)]*\)/g, '$1') // images: keep alt text
        .replace(/\[(.+?)]\([^)]*\)/g, '$1')  // links: keep link text, drop URL
        .replace(/[`*_~[\]]/g, '')            // remaining inline markers
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }


  // ── Copy helpers ───────────────────────────────────────────────────────────


  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for older browsers / non-HTTPS
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    let succeeded = false;
    try {
      ta.focus();
      ta.select();
      succeeded = document.execCommand('copy'); // eslint-disable-line -- no alternative in non-HTTPS/legacy contexts
    } catch (_) {}
    finally { document.body.removeChild(ta); }
    return succeeded ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }


  function flash(btn, icon, cssClass, duration) {
    if (btn._flashTimer) clearTimeout(btn._flashTimer);
    btn.innerHTML = icon;
    btn.classList.add(cssClass);
    btn._flashTimer = setTimeout(function () {
      btn._flashTimer = null;
      btn.innerHTML = ICON_COPY;
      btn.classList.remove(cssClass);
    }, duration);
  }


  const flashOk    = function (btn, d) { flash(btn, ICON_OK,    'copy-md-ok',    d); };
  const flashError = function (btn, d) { flash(btn, ICON_ERROR, 'copy-md-error', d); };


  // ── DOM injection ──────────────────────────────────────────────────────────


  function buildSectionMap(sections) {
    // Map keyed by "level:normalisedText" → ordered array of Markdown strings.
    // Using an array handles duplicate headings at the same level: the Nth DOM
    // heading with a given key maps to the Nth entry in the array.
    const map = Object.create(null);
    for (let i = 0; i < sections.length; i++) {
      const s   = sections[i];
      const key = s.level + ':' + normalise(s.text);
      if (!map[key]) map[key] = [];
      map[key].push(s.markdown);
    }
    return map;
  }


  function injectButtons(sections, config) {
    const container = document.querySelector('.markdown-section');
    if (!container) return;


    const sectionMap = buildSectionMap(sections);
    // Track how many times each key has been consumed as we walk the DOM in order.
    const seenCount  = Object.create(null);
    const headingEls = container.querySelectorAll('h1,h2,h3,h4,h5,h6');


    headingEls.forEach(function (el) {
      // Skip if button already added (e.g., partial re-renders)
      if (el.querySelector('.copy-md-btn')) return;


      const level   = parseInt(el.tagName[1], 10);
      const key     = level + ':' + normalise(el.textContent);
      const entries = sectionMap[key];
      if (!entries) return;


      const idx = seenCount[key] || 0;
      const md  = entries[idx];
      seenCount[key] = idx + 1;
      if (!md) return;


      const btn = document.createElement('button');
      btn.className = 'copy-md-btn';
      btn.title     = config.buttonLabel;
      btn.setAttribute('aria-label', config.buttonLabel);
      btn.innerHTML = ICON_COPY;


      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        copyToClipboard(md)
          .then(function () { flashOk(btn, config.flashDuration); })
          .catch(function () { flashError(btn, config.flashDuration); });
      });


      el.appendChild(btn);
    });
  }


  // ── Styles ─────────────────────────────────────────────────────────────────


  function injectStyles() {
    if (document.getElementById('copy-md-styles')) return;
    const style = document.createElement('style');
    style.id = 'copy-md-styles';
    style.textContent = [
      '.markdown-section h1,.markdown-section h2,.markdown-section h3,',
      '.markdown-section h4,.markdown-section h5,.markdown-section h6{position:relative}',

      '.copy-md-btn{',
        'display:inline-flex;align-items:center;justify-content:center;',
        'margin-left:0.45em;padding:3px 5px;',
        'background:transparent;border:1px solid transparent;border-radius:5px;',
        'cursor:pointer;color:light-dark(#888,#777);vertical-align:middle;',
        'opacity:0;line-height:1;',
        'transition:opacity 0.15s,color 0.15s,background 0.15s,border-color 0.15s}',

      '.markdown-section h1:hover .copy-md-btn,.markdown-section h2:hover .copy-md-btn,',
      '.markdown-section h3:hover .copy-md-btn,.markdown-section h4:hover .copy-md-btn,',
      '.markdown-section h5:hover .copy-md-btn,.markdown-section h6:hover .copy-md-btn,',
      '.copy-md-btn:focus{opacity:1}',

      '.copy-md-btn:hover{',
        'color:light-dark(#434ce4,#6382fd);',
        'background:light-dark(rgba(67,76,228,0.08),rgba(99,130,253,0.1));',
        'border-color:light-dark(rgba(67,76,228,0.25),rgba(99,130,253,0.25))}',

      '.copy-md-btn.copy-md-ok{opacity:1;color:light-dark(#1a9e5c,#4ade80);border-color:transparent}',
      '.copy-md-btn.copy-md-error{opacity:1;color:light-dark(#d32f2f,#f87171);border-color:transparent}',
    ].join('');
    document.head.appendChild(style);
  }


  // ── Plugin install ─────────────────────────────────────────────────────────


  /** @param {{ beforeEach: Function, doneEach: Function }} hook */
  function install(hook) {
    injectStyles();

    const userConfig = (window.$docsify && window.$docsify.copyMarkdown) || {};
    const config = {
      buttonLabel:   userConfig.buttonLabel   || 'Copy section as Markdown',
      flashDuration: userConfig.flashDuration != null ? userConfig.flashDuration : 1500,
    };

    // Queue instead of a shared variable: each beforeEach enqueues the raw
    // markdown for its page; doneEach dequeues the matching entry in FIFO order,
    // avoiding a race condition when rapid navigation causes beforeEach(B) to
    // overwrite the variable before doneEach(A) has consumed it.
    const queue = [];


    hook.beforeEach(function (content) {
      queue.push(content);
      return content;
    });


    hook.doneEach(function () {
      const markdown = queue.shift();
      if (markdown !== undefined) {
        injectButtons(parseMarkdownSections(markdown), config);
      }
    });
  }


  window.$docsify          = window.$docsify          || {};
  window.$docsify.plugins  = (window.$docsify.plugins || []).concat(install);
})();