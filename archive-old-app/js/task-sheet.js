/**
 * Task Sheet - Daily tasks with PIN-per-row unlock (no login)
 * Students tap name, enter PIN, mark tasks. Auto-save. Tap elsewhere to lock.
 */
(function() {
    'use strict';

    let selectedDate = new Date();
    let unlockedStudentId = null;
    let students = [];
    let dailyTasks = [];
    const t = (k) => (typeof window.t === 'function' ? window.t(k) : k);

    function getDateString(d) {
        const date = d instanceof Date ? d : new Date(d);
        return date.toISOString().split('T')[0];
    }

    function isToday(d) {
        return getDateString(d) === getDateString(new Date());
    }

    function formatDateForSheet(d) {
        const date = d instanceof Date ? d : new Date(d);
        const formattedDate = (typeof window.formatDateDisplay === 'function' ? window.formatDateDisplay(date) : null) || date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
        if (isToday(date)) return (t('today') || 'Today') + ' - ' + formattedDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (getDateString(date) === getDateString(yesterday)) return (t('yesterday') || 'Yesterday') + ' - ' + formattedDate;
        return formattedDate;
    }

    function escHtml(s) {
        const div = document.createElement('div');
        div.textContent = s || '';
        return div.innerHTML;
    }

    function lockRow() {
        unlockedStudentId = null;
        document.querySelectorAll('.task-sheet-table tbody tr.unlocked').forEach(r => r.classList.remove('unlocked'));
        document.querySelectorAll('.task-sheet-table .task-cell input[type="checkbox"]').forEach(cb => cb.disabled = true);
    }

    function unlockRow(studentId) {
        lockRow();
        unlockedStudentId = studentId;
        const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
        if (row) row.classList.add('unlocked');
        document.querySelectorAll(`.task-cell input[data-student-id="${studentId}"]`).forEach(cb => {
            cb.disabled = false;
        });
    }

    function closePinModal() {
        document.getElementById('pinModal').style.display = 'none';
        document.getElementById('pinInput').value = '';
        document.getElementById('pinError').style.display = 'none';
    }

    function showPinModal(student) {
        document.getElementById('pinStudentName').textContent = student.name || student.studentId || 'Student';
        document.getElementById('pinModal').dataset.studentId = String(student.id);
        document.getElementById('pinInput').value = '';
        document.getElementById('pinError').style.display = 'none';
        document.getElementById('pinModal').style.display = 'flex';
        document.getElementById('pinInput').focus();
    }

    async function handlePinConfirm() {
        const studentId = document.getElementById('pinModal').dataset.studentId;
        const pin = document.getElementById('pinInput').value.trim();
        const errorEl = document.getElementById('pinError');

        if (!pin) {
            errorEl.textContent = t('pin_required') || 'Please enter your PIN';
            errorEl.style.display = 'block';
            return;
        }

        const student = students.find(s => String(s.id) === String(studentId));
        if (!student) return;

        const storedPin = (student.pin || '1234').toString().trim();
        if (pin !== storedPin) {
            errorEl.textContent = t('pin_incorrect') || 'Incorrect PIN';
            errorEl.style.display = 'block';
            return;
        }

        closePinModal();
        unlockRow(studentId);
        await loadSheet(true);
    }

    async function handleCheckboxChange(taskId, studentId) {
        if (!dataManager) return;
        await dataManager.toggleDailyTaskCompletion(taskId, studentId);
        await loadSheet(true);
    }

    async function loadSheet(preserveUnlock = false) {
        const loadingEl = document.getElementById('sheetLoading');
        const emptyEl = document.getElementById('sheetEmpty');
        const tableWrap = document.getElementById('sheetTableWrap');
        const dateDisplay = document.getElementById('selectedDateDisplay');
        const datePicker = document.getElementById('datePicker');
        const badge = document.getElementById('dateModeBadge');

        loadingEl.style.display = 'block';
        emptyEl.style.display = 'none';
        tableWrap.style.display = 'none';

        if (!dataManager || !dataManager.initialized) {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
            emptyEl.querySelector('p').textContent = t('loading') || 'Loading...';
            return;
        }

        students = await dataManager.getStudents();
        const tasks = await dataManager.getTasks();
        dailyTasks = tasks.filter(t => t.type === 'daily');

        dateDisplay.textContent = formatDateForSheet(selectedDate);
        datePicker.value = getDateString(selectedDate);
        const editable = isToday(selectedDate);
        badge.textContent = editable ? (t('editable') || 'Editable') : (t('view_only') || 'View only');
        badge.className = 'date-mode-badge ' + (editable ? 'editable' : 'readonly');

        if (!preserveUnlock) lockRow();

        if (students.length === 0 || dailyTasks.length === 0) {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
            const tapHint = document.getElementById('sheetTapHint');
            if (tapHint) tapHint.style.display = 'none';
            return;
        }

        const dateStr = getDateString(selectedDate);
        const studentIds = students.map(s => s.id);

        const completionMap = {};
        for (const task of dailyTasks) {
            for (const sid of studentIds) {
                const key = `${task.id}-${sid}`;
                completionMap[key] = await dataManager.isDailyTaskCompletedForDate(task.id, sid, dateStr);
            }
        }

        const studentStats = students.map(student => {
            let completed = 0, total = 0;
            for (const task of dailyTasks) {
                const isAssigned = task.assignedTo && task.assignedTo.some(s => String(s) === String(student.id));
                if (isAssigned) {
                    total++;
                    if (completionMap[`${task.id}-${student.id}`]) completed++;
                }
            }
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { student, completed, total, pct };
        });

        const statMap = {};
        studentStats.forEach(s => { statMap[s.student.id] = s; });

        const thead = document.getElementById('sheetTableHead');
        const tbody = document.getElementById('sheetTableBody');

        const taskHeaders = dailyTasks.map(tk => `<th class="task-col" title="${escHtml(tk.title)}">${escHtml((tk.title || 'Task').substring(0, 12))}</th>`).join('');
        thead.innerHTML = `
            <tr>
                <th class="student-col">${t('student') || 'Student'}</th>
                ${taskHeaders}
                <th class="pct-col">%</th>
            </tr>
        `;

        tbody.innerHTML = students.map(student => {
            const stat = statMap[student.id] || { pct: 0 };
            const taskCells = dailyTasks.map(task => {
                const isAssigned = task.assignedTo && task.assignedTo.some(s => String(s) === String(student.id));
                const completed = completionMap[`${task.id}-${student.id}`];
                const canEdit = editable && unlockedStudentId === String(student.id);
                if (!isAssigned) {
                    return `<td class="task-cell"><span class="status-icon na">—</span></td>`;
                }
                if (editable && canEdit) {
                    return `<td class="task-cell">
                        <input type="checkbox" class="task-checkbox" data-task-id="${escHtml(String(task.id))}" data-student-id="${escHtml(String(student.id))}" 
                            ${completed ? 'checked' : ''}>
                    </td>`;
                }
                return `<td class="task-cell">
                    <span class="status-icon ${completed ? 'done' : 'pending'}">${completed ? '✓' : '✗'}</span>
                </td>`;
            }).join('');

            const cursorStyle = editable ? ' style="cursor:pointer"' : '';
            return `
                <tr data-student-id="${escHtml(String(student.id))}" data-editable="${editable ? '1' : '0'}"${cursorStyle}>
                    <td class="student-col"><div class="student-name">${escHtml(student.name)}</div>${student.studentId ? `<div class="student-id">${escHtml(student.studentId)}</div>` : ''}</td>
                    ${taskCells}
                    <td class="pct-col">${stat.pct}%</td>
                </tr>
            `;
        }).join('');

        if (unlockedStudentId) {
            document.querySelectorAll(`.task-cell input[data-student-id="${unlockedStudentId}"]`).forEach(cb => cb.disabled = false);
            const row = document.querySelector(`tr[data-student-id="${unlockedStudentId}"]`);
            if (row) row.classList.add('unlocked');
        } else {
            document.querySelectorAll('.task-cell input').forEach(cb => cb.disabled = true);
        }

        loadingEl.style.display = 'none';
        tableWrap.style.display = 'block';

        const tapHint = document.getElementById('sheetTapHint');
        if (tapHint) tapHint.style.display = editable ? 'block' : 'none';

        setupTableRowClicks();
        setupCheckboxChanges();

        if (typeof applyI18n === 'function') applyI18n();
    }

    function handleRowClick(studentId) {
        if (!isToday(selectedDate)) return;
        if (unlockedStudentId === studentId) return;
        const student = students.find(s => String(s.id) === String(studentId));
        if (student) showPinModal(student);
    }

    function setupTableRowClicks() {
        document.removeEventListener('click', _tableRowClickHandler, true);
        document.addEventListener('click', _tableRowClickHandler, true);
    }
    function _tableRowClickHandler(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.type === 'checkbox') return;
        const table = document.getElementById('taskSheetTable');
        if (!table || !table.contains(e.target)) return;
        const tr = e.target.closest('tr[data-student-id][data-editable="1"]');
        if (!tr) return;
        e.preventDefault();
        const studentId = tr.getAttribute('data-student-id');
        if (studentId) handleRowClick(studentId);
    }

    function setupCheckboxChanges() {
        document.removeEventListener('change', _checkboxChangeHandler, true);
        document.addEventListener('change', _checkboxChangeHandler, true);
    }
    async function _checkboxChangeHandler(e) {
        if (e.target.type !== 'checkbox' || !e.target.classList.contains('task-checkbox')) return;
        const table = document.getElementById('taskSheetTable');
        if (!table || !table.contains(e.target)) return;
        const taskId = e.target.getAttribute('data-task-id');
        const studentId = e.target.getAttribute('data-student-id');
        if (taskId && studentId) await handleCheckboxChange(taskId, studentId);
    }

    function setupClickOutsideToLock() {
        document.addEventListener('click', function(e) {
            if (!isToday(selectedDate)) return;
            if (!unlockedStudentId) return;
            const table = document.getElementById('taskSheetTable');
            const modal = document.getElementById('pinModal');
            if (table && !table.contains(e.target) && modal && !modal.contains(e.target)) {
                lockRow();
            }
        });
    }

    function init() {
        document.getElementById('pinConfirmBtn').addEventListener('click', handlePinConfirm);
        document.getElementById('pinCancelBtn').addEventListener('click', closePinModal);
        document.getElementById('pinInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') handlePinConfirm();
            if (e.key === 'Escape') closePinModal();
        });
        document.getElementById('pinModal').addEventListener('click', function(e) {
            if (e.target === this) closePinModal();
        });

        document.getElementById('prevDateBtn').addEventListener('click', () => {
            selectedDate.setDate(selectedDate.getDate() - 1);
            loadSheet();
        });
        document.getElementById('nextDateBtn').addEventListener('click', () => {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() + 1);
            if (getDateString(next) <= getDateString(new Date())) {
                selectedDate = next;
                loadSheet();
            }
        });
        document.getElementById('datePicker').addEventListener('change', function() {
            const val = this.value;
            if (val) {
                selectedDate = new Date(val);
                loadSheet();
            }
        });

        setupClickOutsideToLock();

        function doLoad() {
            if (typeof dataManager !== 'undefined' && dataManager.initialized) {
                loadSheet();
            } else {
                window.addEventListener('dataManagerReady', () => loadSheet());
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doLoad);
        } else {
            doLoad();
        }
    }

    init();
})();
