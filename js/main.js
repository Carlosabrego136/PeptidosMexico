// Mundo Péptidos México — interactividad básica del prototipo

const SHIPPING_FEE = 220; // costo de envío nacional
const FREE_SHIPPING_THRESHOLD = 4500; // envío gratis a partir de este monto (subtotal)
const WA_NUMBER = '5213131095135';
const fmtMXN = (n) => `$${Math.round(n).toLocaleString('es-MX')} MXN`;
const parsePrice = (str) => parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;

// ---------- Newsletter / suscripción 10% de descuento ----------
// CONFIGURACIÓN: cuando se cree la cuenta de Brevo (o Mailchimp) para los
// correos automáticos, pegar aquí la URL del formulario del proveedor.
// Mientras este valor esté vacío, los correos se siguen capturando y
// guardando de forma segura (NEWSLETTER_KEY más abajo) para no perder
// ningún registro, pero todavía no se envía nada automático.
const NEWSLETTER_ENDPOINT = ''; // ej: 'https://XXXXX.list-manage.com/subscribe/post?u=...&id=...'
const NEWSLETTER_DISCOUNT_CODE = 'BIENVENIDO10';
const NEWSLETTER_KEY = 'mpm_newsletter_subscribers_v1';

function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  const emailInput = document.getElementById('newsletterEmail');
  const msg = document.getElementById('newsletterMsg');
  const btn = form.querySelector('.newsletter-btn');

  const showMsg = (text, ok) => {
    if (!msg) return;
    msg.textContent = text;
    msg.hidden = false;
    msg.className = 'newsletter-msg ' + (ok ? 'ok' : 'err');
  };

  const getSubscribers = () => {
    try { return JSON.parse(localStorage.getItem(NEWSLETTER_KEY)) || []; }
    catch { return []; }
  };
  const saveSubscriber = (email) => {
    const list = getSubscribers();
    if (!list.some(s => s.email.toLowerCase() === email.toLowerCase())) {
      list.push({ email, date: new Date().toISOString() });
      localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(list));
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (emailInput.value || '').trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      showMsg('Ingresa un correo válido, por favor.', false);
      return;
    }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    // Guardamos siempre localmente para no perder ningún registro.
    saveSubscriber(email);

    // Si ya hay un proveedor de correo conectado (Brevo/Mailchimp), le
    // avisamos también a él para que mande el correo de bienvenida real.
    if (NEWSLETTER_ENDPOINT) {
      try {
        await fetch(NEWSLETTER_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ EMAIL: email }).toString(),
        });
      } catch (err) {
        // Si falla el proveedor externo, igual ya quedó guardado localmente.
      }
    }

    showMsg(`¡Listo! Tu código de 10% de descuento es: ${NEWSLETTER_DISCOUNT_CODE}`, true);
    form.reset();
    btn.disabled = false;
    btn.textContent = original;
  });
}

// ---------- Carrito (persistente vía localStorage, compartido entre páginas) ----------
const CART_KEY = 'mpm_cart_v1';
const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  },
  save(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
    Cart.renderAll();
  },
  add(item) {
    const items = Cart.get();
    const existing = items.find(i => i.id === item.id);
    if (existing) existing.qty += item.qty;
    else items.push(item);
    Cart.save(items);
  },
  setQty(id, qty) {
    const items = Cart.get();
    const it = items.find(i => i.id === id);
    if (!it) return;
    it.qty = Math.max(1, qty);
    Cart.save(items);
  },
  remove(id) {
    Cart.save(Cart.get().filter(i => i.id !== id));
  },
  clear() {
    Cart.save([]);
  },
  count() {
    return Cart.get().reduce((s, i) => s + i.qty, 0);
  },
  subtotal() {
    return Cart.get().reduce((s, i) => s + i.unit * i.qty, 0);
  },
  renderAll() {
    const count = Cart.count();
    document.querySelectorAll('.cart-count .badge').forEach(b => { b.textContent = String(count); });

    const body = document.getElementById('cartDrawerBody');
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');
    const waLink = document.getElementById('cartWaLink');
    if (!body) return; // esta página no tiene carrito (no debería pasar, pero por seguridad)

    const items = Cart.get();
    if (!items.length) {
      body.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
    } else {
      body.innerHTML = items.map(it => `
        <div class="cart-item" data-id="${it.id}">
          <img src="${it.img}" alt="${it.name}">
          <div class="cart-item-info">
            <p class="cart-item-name">${it.name}${it.variant ? ` (${it.variant})` : ''}</p>
            <p class="cart-item-price">${fmtMXN(it.unit)} c/u</p>
            <div class="cart-item-qty">
              <button type="button" class="cart-item-minus" aria-label="Disminuir">−</button>
              <span>${it.qty}</span>
              <button type="button" class="cart-item-plus" aria-label="Aumentar">+</button>
            </div>
          </div>
          <button type="button" class="cart-item-remove" aria-label="Quitar">&times;</button>
        </div>
      `).join('');
    }

    const subtotal = Cart.subtotal();
    const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
    const shipping = items.length ? (freeShipping ? 0 : SHIPPING_FEE) : 0;
    const total = subtotal + shipping;
    if (subtotalEl) subtotalEl.textContent = fmtMXN(subtotal);
    if (shippingEl) {
      if (!items.length) {
        shippingEl.textContent = fmtMXN(0);
      } else if (freeShipping) {
        shippingEl.innerHTML = `<span class="ship-free">Gratis</span><span class="ship-strike">${fmtMXN(SHIPPING_FEE)}</span>`;
      } else {
        shippingEl.textContent = fmtMXN(SHIPPING_FEE);
      }
    }
    if (totalEl) totalEl.textContent = fmtMXN(total);
    const payAmountEl = document.getElementById('payCardAmount');
    if (payAmountEl) payAmountEl.textContent = fmtMXN(total);

    const shipHint = document.getElementById('cartShipHint');
    if (shipHint) {
      if (!items.length) {
        shipHint.textContent = '';
        shipHint.classList.remove('ship-hint-success');
      } else if (freeShipping) {
        shipHint.textContent = '¡Tu pedido ya tiene envío gratis!';
        shipHint.classList.add('ship-hint-success');
      } else {
        const missing = FREE_SHIPPING_THRESHOLD - subtotal;
        shipHint.textContent = `Te faltan ${fmtMXN(missing)} para envío gratis`;
        shipHint.classList.remove('ship-hint-success');
      }
    }

    if (waLink) {
      if (!items.length) {
        waLink.href = `https://wa.me/${WA_NUMBER}`;
      } else {
        const lines = items.map(it => `• ${it.qty} x ${it.name}${it.variant ? ` (${it.variant})` : ''} — ${fmtMXN(it.unit * it.qty)}`);
        const shippingLine = freeShipping ? 'Envío nacional: Gratis 🎉' : `Envío nacional: ${fmtMXN(shipping)}`;
        const msg = `Hola! Quiero hacer este pedido:\n${lines.join('\n')}\n\nSubtotal: ${fmtMXN(subtotal)}\n${shippingLine}\nTotal: ${fmtMXN(total)}\n\nVi los productos en la página web.`;
        waLink.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initNewsletter();

  // Marcar link activo en nav según la página actual
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.primary a, .mobile-nav-inner a:not(.mobile-nav-cta)').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // Acordeón de FAQ
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      q.parentElement.classList.toggle('open');
    });
  });

  // Selector de presentación (mg/mL) en tarjetas de catálogo con variantes
  document.querySelectorAll('.prod-card[data-variants]').forEach(card => {
    let variants = [];
    try { variants = JSON.parse(card.dataset.variants); } catch (e) { variants = []; }
    if (!variants.length) return;
    const select = card.querySelector('.prod-variant-select');
    const img = card.querySelector('.variant-img');
    const priceEl = card.querySelector('.variant-price');
    if (!select) return;
    select.addEventListener('change', () => {
      const v = variants[parseInt(select.value, 10) || 0];
      if (!v) return;
      if (img) { img.src = v.img; img.alt = v.alt || card.querySelector('h4')?.textContent || ''; }
      if (priceEl) priceEl.textContent = fmtMXN(v.price);
    });
    select.addEventListener('click', (e) => e.stopPropagation());
    select.addEventListener('mousedown', (e) => e.stopPropagation());
  });

  // ---------- Filtro real de categorías y presentación (catálogo) ----------
  const catalogGrid = document.getElementById('catalogGrid');
  if (catalogGrid) {
    const catLis = document.querySelectorAll('.filter-box .cats li');
    const mgChecks = document.querySelectorAll('.filter-box [data-filter-mg]');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const clearBtn = document.getElementById('filterClear');
    const cards = Array.from(catalogGrid.querySelectorAll('.prod-card'));

    let activeCat = '';

    const setActiveCat = (cat) => {
      activeCat = cat || '';
      catLis.forEach(li => li.classList.toggle('active', (li.dataset.filterCat || '') === activeCat));
      applyFilters();
    };

    const applyFilters = () => {
      const checkedMg = Array.from(mgChecks).filter(c => c.checked).map(c => c.dataset.filterMg);
      let visible = 0;
      cards.forEach(card => {
        const cardCat = (card.dataset.cat || '').split('·')[0].trim();
        const presentations = (card.dataset.presentations || '').split(' ').filter(Boolean);
        // agrupar presentaciones de a pares porque "3 mL" son dos tokens
        const presPairs = [];
        for (let i = 0; i < presentations.length; i += 2) {
          presPairs.push(`${presentations[i]} ${presentations[i + 1]}`);
        }
        const matchesCat = !activeCat || cardCat === activeCat;
        const matchesMg = !checkedMg.length || checkedMg.some(mg => presPairs.includes(mg));
        const show = matchesCat && matchesMg;
        card.hidden = !show;
        if (show) visible += 1;
      });
      if (resultsCount) resultsCount.textContent = `${visible} resultado${visible === 1 ? '' : 's'}`;
      if (noResults) noResults.hidden = visible !== 0;
    };

    catLis.forEach(li => {
      li.addEventListener('click', () => setActiveCat(li.dataset.filterCat || ''));
    });
    mgChecks.forEach(chk => chk.addEventListener('change', applyFilters));
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        mgChecks.forEach(c => { c.checked = false; });
        setActiveCat('');
      });
    }

    // Preseleccionar categoría desde ?cat=... (enlaces desde la página de Categorías)
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('cat');
    if (catParam) {
      const match = Array.from(catLis).find(li => (li.dataset.filterCat || '').toLowerCase() === catParam.toLowerCase());
      setActiveCat(match ? match.dataset.filterCat : '');
    } else {
      applyFilters();
    }
  }

  // Sidebar de FAQ
  document.querySelectorAll('.faq-side li').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('.faq-side li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
    });
  });

  // Animación blur-in al hacer scroll (sección de catálogo en Inicio)
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    revealEls.forEach(el => io.observe(el));
  }

  // Carrusel "Productos destacados" (estilo best-sellers) — solo en Inicio
  const bsTabs = document.querySelectorAll('.bs-tab');
  const bsPanels = document.querySelectorAll('.bs-carousel');
  if (bsTabs.length && bsPanels.length) {
    const addDot = (tab) => {
      const wrap = tab.querySelector('.bs-tab-dot-wrap');
      if (wrap && !wrap.querySelector('.bs-tab-dot')) {
        const dot = document.createElement('span');
        dot.className = 'bs-tab-dot';
        wrap.appendChild(dot);
      }
    };
    const removeDot = (tab) => {
      const dot = tab.querySelector('.bs-tab-dot');
      if (dot) dot.remove();
    };
    const progressUpdaters = {};
    const initProgress = (panel) => {
      const track = panel.parentElement.parentElement.querySelector('.bs-progress-thumb');
      const update = () => {
        const max = panel.scrollWidth - panel.clientWidth;
        const ratio = max > 0 ? panel.scrollLeft / max : 0;
        const translate = ratio * (100 / 0.3);
        if (track) track.style.transform = `translateX(${translate}%)`;
      };
      panel.addEventListener('scroll', update);
      progressUpdaters[panel.dataset.panel] = update;
      update();
    };
    const showPanel = (name) => {
      bsPanels.forEach(p => { p.hidden = p.dataset.panel !== name; });
      if (progressUpdaters[name]) progressUpdaters[name]();
    };
    // Rueda del mouse convertida a scroll horizontal + arrastre
    // (solo cuando realmente hay hacia dónde deslizar, para no bloquear el scroll normal de la página)
    bsPanels.forEach(panel => {
      panel.addEventListener('wheel', (e) => {
        if (panel.hidden) return;
        const maxScroll = panel.scrollWidth - panel.clientWidth;
        if (maxScroll <= 0) return;
        const atStart = panel.scrollLeft <= 0;
        const atEnd = panel.scrollLeft >= maxScroll - 1;
        if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return;
        e.preventDefault();
        panel.scrollLeft += e.deltaY;
      }, { passive: false });
      initProgress(panel);
    });
    // Tabs
    bsTabs.forEach(tab => {
      if (tab.classList.contains('active')) addDot(tab);
      tab.addEventListener('click', () => {
        bsTabs.forEach(t => { t.classList.remove('active'); removeDot(t); });
        tab.classList.add('active');
        addDot(tab);
        showPanel(tab.dataset.panel);
      });
    });
    // Reveal (tabs + tarjetas) vía IntersectionObserver
    const bsRevealEls = document.querySelectorAll('.bs-reveal');
    if (bsRevealEls.length) {
      const bsIo = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            bsIo.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      bsRevealEls.forEach(el => bsIo.observe(el));
    }
  }

  // ---------- Modal de producto (Inicio: tarjetas del carrusel · Catálogo: tarjetas de la grilla) ----------
  const modalOverlay = document.getElementById('productModalOverlay');
  if (modalOverlay) {
    const pmImage = document.getElementById('pmImage');
    const pmCat = document.getElementById('pmCat');
    const pmName = document.getElementById('pmName');
    const pmFormula = document.getElementById('pmFormula');
    const pmVariantWrap = document.getElementById('pmVariantWrap');
    const pmVariantSelect = document.getElementById('pmVariantSelect');
    const pmPrice = document.getElementById('pmPrice');
    const pmQtyValue = document.getElementById('pmQtyValue');
    const pmQtyMinus = document.getElementById('pmQtyMinus');
    const pmQtyPlus = document.getElementById('pmQtyPlus');
    const pmShipping = document.getElementById('pmShipping');
    const pmTotal = document.getElementById('pmTotal');
    const pmAddBtn = document.getElementById('pmAddBtn');
    const pmWaLink = document.getElementById('pmWaLink');
    const pmCoaBadge = document.getElementById('pmCoaBadge');
    const pmClose = document.getElementById('productModalClose');
    let qty = 1;
    let currentProduct = null;
    let variants = [];
    let variantIndex = 0;

    const updateQtyUI = () => { pmQtyValue.textContent = qty; };

    const currentUnitPrice = () => {
      if (variants.length) return variants[variantIndex].price;
      return parsePrice(currentProduct ? currentProduct.price : 0);
    };
    const currentVariantLabel = () => variants.length ? variants[variantIndex].label : '';
    const currentImg = () => variants.length ? variants[variantIndex].img : (currentProduct ? currentProduct.img : '');
    const currentLabel = () => {
      if (variants.length) return `${currentProduct.name} (${variants[variantIndex].label})`;
      return currentProduct ? currentProduct.name : '';
    };

    const pmShipHint = document.getElementById('pmShipHint');

    const updateTotals = () => {
      const unit = currentUnitPrice();
      const subtotal = unit * qty;
      const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
      const shipping = freeShipping ? 0 : SHIPPING_FEE;
      pmPrice.textContent = fmtMXN(unit);
      if (freeShipping) {
        pmShipping.innerHTML = `<span class="ship-free">Gratis</span><span class="ship-strike">${fmtMXN(SHIPPING_FEE)}</span>`;
      } else {
        pmShipping.textContent = fmtMXN(SHIPPING_FEE);
      }
      pmTotal.textContent = fmtMXN(subtotal + shipping);
      if (pmShipHint) {
        if (freeShipping) {
          pmShipHint.textContent = '¡Tu pedido ya tiene envío gratis!';
          pmShipHint.classList.add('ship-hint-success');
        } else {
          pmShipHint.textContent = `Te faltan ${fmtMXN(FREE_SHIPPING_THRESHOLD - subtotal)} para envío gratis`;
          pmShipHint.classList.remove('ship-hint-success');
        }
      }
    };

    const updateWaLink = () => {
      if (!currentProduct) return;
      const unit = currentUnitPrice();
      const subtotal = unit * qty;
      const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
      const shipping = freeShipping ? 0 : SHIPPING_FEE;
      const total = subtotal + shipping;
      const shippingLabel = freeShipping ? 'Gratis 🎉' : fmtMXN(SHIPPING_FEE);
      const msg = `Hola! Quiero comprar: ${qty} x ${currentLabel()} (${fmtMXN(unit)} c/u) + envío ${shippingLabel} = Total ${fmtMXN(total)} — vi el producto en la página web.`;
      pmWaLink.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    };

    const applyVariant = () => {
      if (!variants.length) return;
      const v = variants[variantIndex];
      pmImage.src = v.img;
      pmImage.alt = `${currentProduct.name} ${v.label}`;
      updateTotals();
      updateWaLink();
    };

    const openModal = (card) => {
      currentProduct = {
        name: card.dataset.name || '',
        cat: card.dataset.cat || '',
        formula: card.dataset.formula || '',
        price: card.dataset.price || '',
        img: card.dataset.img || ''
      };
      qty = 1;
      updateQtyUI();

      try {
        variants = card.dataset.variants ? JSON.parse(card.dataset.variants) : [];
      } catch (e) {
        variants = [];
      }
      variantIndex = 0;

      pmCat.textContent = currentProduct.cat;
      pmName.textContent = currentProduct.name;
      pmFormula.textContent = currentProduct.formula;
      pmAddBtn.textContent = 'Agregar al carrito';
      pmAddBtn.classList.remove('added');

      if (pmCoaBadge) {
        const coaUrl = card.dataset.coa || '';
        if (coaUrl) {
          pmCoaBadge.href = coaUrl;
          pmCoaBadge.hidden = false;
        } else {
          pmCoaBadge.hidden = true;
        }
      }

      if (variants.length) {
        pmVariantWrap.hidden = false;
        pmVariantSelect.innerHTML = variants.map((v, i) => `<option value="${i}">${v.label} — ${fmtMXN(v.price)}</option>`).join('');
        pmVariantSelect.value = '0';
        applyVariant();
      } else {
        pmVariantWrap.hidden = true;
        pmImage.src = currentProduct.img;
        pmImage.alt = currentProduct.name;
        updateTotals();
        updateWaLink();
      }

      modalOverlay.classList.add('open');
      document.body.classList.add('modal-open');
    };
    const closeModal = () => {
      modalOverlay.classList.remove('open');
      document.body.classList.remove('modal-open');
    };

    pmVariantSelect.addEventListener('change', () => {
      variantIndex = parseInt(pmVariantSelect.value, 10) || 0;
      applyVariant();
    });
    pmQtyMinus.addEventListener('click', () => { qty = Math.max(1, qty - 1); updateQtyUI(); updateTotals(); updateWaLink(); });
    pmQtyPlus.addEventListener('click', () => { qty += 1; updateQtyUI(); updateTotals(); updateWaLink(); });
    pmAddBtn.addEventListener('click', () => {
      if (!currentProduct) return;
      const variantLabel = currentVariantLabel();
      Cart.add({
        id: `${currentProduct.name}|${variantLabel}`,
        name: currentProduct.name,
        variant: variantLabel,
        unit: currentUnitPrice(),
        qty: qty,
        img: currentImg()
      });
      pmAddBtn.textContent = `Agregado (${qty}) ✓`;
      pmAddBtn.classList.add('added');
      setTimeout(() => {
        pmAddBtn.textContent = 'Agregar al carrito';
        pmAddBtn.classList.remove('added');
      }, 1600);
    });
    pmClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Distinguir clic de arrastre: solo abre si el mouse no se movió (o casi nada)
    // Aplica a las tarjetas del carrusel (bs-card) y a las del catálogo (prod-card con datos de producto)
    document.querySelectorAll('.bs-card, .prod-card[data-name]').forEach(card => {
      let downX = 0, downY = 0, dragged = false;
      card.addEventListener('mousedown', (e) => { downX = e.clientX; downY = e.clientY; dragged = false; });
      card.addEventListener('mousemove', (e) => {
        if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) dragged = true;
      });
      card.addEventListener('click', (e) => {
        if (e.target.closest('.prod-variant-select, .add')) return;
        if (!dragged) openModal(card);
      });
      card.setAttribute('tabindex', card.getAttribute('tabindex') || '0');
      card.setAttribute('role', card.getAttribute('role') || 'button');
      card.addEventListener('keydown', (e) => {
        if (e.target.closest('.prod-variant-select, .add')) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card); }
      });
    });
  }

  // ---------- Carrito lateral (drawer) ----------
  const cartOverlay = document.getElementById('cartDrawerOverlay');
  if (cartOverlay) {
    const cartClose = document.getElementById('cartDrawerClose');
    const cartBody = document.getElementById('cartDrawerBody');
    const cartClearBtn = document.getElementById('cartClearBtn');

    const openCart = () => {
      Cart.renderAll();
      cartOverlay.classList.add('open');
      document.body.classList.add('modal-open');
    };
    const closeCart = () => {
      cartOverlay.classList.remove('open');
      document.body.classList.remove('modal-open');
    };

    document.querySelectorAll('.cart-count').forEach(el => {
      el.addEventListener('click', openCart);
    });
    if (cartClose) cartClose.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', (e) => { if (e.target === cartOverlay) closeCart(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });
    if (cartClearBtn) cartClearBtn.addEventListener('click', () => { if (Cart.get().length) Cart.clear(); });

    if (cartBody) {
      cartBody.addEventListener('click', (e) => {
        const row = e.target.closest('.cart-item');
        if (!row) return;
        const id = row.dataset.id;
        const items = Cart.get();
        const it = items.find(i => i.id === id);
        if (!it) return;
        if (e.target.closest('.cart-item-plus')) Cart.setQty(id, it.qty + 1);
        else if (e.target.closest('.cart-item-minus')) {
          if (it.qty <= 1) Cart.remove(id); else Cart.setQty(id, it.qty - 1);
        } else if (e.target.closest('.cart-item-remove')) {
          Cart.remove(id);
        }
      });
    }

    // ---------- Método de pago: tarjeta (vitrina, lista para conectar una pasarela real) / WhatsApp ----------
    const payTabCard = document.getElementById('payTabCard');
    const payTabWa = document.getElementById('payTabWa');
    const payCardPanel = document.getElementById('payCardPanel');
    const payWaPanel = document.getElementById('payWaPanel');
    if (payTabCard && payTabWa) {
      const showMethod = (method) => {
        payTabCard.classList.toggle('active', method === 'card');
        payTabWa.classList.toggle('active', method === 'whatsapp');
        payCardPanel.hidden = method !== 'card';
        payWaPanel.hidden = method !== 'whatsapp';
      };
      payTabCard.addEventListener('click', () => showMethod('card'));
      payTabWa.addEventListener('click', () => showMethod('whatsapp'));
    }

    // Formato en vivo de los campos de tarjeta (solo presentación)
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');
    if (cardNumber) {
      cardNumber.addEventListener('input', () => {
        const digits = cardNumber.value.replace(/\D/g, '').slice(0, 16);
        cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
      });
    }
    if (cardExpiry) {
      cardExpiry.addEventListener('input', () => {
        const digits = cardExpiry.value.replace(/\D/g, '').slice(0, 4);
        cardExpiry.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      });
    }
    if (cardCvv) {
      cardCvv.addEventListener('input', () => {
        cardCvv.value = cardCvv.value.replace(/\D/g, '').slice(0, 4);
      });
    }

    // El cobro con tarjeta se activará al conectar una pasarela real (Stripe/Mercado Pago/Conekta o WooCommerce).
    // Por ahora este botón NUNCA envía ni guarda los datos de la tarjeta: solo confirma el pedido por WhatsApp
    // para no perder la venta mientras se activa el cobro en línea.
    const payCardSubmit = document.getElementById('payCardSubmit');
    const payCardNote = document.getElementById('payCardNote');
    if (payCardSubmit) {
      payCardSubmit.addEventListener('click', () => {
        if (!Cart.get().length) return;
        const cardNameEl = document.getElementById('cardName');
        payCardSubmit.disabled = true;
        payCardSubmit.textContent = 'Procesando…';
        setTimeout(() => {
          payCardSubmit.disabled = false;
          const subtotalNow = Cart.subtotal();
          const shippingNow = Cart.get().length ? (subtotalNow >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE) : 0;
          payCardSubmit.innerHTML = `Pagar <span id="payCardAmount">${fmtMXN(subtotalNow + shippingNow)}</span>`;
          if (payCardNote) {
            payCardNote.textContent = 'El cobro con tarjeta se activará muy pronto. Para no detener tu pedido, lo confirmamos por WhatsApp.';
            payCardNote.classList.add('pay-note-info');
          }
          // Nunca se guarda ni se envía el número de tarjeta a ningún lado — solo se limpia el formulario.
          if (cardNumber) cardNumber.value = '';
          if (cardExpiry) cardExpiry.value = '';
          if (cardCvv) cardCvv.value = '';
          if (cardNameEl) cardNameEl.value = '';
          const waLink = document.getElementById('cartWaLink');
          if (waLink) window.open(waLink.href, '_blank', 'noopener');
        }, 900);
      });
    }
  }
  Cart.renderAll();

  // Videos de fondo — forzar reproducción (algunos navegadores la bloquean)
  document.querySelectorAll('.why-targo-video, .footer-video').forEach(v => {
    v.muted = true;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    const retry = setInterval(tryPlay, 1000);
    ['click', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, tryPlay, { once: true });
    });
    v.addEventListener('playing', () => clearInterval(retry));
  });

  // Menú móvil (hamburguesa)
  const mobileNav = document.getElementById('mobileNav');
  const burgers = document.querySelectorAll('.burger');
  if (mobileNav && burgers.length) {
    const setMenu = (open) => {
      mobileNav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      burgers.forEach(b => {
        b.classList.toggle('active', open);
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    };
    burgers.forEach(b => {
      b.addEventListener('click', () => setMenu(!mobileNav.classList.contains('open')));
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setMenu(false));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  // Botón "agregar al carrito" en tarjetas de catálogo/prod-card — ahora agrega de verdad al carrito
  document.querySelectorAll('.prod-card .add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.prod-card');
      if (!card) return;
      let variants = [];
      try { variants = card.dataset.variants ? JSON.parse(card.dataset.variants) : []; } catch (err) { variants = []; }
      const name = card.querySelector('h4')?.textContent.trim() || '';
      let unit, variantLabel = '', img;
      if (variants.length) {
        const select = card.querySelector('.prod-variant-select');
        const idx = select ? (parseInt(select.value, 10) || 0) : 0;
        const v = variants[idx];
        unit = v.price;
        variantLabel = v.label;
        img = v.img;
      } else {
        const priceText = card.querySelector('.price')?.textContent || '0';
        unit = parsePrice(priceText);
        img = card.querySelector('img')?.getAttribute('src') || '';
      }
      Cart.add({ id: `${name}|${variantLabel}`, name, variant: variantLabel, unit, qty: 1, img });

      const original = btn.textContent;
      btn.textContent = 'Agregado ✓';
      setTimeout(() => { btn.textContent = original; }, 1200);
    });
  });

  // Botón "agregar al carrito" en otras secciones sin datos de producto (demo visual, p. ej. banners)
  document.querySelectorAll('.add').forEach(btn => {
    if (btn.closest('.prod-card')) return; // ya manejado arriba
    btn.addEventListener('click', () => {
      const original = btn.textContent;
      btn.textContent = 'Agregado ✓';
      setTimeout(() => { btn.textContent = original; }, 1200);
    });
  });
});
