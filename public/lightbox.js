(() => {
  const dialog = document.getElementById('lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const img = dialog.querySelector('.lightbox-image');
  const cap = dialog.querySelector('.lightbox-caption');
  const closeBtn = dialog.querySelector('.lightbox-close');

  const open = (src, caption, alt) => {
    img.src = src;
    img.alt = alt || '';
    cap.innerHTML = caption || '';
    cap.hidden = !caption;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
  };

  const close = () => {
    if (dialog.open) dialog.close();
    img.src = '';
    document.documentElement.style.overflow = '';
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.lightbox-trigger');
    if (trigger) {
      e.preventDefault();
      open(
        trigger.dataset.lightboxSrc || trigger.currentSrc || trigger.src,
        trigger.dataset.lightboxCaption || '',
        trigger.alt || ''
      );
      return;
    }
    if (e.target === dialog) close();
  });

  closeBtn?.addEventListener('click', close);
  dialog.addEventListener('close', () => {
    img.src = '';
    document.documentElement.style.overflow = '';
  });
})();
