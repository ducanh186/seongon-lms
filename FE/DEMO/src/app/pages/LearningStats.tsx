import { Link } from 'react-router';
import { BookOpen, Award, TrendingUp, Clock, Calendar, CheckCircle, FileText, BarChart3 } from 'lucide-react';
import { mockCourses } from '../data/mockData';

export function LearningStats() {
  // Mock enrolled courses
  const enrolledCourses = [
    {
      ...mockCourses[0],
      progress: 65,
      enrolledAt: new Date('2026-01-15'),
      lastAccessed: new Date('2026-03-18'),
      examScore: null,
    },
    {
      ...mockCourses[1],
      progress: 100,
      enrolledAt: new Date('2026-01-10'),
      lastAccessed: new Date('2026-02-28'),
      examScore: 85,
    },
    {
      ...mockCourses[4],
      progress: 35,
      enrolledAt: new Date('2026-02-01'),
      lastAccessed: new Date('2026-03-15'),
      examScore: null,
    },
  ];

  const completedCourses = enrolledCourses.filter(c => c.progress === 100);
  const inProgressCourses = enrolledCourses.filter(c => c.progress < 100);

  const stats = [
    {
      label: 'Khóa học đang học',
      value: inProgressCourses.length,
      icon: BookOpen,
      color: 'from-primary to-teal-600',
    },
    {
      label: 'Khóa học đã hoàn thành',
      value: completedCourses.length,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-600',
    },
    {
      label: 'Chứng chỉ đạt được',
      value: completedCourses.filter(c => c.examScore && c.examScore >= 75).length,
      icon: Award,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      label: 'Điểm trung bình',
      value: completedCourses.length > 0 
        ? Math.round(completedCourses.reduce((acc, c) => acc + (c.examScore || 0), 0) / completedCourses.length) 
        : 0,
      icon: TrendingUp,
      color: 'from-secondary to-pink-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="mb-2">Thống kê học tập</h1>
        <p className="text-muted-foreground">Theo dõi tiến độ và kết quả học tập của bạn</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, index) => (
          <div key={index} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className={`bg-gradient-to-r ${stat.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-8 w-8" />
                <div className="text-3xl">{stat.value}</div>
              </div>
              <div className="text-sm opacity-90">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* In Progress Courses */}
      {inProgressCourses.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-6 w-6 text-primary" />
            <h2>Khóa học đang học ({inProgressCourses.length})</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {inProgressCourses.map((course) => (
              <div key={course.id} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex">
                  <div className="w-1/3 aspect-square">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        {course.category}
                      </span>
                      <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded">
                        Đang học
                      </span>
                    </div>
                    <h3 className="mb-2">{course.title}</h3>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Tiến độ</span>
                        <span className="text-primary">{course.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-teal-600 transition-all"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(course.lastAccessed).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Tiếp tục học
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Award className="h-6 w-6 text-green-600" />
            <h2>Khóa học đã hoàn thành ({completedCourses.length})</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedCourses.map((course) => (
              <div key={course.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex">
                  <div className="w-1/3 aspect-square">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        {course.category}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Hoàn thành
                      </span>
                    </div>
                    <h3 className="mb-2">{course.title}</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Điểm số</span>
                        <span className={`${
                          course.examScore && course.examScore >= 75 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {course.examScore}/100
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Hoàn thành</span>
                        <span>{new Date(course.lastAccessed).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                    {course.examScore && course.examScore >= 75 ? (
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors">
                        <FileText className="h-4 w-4" />
                        Tải chứng chỉ
                      </button>
                    ) : (
                      <Link
                        to={`/courses/${course.id}`}
                        className="inline-block px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Thi lại
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Activity Chart */}
      <div className="mt-12 bg-card border border-border rounded-lg p-8">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h3>Hoạt động học tập</h3>
        </div>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Biểu đồ hoạt động học tập sẽ được hiển thị tại đây</p>
          </div>
        </div>
      </div>
    </div>
  );
}
