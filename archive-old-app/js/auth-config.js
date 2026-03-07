/**
 * Auth Config - Teacher credentials and auth helpers
 * Teacher ID + PIN stored in localStorage (can be moved to Firestore later)
 */

const AUTH_KEYS = {
    TEACHER_LOGGED_IN: 'teacherLoggedIn',
    TEACHER_ID: 'teacherId',
    TEACHER_PIN: 'teacherPin',
    CURRENT_STUDENT_ID: 'currentStudentId',
    STUDENT_LOGGED_IN: 'studentLoggedIn'
};

// Default teacher credentials (used when not yet configured)
const DEFAULT_TEACHER_ID = 'teacher';
const DEFAULT_TEACHER_PIN = '5678';

function getTeacherCredentials() {
    try {
        const id = localStorage.getItem(AUTH_KEYS.TEACHER_ID) || DEFAULT_TEACHER_ID;
        const pin = localStorage.getItem(AUTH_KEYS.TEACHER_PIN) || DEFAULT_TEACHER_PIN;
        return { id, pin };
    } catch (e) {
        return { id: DEFAULT_TEACHER_ID, pin: DEFAULT_TEACHER_PIN };
    }
}

function setTeacherCredentials(id, pin) {
    localStorage.setItem(AUTH_KEYS.TEACHER_ID, id);
    localStorage.setItem(AUTH_KEYS.TEACHER_PIN, pin);
}

function isTeacherLoggedIn() {
    return sessionStorage.getItem(AUTH_KEYS.TEACHER_LOGGED_IN) === 'true';
}

function setTeacherLoggedIn(value) {
    if (value) {
        sessionStorage.setItem(AUTH_KEYS.TEACHER_LOGGED_IN, 'true');
    } else {
        sessionStorage.removeItem(AUTH_KEYS.TEACHER_LOGGED_IN);
    }
}

function isStudentLoggedIn() {
    return sessionStorage.getItem(AUTH_KEYS.STUDENT_LOGGED_IN) === 'true' && sessionStorage.getItem(AUTH_KEYS.CURRENT_STUDENT_ID);
}

function setStudentLoggedIn(studentId) {
    if (studentId) {
        sessionStorage.setItem(AUTH_KEYS.STUDENT_LOGGED_IN, 'true');
        sessionStorage.setItem(AUTH_KEYS.CURRENT_STUDENT_ID, String(studentId));
    } else {
        sessionStorage.removeItem(AUTH_KEYS.STUDENT_LOGGED_IN);
        sessionStorage.removeItem(AUTH_KEYS.CURRENT_STUDENT_ID);
        sessionStorage.removeItem('currentStudentId'); // legacy
    }
}

function getCurrentStudentId() {
    return sessionStorage.getItem(AUTH_KEYS.CURRENT_STUDENT_ID) || sessionStorage.getItem('currentStudentId');
}

function logoutTeacher() {
    setTeacherLoggedIn(false);
}

function logoutStudent() {
    setStudentLoggedIn(null);
}

// Expose for use in other scripts
if (typeof window !== 'undefined') {
    window.AUTH_KEYS = AUTH_KEYS;
    window.getTeacherCredentials = getTeacherCredentials;
    window.setTeacherCredentials = setTeacherCredentials;
    window.isTeacherLoggedIn = isTeacherLoggedIn;
    window.setTeacherLoggedIn = setTeacherLoggedIn;
    window.isStudentLoggedIn = isStudentLoggedIn;
    window.setStudentLoggedIn = setStudentLoggedIn;
    window.getCurrentStudentId = getCurrentStudentId;
    window.logoutTeacher = logoutTeacher;
    window.logoutStudent = logoutStudent;
}
