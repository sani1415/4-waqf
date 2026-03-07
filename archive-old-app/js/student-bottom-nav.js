/**
 * Student Bottom Nav - Scroll indicators and active state sync
 * Mirrors teacher bottom-nav-scroll.js behavior for student tab bar
 */
(function() {
    'use strict';

    var FADE_LEFT_ID = 'studentNavFadeLeft';
    var FADE_RIGHT_ID = 'studentNavFadeRight';
    var NAV_ID = 'studentBottomNav';

    function updateFades() {
        var nav = document.getElementById(NAV_ID);
        var fadeLeft = document.getElementById(FADE_LEFT_ID);
        var fadeRight = document.getElementById(FADE_RIGHT_ID);
        if (!nav || !fadeLeft || !fadeRight) return;

        var scrollLeft = nav.scrollLeft;
        var scrollWidth = nav.scrollWidth;
        var clientWidth = nav.clientWidth;
        var canScrollLeft = scrollLeft > 4;
        var canScrollRight = scrollLeft + clientWidth < scrollWidth - 4;

        fadeLeft.classList.toggle('visible', canScrollLeft);
        fadeRight.classList.toggle('visible', canScrollRight);
    }

    function syncActiveFromRadio() {
        var checked = document.querySelector('input[name="student-tab"]:checked');
        if (!checked) return;
        var nav = document.getElementById(NAV_ID);
        if (!nav) return;
        nav.querySelectorAll('.bottom-nav-item').forEach(function(item) {
            var tabId = item.getAttribute('data-tab');
            item.classList.toggle('active', tabId === checked.id);
        });
    }

    function init() {
        var nav = document.getElementById(NAV_ID);
        if (!nav) return;

        nav.addEventListener('scroll', updateFades);
        window.addEventListener('resize', updateFades);

        // Sync active state when tab radios change
        document.querySelectorAll('input[name="student-tab"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                syncActiveFromRadio();
                updateFades();
            });
        });

        syncActiveFromRadio();
        updateFades();
        requestAnimationFrame(updateFades);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
