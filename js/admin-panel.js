/* ==========================================================
   Panel de administrador — Mundo Péptidos México
   Se abre al tocar el logo del sitio (cualquier página).
   Si no hay sesión: pide correo + contraseña.
   Si ya hay sesión: abre directo el panel de edición.
   ========================================================== */
(function () {
  'use strict';

  var API = {
    me: '/api/auth/me',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    products: '/api/products',
    product: function (id) { return '/api/products/' + id; },
    upload: '/api/upload',
  };

  var state = {
    authenticated: false,
    email: '',
    products: [],
  };

  /* ---------- Inyección del overlay en el DOM (una sola vez) ---------- */

  function injectMarkup() {
    if (document.getElementById('adminOverlay')) return;

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="admin-overlay" id="adminOverlay">' +
        '<div class="admin-box" role="dialog" aria-modal="true">' +
          '<button type="button" class="admin-close" id="adminClose" aria-label="Cerrar">&times;</button>' +

          '<div class="admin-login-view" id="adminLoginView">' +
            '<div class="admin-brand">' +
              '<img src="img/logo-trim.jpg" alt="Mundo Péptidos México">' +
              '<h3>Panel de administrador</h3>' +
              '<p>Acceso exclusivo para administrar el sitio.</p>' +
            '</div>' +
            '<form id="adminLoginForm" autocomplete="off">' +
              '<div class="admin-field">' +
                '<label for="adminEmail">Correo</label>' +
                '<input type="email" id="adminEmail" required autocomplete="username">' +
              '</div>' +
              '<div class="admin-field admin-field-pass">' +
                '<label for="adminPassword">Contraseña</label>' +
                '<div class="admin-pass-wrap">' +
                  '<input type="password" id="adminPassword" required autocomplete="current-password">' +
                  '<button type="button" class="admin-eye" id="adminEyeBtn" aria-label="Mostrar contraseña">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>' +
                  '</button>' +
                '</div>' +
              '</div>' +
              '<p class="admin-error" id="adminError" hidden></p>' +
              '<button type="submit" class="admin-submit" id="adminSubmitBtn">Entrar</button>' +
            '</form>' +
          '</div>' +

          '<div class="admin-dash-view" id="adminDashView" hidden>' +
            '<div class="admin-dash-head">' +
              '<div>' +
                '<h3>Panel de administrador</h3>' +
                '<p id="adminDashEmail"></p>' +
              '</div>' +
              '<button type="button" class="admin-logout" id="adminLogoutBtn">Cerrar sesión</button>' +
            '</div>' +

            '<div class="admin-dash-toolbar">' +
              '<span id="adminProductCount"></span>' +
              '<button type="button" class="admin-add-btn" id="adminAddBtn">+ Agregar producto</button>' +
            '</div>' +

            '<p class="admin-error" id="adminDashError" hidden></p>' +
            '<div class="admin-product-list" id="adminProductList"></div>' +
          '</div>' +

          '<div class="admin-form-view" id="adminFormView" hidden></div>' +

        '</div>' +
      '</div>';
    document.body.appendChild(wrap.firstElementChild);
  }

  /* ---------- Helpers ---------- */

  function fmt(n) {
    return '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 }) + ' MXN';
  }

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function openOverlay() {
    injectMarkup();
    document.getElementById('adminOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    refreshSession(true);
  }

  function closeOverlay() {
    var ov = document.getElementById('adminOverlay');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function refreshSession(openAfter) {
    try {
      var r = await fetch(API.me, { credentials: 'include' });
      var data = await r.json();
      state.authenticated = !!data.authenticated;
      state.email = data.email || '';
    } catch (e) {
      state.authenticated = false;
    }
    if (openAfter) {
      if (state.authenticated) {
        showDash();
      } else {
        showLogin();
      }
    }
  }

  function showLogin() {
    hide(document.getElementById('adminDashView'));
    hide(document.getElementById('adminFormView'));
    show(document.getElementById('adminLoginView'));
    hide(document.getElementById('adminError'));
    var pass = document.getElementById('adminPassword');
    if (pass) pass.value = '';
  }

  function showDash() {
    hide(document.getElementById('adminLoginView'));
    hide(document.getElementById('adminFormView'));
    show(document.getElementById('adminDashView'));
    document.getElementById('adminDashEmail').textContent = state.email;
    loadProducts();
  }

  async function loadProducts() {
    var listEl = document.getElementById('adminProductList');
    var errEl = document.getElementById('adminDashError');
    hide(errEl);
    listEl.innerHTML = '<p class="admin-loading">Cargando productos…</p>';
    try {
      var r = await fetch(API.products, { credentials: 'include' });
      var data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      state.products = data.products || [];
      renderProductList();
    } catch (e) {
      listEl.innerHTML = '';
      errEl.textContent = 'No se pudieron cargar los productos. ' + (e.message || '');
      show(errEl);
    }
  }

  function renderProductList() {
    var listEl = document.getElementById('adminProductList');
    document.getElementById('adminProductCount').textContent =
      state.products.length + (state.products.length === 1 ? ' producto' : ' productos');

    if (state.products.length === 0) {
      listEl.innerHTML = '<p class="admin-loading">Todavía no hay productos. Agrega el primero.</p>';
      return;
    }

    listEl.innerHTML = state.products.map(function (p) {
      return (
        '<div class="admin-product-row" data-id="' + p.id + '">' +
          '<div class="admin-product-thumb"><img src="' + (p.image || 'img/logo-trim.jpg') + '" alt=""></div>' +
          '<div class="admin-product-info">' +
            '<strong>' + escapeHtml(p.name) + '</strong>' +
            '<span>' + escapeHtml(p.category || '') + (p.mg_label ? ' · ' + escapeHtml(p.mg_label) : '') + '</span>' +
            '<span class="admin-product-price">' + fmt(p.price) + (p.featured ? ' · Destacado' : '') + '</span>' +
          '</div>' +
          '<div class="admin-product-actions">' +
            '<button type="button" class="admin-edit-btn" data-edit="' + p.id + '">Editar</button>' +
            '<button type="button" class="admin-delete-btn" data-delete="' + p.id + '">Eliminar</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Formulario de producto (crear/editar) ---------- */

  function imageFieldMarkup(id, label, currentValue, hintHtml) {
    var hasImg = !!currentValue;
    return (
      '<div class="admin-field admin-image-field">' +
        '<label>' + label + '</label>' +
        '<p class="admin-hint">' + hintHtml + '</p>' +
        '<div class="admin-image-upload">' +
          '<div class="admin-image-preview" id="' + id + 'Preview">' +
            (hasImg ? '<img src="' + escapeHtml(currentValue) + '" alt="">' : '<span>Sin imagen</span>') +
          '</div>' +
          '<div class="admin-image-upload-controls">' +
            '<label class="admin-upload-btn">' +
              'Subir imagen' +
              '<input type="file" accept="image/jpeg,image/png,image/webp" class="admin-image-input" data-target="' + id + '" hidden>' +
            '</label>' +
            '<span class="admin-upload-status" id="' + id + 'Status"></span>' +
          '</div>' +
        '</div>' +
        '<input type="hidden" id="' + id + '" value="' + escapeHtml(currentValue) + '">' +
      '</div>'
    );
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result || '';
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function readImageDimensions(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = function () {
        resolve({ width: null, height: null });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  async function handleImageInputChange(input) {
    var targetId = input.getAttribute('data-target');
    var hiddenInput = document.getElementById(targetId);
    var statusEl = document.getElementById(targetId + 'Status');
    var previewEl = document.getElementById(targetId + 'Preview');
    var file = input.files && input.files[0];
    if (!file) return;

    var ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      statusEl.textContent = 'Formato no permitido. Usa JPG, PNG o WEBP.';
      statusEl.className = 'admin-upload-status admin-upload-error';
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      statusEl.textContent = 'La imagen pesa más de 2.5 MB. Comprímela e intenta de nuevo.';
      statusEl.className = 'admin-upload-status admin-upload-error';
      return;
    }

    statusEl.textContent = 'Subiendo…';
    statusEl.className = 'admin-upload-status';

    try {
      var dims = await readImageDimensions(file);
      var base64 = await fileToBase64(file);

      var r = await fetch(API.upload, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mime_type: file.type,
          data_base64: base64,
          width: dims.width,
          height: dims.height,
        }),
      });
      var data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo subir la imagen');

      hiddenInput.value = data.url;
      previewEl.innerHTML = '<img src="' + data.url + '" alt="">';
      statusEl.textContent = 'Subida correctamente ✓';
      statusEl.className = 'admin-upload-status admin-upload-ok';
    } catch (err) {
      statusEl.textContent = err.message || 'Error al subir la imagen.';
      statusEl.className = 'admin-upload-status admin-upload-error';
    }
  }

  function emptyProduct() {
    return {
      id: null, name: '', category: '', formula: '', mg_label: '', price: 0,
      image: '', coa_image: '', variants: [], featured: false, featured_order: 0,
      sort_order: 0, active: true,
    };
  }

  function openProductForm(product) {
    var p = product ? JSON.parse(JSON.stringify(product)) : emptyProduct();
    var formView = document.getElementById('adminFormView');

    hide(document.getElementById('adminDashView'));
    hide(document.getElementById('adminLoginView'));
    show(formView);

    formView.innerHTML =
      '<div class="admin-form-head">' +
        '<button type="button" class="admin-back-btn" id="adminBackBtn">&larr; Volver</button>' +
        '<h3>' + (p.id ? 'Editar producto' : 'Nuevo producto') + '</h3>' +
      '</div>' +
      '<form id="adminProductForm">' +
        '<div class="admin-field"><label>Nombre</label><input id="pfName" required value="' + escapeHtml(p.name) + '"></div>' +
        '<div class="admin-field-row">' +
          '<div class="admin-field"><label>Categoría</label><input id="pfCategory" value="' + escapeHtml(p.category) + '"></div>' +
          '<div class="admin-field"><label>Presentación (mg / texto corto)</label><input id="pfMg" value="' + escapeHtml(p.mg_label) + '"></div>' +
        '</div>' +
        '<div class="admin-field"><label>Descripción / fórmula</label><input id="pfFormula" value="' + escapeHtml(p.formula) + '"></div>' +
        '<div class="admin-field-row">' +
          '<div class="admin-field"><label>Precio base (MXN)</label><input id="pfPrice" type="number" step="0.01" value="' + p.price + '"></div>' +
          '<div class="admin-field"><label>Orden en catálogo</label><input id="pfSort" type="number" value="' + p.sort_order + '"></div>' +
        '</div>' +
        imageFieldMarkup('pfImage', 'Foto del producto', p.image,
          'Medida recomendada: <strong>720 × 860 px</strong>, vertical (igual a las fotos actuales del catálogo). Fondo blanco, JPG/PNG/WEBP, máximo 2.5 MB.') +
        imageFieldMarkup('pfCoa', 'Imagen del certificado COA (opcional)', p.coa_image,
          'Medida recomendada: <strong>867 × 1280 px</strong>, vertical (igual a los COA actuales). JPG/PNG/WEBP, máximo 2.5 MB.') +

        '<div class="admin-field admin-check-field"><label><input type="checkbox" id="pfFeatured" ' + (p.featured ? 'checked' : '') + '> Mostrar en "Más buscados" (inicio)</label></div>' +
        '<div class="admin-field" id="pfFeaturedOrderWrap" ' + (p.featured ? '' : 'hidden') + '><label>Posición en "Más buscados" (1 = primero)</label><input id="pfFeaturedOrder" type="number" value="' + (p.featured_order || 1) + '"></div>' +
        '<div class="admin-field admin-check-field"><label><input type="checkbox" id="pfActive" ' + (p.active !== false ? 'checked' : '') + '> Producto activo (visible en el sitio)</label></div>' +

        '<div class="admin-variants-block">' +
          '<div class="admin-variants-head"><h4>Presentaciones / variantes</h4><button type="button" class="admin-add-btn admin-add-variant-btn" id="pfAddVariant">+ Agregar presentación</button></div>' +
          '<p class="admin-hint">Si el producto tiene varias presentaciones (ej. 10 mg, 30 mg), agrégalas aquí. Si no tiene, déjalo vacío y se usará el precio base. La imagen de cada presentación es opcional (si no subes una, se usa la foto principal del producto) — misma medida recomendada: 720 × 860 px.</p>' +
          '<div id="pfVariantsList"></div>' +
        '</div>' +

        '<p class="admin-error" id="pfError" hidden></p>' +
        '<div class="admin-form-actions">' +
          '<button type="submit" class="admin-submit" id="pfSaveBtn">Guardar</button>' +
        '</div>' +
      '</form>';

    var variants = p.variants || [];
    renderVariantRows(variants);

    document.getElementById('pfFeatured').addEventListener('change', function (e) {
      document.getElementById('pfFeaturedOrderWrap').hidden = !e.target.checked;
    });

    document.getElementById('adminBackBtn').addEventListener('click', function () {
      hide(formView);
      showDash();
    });

    document.getElementById('pfAddVariant').addEventListener('click', function () {
      variants.push({ label: '', price: 0, img: '', alt: '' });
      renderVariantRows(variants);
    });

    function renderVariantRows(list) {
      var vEl = document.getElementById('pfVariantsList');
      vEl.innerHTML = list.map(function (v, i) {
        var imgId = 'pfvImg' + i;
        return (
          '<div class="admin-variant-row" data-idx="' + i + '">' +
            '<input placeholder="Etiqueta (ej: 30 mg)" class="pfv-label" value="' + escapeHtml(v.label) + '">' +
            '<input placeholder="Precio" type="number" step="0.01" class="pfv-price" value="' + v.price + '">' +
            '<div class="admin-variant-image">' +
              '<div class="admin-image-preview admin-image-preview-sm" id="' + imgId + 'Preview">' +
                (v.img ? '<img src="' + escapeHtml(v.img) + '" alt="">' : '<span>—</span>') +
              '</div>' +
              '<label class="admin-upload-btn admin-upload-btn-sm">' +
                'Subir' +
                '<input type="file" accept="image/jpeg,image/png,image/webp" class="admin-image-input" data-target="' + imgId + '" hidden>' +
              '</label>' +
              '<input type="hidden" class="pfv-img" id="' + imgId + '" value="' + escapeHtml(v.img || '') + '">' +
            '</div>' +
            '<button type="button" class="admin-variant-remove" data-remove-idx="' + i + '">&times;</button>' +
          '</div>' +
          '<p class="admin-upload-status admin-upload-status-sm" id="' + imgId + 'Status"></p>'
        );
      }).join('');

      vEl.querySelectorAll('[data-remove-idx]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = Number(btn.getAttribute('data-remove-idx'));
          variants.splice(idx, 1);
          renderVariantRows(variants);
        });
      });
    }

    document.getElementById('adminProductForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var errEl = document.getElementById('pfError');
      hide(errEl);

      // Recolectar variantes desde el DOM actual
      var rows = document.querySelectorAll('#pfVariantsList .admin-variant-row');
      var finalVariants = [];
      rows.forEach(function (row) {
        var label = row.querySelector('.pfv-label').value.trim();
        var price = Number(row.querySelector('.pfv-price').value || 0);
        var img = row.querySelector('.pfv-img').value.trim();
        if (label) finalVariants.push({ label: label, price: price, img: img, alt: label });
      });

      var payload = {
        name: document.getElementById('pfName').value.trim(),
        category: document.getElementById('pfCategory').value.trim(),
        formula: document.getElementById('pfFormula').value.trim(),
        mg_label: document.getElementById('pfMg').value.trim(),
        price: Number(document.getElementById('pfPrice').value || 0),
        sort_order: Number(document.getElementById('pfSort').value || 0),
        image: document.getElementById('pfImage').value.trim(),
        coa_image: document.getElementById('pfCoa').value.trim(),
        featured: document.getElementById('pfFeatured').checked,
        featured_order: Number(document.getElementById('pfFeaturedOrder').value || 0),
        active: document.getElementById('pfActive').checked,
        variants: finalVariants,
      };

      if (!payload.name) {
        errEl.textContent = 'El nombre es obligatorio.';
        show(errEl);
        return;
      }

      var saveBtn = document.getElementById('pfSaveBtn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando…';

      try {
        var url = p.id ? API.product(p.id) : API.products;
        var method = p.id ? 'PUT' : 'POST';
        var r = await fetch(url, {
          method: method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No se pudo guardar');

        hide(formView);
        showDash();
      } catch (err) {
        errEl.textContent = err.message || 'Error al guardar.';
        show(errEl);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar';
      }
    });
  }

  /* ---------- Eventos globales (login, logout, lista) ---------- */

  function bindStaticEvents() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;

      if (t.closest('#adminClose')) {
        closeOverlay();
        return;
      }
      if (t.id === 'adminOverlay') {
        closeOverlay();
        return;
      }
      if (t.closest('#adminEyeBtn')) {
        var input = document.getElementById('adminPassword');
        if (input.type === 'password') { input.type = 'text'; } else { input.type = 'password'; }
        return;
      }
      if (t.closest('#adminAddBtn')) {
        openProductForm(null);
        return;
      }
      if (t.closest('#adminLogoutBtn')) {
        fetch(API.logout, { method: 'POST', credentials: 'include' }).then(function () {
          state.authenticated = false;
          showLogin();
        });
        return;
      }
      var editBtn = t.closest('[data-edit]');
      if (editBtn) {
        var editId = editBtn.getAttribute('data-edit');
        var prod = state.products.find(function (x) { return String(x.id) === String(editId); });
        if (prod) openProductForm(prod);
        return;
      }
      var delBtn = t.closest('[data-delete]');
      if (delBtn) {
        var delId = delBtn.getAttribute('data-delete');
        if (window.confirm('¿Eliminar este producto del sitio? (se puede reactivar después si hace falta)')) {
          fetch(API.product(delId), { method: 'DELETE', credentials: 'include' })
            .then(function (r) { return r.json(); })
            .then(function () { loadProducts(); });
        }
        return;
      }
    });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('admin-image-input')) {
        handleImageInputChange(t);
      }
    });

    document.addEventListener('submit', function (e) {
      if (e.target && e.target.id === 'adminLoginForm') {
        e.preventDefault();
        var email = document.getElementById('adminEmail').value.trim();
        var password = document.getElementById('adminPassword').value;
        var errEl = document.getElementById('adminError');
        var btn = document.getElementById('adminSubmitBtn');
        hide(errEl);
        btn.disabled = true;
        btn.textContent = 'Entrando…';

        fetch(API.login, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password }),
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            btn.disabled = false;
            btn.textContent = 'Entrar';
            if (!res.ok) {
              errEl.textContent = res.data.error || 'No se pudo iniciar sesión.';
              show(errEl);
              return;
            }
            state.authenticated = true;
            state.email = res.data.email;
            showDash();
          })
          .catch(function () {
            btn.disabled = false;
            btn.textContent = 'Entrar';
            errEl.textContent = 'Error de conexión. Intenta de nuevo.';
            show(errEl);
          });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeOverlay();
    });
  }

  function interceptLogoClicks() {
    document.querySelectorAll('a.logo').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openOverlay();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectMarkup();
    bindStaticEvents();
    interceptLogoClicks();
  });
})();
