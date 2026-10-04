/* Local video lifecycle: user-triggered, never auto-plays or auto-sounds. */
(function () {
  'use strict';
  let video = null;

  function release() {
    if (!video) return;
    try { video.pause(); video.currentTime = 0; video.muted = true; } catch (error) { /* ignore */ }
    video = null;
  }

  function activate(slideEl) {
    video = slideEl.querySelector('video');
    if (!video) return;
    video.muted = true;
    video.addEventListener('error', () => {
      if (!video.isConnected) return;
      const status = slideEl.querySelector('.video-status');
      if (status) {
        status.className = 'video-fallback';
        status.textContent = '视频无法加载：' + (video.getAttribute('src') || '(未配置)') + '。已保留封面与说明，可继续翻页。';
      }
    }, { once: true });
  }

  function handleKey(key) {
    if (!video) return false;
    if (key === 'p' || key === 'P') {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
      return true;
    }
    if (key === 'm' || key === 'M') { video.muted = !video.muted; return true; }
    return false;
  }

  window.Media = { activate, release, handleKey, get active() { return !!video; } };
})();
