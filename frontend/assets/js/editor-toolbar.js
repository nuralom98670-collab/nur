// Plain (non-module) toolbar helpers for Blog editor pages.
// Ensures formatting buttons (H1/H2/Link/etc.) work even when ES modules
// are blocked (e.g. opening admin HTML via file://).
//
// Enhances pages that contain textarea#bodyInput.

(function () {
  function getBodyInput() {
    return document.getElementById('bodyInput') || (document.forms?.postForm ? document.forms.postForm.body : null);
  }

  function insertAtCursor(textarea, text) {
    if (!textarea) return;
    const start = (typeof textarea.selectionStart === 'number') ? textarea.selectionStart : textarea.value.length;
    const end = (typeof textarea.selectionEnd === 'number') ? textarea.selectionEnd : textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = before + text + after;
    const pos = start + text.length;
    try { textarea.setSelectionRange(pos, pos); } catch {}
    textarea.focus();
  }

  function wrapSelection(textarea, before, after, placeholder) {
    if (!textarea) return;
    const start = (typeof textarea.selectionStart === 'number') ? textarea.selectionStart : 0;
    const end = (typeof textarea.selectionEnd === 'number') ? textarea.selectionEnd : 0;
    const selected = textarea.value.slice(start, end) || placeholder || 'Text';
    const out = `${before}${selected}${after}`;
    if (typeof textarea.setRangeText === 'function') {
      textarea.setRangeText(out, start, end, 'end');
    } else {
      textarea.value = textarea.value.slice(0, start) + out + textarea.value.slice(end);
    }
    textarea.focus();
  }

  function videoEmbedFromUrl(url) {
    const u = String(url || '').trim();
    if (!u) return null;

    // YouTube
    const ytId = (() => {
      const m1 = u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
      if (m1) return m1[1];
      const m2 = u.match(/v=([A-Za-z0-9_-]{6,})/);
      if (m2) return m2[1];
      const m3 = u.match(/embed\/([A-Za-z0-9_-]{6,})/);
      if (m3) return m3[1];
      return null;
    })();
    if (ytId) {
      return `\n<div class="video-embed"><iframe src="https://www.youtube.com/embed/${ytId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n`;
    }

    // Vimeo
    const vm = u.match(/vimeo\.com\/(\d{6,})/);
    if (vm) {
      return `\n<div class="video-embed"><iframe src="https://player.vimeo.com/video/${vm[1]}" title="Vimeo video" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>\n`;
    }

    // Facebook video (best-effort)
    if (u.includes('facebook.com') && u.includes('/videos/')) {
      const enc = encodeURIComponent(u);
      return `\n<div class="video-embed"><iframe src="https://www.facebook.com/plugins/video.php?href=${enc}&show_text=0&width=560" title="Facebook video" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>\n`;
    }

    // If already an iframe snippet
    if (u.includes('<iframe') && u.includes('</iframe>')) {
      return `\n<div class="video-embed">${u}</div>\n`;
    }

    return null;
  }

  // Delegate clicks so it works even if buttons are injected later.
  document.addEventListener('click', function (ev) {
    const btn = ev.target?.closest?.('button');
    if (!btn) return;
    const bodyInput = getBodyInput();
    if (!bodyInput) return;

    // Headings
    if (btn.hasAttribute('data-h')) {
      ev.preventDefault();
      const h = btn.getAttribute('data-h');
      wrapSelection(bodyInput, `<h${h}>`, `</h${h}>`, 'Heading');
      return;
    }

    // Wrap tags
    if (btn.hasAttribute('data-wrap')) {
      ev.preventDefault();
      const before = btn.getAttribute('data-wrap') || '';
      const tag = (before.match(/^<([a-zA-Z0-9]+)/) || [])[1] || 'b';
      wrapSelection(bodyInput, before, `</${tag}>`, 'Text');
      return;
    }

    // Insert raw html
    if (btn.hasAttribute('data-insert')) {
      ev.preventDefault();
      const html = btn.getAttribute('data-insert') || '';
      insertAtCursor(bodyInput, `\n${html}\n`);
      return;
    }

    // Lists
    if (btn.hasAttribute('data-list')) {
      ev.preventDefault();
      const t = btn.getAttribute('data-list');
      const start = (typeof bodyInput.selectionStart === 'number') ? bodyInput.selectionStart : 0;
      const end = (typeof bodyInput.selectionEnd === 'number') ? bodyInput.selectionEnd : 0;
      const sel = bodyInput.value.slice(start, end).trim();
      const items = sel ? sel.split(/\n+/).map(s => s.trim()).filter(Boolean) : ['Item 1', 'Item 2'];
      const html = `<${t}>\n` + items.map(i => `  <li>${i}</li>`).join('\n') + `\n</${t}>`;
      if (typeof bodyInput.setRangeText === 'function') {
        bodyInput.setRangeText(html, start, end, 'end');
      } else {
        bodyInput.value = bodyInput.value.slice(0, start) + html + bodyInput.value.slice(end);
      }
      bodyInput.focus();
      return;
    }

    // Link
    if (btn.hasAttribute('data-link')) {
      ev.preventDefault();
      const url = prompt('Link URL (https://...)');
      if (!url) return;
      wrapSelection(bodyInput, `<a href="${url}" target="_blank" rel="noopener">`, `</a>`, 'Link text');
      return;
    }

    // Video
    if (btn.id === 'insertVideoBtn') {
      ev.preventDefault();
      const input = document.getElementById('videoUrl');
      const url = (input?.value || '').trim() || prompt('Paste video URL (YouTube/Facebook/Vimeo)', '');
      if (!url) return;
      const html = videoEmbedFromUrl(url);
      if (!html) {
        alert('Unsupported video link. Please paste a YouTube/Facebook/Vimeo URL.');
        return;
      }
      if (input) input.value = url;
      insertAtCursor(bodyInput, html);
    }
  });
})();
