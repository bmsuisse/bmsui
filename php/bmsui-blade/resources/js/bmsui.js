/* BMS UI: behaviour for the Blade components. Delegated, so it also works for HTML added later. */
(function () {
  'use strict';

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function closePops(except) {
    document.querySelectorAll('.bmsui-confirm__pop:not([hidden])').forEach(function (pop) {
      if (pop === except) { return; }
      pop.hidden = true;
      var trigger = pop.parentNode.querySelector('[data-bmsui-confirm-trigger]');
      if (trigger) { trigger.setAttribute('aria-expanded', 'false'); }
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;

    // Copy button.
    var copy = t.closest && t.closest('[data-bmsui-copy]');
    if (copy) {
      var label = copy.querySelector('.bmsui-copy__label');
      var ok = copy.getAttribute('data-copied-label') || 'Copied';
      var fail = copy.getAttribute('data-failed-label') || 'Copy failed';
      var idle = copy.getAttribute('data-label') || '';
      copyText(copy.getAttribute('data-bmsui-copy')).then(function () {
        copy.classList.add('is-copied');
        if (label) { label.textContent = ok; }
        copy.setAttribute('aria-label', ok);
      }, function () {
        copy.classList.add('is-failed');
        if (label) { label.textContent = fail; }
        copy.setAttribute('aria-label', fail);
      });
      setTimeout(function () {
        copy.classList.remove('is-copied', 'is-failed');
        if (label) { label.textContent = idle; }
        copy.setAttribute('aria-label', idle || copy.getAttribute('data-aria') || '');
      }, 2000);
      return;
    }

    // Confirm popover: open / cancel / confirm.
    var trigger = t.closest && t.closest('[data-bmsui-confirm-trigger]');
    if (trigger) {
      var pop = trigger.parentNode.querySelector('.bmsui-confirm__pop');
      var open = pop.hidden;
      closePops(open ? pop : null);
      pop.hidden = !open;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        // Keep the popover on screen: align to the trigger's right edge when it would overflow.
        pop.classList.remove('bmsui-confirm__pop--end');
        if (pop.getBoundingClientRect().right > window.innerWidth - 8) {
          pop.classList.add('bmsui-confirm__pop--end');
        }
        var first = pop.querySelector('[data-bmsui-confirm-cancel]');
        if (first) { first.focus(); }
      }
      return;
    }
    var cancel = t.closest && t.closest('[data-bmsui-confirm-cancel]');
    if (cancel) {
      var p = cancel.closest('.bmsui-confirm__pop');
      p.hidden = true;
      var tr = p.parentNode.querySelector('[data-bmsui-confirm-trigger]');
      tr.setAttribute('aria-expanded', 'false');
      tr.focus();
      return;
    }
    var yes = t.closest && t.closest('[data-bmsui-confirm-yes]');
    if (yes && !yes.closest('form')) {
      var root = yes.closest('.bmsui-confirm');
      root.dispatchEvent(new CustomEvent('bmsui:confirm', { bubbles: true }));
      root.querySelector('.bmsui-confirm__pop').hidden = true;
      return;
    }

    // Banner / chip dismiss.
    var x = t.closest && t.closest('[data-bmsui-dismiss]');
    if (x) {
      var target = x.closest('.bmsui-banner, .bmsui-chip');
      if (target) {
        target.dispatchEvent(new CustomEvent('bmsui:dismiss', { bubbles: true }));
        target.parentNode.removeChild(target);
      }
      return;
    }

    if (!(t.closest && t.closest('.bmsui-confirm'))) { closePops(null); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelector('.bmsui-confirm__pop:not([hidden])');
      if (open) {
        var tr = open.parentNode.querySelector('[data-bmsui-confirm-trigger]');
        closePops(null);
        if (tr) { tr.focus(); }
      }
    }
  });
})();
