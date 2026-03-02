import '@/styles/teacher.css';
import '@/styles/daily-overview.css';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="teacher-dashboard">
      {children}
    </div>
  );
}
