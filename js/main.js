// Mundo Péptidos México — interactividad básica del prototipo

document.addEventListener('DOMContentLoaded', () => {
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

  // Filtro de categorías en catálogo (demo visual)
  document.querySelectorAll('.filter-box .cats li').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('.filter-box .cats li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
    });
  });

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

  // Carrusel "Productos destacados" (estilo best-sellers)
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
    bsPanels.forEach(panel => {
      panel.addEventListener('wheel', (e) => {
        if (panel.hidden) return;
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

  // Botón "agregar al carrito" — demo visual
  document.querySelectorAll('.add').forEach(btn => {
    btn.addEventListener('click', () => {
      const original = btn.textContent;
      btn.textContent = 'Agregado ✓';
      setTimeout(() => { btn.textContent = original; }, 1200);
    });
  });
});
