// Data Manager - Handles all data operations using storage adapters
// Now supports multiple storage backends (localStorage, Firebase, etc.)

class DataManager {
    constructor(storageAdapter) {
        this.storage = storageAdapter;
        this.initialized = false;
    }

    /** Normalize ID for comparison - works with numeric, string, or future Firestore IDs */
    _eqId(a, b) {
        return String(a) === String(b);
    }

    /** Get study year (1, 2, 3...) from admission/enrollment date. Used for "First Year", "Second Year" etc. */
    getStudentYear(admissionDate) {
        if (!admissionDate) return 1;
        const adm = new Date(admissionDate);
        const now = new Date();
        const yearIndex = now.getFullYear() - adm.getFullYear() + 1;
        return Math.max(1, yearIndex);
    }

    // Initialize data manager and storage
    async initialize() {
        if (this.initialized) return;

        try {
            // Check if storage is ready
            if (!this.storage.isReady()) {
                console.error('Storage adapter not ready');
                return false;
            }

            // Initialize default data structure
            await this.initializeData();
            this.initialized = true;
            console.log(`✅ DataManager initialized with ${this.storage.getName()}`);
            return true;

        } catch (error) {
            console.error('DataManager initialization failed:', error);
            return false;
        }
    }

    // Initialize default data structure
    async initializeData() {
        const keys = ['students', 'tasks', 'messages', 'quizzes', 'quizResults', 'submittedDocuments'];
        
        for (const key of keys) {
            const data = await this.storage.get(key);
            if (!data) {
                await this.storage.set(key, []);
            }
        }
        
        // Add sample data if empty
        const students = await this.getStudents();
        if (students.length === 0) {
            await this.addSampleData();
        } else {
            await this.migrateStudentIdsToWaqfFormat();
        }
    }

    /** Migrate students with old STU-* IDs to waqf-XXX format */
    async migrateStudentIdsToWaqfFormat() {
        const students = await this.getStudents();
        const waqfPattern = /^waqf-(\d+)$/i;
        let changed = false;
        let nextNum = 1;
        const usedNums = new Set();
        for (const s of students) {
            const sid = (s.studentId || '').toString().trim();
            const match = sid.match(waqfPattern);
            if (match) {
                usedNums.add(parseInt(match[1], 10));
            }
        }
        for (const s of students) {
            const sid = (s.studentId || '').toString().trim();
            if (!sid || !waqfPattern.test(sid)) {
                while (usedNums.has(nextNum)) nextNum++;
                s.studentId = 'waqf-' + String(nextNum).padStart(3, '0');
                usedNums.add(nextNum);
                nextNum++;
                s.updatedAt = new Date().toISOString();
                changed = true;
            }
        }
        if (changed) {
            await this.storage.set('students', students);
            console.log('✅ Migrated student IDs to waqf-XXX format');
        }
    }

    // Add sample data for demonstration
    async addSampleData() {
        const sampleStudents = [
            { 
                id: 1, 
                name: 'Ahmed Ali',
                email: 'ahmed@example.com',
                phone: '+1234567890',
                dateOfBirth: '2010-05-15',
                studentId: 'waqf-001',
                pin: '1234',
                pinSetAt: '2024-09-01T10:00:00.000Z',
                pinSetBy: 'teacher',
                parentName: 'Ali Hassan',
                parentPhone: '+1234567899',
                parentEmail: 'ali.hassan@example.com',
                fatherWork: 'Business',
                district: 'Dhaka',
                upazila: 'Dhanmondi',
                address: 'House 12, Road 5',
                enrollmentDate: '2024-09-01',
                notes: [],
                createdAt: '2024-09-01T10:00:00.000Z',
                updatedAt: '2024-09-01T10:00:00.000Z'
            },
            { 
                id: 2, 
                name: 'Fatima Hassan',
                email: 'fatima@example.com',
                phone: '+1234567891',
                dateOfBirth: '2011-03-22',
                studentId: 'waqf-002',
                pin: '1234',
                pinSetAt: '2024-09-01T10:00:00.000Z',
                pinSetBy: 'teacher',
                parentName: 'Hassan Ibrahim',
                parentPhone: '+1234567898',
                parentEmail: 'hassan@example.com',
                fatherWork: 'Teacher',
                district: 'Chittagong',
                upazila: 'Agrabad',
                address: 'Flat 3B, Block A',
                enrollmentDate: '2024-09-01',
                notes: [],
                createdAt: '2024-09-01T10:00:00.000Z',
                updatedAt: '2024-09-01T10:00:00.000Z'
            },
            { 
                id: 3, 
                name: 'Omar Ibrahim',
                email: 'omar@example.com',
                phone: '+1234567892',
                dateOfBirth: '2009-08-10',
                studentId: 'waqf-003',
                pin: '1234',
                pinSetAt: '2024-09-01T10:00:00.000Z',
                pinSetBy: 'teacher',
                parentName: 'Ibrahim Mahmoud',
                parentPhone: '+1234567897',
                parentEmail: 'ibrahim@example.com',
                fatherWork: 'Doctor',
                district: 'Sylhet',
                upazila: 'Zindabazar',
                address: 'Village Road, Near Mosque',
                enrollmentDate: '2024-09-01',
                notes: [],
                createdAt: '2024-09-01T10:00:00.000Z',
                updatedAt: '2024-09-01T10:00:00.000Z'
            },
            { 
                id: 4, 
                name: 'Aisha Mohammed',
                email: 'aisha@example.com',
                phone: '+1234567893',
                dateOfBirth: '2010-11-30',
                studentId: 'waqf-004',
                pin: '1234',
                pinSetAt: '2024-09-01T10:00:00.000Z',
                pinSetBy: 'teacher',
                parentName: 'Mohammed Khalid',
                parentPhone: '+1234567896',
                parentEmail: 'mohammed@example.com',
                fatherWork: 'Engineer',
                district: 'Rajshahi',
                upazila: 'Boalia',
                address: 'Street 7, Sector 2',
                enrollmentDate: '2024-09-01',
                notes: [],
                createdAt: '2024-09-01T10:00:00.000Z',
                updatedAt: '2024-09-01T10:00:00.000Z'
            },
            { 
                id: 5, 
                name: 'Yusuf Abdullah',
                email: 'yusuf@example.com',
                phone: '+1234567894',
                dateOfBirth: '2011-01-18',
                studentId: 'waqf-005',
                pin: '1234',
                pinSetAt: '2024-09-01T10:00:00.000Z',
                pinSetBy: 'teacher',
                parentName: 'Abdullah Rahman',
                parentPhone: '+1234567895',
                parentEmail: 'abdullah@example.com',
                fatherWork: 'Farmer',
                district: 'Khulna',
                upazila: 'Sonadanga',
                address: 'Village: Charpara, Post Office Road',
                enrollmentDate: '2024-09-01',
                notes: [],
                createdAt: '2024-09-01T10:00:00.000Z',
                updatedAt: '2024-09-01T10:00:00.000Z'
            }
        ];

        const sampleTasks = [
            {
                id: 1,
                title: 'Complete Mathematics Assignment',
                description: 'Solve problems 1-20 from Chapter 5',
                type: 'one-time',
                assignedTo: [1, 2, 3, 4, 5],
                deadline: '2025-10-15',
                completedBy: [1],
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: 'Science Project Report',
                description: 'Write a detailed report on your science experiment',
                type: 'one-time',
                assignedTo: [1, 2, 3, 4, 5],
                deadline: '2025-10-20',
                completedBy: [1, 2],
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                title: 'Group Presentation on Climate Change',
                description: 'Prepare a 15-minute presentation with your group',
                type: 'one-time',
                assignedTo: [1, 2, 3],
                deadline: '2025-10-25',
                completedBy: [1],
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                title: 'English Essay Writing',
                description: 'Write a 500-word essay on your favorite book',
                type: 'one-time',
                assignedTo: [4, 5],
                deadline: '2025-10-18',
                completedBy: [],
                createdAt: new Date().toISOString()
            },
            {
                id: 5,
                title: 'Morning Quran Reading',
                description: 'Read and memorize 1 page from the Quran',
                type: 'daily',
                assignedTo: [1, 2, 3, 4, 5],
                dailyCompletions: {
                    1: ['2025-10-09', '2025-10-08', '2025-10-07'],
                    2: ['2025-10-09', '2025-10-08'],
                    3: ['2025-10-09'],
                    4: ['2025-10-08'],
                    5: ['2025-10-09', '2025-10-08', '2025-10-07', '2025-10-06']
                },
                createdAt: new Date().toISOString()
            },
            {
                id: 6,
                title: 'Daily Prayer Times',
                description: 'Complete all 5 daily prayers on time',
                type: 'daily',
                assignedTo: [1, 2, 3, 4, 5],
                dailyCompletions: {
                    1: ['2025-10-09', '2025-10-08'],
                    2: ['2025-10-09'],
                    3: ['2025-10-09', '2025-10-08', '2025-10-07'],
                    4: ['2025-10-09', '2025-10-08'],
                    5: ['2025-10-08']
                },
                createdAt: new Date().toISOString()
            },
            {
                id: 7,
                title: 'Homework Review',
                description: 'Review and complete daily homework assignments',
                type: 'daily',
                assignedTo: [1, 2, 3, 4, 5],
                dailyCompletions: {
                    1: ['2025-10-08'],
                    2: ['2025-10-09', '2025-10-08'],
                    3: ['2025-10-09', '2025-10-08'],
                    4: ['2025-10-09'],
                    5: ['2025-10-09', '2025-10-08']
                },
                createdAt: new Date().toISOString()
            },
            {
                id: 8,
                title: 'Islamic Studies Reading',
                description: 'Read 15 minutes of Islamic studies material',
                type: 'daily',
                assignedTo: [1, 2, 3, 4, 5],
                dailyCompletions: {
                    1: ['2025-10-09', '2025-10-08', '2025-10-07'],
                    2: ['2025-10-09', '2025-10-08'],
                    3: ['2025-10-08'],
                    4: ['2025-10-09', '2025-10-08', '2025-10-07'],
                    5: ['2025-10-09']
                },
                createdAt: new Date().toISOString()
            }
        ];

        await this.storage.set('students', sampleStudents);
        await this.storage.set('tasks', sampleTasks);
        
        // Sample Quizzes
        const sampleQuizzes = [
            {
                id: 1001,
                title: "Islamic Studies - Quiz 1",
                description: "Test your knowledge on the basics of Islam",
                subject: "Islamic Studies",
                questions: [
                    {
                        id: 1,
                        question: "How many pillars of Islam are there?",
                        options: ["3", "4", "5", "6"],
                        correctAnswer: 2,
                        marks: 2
                    },
                    {
                        id: 2,
                        question: "What is the first pillar of Islam?",
                        options: ["Salah", "Shahada", "Zakat", "Hajj"],
                        correctAnswer: 1,
                        marks: 2
                    },
                    {
                        id: 3,
                        question: "How many times Muslims pray daily?",
                        options: ["3 times", "4 times", "5 times", "6 times"],
                        correctAnswer: 2,
                        marks: 2
                    },
                    {
                        id: 4,
                        question: "Which month is the month of fasting?",
                        options: ["Rajab", "Shaban", "Ramadan", "Shawwal"],
                        correctAnswer: 2,
                        marks: 2
                    },
                    {
                        id: 5,
                        question: "What is Zakat?",
                        options: ["Prayer", "Charity", "Fasting", "Pilgrimage"],
                        correctAnswer: 1,
                        marks: 2
                    }
                ],
                timeLimit: 10,
                passingPercentage: 60,
                assignedTo: [1, 2, 3, 4],
                deadline: "2025-10-20",
                createdAt: new Date().toISOString(),
                createdBy: 'teacher'
            },
            {
                id: 1002,
                title: "Arabic Language - Basics",
                description: "Test on basic Arabic vocabulary and grammar",
                subject: "Arabic",
                questions: [
                    {
                        id: 1,
                        question: "What is the Arabic word for 'Peace'?",
                        options: ["Sabah", "Salaam", "Shukran", "Marhaba"],
                        correctAnswer: 1,
                        marks: 3
                    },
                    {
                        id: 2,
                        question: "How do you say 'Thank you' in Arabic?",
                        options: ["Shukran", "Afwan", "Marhaba", "Ma'assalama"],
                        correctAnswer: 0,
                        marks: 3
                    },
                    {
                        id: 3,
                        question: "What does 'Bismillah' mean?",
                        options: ["Thank God", "In the name of Allah", "Peace be upon you", "Goodbye"],
                        correctAnswer: 1,
                        marks: 4
                    }
                ],
                timeLimit: 5,
                passingPercentage: 50,
                assignedTo: [1, 2, 3],
                deadline: "2025-10-18",
                createdAt: new Date().toISOString(),
                createdBy: 'teacher'
            },
            {
                id: 1003,
                title: "Comprehensive Exam - All Question Types",
                description: "This exam demonstrates all available question types including auto-graded and manually-graded questions",
                subject: "Mixed Assessment",
                questions: [
                    {
                        id: 1,
                        type: "mcq",
                        question: "What is the capital city of Saudi Arabia?",
                        options: ["Jeddah", "Riyadh", "Mecca", "Medina"],
                        correctAnswer: 1,
                        marks: 2
                    },
                    {
                        id: 2,
                        type: "true_false",
                        question: "The Quran was revealed over a period of 23 years.",
                        options: ["True", "False"],
                        correctAnswer: 0,
                        marks: 2
                    },
                    {
                        id: 3,
                        type: "fill_blank",
                        question: "The first Surah in the Quran is called Surah ______.",
                        acceptedAnswers: ["Al-Fatiha", "Fatiha", "al fatiha"],
                        correctAnswer: "Al-Fatiha",
                        marks: 2
                    },
                    {
                        id: 4,
                        type: "short_answer",
                        question: "Explain the meaning of 'Tawheed' in one or two sentences.",
                        expectedAnswer: "Tawheed means the oneness of Allah. It is the fundamental concept that Allah is one, unique, and has no partners.",
                        marks: 3
                    },
                    {
                        id: 5,
                        type: "essay",
                        question: "Write an essay about the importance of seeking knowledge in Islam. Discuss the role of education in a Muslim's life and provide examples from Islamic history.",
                        wordLimit: 300,
                        gradingRubric: "1. Clear introduction (1 mark), 2. Discussion of Islamic perspective (2 marks), 3. Historical examples (2 marks), 4. Conclusion (1 mark)",
                        marks: 6
                    },
                    {
                        id: 6,
                        type: "file_upload",
                        question: "Upload a document showing your Arabic homework assignment (any format: PDF, image, Word document)",
                        uploadInstructions: "Please upload a clear, readable document. Accepted formats: PDF, JPG, PNG, DOC, DOCX",
                        marks: 5
                    }
                ],
                timeLimit: 30,
                passingPercentage: 60,
                assignedTo: [1, 2, 3, 4],
                deadline: "2025-10-20",
                createdAt: new Date().toISOString(),
                createdBy: 'teacher'
            }
        ];
        
        await this.storage.set('quizzes', sampleQuizzes);
        
        // Sample Quiz Results
        const sampleResults = [
            {
                id: 2001,
                quizId: 1001,
                studentId: 1,
                answers: [
                    {questionId: 0, selectedAnswer: 2, correctAnswer: 2, isCorrect: true, marks: 2},
                    {questionId: 1, selectedAnswer: 1, correctAnswer: 1, isCorrect: true, marks: 2},
                    {questionId: 2, selectedAnswer: 2, correctAnswer: 2, isCorrect: true, marks: 2},
                    {questionId: 3, selectedAnswer: 2, correctAnswer: 2, isCorrect: true, marks: 2},
                    {questionId: 4, selectedAnswer: 0, correctAnswer: 1, isCorrect: false, marks: 0}
                ],
                score: 8,
                totalMarks: 10,
                percentage: 80,
                passed: true,
                timeTaken: 420,
                submittedAt: "2025-10-08T10:30:00.000Z",
                autoGraded: true,
                status: 'graded'
            },
            {
                id: 2002,
                quizId: 1002,
                studentId: 2,
                answers: [
                    {questionId: 0, selectedAnswer: 1, correctAnswer: 1, isCorrect: true, marks: 3},
                    {questionId: 1, selectedAnswer: 0, correctAnswer: 0, isCorrect: true, marks: 3},
                    {questionId: 2, selectedAnswer: 1, correctAnswer: 1, isCorrect: true, marks: 4}
                ],
                score: 10,
                totalMarks: 10,
                percentage: 100,
                passed: true,
                timeTaken: 180,
                submittedAt: "2025-10-07T14:15:00.000Z",
                autoGraded: true,
                status: 'graded'
            },
            {
                id: 2003,
                quizId: 1003,
                studentId: 1,
                answers: [
                    {
                        questionId: 0, 
                        answer: 1, 
                        correctAnswer: 1, 
                        isCorrect: true, 
                        marks: 2,
                        autoGraded: true
                    },
                    {
                        questionId: 1, 
                        answer: 0, 
                        correctAnswer: 0, 
                        isCorrect: true, 
                        marks: 2,
                        autoGraded: true
                    },
                    {
                        questionId: 2, 
                        answer: "Al-Fatiha", 
                        correctAnswer: "Al-Fatiha", 
                        isCorrect: true, 
                        marks: 2,
                        autoGraded: true
                    },
                    {
                        questionId: 3, 
                        answer: "Tawheed is the belief in the oneness of Allah. It means that Allah is one and has no partners.", 
                        marks: null,
                        autoGraded: false
                    },
                    {
                        questionId: 4, 
                        answer: "Knowledge is highly valued in Islam. The first revelation to Prophet Muhammad (PBUH) was 'Read'. This shows the importance of learning. Throughout Islamic history, scholars like Imam Bukhari and Ibn Sina contributed greatly to various fields. Education helps Muslims understand their faith better and contribute to society. The Prophet said 'Seeking knowledge is an obligation upon every Muslim', which emphasizes its importance.",
                        marks: null,
                        autoGraded: false
                    },
                    {
                        questionId: 5, 
                        answer: {
                            fileName: "Arabic_Homework_Ahmed.pdf",
                            fileType: "application/pdf",
                            fileSize: 245760,
                            fileData: "data:application/pdf;base64,..."
                        },
                        marks: null,
                        autoGraded: false
                    }
                ],
                score: 6,
                autoGradedScore: 6,
                manualGradedScore: 0,
                totalMarks: 20,
                percentage: 30,
                passed: false,
                timeTaken: 1200,
                submittedAt: "2025-10-09T09:30:00.000Z",
                status: 'pending_review'
            }
        ];
        
        await this.storage.set('quizResults', sampleResults);
    }

    // Students Management
    async getStudents() {
        return (await this.storage.get('students')) || [];
    }

    async getStudentById(id) {
        const students = await this.getStudents();
        return students.find(s => this._eqId(s.id, id));
    }

    /** Get student by login ID (studentId = waqf-001 format) */
    async getStudentByLoginId(loginId) {
        if (!loginId || !String(loginId).trim()) return null;
        const students = await this.getStudents();
        const normalized = String(loginId).trim();
        return students.find(s => s.studentId && String(s.studentId).trim().toLowerCase() === normalized.toLowerCase());
    }

    /** Generate next studentId in waqf-XXX format */
    async getNextStudentId() {
        const students = await this.getStudents();
        const prefix = 'waqf-';
        let maxNum = 0;
        for (const s of students) {
            const sid = s.studentId || '';
            const match = sid.match(new RegExp('^' + prefix.replace('-', '\\-') + '(\\d+)$', 'i'));
            if (match) {
                const n = parseInt(match[1], 10);
                if (n > maxNum) maxNum = n;
            }
        }
        const next = maxNum + 1;
        return prefix + String(next).padStart(3, '0');
    }

    /** Validate student login: loginId + pin. Returns student if valid, null otherwise */
    async validateStudentLogin(loginId, pin) {
        const student = await this.getStudentByLoginId(loginId);
        if (!student) return null;
        const storedPin = (student.pin || '').toString().trim();
        const inputPin = (pin || '').toString().trim();
        if (!storedPin || !inputPin) return null;
        return storedPin === inputPin ? student : null;
    }

    /** Update student PIN (by teacher or student). setBy: 'teacher' | 'student' */
    async updateStudentPin(studentId, newPin, setBy = 'teacher') {
        const students = await this.getStudents();
        const idx = students.findIndex(s => this._eqId(s.id, studentId));
        if (idx === -1) return null;
        const pinStr = String(newPin || '').trim();
        if (!pinStr) return null;
        students[idx].pin = pinStr;
        students[idx].pinSetAt = new Date().toISOString();
        students[idx].pinSetBy = setBy === 'student' ? 'student' : 'teacher';
        students[idx].updatedAt = new Date().toISOString();
        await this.storage.set('students', students);
        return students[idx];
    }

    async addStudent(student) {
        const students = await this.getStudents();
        const raw = (student.studentId || '').toString().trim();
        const waqfMatch = raw.match(/^waqf-(\d+)$/i);
        const studentId = waqfMatch ? raw : (await this.getNextStudentId());
        const pin = (student.pin || '1234').toString().trim();
        const now = new Date().toISOString();
        const newStudent = {
            id: String(Date.now()),
            ...student,
            studentId: studentId,
            pin: pin,
            pinSetAt: now,
            pinSetBy: 'teacher',
            notes: student.notes || [],
            createdAt: now,
            updatedAt: now
        };
        students.push(newStudent);
        await this.storage.set('students', students);
        return newStudent;
    }

    async updateStudentProfile(studentId, updatedData) {
        const students = await this.getStudents();
        const studentIndex = students.findIndex(s => this._eqId(s.id, studentId));
        
        if (studentIndex !== -1) {
            students[studentIndex] = {
                ...students[studentIndex],
                ...updatedData,
                id: students[studentIndex].id,
                notes: students[studentIndex].notes,
                createdAt: students[studentIndex].createdAt,
                updatedAt: new Date().toISOString()
            };
            await this.storage.set('students', students);
            return students[studentIndex];
        }
        return null;
    }

    // Student Notes Management
    async addStudentNote(studentId, noteData) {
        const students = await this.getStudents();
        const student = students.find(s => this._eqId(s.id, studentId));
        
        if (student) {
            if (!student.notes) {
                student.notes = [];
            }
            
            const newNote = {
                id: String(Date.now()),
                date: new Date().toISOString(),
                category: noteData.category || 'General',
                note: noteData.note,
                addedBy: 'Teacher'
            };
            
            student.notes.unshift(newNote);
            student.updatedAt = new Date().toISOString();
            await this.storage.set('students', students);
            return newNote;
        }
        return null;
    }

    async updateStudentNote(studentId, noteId, updatedNote) {
        const students = await this.getStudents();
        const student = students.find(s => this._eqId(s.id, studentId));
        
        if (student && student.notes) {
            const noteIndex = student.notes.findIndex(n => this._eqId(n.id, noteId));
            if (noteIndex !== -1) {
                student.notes[noteIndex] = {
                    ...student.notes[noteIndex],
                    note: updatedNote.note,
                    category: updatedNote.category,
                    edited: true,
                    editedAt: new Date().toISOString()
                };
                student.updatedAt = new Date().toISOString();
                await this.storage.set('students', students);
                return student.notes[noteIndex];
            }
        }
        return null;
    }

    async deleteStudentNote(studentId, noteId) {
        const students = await this.getStudents();
        const student = students.find(s => this._eqId(s.id, studentId));
        
        if (student && student.notes) {
            student.notes = student.notes.filter(n => !this._eqId(n.id, noteId));
            student.updatedAt = new Date().toISOString();
            await this.storage.set('students', students);
            return true;
        }
        return false;
    }

    async deleteStudent(id) {
        const idStr = String(id);
        let students = await this.getStudents();
        students = students.filter(s => !this._eqId(s.id, idStr));
        await this.storage.set('students', students);
        
        // Also remove student from all tasks
        let tasks = await this.getTasks();
        tasks = tasks.map(task => ({
            ...task,
            assignedTo: (task.assignedTo || []).filter(sid => !this._eqId(sid, idStr)),
            completedBy: (task.completedBy || []).filter(sid => !this._eqId(sid, idStr))
        }));
        await this.storage.set('tasks', tasks);
    }

    // Tasks Management
    async getTasks() {
        return (await this.storage.get('tasks')) || [];
    }

    async getTaskById(id) {
        const tasks = await this.getTasks();
        return tasks.find(t => this._eqId(t.id, id));
    }

    async getTasksForStudent(studentId) {
        const tasks = await this.getTasks();
        return tasks.filter(task => 
            (task.assignedTo || []).some(sid => this._eqId(sid, studentId))
        );
    }

    async addTask(task) {
        const tasks = await this.getTasks();
        const assignedTo = (task.assignedTo || []).map(id => String(id));
        const isDaily = task.type === 'daily';
        const newTask = {
            id: String(Date.now()),
            ...task,
            assignedTo,
            createdAt: new Date().toISOString()
        };
        if (isDaily) {
            newTask.dailyCompletions = {};
        } else {
            newTask.completedBy = [];
        }
        tasks.push(newTask);
        await this.storage.set('tasks', tasks);
        return newTask;
    }

    async updateTask(taskId, updatedData) {
        const tasks = await this.getTasks();
        const taskIndex = tasks.findIndex(t => this._eqId(t.id, taskId));
        
        if (taskIndex !== -1) {
            const existingTask = tasks[taskIndex];
            const normalized = { ...updatedData };
            if (normalized.assignedTo) normalized.assignedTo = normalized.assignedTo.map(id => String(id));
            
            if (normalized.type && normalized.type !== existingTask.type) {
                if (normalized.type === 'daily') {
                    delete normalized.completedBy;
                    normalized.dailyCompletions = {};
                    normalized.deadline = null;
                } else {
                    normalized.completedBy = [];
                    delete normalized.dailyCompletions;
                }
            } else {
                normalized.completedBy = existingTask.completedBy;
                normalized.dailyCompletions = existingTask.dailyCompletions;
            }
            
            tasks[taskIndex] = {
                ...existingTask,
                ...normalized,
                id: existingTask.id,
                createdAt: existingTask.createdAt,
                updatedAt: new Date().toISOString()
            };
            
            await this.storage.set('tasks', tasks);
            return tasks[taskIndex];
        }
        return null;
    }

    async deleteTask(id) {
        let tasks = await this.getTasks();
        tasks = tasks.filter(t => !this._eqId(t.id, id));
        await this.storage.set('tasks', tasks);
    }

    async toggleTaskCompletion(taskId, studentId) {
        const tasks = await this.getTasks();
        const task = tasks.find(t => this._eqId(t.id, taskId));
        
        if (task) {
            const completedBy = task.completedBy || [];
            const index = completedBy.findIndex(sid => this._eqId(sid, studentId));
            
            if (index > -1) {
                completedBy.splice(index, 1);
            } else {
                completedBy.push(String(studentId));
            }
            
            await this.storage.set('tasks', tasks);
            return task;
        }
        return null;
    }

    async isTaskCompletedByStudent(taskId, studentId) {
        const task = await this.getTaskById(taskId);
        return task ? (task.completedBy || []).some(sid => this._eqId(sid, studentId)) : false;
    }

    // Daily Tasks Management
    getTodayDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    async getDailyTasksForStudent(studentId) {
        const tasks = await this.getTasks();
        return tasks.filter(task => 
            task.type === 'daily' && (task.assignedTo || []).some(sid => this._eqId(sid, studentId))
        );
    }

    async getRegularTasksForStudent(studentId) {
        const tasks = await this.getTasks();
        return tasks.filter(task => 
            task.type !== 'daily' && (task.assignedTo || []).some(sid => this._eqId(sid, studentId))
        );
    }

    async isDailyTaskCompletedToday(taskId, studentId) {
        return this.isDailyTaskCompletedForDate(taskId, studentId, this.getTodayDateString());
    }

    /** Check if daily task is completed for a specific date (YYYY-MM-DD) */
    async isDailyTaskCompletedForDate(taskId, studentId, dateString) {
        const task = await this.getTaskById(taskId);
        if (!task || !task.dailyCompletions) return false;
        const studentIdStr = String(studentId);
        const completions = task.dailyCompletions[studentIdStr] || [];
        return completions.includes(dateString);
    }

    async toggleDailyTaskCompletion(taskId, studentId) {
        const tasks = await this.getTasks();
        const task = tasks.find(t => this._eqId(t.id, taskId));
        
        if (task && task.type === 'daily') {
            const today = this.getTodayDateString();
            const studentIdStr = studentId.toString();
            
            if (!task.dailyCompletions) {
                task.dailyCompletions = {};
            }
            if (!task.dailyCompletions[studentIdStr]) {
                task.dailyCompletions[studentIdStr] = [];
            }
            
            const completionArray = task.dailyCompletions[studentIdStr];
            const index = completionArray.indexOf(today);
            
            if (index > -1) {
                completionArray.splice(index, 1);
            } else {
                completionArray.push(today);
            }
            
            await this.storage.set('tasks', tasks);
            return task;
        }
        return null;
    }

    async getDailyTaskStreak(taskId, studentId) {
        const task = await this.getTaskById(taskId);
        if (!task || task.type !== 'daily') return 0;
        
        const studentIdStr = studentId.toString();
        const completions = task.dailyCompletions && task.dailyCompletions[studentIdStr] 
            ? task.dailyCompletions[studentIdStr] 
            : [];
        
        let streak = 0;
        let currentDate = new Date();
        
        while (true) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (completions.includes(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    async getDailyTaskCompletionHistory(taskId, studentId, days = 7) {
        const task = await this.getTaskById(taskId);
        if (!task || task.type !== 'daily') return [];
        
        const studentIdStr = studentId.toString();
        const completions = task.dailyCompletions && task.dailyCompletions[studentIdStr] 
            ? task.dailyCompletions[studentIdStr] 
            : [];
        
        const history = [];
        const currentDate = new Date();
        
        for (let i = 0; i < days; i++) {
            const dateStr = currentDate.toISOString().split('T')[0];
            history.push({
                date: dateStr,
                completed: completions.includes(dateStr)
            });
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        return history.reverse();
    }

    /** Get daily task completion rate for last N days (for 30-day history view) */
    async getStudentDailyCompletionRateHistory(studentId, days = 30) {
        return this.getStudentDailyCompletionRateHistoryFromDate(studentId, null, days);
    }

    /**
     * Get daily task completion rate from a start date (e.g. admission) to today.
     * @param {string|number} studentId
     * @param {string|null} startDateStr - YYYY-MM-DD (e.g. admission date). If null, uses last N days from today.
     * @param {number} maxDays - Max days to return (cap for performance, default 365)
     */
    async getStudentDailyCompletionRateHistoryFromDate(studentId, startDateStr, maxDays = 365) {
        const dailyTasks = await this.getDailyTasksForStudent(studentId);
        const studentIdStr = String(studentId);
        const totalTasks = dailyTasks.length;

        const today = new Date();
        today.setHours(12, 0, 0, 0);
        let startDate;

        if (startDateStr) {
            startDate = new Date(startDateStr + 'T12:00:00');
            if (isNaN(startDate.getTime())) startDate = new Date(today);
            const totalDays = Math.ceil((today - startDate) / (24 * 60 * 60 * 1000)) + 1;
            if (totalDays > maxDays) {
                startDate.setDate(startDate.getDate() + (totalDays - maxDays));
            }
        } else {
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - (maxDays - 1));
        }

        const days = Math.ceil((today - startDate) / (24 * 60 * 60 * 1000)) + 1;

        if (totalTasks === 0) {
            return Array.from({ length: Math.max(1, days) }, (_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                if (dateStr > today.toISOString().split('T')[0]) return null;
                return { date: dateStr, completed: 0, total: 0, percentage: 0 };
            }).filter(Boolean);
        }

        const history = [];
        const iterDate = new Date(startDate);
        const todayStr = today.toISOString().split('T')[0];

        for (let i = 0; i < days; i++) {
            const dateStr = iterDate.toISOString().split('T')[0];
            if (dateStr > todayStr) break;
            let completed = 0;
            for (const task of dailyTasks) {
                const completions = task.dailyCompletions && task.dailyCompletions[studentIdStr]
                    ? task.dailyCompletions[studentIdStr]
                    : [];
                if (completions.includes(dateStr)) completed++;
            }
            const pct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
            history.push({ date: dateStr, completed, total: totalTasks, percentage: pct });
            iterDate.setDate(iterDate.getDate() + 1);
        }

        return history;
    }

    /** Get detailed task completion for a specific date (for 30-day date click) */
    async getStudentDailyCompletionDetailsForDate(studentId, dateStr) {
        const dailyTasks = await this.getDailyTasksForStudent(studentId);
        const studentIdStr = String(studentId);
        const tasks = dailyTasks.map(task => {
            const completions = task.dailyCompletions && task.dailyCompletions[studentIdStr]
                ? task.dailyCompletions[studentIdStr]
                : [];
            return {
                id: task.id,
                title: task.title,
                completed: completions.includes(dateStr)
            };
        });
        const completed = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { date: dateStr, tasks, completed, total, percentage };
    }

    // Statistics
    async getStudentStats(studentId) {
        const regularTasks = await this.getRegularTasksForStudent(studentId);
        const dailyTasks = await this.getDailyTasksForStudent(studentId);
        
        const regularCompleted = regularTasks.filter(task => 
            (task.completedBy || []).some(sid => this._eqId(sid, studentId))
        ).length;
        
        let dailyCompletedToday = 0;
        for (const task of dailyTasks) {
            if (await this.isDailyTaskCompletedToday(task.id, studentId)) {
                dailyCompletedToday++;
            }
        }
        
        return {
            total: regularTasks.length,
            completed: regularCompleted,
            pending: regularTasks.length - regularCompleted,
            percentage: regularTasks.length > 0 ? Math.round((regularCompleted / regularTasks.length) * 100) : 0,
            dailyTotal: dailyTasks.length,
            dailyCompletedToday: dailyCompletedToday,
            dailyPendingToday: dailyTasks.length - dailyCompletedToday
        };
    }

    async getOverallStats() {
        const students = await this.getStudents();
        const tasks = await this.getTasks();
        
        const oneTimeTasks = tasks.filter(t => t.type === 'one-time');
        const dailyTasks = tasks.filter(t => t.type === 'daily');
        
        const totalTasks = oneTimeTasks.length;
        const totalAssignments = oneTimeTasks.reduce((sum, task) => 
            sum + task.assignedTo.length, 0
        );
        const completedAssignments = oneTimeTasks.reduce((sum, task) => 
            sum + (task.completedBy ? task.completedBy.length : 0), 0
        );
        
        return {
            totalStudents: students.length,
            totalTasks: totalTasks,
            totalAssignments: totalAssignments,
            completedAssignments: completedAssignments,
            pendingAssignments: totalAssignments - completedAssignments,
            overallCompletion: totalAssignments > 0 ? 
                Math.round((completedAssignments / totalAssignments) * 100) : 0,
            oneTimeTasks: oneTimeTasks.length,
            dailyTasks: dailyTasks.length
        };
    }

    async getStudentProgress() {
        const students = await this.getStudents();
        const progressData = [];
        
        for (const student of students) {
            const stats = await this.getStudentStats(student.id);
            progressData.push({
                student: student,
                stats: stats
            });
        }
        
        return progressData;
    }

    // Messages Management
    async getMessages() {
        return (await this.storage.get('messages')) || [];
    }

    async getMessagesForStudent(studentId) {
        const messages = await this.getMessages();
        return messages.filter(msg => this._eqId(msg.studentId, studentId))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    async sendMessage(studentId, message, sender) {
        const messages = await this.getMessages();
        const newMessage = {
            id: String(Date.now()),
            studentId: String(studentId),
            message: message,
            sender: sender,
            timestamp: new Date().toISOString(),
            read: false
        };
        messages.push(newMessage);
        await this.storage.set('messages', messages);
        return newMessage;
    }

    async markMessagesAsRead(studentId, sender) {
        const messages = await this.getMessages();
        const readBy = sender === 'teacher' ? 'student' : 'teacher';
        messages.forEach(msg => {
            if (this._eqId(msg.studentId, studentId) && msg.sender === readBy) {
                msg.read = true;
            }
        });
        await this.storage.set('messages', messages);
    }

    async getUnreadCount(studentId, forUser) {
        const messages = await this.getMessages();
        return messages.filter(msg => 
            this._eqId(msg.studentId, studentId) && 
            msg.sender !== forUser && 
            !msg.read
        ).length;
    }

    async getLastMessage(studentId) {
        const messages = await this.getMessagesForStudent(studentId);
        return messages.length > 0 ? messages[messages.length - 1] : null;
    }

    async getAllChatsForTeacher() {
        const [students, messages] = await Promise.all([
            this.getStudents(),
            this.getMessages()
        ]);
        
        const chats = students.map(student => {
            const studentMessages = messages.filter(msg => this._eqId(msg.studentId, student.id))
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const lastMessage = studentMessages.length > 0 ? studentMessages[studentMessages.length - 1] : null;
            const unreadCount = studentMessages.filter(msg => 
                msg.sender !== 'teacher' && !msg.read
            ).length;
            return {
                student: student,
                lastMessage: lastMessage,
                unreadCount: unreadCount
            };
        });
        
        return chats.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
        });
    }

    /* ===================================
       QUIZ MANAGEMENT METHODS
       =================================== */

    async getQuizzes() {
        return (await this.storage.get('quizzes')) || [];
    }

    async getQuizById(quizId) {
        const quizzes = await this.getQuizzes();
        return quizzes.find(q => this._eqId(q.id, quizId));
    }

    async getQuizzesForStudent(studentId) {
        const quizzes = await this.getQuizzes();
        return quizzes.filter(quiz => 
            (quiz.assignedTo || []).some(sid => this._eqId(sid, studentId))
        );
    }

    async addQuiz(quiz) {
        const quizzes = await this.getQuizzes();
        const assignedTo = (quiz.assignedTo || []).map(id => String(id));
        const newQuiz = {
            id: String(Date.now()),
            ...quiz,
            assignedTo,
            createdAt: new Date().toISOString(),
            createdBy: 'teacher'
        };
        quizzes.push(newQuiz);
        await this.storage.set('quizzes', quizzes);
        return newQuiz;
    }

    async updateQuiz(quizId, updatedData) {
        const quizzes = await this.getQuizzes();
        const quizIndex = quizzes.findIndex(q => this._eqId(q.id, quizId));
        
        if (quizIndex !== -1) {
            const normalized = { ...updatedData };
            if (normalized.assignedTo) normalized.assignedTo = normalized.assignedTo.map(id => String(id));
            quizzes[quizIndex] = {
                ...quizzes[quizIndex],
                ...normalized,
                updatedAt: new Date().toISOString()
            };
            await this.storage.set('quizzes', quizzes);
            return quizzes[quizIndex];
        }
        return null;
    }

    async deleteQuiz(quizId) {
        let quizzes = await this.getQuizzes();
        quizzes = quizzes.filter(q => !this._eqId(q.id, quizId));
        await this.storage.set('quizzes', quizzes);
        
        let results = await this.getQuizResults();
        results = results.filter(r => !this._eqId(r.quizId, quizId));
        await this.storage.set('quizResults', results);
    }

    /* ===================================
       QUIZ RESULTS METHODS
       =================================== */

    async getQuizResults() {
        return (await this.storage.get('quizResults')) || [];
    }

    async getResultsForQuiz(quizId) {
        const results = await this.getQuizResults();
        return results.filter(r => this._eqId(r.quizId, quizId));
    }

    async getResultsForStudent(studentId) {
        const results = await this.getQuizResults();
        return results.filter(r => this._eqId(r.studentId, studentId));
    }

    async getQuizResult(quizId, studentId) {
        const results = await this.getQuizResults();
        return results.find(r => 
            this._eqId(r.quizId, quizId) && 
            this._eqId(r.studentId, studentId)
        );
    }

    async submitQuiz(quizId, studentId, answers, timeTaken) {
        const quiz = await this.getQuizById(quizId);
        if (!quiz) return null;

        let autoGradedScore = 0;
        let totalAutoGradableMarks = 0;
        let hasManualGrading = false;

        const gradedAnswers = answers.map((answer, index) => {
            const question = quiz.questions[index];
            const questionType = question.type || 'mcq';
            
            let answerResult = {
                questionId: index,
                questionType: questionType,
                studentAnswer: answer,
                marks: null,
                autoGraded: false,
                isCorrect: null,
                gradedBy: null,
                gradedAt: null,
                teacherFeedback: null
            };

            if (questionType === 'mcq' || questionType === 'true_false') {
                const isCorrect = answer === question.correctAnswer;
                answerResult.correctAnswer = question.correctAnswer;
                answerResult.isCorrect = isCorrect;
                answerResult.marks = isCorrect ? question.marks : 0;
                answerResult.autoGraded = true;
                autoGradedScore += answerResult.marks;
                totalAutoGradableMarks += question.marks;
            } else if (questionType === 'fill_blank') {
                const acceptedAnswers = question.acceptedAnswers || [question.correctAnswer];
                const studentAnswerNorm = (answer || '').toString().trim().toLowerCase();
                const isCorrect = acceptedAnswers.some(accepted => 
                    accepted.toString().trim().toLowerCase() === studentAnswerNorm
                );
                answerResult.isCorrect = isCorrect;
                answerResult.marks = isCorrect ? question.marks : 0;
                answerResult.autoGraded = true;
                answerResult.correctAnswer = acceptedAnswers[0];
                autoGradedScore += answerResult.marks;
                totalAutoGradableMarks += question.marks;
            } else {
                hasManualGrading = true;
                answerResult.autoGraded = false;
                answerResult.marks = null;
            }

            return answerResult;
        });

        const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
        
        let status, finalScore, percentage, passed;
        
        if (hasManualGrading) {
            status = 'pending_review';
            finalScore = null;
            percentage = null;
            passed = null;
        } else {
            status = 'graded';
            finalScore = autoGradedScore;
            percentage = parseFloat(((finalScore / totalMarks) * 100).toFixed(2));
            passed = percentage >= (quiz.passingPercentage || 40);
        }

        const result = {
            id: String(Date.now()),
            quizId: String(quizId),
            studentId: String(studentId),
            answers: gradedAnswers,
            autoGradedScore: autoGradedScore,
            manualGradedScore: hasManualGrading ? null : 0,
            score: finalScore,
            totalMarks: totalMarks,
            percentage: percentage,
            passed: passed,
            status: status,
            timeTaken: timeTaken,
            submittedAt: new Date().toISOString(),
            gradedAt: hasManualGrading ? null : new Date().toISOString()
        };

        const results = await this.getQuizResults();
        results.push(result);
        await this.storage.set('quizResults', results);
        
        return result;
    }

    async hasStudentTakenQuiz(quizId, studentId) {
        const result = await this.getQuizResult(quizId, studentId);
        return result !== undefined;
    }

    async getQuizStatistics(quizId) {
        const results = await this.getResultsForQuiz(quizId);
        const quiz = await this.getQuizById(quizId);
        
        if (results.length === 0) {
            return {
                totalAttempts: 0,
                averageScore: 0,
                averagePercentage: 0,
                passedCount: 0,
                failedCount: 0,
                passRate: 0,
                highestScore: 0,
                lowestScore: 0,
                totalAssigned: quiz ? quiz.assignedTo.length : 0,
                completionRate: 0
            };
        }

        const totalScore = results.reduce((sum, r) => sum + r.score, 0);
        const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
        const passedCount = results.filter(r => r.passed).length;
        const scores = results.map(r => r.score);

        return {
            totalAttempts: results.length,
            averageScore: (totalScore / results.length).toFixed(2),
            averagePercentage: (totalPercentage / results.length).toFixed(2),
            passedCount: passedCount,
            failedCount: results.length - passedCount,
            passRate: ((passedCount / results.length) * 100).toFixed(2),
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            totalAssigned: quiz ? quiz.assignedTo.length : 0,
            completionRate: quiz ? ((results.length / quiz.assignedTo.length) * 100).toFixed(2) : 0
        };
    }

    async getStudentQuizStats(studentId) {
        const results = await this.getResultsForStudent(studentId);
        
        const gradedResults = results.filter(r => r.status === 'graded');
        
        if (gradedResults.length === 0) {
            return {
                totalQuizzes: 0,
                averageScore: 0,
                averagePercentage: 0,
                passedCount: 0,
                failedCount: 0
            };
        }

        const totalScore = gradedResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const totalPercentage = gradedResults.reduce((sum, r) => sum + (r.percentage || 0), 0);
        const passedCount = gradedResults.filter(r => r.passed).length;

        return {
            totalQuizzes: gradedResults.length,
            averageScore: (totalScore / gradedResults.length).toFixed(2),
            averagePercentage: (totalPercentage / gradedResults.length).toFixed(2),
            passedCount: passedCount,
            failedCount: gradedResults.length - passedCount
        };
    }

    /* ===================================
       MANUAL GRADING METHODS
       =================================== */

    async getPendingGradingResults() {
        const results = await this.getQuizResults();
        return results.filter(r => r.status === 'pending_review');
    }

    async getPendingResultsForQuiz(quizId) {
        const results = await this.getResultsForQuiz(quizId);
        return results.filter(r => r.status === 'pending_review');
    }

    async gradeAnswer(resultId, questionIndex, marks, feedback) {
        const results = await this.getQuizResults();
        const resultIndex = results.findIndex(r => this._eqId(r.id, resultId));
        
        if (resultIndex === -1) return null;
        
        const result = results[resultIndex];
        const answer = result.answers[questionIndex];
        
        if (!answer) return null;
        
        answer.marks = parseFloat(marks);
        answer.gradedBy = 'teacher';
        answer.gradedAt = new Date().toISOString();
        answer.teacherFeedback = feedback || null;
        
        const allGraded = result.answers.every(a => a.marks !== null);
        
        if (allGraded) {
            const autoScore = result.autoGradedScore || 0;
            const manualScore = result.answers
                .filter(a => !a.autoGraded)
                .reduce((sum, a) => sum + (a.marks || 0), 0);
            
            const totalScore = autoScore + manualScore;
            const percentage = parseFloat(((totalScore / result.totalMarks) * 100).toFixed(2));
            const quiz = await this.getQuizById(result.quizId);
            const passed = percentage >= (quiz?.passingPercentage || 40);
            
            result.manualGradedScore = manualScore;
            result.score = totalScore;
            result.percentage = percentage;
            result.passed = passed;
            result.status = 'graded';
            result.gradedAt = new Date().toISOString();
        }
        
        await this.storage.set('quizResults', results);
        return results[resultIndex];
    }

    async bulkGradeAnswers(resultId, gradings) {
        let result = null;
        for (const grading of gradings) {
            result = await this.gradeAnswer(resultId, grading.questionIndex, grading.marks, grading.feedback);
        }
        return result;
    }

    async getUngradedAnswers(resultId) {
        const results = await this.getQuizResults();
        const result = results.find(r => this._eqId(r.id, resultId));
        
        if (!result) return [];
        
        return result.answers
            .map((answer, index) => ({...answer, index}))
            .filter(a => a.marks === null && !a.autoGraded);
    }

    /**
     * Subscribe to real-time updates for a collection (Firebase only).
     * @param {string} key - Collection name (e.g. 'quizResults', 'messages')
     * @param {Function} callback - Called when data changes
     * @returns {Function} Unsubscribe function
     */
    subscribeToCollection(key, callback) {
        if (typeof this.storage.onValue === 'function') {
            return this.storage.onValue(key, callback);
        }
        return () => {};
    }

    /* ===================================
       SUBMITTED DOCUMENTS (for teacher review)
       =================================== */

    async getSubmittedDocuments() {
        return (await this.storage.get('submittedDocuments')) || [];
    }

    /** Get documents marked for teacher review (all students) */
    async getDocumentsForReview() {
        const docs = await this.getSubmittedDocuments();
        return docs.filter(d => d.markedForReview === true).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    }

    /** Get documents by student */
    async getDocumentsByStudent(studentId) {
        const docs = await this.getSubmittedDocuments();
        return docs.filter(d => this._eqId(d.studentId, studentId)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    }

    async addSubmittedDocument(doc) {
        const docs = await this.getSubmittedDocuments();
        const id = String(Date.now());
        const newDoc = {
            id,
            studentId: String(doc.studentId),
            studentName: doc.studentName || '',
            fileName: doc.fileName,
            fileType: doc.fileType || '',
            fileSize: doc.fileSize || 0,
            downloadURL: doc.downloadURL || null,
            uploadedAt: new Date().toISOString(),
            markedForReview: doc.markedForReview === true
        };
        docs.push(newDoc);
        await this.storage.set('submittedDocuments', docs);
        return newDoc;
    }

    async updateDocumentMarkedForReview(docId, markedForReview) {
        const docs = await this.getSubmittedDocuments();
        const idx = docs.findIndex(d => String(d.id) === String(docId));
        if (idx < 0) return null;
        docs[idx].markedForReview = !!markedForReview;
        docs[idx].updatedAt = new Date().toISOString();
        await this.storage.set('submittedDocuments', docs);
        return docs[idx];
    }

    async removeSubmittedDocument(docId) {
        const docs = await this.getSubmittedDocuments();
        const filtered = docs.filter(d => String(d.id) !== String(docId));
        if (filtered.length === docs.length) return false;
        await this.storage.set('submittedDocuments', filtered);
        return true;
    }
}

// Initialize data manager with storage adapter
let dataManager;

// Initialize on page load
(async function initializeApp() {
    try {
        console.log('🚀 Initializing application...');
        
        // Create storage adapter
        const storage = await StorageFactory.createStorage();
        
        // Create data manager with storage
        dataManager = new DataManager(storage);
        
        // Initialize data manager
        const success = await dataManager.initialize();
        
        if (success) {
            console.log('✅ Application ready!');
            window.dataManager = dataManager;
            // Dispatch event to let UI know data is ready
            window.dispatchEvent(new Event('dataManagerReady'));
        } else {
            console.error('❌ Application initialization failed');
            if (typeof window !== 'undefined' && typeof window.showConnectionIcon === 'function') {
                window.showConnectionIcon('failed');
            }
        }
        
    } catch (error) {
        console.error('❌ Fatal error during initialization:', error);
        if (typeof window !== 'undefined' && typeof window.showConnectionIcon === 'function') {
            window.showConnectionIcon('failed');
        }
    }
})();
