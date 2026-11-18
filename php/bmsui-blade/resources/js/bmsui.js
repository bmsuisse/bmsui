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

  /* ---- Email address input ---- */
  var EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

  function emailChips(root) { return root.querySelectorAll('.bmsui-chip[data-email]'); }

  function emailSync(root, silent) {
    var chips = emailChips(root);
    var list = [];
    var bad = false;
    chips.forEach(function (c) {
      list.push(c.getAttribute('data-email'));
      if (c.getAttribute('aria-invalid') === 'true') { bad = true; }
    });
    var hidden = root.querySelector('[data-bmsui-emails-value]');
    if (hidden) { hidden.value = list.join(','); }
    var input = root.querySelector('.bmsui-emails__input');
    var msg = root.querySelector('.bmsui-emails__msg');
    root.classList.toggle('is-invalid', bad);
    if (input) { if (bad) { input.setAttribute('aria-invalid', 'true'); } else { input.removeAttribute('aria-invalid'); } }
    if (msg) { msg.textContent = bad ? root.getAttribute('data-invalid-msg') : ''; }
    if (!silent) { root.dispatchEvent(new CustomEvent('bmsui:change', { bubbles: true, detail: { value: list } })); }
  }

  function emailAdd(root, text) {
    var input = root.querySelector('.bmsui-emails__input');
    var max = parseInt(root.getAttribute('data-max'), 10) || 0;
    var parts = text.replace(/[^,;<>]*<([^<>]*)>/g, ' $1 ').split(/[,;\s]+/);
    var changed = false;
    var msg = root.querySelector('.bmsui-emails__msg');
    parts.forEach(function (raw) {
      var addr = raw.replace(/^["']+|["']+$/g, '');
      if (!addr) { return; }
      var key = addr.toLowerCase();
      var dup = false;
      var count = 0;
      emailChips(root).forEach(function (c) { count++; if (c.getAttribute('data-email').toLowerCase() === key) { dup = true; } });
      if (dup) { return; }
      if (max && count >= max) { if (msg) { msg.textContent = root.getAttribute('data-max-msg'); } return; }
      var bad = !EMAIL_RE.test(addr);
      var chip = document.createElement('span');
      chip.className = 'bmsui-chip' + (bad ? ' bmsui-chip--danger' : '');
      chip.setAttribute('data-email', addr);
      if (bad) { chip.setAttribute('aria-invalid', 'true'); }
      var label = document.createElement('span');
      label.className = 'bmsui-chip__text';
      label.textContent = addr;
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'bmsui-chip__x';
      x.setAttribute('data-bmsui-email-remove', '');
      x.setAttribute('aria-label', (root.getAttribute('data-remove') || 'Remove') + ': ' + addr);
      x.innerHTML = '&times;';
      chip.appendChild(label);
      chip.appendChild(x);
      input.parentNode.insertBefore(chip, input);
      changed = true;
    });
    input.value = '';
    if (changed) { emailSync(root); }
  }

  function emailRoot(el) { return el.closest && el.closest('[data-bmsui-emails]'); }

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('bmsui-emails__input')) { return; }
    var root = emailRoot(t);
    var has = t.value.trim() !== '';
    if (has && (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ')) {
      e.preventDefault();
      emailAdd(root, t.value);
    } else if (has && e.key === 'Tab') {
      emailAdd(root, t.value);
    } else if (!has && e.key === 'Backspace') {
      var chips = emailChips(root);
      if (chips.length) {
        chips[chips.length - 1].parentNode.removeChild(chips[chips.length - 1]);
        emailSync(root);
      }
    }
  });
  document.addEventListener('focusout', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('bmsui-emails__input') && t.value.trim()) { emailAdd(emailRoot(t), t.value); }
  });
  document.addEventListener('paste', function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('bmsui-emails__input')) { return; }
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text) { return; }
    e.preventDefault();
    emailAdd(emailRoot(t), t.value + ' ' + text);
  });
  document.addEventListener('input', function (e) {
    // Picking an entry of the native suggestion list.
    var t = e.target;
    if (t.classList && t.classList.contains('bmsui-emails__input') && e.inputType === 'insertReplacementText') { emailAdd(emailRoot(t), t.value); }
  });

  /* ---- Split button ---- */
  function closeSplits(except) {
    document.querySelectorAll('.bmsui-split__menu:not([hidden])').forEach(function (menu) {
      if (menu === except) { return; }
      menu.hidden = true;
      var tg = menu.parentNode.querySelector('[data-bmsui-split-toggle]');
      if (tg) { tg.setAttribute('aria-expanded', 'false'); }
    });
  }

  function splitItems(menu) { return menu.querySelectorAll('[role="menuitem"]:not([disabled])'); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var tog = t.closest && t.closest('[data-bmsui-split-toggle]');
    if (tog) {
      var menu = tog.parentNode.querySelector('.bmsui-split__menu');
      var open = menu.hidden;
      closeSplits(open ? menu : null);
      menu.hidden = !open;
      tog.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        // Keep the menu on screen: flip sideways / upwards when it would overflow.
        menu.classList.remove('bmsui-split__menu--flip', 'bmsui-split__menu--up');
        var r = menu.getBoundingClientRect();
        if (r.left < 8 || r.right > window.innerWidth - 8) { menu.classList.add('bmsui-split__menu--flip'); }
        if (r.bottom > window.innerHeight - 8 && tog.getBoundingClientRect().top > r.height + 16) { menu.classList.add('bmsui-split__menu--up'); }
        var first = splitItems(menu)[0];
        if (first) { first.focus(); }
      }
      return;
    }
    var item = t.closest && t.closest('[data-bmsui-split-item]');
    if (item) {
      var root = item.closest('.bmsui-split');
      root.dispatchEvent(new CustomEvent('bmsui:select', { bubbles: true, detail: { id: item.getAttribute('data-bmsui-split-item') } }));
      closeSplits(null);
      root.querySelector('[data-bmsui-split-toggle]').focus();
      return;
    }
    if (!(t.closest && t.closest('.bmsui-split'))) { closeSplits(null); }
  });

  document.addEventListener('keydown', function (e) {
    var menu = e.target.closest && e.target.closest('.bmsui-split');
    if (!menu) { return; }
    var m = menu.querySelector('.bmsui-split__menu');
    if (e.key === 'Escape' && !m.hidden) {
      closeSplits(null);
      menu.querySelector('[data-bmsui-split-toggle]').focus();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !m.hidden) {
      e.preventDefault();
      var items = Array.prototype.slice.call(splitItems(m));
      var i = items.indexOf(document.activeElement);
      i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      if (items[i]) { items[i].focus(); }
    }
  });

  document.addEventListener('click', function (e) {
    var t = e.target;

    // Quoted text toggle.
    var q = t.closest && t.closest('[data-bmsui-quote]');
    if (q) {
      var body = document.getElementById(q.getAttribute('aria-controls'));
      var show = body.hidden;
      body.hidden = !show;
      q.setAttribute('aria-expanded', show ? 'true' : 'false');
      var lab = q.getAttribute(show ? 'data-hide' : 'data-show');
      if (lab) { q.setAttribute('aria-label', lab); q.title = lab; }
      q.parentNode.classList.toggle('is-open', show);
      return;
    }

    // Email chip remove.
    var rm = t.closest && t.closest('[data-bmsui-email-remove]');
    if (rm) {
      var er = emailRoot(rm);
      rm.parentNode.parentNode.removeChild(rm.parentNode);
      emailSync(er);
      var inp = er.querySelector('.bmsui-emails__input');
      if (inp) { inp.focus(); }
      return;
    }
    var fld = t.closest && t.closest('.bmsui-emails__field');
    if (fld && !(t.closest('button, input'))) {
      var fi = fld.querySelector('.bmsui-emails__input');
      if (fi) { fi.focus(); }
    }
  });

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
  /* ---- Conversation list: select all, sort, star ---- */
  function convList(el) { return el.closest('.bmsui-convs-wrap, table.bmsui-convs') || el.closest('.bmsui-convs'); }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-bmsui-select-all')) {
      var list = convList(t);
      if (list) {
        list.querySelectorAll('.bmsui-conv__check').forEach(function (c) {
          if (c.disabled || c.checked === t.checked) { return; }
          c.checked = t.checked;
          var row = c.closest('.bmsui-conv');
          if (row) { row.classList.toggle('is-selected', t.checked); }
        });
      }
      t.dispatchEvent(new CustomEvent('bmsui:select-all', { bubbles: true, detail: { checked: t.checked } }));
      return;
    }
    if (t.classList && t.classList.contains('bmsui-conv__check')) {
      var r = t.closest('.bmsui-conv');
      if (r) { r.classList.toggle('is-selected', t.checked); }
      var l = convList(t);
      var all = l && l.querySelector('[data-bmsui-select-all]');
      if (all) {
        var boxes = Array.prototype.slice.call(l.querySelectorAll('.bmsui-conv__check'));
        var on = boxes.filter(function (b) { return b.checked; }).length;
        all.checked = boxes.length > 0 && on === boxes.length;
        all.indeterminate = on > 0 && on < boxes.length;
      }
    }
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    var sort = t.closest && t.closest('[data-bmsui-sort]');
    if (sort) {
      var dir = sort.getAttribute('data-dir') === 'asc' ? 'desc' : 'asc';
      sort.dispatchEvent(new CustomEvent('bmsui:sort', { bubbles: true, detail: { key: sort.getAttribute('data-bmsui-sort'), dir: dir } }));
      return;
    }
    var star = t.closest && t.closest('[data-bmsui-star]');
    if (star) {
      e.preventDefault();
      var on = star.getAttribute('aria-pressed') !== 'true';
      var setStar = function (v) {
        star.setAttribute('aria-pressed', v ? 'true' : 'false');
        star.classList.toggle('is-on', v);
        var row = star.closest('.bmsui-conv');
        if (row) { row.classList.toggle('is-starred', v); }
      };
      setStar(on);
      var ok = star.dispatchEvent(new CustomEvent('bmsui:star', { bubbles: true, cancelable: true, detail: { starred: on } }));
      if (!ok) { setStar(!on); }
    }
  });

  /* ---- Dropdown menu (also the per-message "…" menu) ---- */
  function menuItems(menu) {
    return Array.prototype.filter.call(menu.children, function () { return true; }).reduce(function (acc, el) {
      if (el.matches('[role="menuitem"]')) { acc.push(el); }
      else if (el.classList.contains('bmsui-menu__sub')) { acc.push(el.querySelector(':scope > [role="menuitem"]')); }
      return acc;
    }, []).filter(function (el) { return el && !el.disabled && el.getAttribute('aria-disabled') !== 'true'; });
  }

  function placeMenu(menu, anchor) {
    menu.classList.remove('is-flip', 'is-up');
    var r = menu.getBoundingClientRect();
    if (r.left < 8 || r.right > window.innerWidth - 8) { menu.classList.add('is-flip'); }
    if (!menu.classList.contains('bmsui-menu--sub') && r.bottom > window.innerHeight - 8 && anchor.getBoundingClientRect().top > r.height + 16) { menu.classList.add('is-up'); }
  }

  function closeSub(menu) {
    menu.querySelectorAll('.bmsui-menu--sub:not([hidden])').forEach(function (m) {
      m.hidden = true;
      var b = m.parentNode.querySelector(':scope > [data-bmsui-submenu]');
      if (b) { b.setAttribute('aria-expanded', 'false'); }
    });
  }

  function closeMenus(except) {
    document.querySelectorAll('[data-bmsui-dropdown] > .bmsui-menu:not([hidden])').forEach(function (menu) {
      if (menu === except) { return; }
      closeSub(menu);
      menu.hidden = true;
      var tg = menu.parentNode.querySelector(':scope > [data-bmsui-menu-toggle]');
      if (tg) { tg.setAttribute('aria-expanded', 'false'); }
    });
  }

  function openSub(btn, focusFirst) {
    var sub = btn.parentNode.querySelector(':scope > .bmsui-menu--sub');
    closeSub(btn.closest('.bmsui-menu'));
    sub.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    placeMenu(sub, btn);
    if (focusFirst) { var f = menuItems(sub)[0]; if (f) { f.focus(); } }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var tog = t.closest && t.closest('[data-bmsui-menu-toggle]');
    if (tog) {
      var menu = tog.parentNode.querySelector(':scope > .bmsui-menu');
      var open = menu.hidden;
      closeMenus(open ? menu : null);
      menu.hidden = !open;
      tog.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        placeMenu(menu, tog);
        var first = menuItems(menu)[0];
        if (first) { first.focus(); }
      } else { closeSub(menu); }
      return;
    }
    var subBtn = t.closest && t.closest('[data-bmsui-submenu]');
    if (subBtn) { openSub(subBtn, true); return; }
    var item = t.closest && t.closest('.bmsui-menu [role="menuitem"]');
    if (item && item.closest('[data-bmsui-dropdown]')) {
      var root = item.closest('[data-bmsui-dropdown]');
      if (item.tagName === 'BUTTON' && item.hasAttribute('data-bmsui-menu-item')) {
        root.dispatchEvent(new CustomEvent('bmsui:select', { bubbles: true, detail: { id: item.getAttribute('data-bmsui-menu-item') } }));
      }
      closeMenus(null);
      var tr = root.querySelector(':scope > [data-bmsui-menu-toggle]');
      if (tr && item.tagName === 'BUTTON') { tr.focus(); }
      return;
    }
    if (!(t.closest && t.closest('[data-bmsui-dropdown]'))) { closeMenus(null); }
  });

  document.addEventListener('mouseover', function (e) {
    var b = e.target.closest && e.target.closest('[data-bmsui-submenu]');
    if (b && b.getAttribute('aria-expanded') !== 'true' && !b.disabled && window.matchMedia('(hover: hover)').matches) { openSub(b, false); }
  });

  document.addEventListener('keydown', function (e) {
    var menu = e.target.closest && e.target.closest('[data-bmsui-dropdown] .bmsui-menu');
    var root = e.target.closest && e.target.closest('[data-bmsui-dropdown]');
    if (!root) { return; }
    var top = root.querySelector(':scope > .bmsui-menu');
    if (!menu) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.hasAttribute('data-bmsui-menu-toggle')) {
        e.preventDefault();
        if (top.hidden) { e.target.click(); }
        if (e.key === 'ArrowUp') { var it0 = menuItems(top); if (it0.length) { it0[it0.length - 1].focus(); } }
      }
      return;
    }
    var items = menuItems(menu);
    var i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      if (items[i]) { items[i].focus(); }
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (items.length) { items[e.key === 'Home' ? 0 : items.length - 1].focus(); }
    } else if (e.key === 'ArrowRight' && document.activeElement.hasAttribute('data-bmsui-submenu')) {
      e.preventDefault();
      openSub(document.activeElement, true);
    } else if ((e.key === 'ArrowLeft' || e.key === 'Escape') && menu.classList.contains('bmsui-menu--sub')) {
      e.preventDefault();
      e.stopPropagation();
      menu.hidden = true;
      var owner = menu.parentNode.querySelector(':scope > [data-bmsui-submenu]');
      owner.setAttribute('aria-expanded', 'false');
      owner.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') { e.preventDefault(); }
      closeMenus(null);
      if (e.key === 'Escape') { root.querySelector(':scope > [data-bmsui-menu-toggle]').focus(); }
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      // Type-ahead: jump to the next item starting with the typed letter.
      var k = e.key.toLowerCase();
      for (var n = 1; n <= items.length; n++) {
        var cand = items[(i + n) % items.length];
        if ((cand.textContent || '').trim().toLowerCase().indexOf(k) === 0) { cand.focus(); break; }
      }
    }
  });
  /* ---- Form controls: indeterminate checkboxes, auto-resizing textareas ---- */
  // Runs on load and for HTML added later (ajax): call window.BMSUi.init(container) after inserting markup,
  // or rely on the MutationObserver below.
  // querySelectorAll plus the root itself.
  function within(root, sel) {
    var list = Array.prototype.slice.call(root.querySelectorAll(sel));
    if (root.matches && root.matches(sel)) { list.unshift(root); }
    return list;
  }

  function initForms(root) {
    within(root, '[data-bmsui-indeterminate]').forEach(function (c) {
      c.indeterminate = true;
      c.removeAttribute('data-bmsui-indeterminate');
    });
    within(root, 'textarea[data-bmsui-autoresize]').forEach(autoResize);
  }

  function autoResize(ta) {
    var max = parseInt(ta.getAttribute('data-bmsui-autoresize'), 10);
    ta.style.height = 'auto';
    var cs = window.getComputedStyle(ta);
    var line = parseFloat(cs.lineHeight) || 20;
    var extra = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    var h = ta.scrollHeight + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    if (max > 0) { h = Math.min(h, max * line + extra); }
    ta.style.height = h + 'px';
    ta.style.overflowY = max > 0 && ta.scrollHeight + extra > max * line + extra ? 'auto' : 'hidden';
  }

  document.addEventListener('input', function (e) {
    if (e.target.matches && e.target.matches('textarea[data-bmsui-autoresize]')) { autoResize(e.target); }
  });

  window.BMSUi = window.BMSUi || {};
  var inits = [initForms];
  window.BMSUi.init = function (root) { inits.forEach(function (fn) { fn(root || document); }); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.BMSUi.init(document); });
  } else { window.BMSUi.init(document); }
  if (window.MutationObserver) {
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { window.BMSUi.init(n); } });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
