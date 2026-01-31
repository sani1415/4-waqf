// Data Manager - Handles all data operations using storage adapters
// Now supports multiple storage backends (localStorage, Firebase, etc.)

class DataManager {
    constructor(storageAdapter) {
        this.storage = storageAdapter;
        this.initialized = false;
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
        const keys = ['students', 'tasks', 'messages', 'quizzes', 'quizResults'];
        
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
                grade: '8th Grade',
                section: 'A',
                studentId: 'STU-2024-001',
                parentName: 'Ali Hassan',
                parentPhone: '+1234567899',
                parentEmail: 'ali.hassan@example.com',
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
                grade: '7th Grade',
                section: 'B',
                studentId: 'STU-2024-002',
                parentName: 'Hassan Ibrahim',
                parentPhone: '+1234567898',
                parentEmail: 'hassan@example.com',
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
                grade: '9th Grade',
                section: 'A',
                studentId: 'STU-2024-003',
                parentName: 'Ibrahim Mahmoud',
                parentPhone: '+1234567897',
                parentEmail: 'ibrahim@example.com',
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
                grade: '8th Grade',
                section: 'B',
                studentId: 'STU-2024-004',
                parentName: 'Mohammed Khalid',
                parentPhone: '+1234567896',
                parentEmail: 'mohammed@example.com',
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
                grade: '7th Grade',
                section: 'A',
                studentId: 'STU-2024-005',
                parentName: 'Abdullah Rahman',
                parentPhone: '+1234567895',
                parentEmail: 'abdullah@example.com',
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
        return students.find(s => s.id === parseInt(id));
    }

    async addStudent(student) {
        const students = await this.getStudents();
        const newStudent = {
            id: Date.now(),
            ...student,
            notes: student.notes || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        students.push(newStudent);
        await this.storage.set('students', students);
        return newStudent;
    }

    async updateStudentProfile(studentId, updatedData) {
        const students = await this.getStudents();
        const studentIndex = students.findIndex(s => s.id === parseInt(studentId));
        
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
        const student = students.find(s => s.id === parseInt(studentId));
        
        if (student) {
            if (!student.notes) {
                student.notes = [];
            }
            
            const newNote = {
                id: Date.now(),
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
        const student = students.find(s => s.id === parseInt(studentId));
        
        if (student && student.notes) {
            const noteIndex = student.notes.findIndex(n => n.id === parseInt(noteId));
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
        const student = students.find(s => s.id === parseInt(studentId));
        
        if (student && student.notes) {
            student.notes = student.notes.filter(n => n.id !== parseInt(noteId));
            student.updatedAt = new Date().toISOString();
            await this.storage.set('students', students);
            return true;
        }
        return false;
    }

    async deleteStudent(id) {
        let students = await this.getStudents();
        students = students.filter(s => s.id !== parseInt(id));
        await this.storage.set('students', students);
        
        // Also remove student from all tasks
        let tasks = await this.getTasks();
        tasks = tasks.map(task => ({
            ...task,
            assignedTo: task.assignedTo.filter(sid => sid !== parseInt(id)),
            completedBy: task.completedBy ? task.completedBy.filter(sid => sid !== parseInt(id)) : []
        }));
        await this.storage.set('tasks', tasks);
    }

    // Tasks Management
    async getTasks() {
        return (await this.storage.get('tasks')) || [];
    }

    async getTaskById(id) {
        const tasks = await this.getTasks();
        return tasks.find(t => t.id === parseInt(id));
    }

    async getTasksForStudent(studentId) {
        const tasks = await this.getTasks();
        return tasks.filter(task => 
            task.assignedTo.includes(parseInt(studentId))
        );
    }

    async addTask(task) {
        const tasks = await this.getTasks();
        const newTask = {
            id: Date.now(),
            ...task,
            completedBy: task.type === 'daily' ? undefined : [],
            dailyCompletions: task.type === 'daily' ? {} : undefined,
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        await this.storage.set('tasks', tasks);
        return newTask;
    }

    async updateTask(taskId, updatedData) {
        const tasks = await this.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId));
        
        if (taskIndex !== -1) {
            const existingTask = tasks[taskIndex];
            
            if (updatedData.type && updatedData.type !== existingTask.type) {
                if (updatedData.type === 'daily') {
                    updatedData.completedBy = undefined;
                    updatedData.dailyCompletions = {};
                    updatedData.deadline = undefined;
                } else {
                    updatedData.completedBy = [];
                    updatedData.dailyCompletions = undefined;
                }
            } else {
                updatedData.completedBy = existingTask.completedBy;
                updatedData.dailyCompletions = existingTask.dailyCompletions;
            }
            
            tasks[taskIndex] = {
                ...existingTask,
                ...updatedData,
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
        tasks = tasks.filter(t => t.id !== parseInt(id));
        await this.storage.set('tasks', tasks);
    }

    async toggleTaskCompletion(taskId, studentId) {
        const tasks = await this.getTasks();
        const task = tasks.find(t => t.id === parseInt(taskId));
        
        if (task) {
            const studentIdNum = parseInt(studentId);
            const index = task.completedBy.indexOf(studentIdNum);
            
            if (index > -1) {
                task.completedBy.splice(index, 1);
            } else {
                task.completedBy.push(studentIdNum);
            }
            
            await this.storage.set('tasks', tasks);
            return task;
        }
        return null;
    }

    async isTaskCompletedByStudent(taskId, studentId) {
        const task = await this.getTaskById(taskId);
        return task ? task.completedBy.includes(parseInt(studentId)) : false;
    }

    // Daily Tasks Management
    getTodayDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    async getDailyTasksForStudent(studentId) {
        const tasks = await this.getTasks();
        return tasks.filter(task => 
            task.type === 'daily' && task.assignedTo.includes(parseInt(studentId))
        );
    }

    async getRegularTasksForStudent(studentId) {
        const tasks = await this.getTasks();
        return tasks.filter(task => 
            task.type !== 'daily' && task.assignedTo.includes(parseInt(studentId))
        );
    }

    async isDailyTaskCompletedToday(taskId, studentId) {
        const task = await this.getTaskById(taskId);
        if (!task || task.type !== 'daily') return false;
        
        const today = this.getTodayDateString();
        const studentIdStr = studentId.toString();
        
        return task.dailyCompletions && 
               task.dailyCompletions[studentIdStr] && 
               Array.isArray(task.dailyCompletions[studentIdStr]) &&
               task.dailyCompletions[studentIdStr].includes(today);
    }

    async toggleDailyTaskCompletion(taskId, studentId) {
        const tasks = await this.getTasks();
        const task = tasks.find(t => t.id === parseInt(taskId));
        
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

    // Statistics
    async getStudentStats(studentId) {
        const regularTasks = await this.getRegularTasksForStudent(studentId);
        const dailyTasks = await this.getDailyTasksForStudent(studentId);
        
        const regularCompleted = regularTasks.filter(task => 
            task.completedBy && task.completedBy.includes(parseInt(studentId))
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
        return messages.filter(msg => msg.studentId === parseInt(studentId))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    async sendMessage(studentId, message, sender) {
        const messages = await this.getMessages();
        const newMessage = {
            id: Date.now(),
            studentId: parseInt(studentId),
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
            if (msg.studentId === parseInt(studentId) && msg.sender === readBy) {
                msg.read = true;
            }
        });
        await this.storage.set('messages', messages);
    }

    async getUnreadCount(studentId, forUser) {
        const messages = await this.getMessages();
        return messages.filter(msg => 
            msg.studentId === parseInt(studentId) && 
            msg.sender !== forUser && 
            !msg.read
        ).length;
    }

    async getLastMessage(studentId) {
        const messages = await this.getMessagesForStudent(studentId);
        return messages.length > 0 ? messages[messages.length - 1] : null;
    }

    async getAllChatsForTeacher() {
        const students = await this.getStudents();
        const chats = [];
        
        for (const student of students) {
            const lastMessage = await this.getLastMessage(student.id);
            const unreadCount = await this.getUnreadCount(student.id, 'teacher');
            chats.push({
                student: student,
                lastMessage: lastMessage,
                unreadCount: unreadCount
            });
        }
        
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
        return quizzes.find(q => q.id === parseInt(quizId));
    }

    async getQuizzesForStudent(studentId) {
        const quizzes = await this.getQuizzes();
        return quizzes.filter(quiz => 
            quiz.assignedTo.includes(parseInt(studentId))
        );
    }

    async addQuiz(quiz) {
        const quizzes = await this.getQuizzes();
        const newQuiz = {
            id: Date.now(),
            ...quiz,
            createdAt: new Date().toISOString(),
            createdBy: 'teacher'
        };
        quizzes.push(newQuiz);
        await this.storage.set('quizzes', quizzes);
        return newQuiz;
    }

    async updateQuiz(quizId, updatedData) {
        const quizzes = await this.getQuizzes();
        const quizIndex = quizzes.findIndex(q => q.id === parseInt(quizId));
        
        if (quizIndex !== -1) {
            quizzes[quizIndex] = {
                ...quizzes[quizIndex],
                ...updatedData,
                updatedAt: new Date().toISOString()
            };
            await this.storage.set('quizzes', quizzes);
            return quizzes[quizIndex];
        }
        return null;
    }

    async deleteQuiz(quizId) {
        let quizzes = await this.getQuizzes();
        quizzes = quizzes.filter(q => q.id !== parseInt(quizId));
        await this.storage.set('quizzes', quizzes);
        
        let results = await this.getQuizResults();
        results = results.filter(r => r.quizId !== parseInt(quizId));
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
        return results.filter(r => r.quizId === parseInt(quizId));
    }

    async getResultsForStudent(studentId) {
        const results = await this.getQuizResults();
        return results.filter(r => r.studentId === parseInt(studentId));
    }

    async getQuizResult(quizId, studentId) {
        const results = await this.getQuizResults();
        return results.find(r => 
            r.quizId === parseInt(quizId) && 
            r.studentId === parseInt(studentId)
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
            id: Date.now(),
            quizId: parseInt(quizId),
            studentId: parseInt(studentId),
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
        const resultIndex = results.findIndex(r => r.id === parseInt(resultId));
        
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
        const result = results.find(r => r.id === parseInt(resultId));
        
        if (!result) return [];
        
        return result.answers
            .map((answer, index) => ({...answer, index}))
            .filter(a => a.marks === null && !a.autoGraded);
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
