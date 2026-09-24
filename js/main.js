// Mundo Péptidos México — interactividad básica del prototipo

document.addEventListener('DOMContentLoaded', () => {
  // Marcar link activo en nav según la página actual
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.primary a').forEach(a => {
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

  // Botón "agregar al carrito" — demo visual
  document.querySelectorAll('.add').forEach(btn => {
    btn.addEventListener('click', () => {
      const original = btn.textContent;
      btn.textContent = 'Agregado ✓';
      setTimeout(() => { btn.textContent = original; }, 1200);
    });
  });
});
