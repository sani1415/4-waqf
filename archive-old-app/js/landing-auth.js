/**
 * Landing Auth - Login modal and validation for Teacher & Student
 */
(function() {
    'use strict';

    let dataManager = null;
    let currentLoginRole = null; // 'teacher' | 'student'

    function getDataManager() {
        if (dataManager) return dataManager;
        if (typeof window.dataManager !== 'undefined' && window.dataManager) return window.dataManager;
        return null;
    }

    function showLoginModal(role) {
        currentLoginRole = role;
        const modal = document.getElementById('loginModal');
        const title = document.getElementById('loginModalTitle');
        const form = document.getElementById('loginForm');
        const idInput = document.getElementById('loginId');
        const pinInput = document.getElementById('loginPin');
        const errorEl = document.getElementById('loginError');

        if (!modal) return;

        form.reset();
        errorEl.style.display = 'none';
        errorEl.textContent = '';

        if (role === 'teacher') {
            title.setAttribute('data-i18n', 'teacher_login');
            title.textContent = typeof window.t === 'function' ? window.t('teacher_login') : 'Teacher Login';
            idInput.placeholder = 'e.g. teacher';
        } else {
            title.setAttribute('data-i18n', 'student_login');
            title.textContent = typeof window.t === 'function' ? window.t('student_login') : 'Student Login';
            idInput.placeholder = 'e.g. waqf-001';
        }

        modal.style.display = 'flex';
        idInput.focus();
    }

    function closeLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) modal.style.display = 'none';
        currentLoginRole = null;
    }

    function showLoginError(msg) {
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
    }

    async function handleTeacherLogin(id, pin) {
        const creds = getTeacherCredentials();
        const idMatch = String(id || '').trim().toLowerCase() === String(creds.id || '').toLowerCase();
        const pinMatch = String(pin || '').trim() === String(creds.pin || '');
        if (idMatch && pinMatch) {
            setTeacherLoggedIn(true);
            window.location.href = '/pages/teacher-dashboard.html';
        } else {
            showLoginError(typeof window.t === 'function' ? window.t('login_invalid_credentials') : 'Invalid ID or PIN');
        }
    }

    async function handleStudentLogin(id, pin) {
        const dm = getDataManager();
        if (!dm) {
            showLoginError(typeof window.t === 'function' ? window.t('login_loading') : 'Please wait, loading...');
            return;
        }
        const student = await dm.validateStudentLogin(id, pin);
        if (student) {
            setStudentLoggedIn(student.id);
            sessionStorage.setItem('currentStudentId', String(student.id));
            window.location.href = '/pages/student-dashboard.html';
        } else {
            showLoginError(typeof window.t === 'function' ? window.t('login_invalid_credentials') : 'Invalid ID or PIN');
        }
    }

    async function handleLoginSubmit(e) {
        e.preventDefault();
        const idInput = document.getElementById('loginId');
        const pinInput = document.getElementById('loginPin');
        const submitBtn = document.getElementById('loginSubmitBtn');
        const id = (idInput && idInput.value) ? idInput.value.trim() : '';
        const pin = (pinInput && pinInput.value) ? pinInput.value.trim() : '';

        if (!id || !pin) {
            showLoginError(typeof window.t === 'function' ? window.t('login_required') : 'Please enter ID and PIN');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (typeof window.t === 'function' ? window.t('loading') : 'Loading...');
        }

        try {
            if (currentLoginRole === 'teacher') {
                await handleTeacherLogin(id, pin);
            } else if (currentLoginRole === 'student') {
                await handleStudentLogin(id, pin);
            }
        } catch (err) {
            console.error('Login error:', err);
            showLoginError(typeof window.t === 'function' ? window.t('login_error') : 'An error occurred. Please try again.');
        }

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ' + (typeof window.t === 'function' ? window.t('login') : 'Login');
        }
    }

    function setupEventListeners() {
        document.getElementById('teacherCard').addEventListener('click', function() {
            showLoginModal('teacher');
        });
        document.getElementById('studentCard').addEventListener('click', function() {
            showLoginModal('student');
        });
        const spreadsheetCard = document.getElementById('spreadsheetCard');
        if (spreadsheetCard) {
            spreadsheetCard.addEventListener('click', function() {
                window.location.href = '/pages/task-sheet.html';
            });
        }

        document.getElementById('loginModalClose').addEventListener('click', closeLoginModal);
        document.getElementById('loginModal').addEventListener('click', function(e) {
            if (e.target === this) closeLoginModal();
        });
        document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
    }

    function init() {
        setupEventListeners();
        window.addEventListener('dataManagerReady', function() {
            dataManager = window.dataManager || null;
        });
        if (window.dataManager) dataManager = window.dataManager;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
