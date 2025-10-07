// Data Manager - Handles all localStorage operations

class DataManager {
    constructor() {
        this.initializeData();
    }

    // Initialize default data structure
    initializeData() {
        if (!localStorage.getItem('students')) {
            localStorage.setItem('students', JSON.stringify([]));
        }
        if (!localStorage.getItem('tasks')) {
            localStorage.setItem('tasks', JSON.stringify([]));
        }
        if (!localStorage.getItem('messages')) {
            localStorage.setItem('messages', JSON.stringify([]));
        }
        
        // Add sample data if empty
        const students = this.getStudents();
        if (students.length === 0) {
            this.addSampleData();
        }
    }

    // Add sample data for demonstration
    addSampleData() {
        const sampleStudents = [
            { id: 1, name: 'Ahmed Ali', email: 'ahmed@example.com' },
            { id: 2, name: 'Fatima Hassan', email: 'fatima@example.com' },
            { id: 3, name: 'Omar Ibrahim', email: 'omar@example.com' },
            { id: 4, name: 'Aisha Mohammed', email: 'aisha@example.com' },
            { id: 5, name: 'Yusuf Abdullah', email: 'yusuf@example.com' }
        ];

        const sampleTasks = [
            {
                id: 1,
                title: 'Complete Mathematics Assignment',
                description: 'Solve problems 1-20 from Chapter 5',
                type: 'individual',
                assignedTo: [1, 2, 3, 4, 5],
                deadline: '2025-10-15',
                completedBy: [1],
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: 'Science Project Report',
                description: 'Write a detailed report on your science experiment',
                type: 'individual',
                assignedTo: [1, 2, 3, 4, 5],
                deadline: '2025-10-20',
                completedBy: [1, 2],
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                title: 'Group Presentation on Climate Change',
                description: 'Prepare a 15-minute presentation with your group',
                type: 'group',
                assignedTo: [1, 2, 3],
                deadline: '2025-10-25',
                completedBy: [1],
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                title: 'English Essay Writing',
                description: 'Write a 500-word essay on your favorite book',
                type: 'individual',
                assignedTo: [4, 5],
                deadline: '2025-10-18',
                completedBy: [],
                createdAt: new Date().toISOString()
            }
        ];

        localStorage.setItem('students', JSON.stringify(sampleStudents));
        localStorage.setItem('tasks', JSON.stringify(sampleTasks));
    }

    // Students Management
    getStudents() {
        return JSON.parse(localStorage.getItem('students')) || [];
    }

    getStudentById(id) {
        const students = this.getStudents();
        return students.find(s => s.id === parseInt(id));
    }

    addStudent(student) {
        const students = this.getStudents();
        const newStudent = {
            id: Date.now(),
            ...student
        };
        students.push(newStudent);
        localStorage.setItem('students', JSON.stringify(students));
        return newStudent;
    }

    deleteStudent(id) {
        let students = this.getStudents();
        students = students.filter(s => s.id !== parseInt(id));
        localStorage.setItem('students', JSON.stringify(students));
        
        // Also remove student from all tasks
        let tasks = this.getTasks();
        tasks = tasks.map(task => ({
            ...task,
            assignedTo: task.assignedTo.filter(sid => sid !== parseInt(id)),
            completedBy: task.completedBy.filter(sid => sid !== parseInt(id))
        }));
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Tasks Management
    getTasks() {
        return JSON.parse(localStorage.getItem('tasks')) || [];
    }

    getTaskById(id) {
        const tasks = this.getTasks();
        return tasks.find(t => t.id === parseInt(id));
    }

    getTasksForStudent(studentId) {
        const tasks = this.getTasks();
        return tasks.filter(task => 
            task.assignedTo.includes(parseInt(studentId))
        );
    }

    addTask(task) {
        const tasks = this.getTasks();
        const newTask = {
            id: Date.now(),
            ...task,
            completedBy: [],
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        return newTask;
    }

    deleteTask(id) {
        let tasks = this.getTasks();
        tasks = tasks.filter(t => t.id !== parseInt(id));
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    toggleTaskCompletion(taskId, studentId) {
        const tasks = this.getTasks();
        const task = tasks.find(t => t.id === parseInt(taskId));
        
        if (task) {
            const studentIdNum = parseInt(studentId);
            const index = task.completedBy.indexOf(studentIdNum);
            
            if (index > -1) {
                // Remove from completed
                task.completedBy.splice(index, 1);
            } else {
                // Add to completed
                task.completedBy.push(studentIdNum);
            }
            
            localStorage.setItem('tasks', JSON.stringify(tasks));
            return task;
        }
        return null;
    }

    isTaskCompletedByStudent(taskId, studentId) {
        const task = this.getTaskById(taskId);
        return task ? task.completedBy.includes(parseInt(studentId)) : false;
    }

    // Statistics
    getStudentStats(studentId) {
        const tasks = this.getTasksForStudent(studentId);
        const completed = tasks.filter(task => 
            task.completedBy.includes(parseInt(studentId))
        ).length;
        
        return {
            total: tasks.length,
            completed: completed,
            pending: tasks.length - completed,
            percentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
        };
    }

    getOverallStats() {
        const students = this.getStudents();
        const tasks = this.getTasks();
        
        const totalTasks = tasks.length;
        const totalAssignments = tasks.reduce((sum, task) => 
            sum + task.assignedTo.length, 0
        );
        const completedAssignments = tasks.reduce((sum, task) => 
            sum + task.completedBy.length, 0
        );
        
        const individualTasks = tasks.filter(t => t.type === 'individual').length;
        const groupTasks = tasks.filter(t => t.type === 'group').length;
        
        return {
            totalStudents: students.length,
            totalTasks: totalTasks,
            totalAssignments: totalAssignments,
            completedAssignments: completedAssignments,
            pendingAssignments: totalAssignments - completedAssignments,
            overallCompletion: totalAssignments > 0 ? 
                Math.round((completedAssignments / totalAssignments) * 100) : 0,
            individualTasks: individualTasks,
            groupTasks: groupTasks
        };
    }

    getStudentProgress() {
        const students = this.getStudents();
        return students.map(student => {
            const stats = this.getStudentStats(student.id);
            return {
                student: student,
                stats: stats
            };
        });
    }

    // Messages Management
    getMessages() {
        return JSON.parse(localStorage.getItem('messages')) || [];
    }

    getMessagesForStudent(studentId) {
        const messages = this.getMessages();
        return messages.filter(msg => msg.studentId === parseInt(studentId))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    sendMessage(studentId, message, sender) {
        const messages = this.getMessages();
        const newMessage = {
            id: Date.now(),
            studentId: parseInt(studentId),
            message: message,
            sender: sender, // 'teacher' or 'student'
            timestamp: new Date().toISOString(),
            read: false
        };
        messages.push(newMessage);
        localStorage.setItem('messages', JSON.stringify(messages));
        return newMessage;
    }

    markMessagesAsRead(studentId, sender) {
        // Mark all messages from the opposite sender as read
        const messages = this.getMessages();
        const readBy = sender === 'teacher' ? 'student' : 'teacher';
        messages.forEach(msg => {
            if (msg.studentId === parseInt(studentId) && msg.sender === readBy) {
                msg.read = true;
            }
        });
        localStorage.setItem('messages', JSON.stringify(messages));
    }

    getUnreadCount(studentId, forUser) {
        // forUser: 'teacher' or 'student'
        const messages = this.getMessages();
        return messages.filter(msg => 
            msg.studentId === parseInt(studentId) && 
            msg.sender !== forUser && 
            !msg.read
        ).length;
    }

    getLastMessage(studentId) {
        const messages = this.getMessagesForStudent(studentId);
        return messages.length > 0 ? messages[messages.length - 1] : null;
    }

    getAllChatsForTeacher() {
        const students = this.getStudents();
        return students.map(student => {
            const lastMessage = this.getLastMessage(student.id);
            const unreadCount = this.getUnreadCount(student.id, 'teacher');
            return {
                student: student,
                lastMessage: lastMessage,
                unreadCount: unreadCount
            };
        }).sort((a, b) => {
            // Sort by last message time, most recent first
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
        });
    }
}

// Initialize data manager
const dataManager = new DataManager();

