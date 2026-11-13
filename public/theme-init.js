(function () {
  try {
    var t = localStorage.getItem('baraka.theme');
    var isDark = t ? t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) : true;
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
