/**
 * Scrollable Bottom Nav - Fade indicators and scroll-to-active
 * Include this on all teacher pages that have the scrollable bottom nav.
 */
(function() {
    'use strict';

    function updateBottomNavFades() {
        var wrapper = document.querySelector('.bottom-nav-wrapper');
        var nav = document.getElementById('bottomNav');
        var fadeLeft = document.getElementById('bottomNavFadeLeft');
        var fadeRight = document.getElementById('bottomNavFadeRight');
        if (!nav || !fadeLeft || !fadeRight) return;

        var scrollLeft = nav.scrollLeft;
        var scrollWidth = nav.scrollWidth;
        var clientWidth = nav.clientWidth;
        var canScrollLeft = scrollLeft > 4;
        var canScrollRight = scrollLeft + clientWidth < scrollWidth - 4;

        fadeLeft.classList.toggle('visible', canScrollLeft);
        fadeRight.classList.toggle('visible', canScrollRight);
    }

    function initBottomNavScroll() {
        var nav = document.getElementById('bottomNav');
        if (!nav) return;

        nav.addEventListener('scroll', updateBottomNavFades);
        window.addEventListener('resize', updateBottomNavFades);

        updateBottomNavFades();
        requestAnimationFrame(updateBottomNavFades);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBottomNavScroll);
    } else {
        initBottomNavScroll();
    }
})();
