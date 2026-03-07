/**
 * Simple i18n for Waqf - Bengali/English
 * Loads locale JSON, applies to [data-i18n], exposes t(key) for JS.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'waqf_lang';
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en', 'bn'];

  let strings = {};
  let currentLang = DEFAULT_LANG;

  function getBasePath() {
    const script = document.currentScript;
    if (script && script.src) {
      const dir = script.src.replace(/\/[^/]+$/, '');
      return dir.replace(/\/js$/, '');
    }
    return window.location.pathname.replace(/\/[^/]*$/, '') || '';
  }

  function getLocalesPath() {
    const base = getBasePath();
    if (base.indexOf('/pages') !== -1) return base.replace(/\/pages.*$/, '') + '/locales';
    return base + (base.endsWith('/') ? '' : '/') + 'locales';
  }

  function loadLocale(lang) {
    const path = getLocalesPath() + '/' + (SUPPORTED.indexOf(lang) !== -1 ? lang : DEFAULT_LANG) + '.json';
    return fetch(path)
      .then(function (res) { return res.ok ? res.json() : {}; })
      .then(function (data) {
        strings = data || {};
        currentLang = lang;
        return strings;
      })
      .catch(function () {
        strings = {};
        return strings;
      });
  }

  function getStoredLang() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && SUPPORTED.indexOf(stored) !== -1 ? stored : DEFAULT_LANG;
    } catch (e) {
      return DEFAULT_LANG;
    }
  }

  function setStoredLang(lang) {
    try {
      if (SUPPORTED.indexOf(lang) !== -1) localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  }

  function interpolate(str, params) {
    if (!str || typeof str !== 'string') return str;
    if (!params || typeof params !== 'object') return str;
    return str.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
      return params[key] != null ? String(params[key]) : '';
    });
  }

  function t(key, params) {
    const value = strings[key];
    const str = value != null ? String(value) : (key || '');
    return interpolate(str, params);
  }

  function apply() {
    document.documentElement.lang = currentLang === 'bn' ? 'bn' : 'en';
    if (strings['app_title']) document.title = t('app_title');
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
    document.querySelectorAll('.lang-btn[data-lang]').forEach(function (btn) {
      var lang = btn.getAttribute('data-lang');
      btn.classList.toggle('active', lang === currentLang);
      btn.title = lang === 'en' ? t('lang_english') : t('lang_bengali');
    });
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    setStoredLang(lang);
    window.location.reload();
  }

  function init() {
    currentLang = getStoredLang();
    return loadLocale(currentLang).then(function () {
      apply();
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('i18nReady', { detail: { lang: currentLang } }));
      }
    });
  }

  window.t = t;
  window.setLang = setLang;
  window.getLang = function () { return currentLang; };
  window.i18nApply = apply;
  window.i18nReady = init();
})();
