/**
 * Hijri Date Formatting - Bangladesh
 * Uses Intl API with islamic-umalqura calendar.
 * Bangladesh Hijri is typically 1 day behind Saudi - we apply offset.
 */
(function() {
    'use strict';

    var BANGLADESH_OFFSET_DAYS = 1;
    var USE_HIJRI_KEY = 'waqf_use_hijri';

    function getUseHijri() {
        try {
            var stored = localStorage.getItem(USE_HIJRI_KEY);
            return stored === null || stored === 'true';
        } catch (e) {
            return true;
        }
    }

    function setUseHijri(use) {
        try {
            localStorage.setItem(USE_HIJRI_KEY, String(use));
        } catch (e) {}
    }

    function applyBangladeshOffset(date) {
        var d = new Date(date);
        d.setDate(d.getDate() - BANGLADESH_OFFSET_DAYS);
        return d;
    }

    function formatHijri(date, options) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
        var d = applyBangladeshOffset(date);
        var opts = options || {};
        var locale = opts.locale || (typeof getLang === 'function' ? getLang() : 'en');
        locale = locale === 'bn' ? 'bn' : 'en';
        var defaults = {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            calendar: 'islamic-umalqura'
        };
        var merged = Object.assign({}, defaults, opts);
        try {
            var formatter = new Intl.DateTimeFormat(locale, merged);
            var parts = formatter.formatToParts(d);
            var withoutEra = parts.filter(function(p) { return p.type !== 'era'; });
            var day = withoutEra.find(function(p) { return p.type === 'day'; });
            var month = withoutEra.find(function(p) { return p.type === 'month'; });
            var year = withoutEra.find(function(p) { return p.type === 'year'; });
            if (opts.weekday === undefined && day && month && year) return day.value + '/' + month.value + '/' + year.value;
            return withoutEra.map(function(p) { return p.value; }).join('').replace(/\s+/g, ' ').trim();
        } catch (e) {
            var formatter = new Intl.DateTimeFormat('en', merged);
            var parts = formatter.formatToParts(d);
            var withoutEra = parts.filter(function(p) { return p.type !== 'era'; });
            var day = withoutEra.find(function(p) { return p.type === 'day'; });
            var month = withoutEra.find(function(p) { return p.type === 'month'; });
            var year = withoutEra.find(function(p) { return p.type === 'year'; });
            if (opts.weekday === undefined && day && month && year) return day.value + '/' + month.value + '/' + year.value;
            return withoutEra.map(function(p) { return p.value; }).join('').replace(/\s+/g, ' ').trim();
        }
    }

    function formatHijriShort(date) {
        return formatHijri(date, { month: '2-digit', day: '2-digit', year: 'numeric' });
    }

    function formatHijriMonthDay(date) {
        return formatHijri(date, { month: 'short', day: 'numeric' });
    }

    function formatDateDisplayDayOnly(dateInput) {
        if (!dateInput) return '';
        var date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        if (!getUseHijri()) return String(date.getDate());
        var d = applyBangladeshOffset(date);
        var locale = (typeof getLang === 'function' ? getLang() : 'en') === 'bn' ? 'bn' : 'en';
        try {
            var formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', calendar: 'islamic-umalqura' });
            var parts = formatter.formatToParts(d);
            var dayPart = parts.find(function(p) { return p.type === 'day'; });
            return dayPart ? dayPart.value : String(date.getDate());
        } catch (e) {
            return String(date.getDate());
        }
    }

    function formatDateDisplayMonthYear(dateInput) {
        if (!dateInput) return '';
        var date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        if (!getUseHijri()) {
            var loc = (typeof getLang === 'function' ? getLang() : 'en') === 'bn' ? 'bn' : 'en';
            return date.toLocaleDateString(loc === 'bn' ? 'bn' : undefined, { month: 'long', year: '2-digit' });
        }
        var d = applyBangladeshOffset(date);
        var locale = (typeof getLang === 'function' ? getLang() : 'en') === 'bn' ? 'bn' : 'en';
        try {
            var formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: '2-digit', calendar: 'islamic-umalqura' });
            var parts = formatter.formatToParts(d);
            var withoutEra = parts.filter(function(p) { return p.type !== 'era'; });
            var month = withoutEra.find(function(p) { return p.type === 'month'; });
            var year = withoutEra.find(function(p) { return p.type === 'year'; });
            return (month ? month.value : '') + (month && year ? ' ' : '') + (year ? year.value : '');
        } catch (e) {
            return date.toLocaleDateString('en', { month: 'long', year: '2-digit' });
        }
    }

    function formatHijriLong(date) {
        return formatHijri(date, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Main formatter - use throughout the app.
     * When Hijri is enabled, returns Hijri (Bangladesh). Otherwise Gregorian.
     */
    function formatDateDisplay(dateInput, options) {
        if (!dateInput) return '';
        var date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        if (!getUseHijri()) {
            var opt = options || {};
            if (opt.day !== undefined || opt.month !== undefined || opt.weekday !== undefined) {
                var loc = opt.locale || (typeof getLang === 'function' ? getLang() : 'en');
                try {
                    return date.toLocaleDateString(loc === 'bn' ? 'bn' : undefined, opt);
                } catch (e) {
                    return date.toLocaleDateString(undefined, opt);
                }
            }
            var d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear() % 100;
            return String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + String(y).padStart(2, '0');
        }
        if (options && (options.month !== undefined || options.weekday !== undefined)) {
            return formatHijri(date, options);
        }
        return formatHijri(date, { day: '2-digit', month: '2-digit', year: '2-digit' });
    }

    function formatDateDisplayShort(dateInput) {
        return formatDateDisplay(dateInput, { month: '2-digit', day: '2-digit', year: '2-digit' });
    }

    function formatDateDisplayLong(dateInput) {
        return formatDateDisplay(dateInput, {
            weekday: 'long',
            year: '2-digit',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatDateTimeDisplay(dateInput) {
        if (!dateInput) return '';
        var date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        var loc = typeof getLang === 'function' ? getLang() : 'en';
        var timeStr = date.toLocaleTimeString(loc === 'bn' ? 'bn' : undefined, { hour: '2-digit', minute: '2-digit' });
        return formatDateDisplay(date) + ' ' + timeStr;
    }

    window.formatDateDisplay = formatDateDisplay;
    window.formatDateDisplayDayOnly = formatDateDisplayDayOnly;
    window.formatDateDisplayMonthYear = formatDateDisplayMonthYear;
    window.formatDateDisplayShort = formatDateDisplayShort;
    window.formatDateDisplayLong = formatDateDisplayLong;
    window.formatDateTimeDisplay = formatDateTimeDisplay;
    window.formatHijri = formatHijri;
    window.getUseHijri = getUseHijri;
    window.setUseHijri = setUseHijri;

    function initDateFormatToggle(container) {
        if (!container) return;
        var btn = document.createElement('button');
        btn.className = 'date-format-btn';
        btn.type = 'button';
        btn.title = 'Toggle date format: Hijri (Islamic) / Gregorian';
        btn.setAttribute('aria-label', 'Toggle date format');
        function updateLabel() {
            btn.textContent = getUseHijri() ? '📅 Hijri' : '📅 Greg';
            btn.classList.toggle('active', getUseHijri());
        }
        updateLabel();
        btn.addEventListener('click', function() {
            setUseHijri(!getUseHijri());
            location.reload();
        });
        container.appendChild(btn);
    }

    function initAllDateFormatToggles() {
        document.querySelectorAll('.date-format-toggle').forEach(initDateFormatToggle);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllDateFormatToggles);
    } else {
        initAllDateFormatToggles();
    }
})();
