/**
 * Student Documents Tab - Upload documents, mark for teacher review
 */
(function() {
    'use strict';

    function getStudentId() {
        return typeof getCurrentStudentId === 'function' ? getCurrentStudentId() : sessionStorage.getItem('currentStudentId');
    }

    function getCurrentStudent() {
        return typeof currentStudent !== 'undefined' ? currentStudent : null;
    }

    async function uploadFileToStorage(file, studentId) {
        if (typeof firebase === 'undefined' || !firebase.storage) return null;
        const storage = firebase.storage();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `documents/${studentId}/${Date.now()}_${safeName}`;
        const ref = storage.ref(path);
        await ref.put(file);
        return await ref.getDownloadURL();
    }

    async function loadDocumentsTab() {
        const student = getCurrentStudent();
        const studentId = getStudentId();
        if (!student || !studentId) return;

        const listEl = document.getElementById('documentsList');
        const emptyEl = document.getElementById('documentsEmpty');
        if (!listEl || !emptyEl) return;

        const docs = await dataManager.getDocumentsByStudent(studentId);
        emptyEl.style.display = docs.length === 0 ? 'block' : 'none';
        listEl.style.display = docs.length === 0 ? 'none' : 'block';

        if (docs.length === 0) {
            listEl.innerHTML = '';
            return;
        }

        const t = typeof window.t === 'function' ? window.t : (k) => k;
        listEl.innerHTML = docs.map(d => `
            <div class="document-item" data-doc-id="${d.id}">
                <div class="document-item-icon">
                    <i class="fas fa-file${(d.fileType || '').includes('pdf') ? '-pdf' : ''}"></i>
                </div>
                <div class="document-item-info">
                    <span class="document-item-name">${escapeHtml(d.fileName)}</span>
                    <span class="document-item-meta">${formatFileSize(d.fileSize)} · ${formatDate(d.uploadedAt)}</span>
                </div>
                <label class="document-item-toggle">
                    <input type="checkbox" ${d.markedForReview ? 'checked' : ''} onchange="window.studentDocumentsToggleReview('${d.id}', this.checked)">
                    <span class="toggle-label" data-i18n="submit_for_review">Submit for review</span>
                </label>
                <button type="button" class="btn-document-remove" onclick="window.studentDocumentsRemove('${d.id}')" title="${t('remove') || 'Remove'}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');

        if (typeof applyI18n === 'function') applyI18n();
    }

    function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    window.studentDocumentsToggleReview = async function(docId, checked) {
        await dataManager.updateDocumentMarkedForReview(docId, checked);
        await loadDocumentsTab();
    };

    window.studentDocumentsRemove = async function(docId) {
        if (!confirm(typeof window.t === 'function' ? window.t('confirm_remove_document') : 'Remove this document?')) return;
        await dataManager.removeSubmittedDocument(docId);
        await loadDocumentsTab();
    };

    function setupDocumentsTab() {
        const tab = document.getElementById('tab-documents');
        if (tab) {
            tab.addEventListener('change', function() {
                if (this.checked) loadDocumentsTab();
            });
        }

        const uploadArea = document.getElementById('documentUploadArea');
        const fileInput = document.getElementById('documentFileInput');
        if (!uploadArea || !fileInput) return;

        /* Click handled natively by <label for="documentFileInput"> */
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer?.files;
            if (files && files[0]) handleDocumentUpload(files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            if (f) handleDocumentUpload(f);
            e.target.value = '';
        });
    }

    async function handleDocumentUpload(file) {
        const student = getCurrentStudent();
        const studentId = getStudentId();
        if (!student || !studentId) return;

        const contentEl = document.getElementById('documentUploadContent');
        if (!contentEl) return;
        const origContent = '<i class="fas fa-cloud-upload-alt"></i><p data-i18n="click_to_upload">Click to upload or drag and drop</p><small data-i18n="documents_formats">PDF, Image, Word document</small>';
        contentEl.closest('.document-upload-area')?.classList.add('uploading');
        contentEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>' + (typeof window.t === 'function' ? window.t('uploading') : 'Uploading') + ' ' + escapeHtml(file.name) + '...</span>';

        try {
            let downloadURL = await uploadFileToStorage(file, studentId);
            if (!downloadURL) {
                console.warn('Firebase Storage not available - document metadata saved only.');
            }

            await dataManager.addSubmittedDocument({
                studentId,
                studentName: student.name || '',
                fileName: file.name,
                fileType: file.type || '',
                fileSize: file.size,
                downloadURL,
                markedForReview: false
            });

            await loadDocumentsTab();
        } catch (err) {
            console.error('Document upload failed:', err);
            alert(typeof window.t === 'function' ? window.t('upload_failed') : 'Upload failed. Please try again.');
        } finally {
            contentEl.closest('.document-upload-area')?.classList.remove('uploading');
            contentEl.innerHTML = origContent;
            if (typeof applyI18n === 'function') applyI18n();
        }
    }

    function init() {
        setupDocumentsTab();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.loadDocumentsTab = loadDocumentsTab;
})();
