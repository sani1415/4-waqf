# Task Management System - Waqf

A beautiful, modern web application for managing student tasks with real-time progress tracking. Built with vanilla HTML, CSS, and JavaScript with a comforting color scheme that's easy on the eyes.

## 🌟 Features

### For Teachers
- **Dashboard Overview**: View all students' progress at a glance
- **Task Management**: Create individual or group tasks
- **Student Management**: Add, view, and manage students
- **Analytics**: Track completion rates and task distribution
- **Real-time Progress Bars**: Visual representation of each student's progress

### For Students
- **Personal Dashboard**: View assigned tasks and completion status
- **Task Completion**: Simple checkbox interface to mark tasks as complete
- **Progress Tracking**: See your overall completion percentage
- **Deadline Tracking**: Visual indicators for upcoming and overdue tasks
- **Search Functionality**: Quickly find your name from the student list

## 🎨 Design Features

- **Comforting Color Scheme**: Soft blues, purples, and greens that are easy on the eyes
- **Modern UI**: Clean, card-based layout with smooth animations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Sidebar Navigation**: Easy access to all features
- **Glass Morphism Effects**: Modern, translucent design elements
- **Progress Animations**: Engaging visual feedback

## 🚀 Getting Started

### Installation

1. **Clone or download** this repository to your local machine
2. No installation or build process required!
3. Simply open `index.html` in your web browser

### First Time Setup

When you first open the application, sample data will be automatically loaded with:
- 5 sample students
- 4 sample tasks
- Pre-populated progress data

You can delete or modify this sample data as needed.

## 📖 How to Use

### Landing Page
1. Open `index.html` in your browser
2. Choose your role:
   - **Teacher**: Access the teacher dashboard
   - **Student**: View student list and select your name

### Teacher Dashboard

#### Creating Tasks
1. Click "Create Task" in the sidebar
2. Fill in task details:
   - Task title
   - Description (optional)
   - Type (Individual or Group)
   - Assign to students
   - Deadline (optional)
3. Click "Create Task"

#### Managing Students
1. Click "Students" in the sidebar
2. Click "Add Student" to add new students
3. View student cards with their progress
4. Remove students if needed (warning: this action cannot be undone)

#### Viewing Analytics
1. Click "Analytics" in the sidebar
2. View overall completion rate
3. See task distribution (Individual vs Group)

### Student Experience

#### Selecting Your Name
1. From the landing page, click "Student"
2. Use the search box to find your name quickly
3. Click on your name card to enter your dashboard

#### Completing Tasks
1. Your dashboard shows all assigned tasks
2. Tasks are organized into:
   - **Pending Tasks**: Tasks you haven't completed yet
   - **Completed Tasks**: Tasks you've already finished
3. Click the checkbox next to a task to mark it as complete
4. Your progress bar updates automatically

#### Understanding Task Information
- **Individual Tasks**: Tasks assigned to you personally
- **Group Tasks**: Tasks assigned to multiple students
- **Deadline Indicators**:
  - Green: More than 2 days remaining
  - Orange: 2 days or less remaining
  - Red: Overdue tasks
- **Progress Percentage**: Shows your overall completion rate

## 🗂️ File Structure

```
waqf - 1/
├── index.html                    # Landing page
├── teacher-dashboard.html        # Teacher interface
├── student-list.html            # Student selection page
├── student-dashboard.html       # Student task view
├── css/
│   ├── common.css               # Shared styles and variables
│   ├── landing.css              # Landing page styles
│   ├── teacher.css              # Teacher dashboard styles
│   └── student.css              # Student pages styles
├── js/
│   ├── data-manager.js          # Data storage and management
│   ├── teacher.js               # Teacher dashboard functionality
│   ├── student-list.js          # Student list functionality
│   └── student-dashboard.js     # Student dashboard functionality
└── README.md                    # This file
```

## 💾 Data Storage

The application uses browser **localStorage** to store all data:
- Student information
- Task assignments
- Completion status

**Important Notes:**
- Data persists between sessions
- Clearing browser data will reset the application
- Each browser/device has separate data storage
- Perfect for demonstration and local use
- For production use, you would need a backend server

## 🎯 Future Enhancements

This prototype is ready for the following improvements:
- User authentication system
- Backend server integration
- Database storage
- Email notifications
- File attachments for tasks
- Comments and feedback system
- Due date reminders
- Export progress reports
- Multi-language support

## 🛠️ Customization

### Changing Colors
Edit the CSS variables in `css/common.css`:
```css
:root {
    --primary-soft: #7B9EBD;        /* Soft blue */
    --primary-light: #A8C5E3;       /* Light blue */
    --secondary-soft: #B8A5D6;      /* Soft purple */
    --success-soft: #88B68D;        /* Soft green */
    /* ... more colors ... */
}
```

### Modifying Sample Data
Edit the `addSampleData()` method in `js/data-manager.js` to customize initial students and tasks.

## 🌐 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Opera

Requires a modern browser with localStorage support.

## 📱 Responsive Breakpoints

- **Desktop**: 1024px and above
- **Tablet**: 768px to 1023px
- **Mobile**: Below 768px

## 🤝 Contributing

This is a prototype/demonstration project. Feel free to fork and modify for your needs!

## 📄 License

Free to use for educational purposes.

## 👨‍💻 Technical Details

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with CSS Variables
- **Icons**: Font Awesome 6.4.0
- **Storage**: Browser localStorage API
- **No Dependencies**: No frameworks or libraries required
- **No Build Process**: Works directly in the browser

## 🔒 Privacy

All data is stored locally in your browser. No data is sent to any server.

## 📞 Support

For issues or questions about this prototype, please refer to the code comments or modify as needed for your specific use case.

---

**Bismillah** - Built with care for educational purposes 📚✨

Enjoy using the Task Management System!

