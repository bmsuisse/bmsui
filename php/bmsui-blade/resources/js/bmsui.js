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
  /* ---- Combobox / tag combobox ---- */
  function comboRoot(el) { return el.closest && el.closest('[data-bmsui-combo]'); }
  function comboInput(root) { return root.querySelector('.bmsui-combo__input'); }
  function comboList(root) { return root.querySelector('.bmsui-combo__list'); }
  function comboOpts(root) { return Array.prototype.slice.call(comboList(root).querySelectorAll('[role="option"]:not([hidden])')); }
  function comboValues(root) {
    if (root.hasAttribute('data-multiple')) {
      return Array.prototype.map.call(root.querySelectorAll('.bmsui-chip[data-value]'), function (c) { return c.getAttribute('data-value'); });
    }
    var h = root.querySelector('[data-bmsui-combo-value]');
    return h && h.value !== '' ? [h.value] : [];
  }
  function comboStatus(root, text) { var st = root.querySelector('[data-bmsui-combo-status]'); if (st) { st.textContent = text || ''; } }
  function comboNotice(root, kind) {
    var list = comboList(root);
    var old = list.querySelector('.bmsui-combo__note');
    if (old) { old.parentNode.removeChild(old); }
    if (!kind) { return; }
    var li = document.createElement('li');
    li.className = 'bmsui-combo__note' + (kind === 'failed' ? ' is-error' : '');
    li.setAttribute('role', 'presentation');
    li.textContent = root.getAttribute('data-l-' + kind) || '';
    list.appendChild(li);
    comboStatus(root, li.textContent);
  }

  function comboOpen(root, open) {
    var list = comboList(root);
    var input = comboInput(root);
    list.hidden = !open;
    input.setAttribute('aria-expanded', open ? 'true' : 'false');
    root.classList.toggle('is-open', open);
    if (!open) { input.removeAttribute('aria-activedescendant'); comboOpts(root).forEach(function (o) { o.classList.remove('is-active'); }); }
  }

  function comboActivate(root, opt) {
    comboOpts(root).forEach(function (o) { o.classList.toggle('is-active', o === opt); });
    var input = comboInput(root);
    if (opt) { input.setAttribute('aria-activedescendant', opt.id); opt.scrollIntoView({ block: 'nearest' }); }
    else { input.removeAttribute('aria-activedescendant'); }
  }

  function comboMark(root) {
    var vals = comboValues(root);
    comboList(root).querySelectorAll('[role="option"]').forEach(function (o) {
      o.setAttribute('aria-selected', vals.indexOf(o.getAttribute('data-value')) >= 0 ? 'true' : 'false');
    });
  }

  function comboChange(root) {
    comboMark(root);
    root.dispatchEvent(new CustomEvent('bmsui:change', { bubbles: true, detail: { value: root.hasAttribute('data-multiple') ? comboValues(root) : (comboValues(root)[0] || null) } }));
  }

  function comboPick(root, value, label) {
    var input = comboInput(root);
    if (root.hasAttribute('data-multiple')) {
      var vals = comboValues(root);
      var max = parseInt(root.getAttribute('data-max'), 10) || 0;
      if (vals.indexOf(value) >= 0) { comboRemove(root, value); input.value = ''; return; }
      if (max && vals.length >= max) { return; }
      var chip = document.createElement('span');
      chip.className = 'bmsui-chip';
      chip.setAttribute('data-value', value);
      var t = document.createElement('span');
      t.className = 'bmsui-chip__text';
      t.textContent = label;
      var h = document.createElement('input');
      h.type = 'hidden';
      h.name = root.getAttribute('data-name') + '[]';
      h.value = value;
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'bmsui-chip__x';
      x.setAttribute('data-bmsui-combo-remove', '');
      x.setAttribute('aria-label', (root.getAttribute('data-l-remove') || 'Remove') + ': ' + label);
      x.innerHTML = '&times;';
      chip.appendChild(t); chip.appendChild(h); chip.appendChild(x);
      input.parentNode.insertBefore(chip, input);
      input.value = '';
      comboFilter(root, '');
      input.focus();
    } else {
      root.querySelector('[data-bmsui-combo-value]').value = value;
      input.value = label;
      input.setAttribute('data-label', label);
      var clr = root.querySelector('[data-bmsui-combo-clear]');
      if (clr) { clr.hidden = false; }
      comboOpen(root, false);
    }
    comboChange(root);
  }

  function comboRemove(root, value) {
    root.querySelectorAll('.bmsui-chip[data-value]').forEach(function (c) { if (c.getAttribute('data-value') === value) { c.parentNode.removeChild(c); } });
    comboChange(root);
  }

  function comboRender(root, items) {
    var list = comboList(root);
    var base = comboInput(root).id;
    list.querySelectorAll('[role="option"], .bmsui-combo__note').forEach(function (n) { n.parentNode.removeChild(n); });
    items.forEach(function (it, i) {
      var li = document.createElement('li');
      li.className = 'bmsui-combo__opt';
      li.setAttribute('role', 'option');
      li.id = base + '-r' + i;
      li.setAttribute('data-value', it.value);
      li.setAttribute('data-label', it.label);
      var lab = document.createElement('span');
      lab.className = 'bmsui-combo__label';
      lab.textContent = it.label;
      li.appendChild(lab);
      if (it.description) {
        var d = document.createElement('span');
        d.className = 'bmsui-combo__desc';
        d.textContent = it.description;
        li.appendChild(d);
      }
      list.appendChild(li);
    });
    comboMark(root);
    if (!items.length) { comboNotice(root, 'empty'); } else { comboStatus(root, ''); }
    comboActivate(root, comboOpts(root)[0] || null);
  }

  function comboFilter(root, term) {
    var url = root.getAttribute('data-url');
    var min = parseInt(root.getAttribute('data-min'), 10) || 0;
    if (url) {
      clearTimeout(root._bmsuiTimer);
      if (term.length < min) { comboRender(root, []); comboNotice(root, 'type'); return; }
      root._bmsuiTimer = setTimeout(function () { comboFetch(root, url, term); }, 250);
      return;
    }
    var q = term.trim().toLowerCase();
    var shown = 0;
    comboList(root).querySelectorAll('[role="option"]').forEach(function (o) {
      var hit = !q || (o.getAttribute('data-label') || '').toLowerCase().indexOf(q) >= 0;
      o.hidden = !hit;
      if (hit) { shown++; }
    });
    comboNotice(root, shown ? null : 'empty');
  }

  function comboFetch(root, url, term) {
    if (root._bmsuiAbort) { root._bmsuiAbort.abort(); }
    var ctrl = window.AbortController ? new AbortController() : null;
    root._bmsuiAbort = ctrl;
    var full = url.indexOf('{q}') >= 0 ? url.replace('{q}', encodeURIComponent(term)) : url + (url.indexOf('?') >= 0 ? '&' : '?') + 'q=' + encodeURIComponent(term);
    comboNotice(root, 'loading');
    root.setAttribute('aria-busy', 'true');
    fetch(full, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
      .then(function (data) {
        var rows = Array.isArray(data) ? data : (data.results || data.data || []);
        comboRender(root, rows.map(function (r) {
          return { value: String(r.value !== undefined ? r.value : r.id), label: String(r.label !== undefined ? r.label : (r.text !== undefined ? r.text : r.value)), description: r.description || '' };
        }));
      })
      .catch(function (err) { if (err.name !== 'AbortError') { comboRender(root, []); comboNotice(root, 'failed'); } })
      .then(function () { root.removeAttribute('aria-busy'); });
  }

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('bmsui-combo__input')) { return; }
    var root = comboRoot(t);
    comboOpen(root, true);
    comboFilter(root, t.value);
    comboActivate(root, comboOpts(root)[0] || null);
  });

  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('bmsui-combo__input')) { return; }
    var root = comboRoot(t);
    if (!root.hasAttribute('data-url') || comboOpts(root).length) {
      if (!root.hasAttribute('data-multiple')) { comboFilter(root, ''); }
      comboOpen(root, true);
    }
  });

  document.addEventListener('focusout', function (e) {
    var t = e.target;
    var root = comboRoot(t);
    if (!root) { return; }
    setTimeout(function () {
      if (root.contains(document.activeElement)) { return; }
      comboOpen(root, false);
      var input = comboInput(root);
      if (root.hasAttribute('data-multiple')) { input.value = ''; }
      else { input.value = input.getAttribute('data-label') || ''; }
    }, 0);
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('bmsui-combo__input')) { return; }
    var root = comboRoot(t);
    var opts = comboOpts(root).filter(function (o) { return o.getAttribute('aria-disabled') !== 'true'; });
    var cur = comboList(root).querySelector('.is-active');
    var i = opts.indexOf(cur);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (comboList(root).hidden) { comboOpen(root, true); comboFilter(root, root.hasAttribute('data-multiple') ? t.value : ''); opts = comboOpts(root); }
      if (!opts.length) { return; }
      i = e.key === 'ArrowDown' ? (i + 1) % opts.length : (i <= 0 ? opts.length - 1 : i - 1);
      comboActivate(root, opts[i]);
    } else if (e.key === 'Enter') {
      if (cur && !comboList(root).hidden) {
        e.preventDefault();
        comboPick(root, cur.getAttribute('data-value'), cur.getAttribute('data-label'));
      } else if (root.hasAttribute('data-creatable') && t.value.trim()) {
        e.preventDefault();
        comboPick(root, t.value.trim(), t.value.trim());
      }
    } else if (e.key === 'Escape') {
      if (!comboList(root).hidden) { e.preventDefault(); comboOpen(root, false); }
    } else if (e.key === 'Backspace' && t.value === '' && root.hasAttribute('data-multiple')) {
      var vals = comboValues(root);
      if (vals.length) { comboRemove(root, vals[vals.length - 1]); }
    }
  });

  document.addEventListener('mousedown', function (e) {
    // Keep focus in the input while picking with the mouse.
    var opt = e.target.closest && e.target.closest('.bmsui-combo__opt');
    if (opt) { e.preventDefault(); }
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    var opt = t.closest && t.closest('.bmsui-combo__opt');
    if (opt && opt.getAttribute('aria-disabled') !== 'true') {
      comboPick(comboRoot(opt), opt.getAttribute('data-value'), opt.getAttribute('data-label'));
      return;
    }
    var rm = t.closest && t.closest('[data-bmsui-combo-remove]');
    if (rm) {
      var root = comboRoot(rm);
      comboRemove(root, rm.parentNode.getAttribute('data-value'));
      comboInput(root).focus();
      return;
    }
    var clr = t.closest && t.closest('[data-bmsui-combo-clear]');
    if (clr) {
      var r2 = comboRoot(clr);
      r2.querySelector('[data-bmsui-combo-value]').value = '';
      var inp = comboInput(r2);
      inp.value = '';
      inp.setAttribute('data-label', '');
      clr.hidden = true;
      comboChange(r2);
      inp.focus();
      return;
    }
    var fld = t.closest && t.closest('.bmsui-combo__field');
    if (fld && !t.closest('button, input')) { comboInput(comboRoot(fld)).focus(); }
  });
  /* ---- Dialog / modal / confirm dialog ---- */
  function dialogEl(ref) { return typeof ref === 'string' ? document.getElementById(ref.replace(/^#/, '')) : ref; }

  function dialogLoad(dlg, url) {
    var body = dlg.querySelector('[data-bmsui-dialog-body]');
    body.setAttribute('aria-busy', 'true');
    body.innerHTML = '<div class="bmsui-dialog__loading"><span class="bmsui-spinner" aria-hidden="true"></span></div>';
    return fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.text(); })
      .then(function (html) {
        body.innerHTML = html;
        body.removeAttribute('aria-busy');
        window.BMSUi.init(body);
        var auto = body.querySelector('[autofocus], input:not([type=hidden]), select, textarea');
        if (auto) { auto.focus(); }
        dlg.dispatchEvent(new CustomEvent('bmsui:loaded', { bubbles: true, detail: { url: url } }));
      }, function () {
        body.removeAttribute('aria-busy');
        body.innerHTML = '';
        var p = document.createElement('p');
        p.className = 'bmsui-dialog__error';
        p.setAttribute('role', 'alert');
        p.textContent = dlg.getAttribute('data-l-failed') || 'Could not load the content.';
        body.appendChild(p);
      });
  }

  function dialogOpen(ref, opts) {
    var dlg = dialogEl(ref);
    if (!dlg || dlg.open) { return dlg; }
    opts = opts || {};
    dlg._bmsuiOpener = opts.opener || document.activeElement;
    if (opts.title !== undefined) {
      var t = dlg.querySelector('.bmsui-dialog__title');
      if (t) { t.textContent = opts.title; }
    }
    dlg.returnValue = '';
    if (typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open', ''); }
    document.documentElement.classList.add('bmsui-dialog-open');
    var url = opts.url || dlg.getAttribute('data-url');
    if (url) { dialogLoad(dlg, url); }
    dlg.dispatchEvent(new CustomEvent('bmsui:open', { bubbles: true }));
    return dlg;
  }

  function dialogClose(ref, value) {
    var dlg = dialogEl(ref);
    if (!dlg || !dlg.open) { return; }
    if (typeof dlg.close === 'function') { dlg.close(value || ''); } else { dlg.removeAttribute('open'); dlg.dispatchEvent(new Event('close')); }
  }

  // The native close event covers Escape, form[method=dialog] and close().
  document.addEventListener('close', function (e) {
    var dlg = e.target;
    if (!dlg.hasAttribute || !dlg.hasAttribute('data-bmsui-dialog')) { return; }
    if (!document.querySelector('dialog[data-bmsui-dialog][open]')) { document.documentElement.classList.remove('bmsui-dialog-open'); }
    var opener = dlg._bmsuiOpener;
    if (opener && opener.focus && document.contains(opener)) { opener.focus(); }
    dlg.dispatchEvent(new CustomEvent('bmsui:close', { bubbles: true, detail: { returnValue: dlg.returnValue } }));
    if (dlg._bmsuiResolve) { var r = dlg._bmsuiResolve; dlg._bmsuiResolve = null; r(dlg.returnValue === 'confirm'); }
  }, true);

  document.addEventListener('click', function (e) {
    var t = e.target;
    var opener = t.closest && t.closest('[data-bmsui-dialog-open], [data-bmsui-dialog-url]');
    if (opener) {
      e.preventDefault();
      var url = opener.getAttribute('data-bmsui-dialog-url');
      var target = opener.getAttribute('data-bmsui-dialog-open') || '#bmsui-remote';
      var dlg = dialogEl(target) || (url ? remoteDialog() : null);
      if (dlg) { dialogOpen(dlg, { url: url || undefined, title: opener.getAttribute('data-bmsui-dialog-title') || undefined, opener: opener }); }
      return;
    }
    var closer = t.closest && t.closest('[data-bmsui-dialog-close]');
    if (closer) { dialogClose(closer.closest('dialog'), closer.value || closer.getAttribute('data-value') || 'cancel'); return; }
    var yes = t.closest && t.closest('[data-bmsui-dialog-confirm]');
    if (yes) {
      var d = yes.closest('dialog');
      d.dispatchEvent(new CustomEvent('bmsui:confirm', { bubbles: true }));
      dialogClose(d, 'confirm');
      return;
    }
    // Backdrop click: the box fills the <dialog>, so only clicks outside it target the dialog itself.
    if (t.tagName === 'DIALOG' && t.hasAttribute('data-bmsui-dialog') && !t.hasAttribute('data-static')) {
      dialogClose(t, 'cancel');
    }
  });

  function buildDialog(id, size, labels) {
    var dlg = document.createElement('dialog');
    dlg.className = 'bmsui-dialog bmsui-dialog--' + size;
    dlg.id = id;
    dlg.setAttribute('data-bmsui-dialog', '');
    dlg.setAttribute('aria-labelledby', id + '-title');
    dlg.innerHTML = '<div class="bmsui-dialog__box"><header class="bmsui-dialog__head"><h2 class="bmsui-dialog__title"></h2></header>' +
      '<button type="button" class="bmsui-dialog__x" data-bmsui-dialog-close>&times;</button><div class="bmsui-dialog__body" data-bmsui-dialog-body></div></div>';
    dlg.querySelector('.bmsui-dialog__title').id = id + '-title';
    dlg.querySelector('.bmsui-dialog__x').setAttribute('aria-label', labels.close || 'Close');
    document.body.appendChild(dlg);
    return dlg;
  }

  function remoteDialog() { return document.getElementById('bmsui-remote') || buildDialog('bmsui-remote', 'md', {}); }

  // Promise-based confirm for ajax flows. Uses <x-bmsui::confirm-dialog id="bmsui-confirm"/> when the layout
  // renders one (translated labels); otherwise builds a minimal one with the labels passed in options.
  function confirmDialog(message, opts) {
    opts = opts || {};
    var dlg = document.getElementById('bmsui-confirm');
    if (!dlg) {
      dlg = buildDialog('bmsui-confirm', 'sm', opts);
      dlg.classList.add('bmsui-dialog--confirm');
      var foot = document.createElement('footer');
      foot.className = 'bmsui-dialog__foot';
      foot.innerHTML = '<button type="button" class="bmsui-btn bmsui-btn--md" data-bmsui-dialog-close value="cancel"></button><button type="button" class="bmsui-btn bmsui-btn--md bmsui-btn--danger" data-bmsui-dialog-confirm></button>';
      foot.children[0].textContent = opts.cancelLabel || 'Cancel';
      foot.children[1].textContent = opts.confirmLabel || 'OK';
      dlg.querySelector('.bmsui-dialog__box').appendChild(foot);
    }
    var msg = dlg.querySelector('.bmsui-dialog__msg');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'bmsui-dialog__msg';
      dlg.querySelector('[data-bmsui-dialog-body]').prepend(msg);
    }
    msg.textContent = message || '';
    if (opts.title) { dlg.querySelector('.bmsui-dialog__title').textContent = opts.title; }
    if (opts.confirmLabel) { dlg.querySelector('[data-bmsui-dialog-confirm]').textContent = opts.confirmLabel; }
    if (opts.cancelLabel) { dlg.querySelector('[data-bmsui-dialog-close][value="cancel"]').textContent = opts.cancelLabel; }
    return new Promise(function (resolve) {
      dlg._bmsuiResolve = resolve;
      dialogOpen(dlg);
      var c = dlg.querySelector('[data-bmsui-dialog-close][value="cancel"]');
      if (c) { c.focus(); }
    });
  }

  window.BMSUi = window.BMSUi || {};
  window.BMSUi.dialog = { open: dialogOpen, close: dialogClose, load: function (ref, url) { return dialogLoad(dialogEl(ref), url); } };
  window.BMSUi.confirm = confirmDialog;

  /* ---- Tabs ---- */
  function selectTab(btn, focus) {
    var root = btn.closest('[data-bmsui-tabs]');
    var id = btn.getAttribute('data-tab');
    root.querySelectorAll(':scope > .bmsui-tabs__list > [role="tab"]').forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('is-active', on);
    });
    root.querySelectorAll(':scope > [data-tab-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-tab-panel') !== id; });
    if (focus) { btn.focus(); }
    root.dispatchEvent(new CustomEvent('bmsui:tab', { bubbles: true, detail: { id: id } }));
  }

  document.addEventListener('click', function (e) {
    var tab = e.target.closest && e.target.closest('[data-bmsui-tabs] [role="tab"]');
    if (tab && !tab.disabled) { selectTab(tab, false); }
  });

  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('[data-bmsui-tabs] [role="tab"]');
    if (!tab) { return; }
    var tabs = Array.prototype.filter.call(tab.parentNode.querySelectorAll('[role="tab"]'), function (b) { return !b.disabled; });
    var i = tabs.indexOf(tab);
    var next = null;
    if (e.key === 'ArrowRight') { next = tabs[(i + 1) % tabs.length]; }
    else if (e.key === 'ArrowLeft') { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
    else if (e.key === 'Home') { next = tabs[0]; }
    else if (e.key === 'End') { next = tabs[tabs.length - 1]; }
    if (next) { e.preventDefault(); selectTab(next, true); }
  });

  function initTabs(root) {
    // Wire panels to their tabs (ids are generated server-side per tab list).
    within(root, '[data-bmsui-tabs]').forEach(function (tabs) {
      var base = tabs.getAttribute('data-base');
      tabs.querySelectorAll(':scope > [data-tab-panel]').forEach(function (p) {
        var id = p.getAttribute('data-tab-panel');
        if (!p.id) { p.id = base + '-' + id; }
        p.setAttribute('aria-labelledby', base + '-' + id + '-tab');
      });
    });
  }
  inits.push(initTabs);

  /* ---- Tooltip ---- */
  var tip = null;
  var tipFor = null;
  function showTip(el) {
    var text = el.getAttribute('data-bmsui-tooltip');
    if (!text) { return; }
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'bmsui-tooltip';
      tip.id = 'bmsui-tooltip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    tip.textContent = text;
    tip.hidden = false;
    tipFor = el;
    var target = el.matches('.bmsui-tip-anchor') && el.firstElementChild ? el.firstElementChild : el;
    target.setAttribute('aria-describedby', 'bmsui-tooltip');
    var r = el.getBoundingClientRect();
    var tr = tip.getBoundingClientRect();
    var side = el.getAttribute('data-side') || 'top';
    var gap = 6;
    var pos = function (s) {
      if (s === 'bottom') { return { x: r.left + r.width / 2 - tr.width / 2, y: r.bottom + gap }; }
      if (s === 'left') { return { x: r.left - tr.width - gap, y: r.top + r.height / 2 - tr.height / 2 }; }
      if (s === 'right') { return { x: r.right + gap, y: r.top + r.height / 2 - tr.height / 2 }; }
      return { x: r.left + r.width / 2 - tr.width / 2, y: r.top - tr.height - gap };
    };
    var p = pos(side);
    var flip = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side];
    if (p.y < 4 || p.y + tr.height > window.innerHeight - 4 || p.x < 4 || p.x + tr.width > window.innerWidth - 4) { var q = pos(flip); if (q.y >= 4 && q.x >= 4) { p = q; } }
    p.x = Math.max(8, Math.min(p.x, window.innerWidth - tr.width - 8));
    tip.style.left = (p.x + window.scrollX) + 'px';
    tip.style.top = (p.y + window.scrollY) + 'px';
  }
  function hideTip() {
    if (!tip || tip.hidden) { return; }
    tip.hidden = true;
    if (tipFor) {
      var target = tipFor.matches('.bmsui-tip-anchor') && tipFor.firstElementChild ? tipFor.firstElementChild : tipFor;
      if (target.getAttribute('aria-describedby') === 'bmsui-tooltip') { target.removeAttribute('aria-describedby'); }
    }
    tipFor = null;
  }
  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest && e.target.closest('[data-bmsui-tooltip]');
    if (el && el !== tipFor) { showTip(el); } else if (!el) { hideTip(); }
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-bmsui-tooltip]');
    if (el) { showTip(el); } else { hideTip(); }
  });
  document.addEventListener('focusout', function () { hideTip(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hideTip(); } });
  window.addEventListener('scroll', hideTip, true);

  /* ---- Popover ---- */
  function closePopovers(except) {
    document.querySelectorAll('[data-bmsui-popover] > .bmsui-popover__panel:not([hidden])').forEach(function (p) {
      if (p === except) { return; }
      p.hidden = true;
      var tg = p.parentNode.querySelector(':scope > [data-bmsui-popover-toggle]');
      if (tg) { tg.setAttribute('aria-expanded', 'false'); }
      p.parentNode.dispatchEvent(new CustomEvent('bmsui:close', { bubbles: true }));
    });
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var tog = t.closest && t.closest('[data-bmsui-popover-toggle]');
    if (tog) {
      var panel = tog.parentNode.querySelector(':scope > .bmsui-popover__panel');
      var open = panel.hidden;
      closePopovers(open ? panel : null);
      panel.hidden = !open;
      tog.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        placeMenu(panel, tog);
        panel.parentNode.dispatchEvent(new CustomEvent('bmsui:open', { bubbles: true }));
      } else { panel.parentNode.dispatchEvent(new CustomEvent('bmsui:close', { bubbles: true })); }
      return;
    }
    if (!(t.closest && t.closest('[data-bmsui-popover]'))) { closePopovers(null); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    var open = e.target.closest && e.target.closest('[data-bmsui-popover]');
    if (open && !open.querySelector(':scope > .bmsui-popover__panel').hidden) {
      closePopovers(null);
      open.querySelector(':scope > [data-bmsui-popover-toggle]').focus();
    }
  });

  function initDialogs(root) {
    within(root, 'dialog[data-bmsui-dialog][data-open]').forEach(function (d) { d.removeAttribute('data-open'); dialogOpen(d); });
  }
  inits.push(initDialogs);

  /* ---- Boot: init on load and for nodes added later ---- */
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
