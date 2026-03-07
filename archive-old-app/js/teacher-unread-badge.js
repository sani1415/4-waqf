/**
 * Teacher Unread Messages Badge
 * Runs on all teacher pages - updates sidebar and bottom nav badges
 */
(function() {
    'use strict';

    async function updateUnreadBadge() {
        if (typeof dataManager === 'undefined' || !dataManager.initialized) return;
        const students = await dataManager.getStudents();
        const counts = await Promise.all(students.map(function(s) { return dataManager.getUnreadCount(s.id, 'teacher'); }));
        const totalUnread = counts.reduce(function(sum, c) { return sum + c; }, 0);
        const show = totalUnread > 0;
        const countText = totalUnread > 99 ? '99+' : String(totalUnread);

        var sidebarBadge = document.getElementById('totalUnreadBadge');
        if (sidebarBadge) {
            sidebarBadge.textContent = countText;
            sidebarBadge.style.display = show ? 'inline-block' : 'none';
        }

        var navBadge = document.getElementById('messagesUnreadBadgeNav');
        if (navBadge) {
            navBadge.textContent = countText;
            navBadge.style.display = show ? 'inline-block' : 'none';
        }
    }

    function init() {
        if (typeof isTeacherLoggedIn === 'function' && !isTeacherLoggedIn()) return;
        updateUnreadBadge();
        setInterval(updateUnreadBadge, 3000);
    }

    if (typeof dataManager !== 'undefined' && dataManager.initialized) {
        init();
    } else {
        window.addEventListener('dataManagerReady', init);
    }
})();
