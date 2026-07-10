import { useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Award, TrendingUp, Play, CheckCircle, Clock, BarChart3, Users, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mockCourses, mockInternships } from '../data/mockData';

export function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'progress' | 'internship' | 'certificates'>('courses');
  const [showExam, setShowExam] = useState(false);
  const [examScore, setExamScore] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Mock data for enrolled courses with progress and scores
  const enrolledCoursesData = [
    {
      ...mockCourses[0],
      progress: 85,
      enrolledAt: new Date('2026-01-15'),
      lastAccessed: new Date('2026-03-18'),
      examScore: 88,
      rank: 12, // Your ranking among all students
      totalEnrolled: 150, // Total students in this course
      averageScore: 75,
    },
    {
      ...mockCourses[1],
      progress: 100,
      enrolledAt: new Date('2026-01-10'),
      lastAccessed: new Date('2026-02-28'),
      examScore: 92,
      rank: 5,
      totalEnrolled: 120,
      averageScore: 78,
    },
    {
      ...mockCourses[4],
      progress: 45,
      enrolledAt: new Date('2026-02-01'),
      lastAccessed: new Date('2026-03-15'),
      examScore: null,
      rank: null,
      totalEnrolled: 180,
      averageScore: 72,
    },
  ];

  const completedInternships = [
    {
      id: 'intern1',
      title: 'Content Creator Internship',
      position: 'Content Creator',
      completedDate: new Date('2026-03-01'),
      score: 85,
      feedback: 'Xuất sắc! Bạn đã hoàn thành tốt tất cả các nhiệm vụ.',
      certificateUrl: '#',
    },
  ];

  const completedCourses = enrolledCoursesData.filter(c => c.progress === 100);
  const inProgressCourses = enrolledCoursesData.filter(c => c.progress < 100);
  const averageProgress = Math.round(enrolledCoursesData.reduce((acc, c) => acc + c.progress, 0) / enrolledCoursesData.length);
  const certificateCount = completedCourses.filter(c => c.examScore && c.examScore >= 75).length + completedInternships.length;

  const handleTakeExam = (courseId: string) => {
    setSelectedCourse(courseId);
    setShowExam(true);
  };

  const handleSubmitExam = () => {
    const score = Math.floor(Math.random() * 30) + 70;
    setExamScore(score);
  };

  const handleRateCourse = () => {
    alert('Cảm ơn bạn đã đánh giá khóa học!');
    setShowExam(false);
    setExamScore(null);
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="mb-2">Xin chào, {user?.name}!</h1>
          <p className="text-muted-foreground">Chào mừng trở lại trang học tập của bạn</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 bg-gradient-to-br from-[#DA1564] to-[#8F349C] text-white rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="opacity-90">Khóa đang học</span>
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="text-3xl">{inProgressCourses.length}</div>
          </div>
          <div className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="opacity-90">Hoàn thành</span>
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="text-3xl">{completedCourses.length}</div>
          </div>
          <div className="p-6 bg-gradient-to-br from-[#489EE2] to-[#8F349C] text-white rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="opacity-90">Tiến độ TB</span>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl">{averageProgress}%</div>
          </div>
          <div className="p-6 bg-gradient-to-br from-[#DA1564] to-[#8F349C] text-white rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="opacity-90">Chứng chỉ</span>
              <Award className="h-5 w-5" />
            </div>
            <div className="text-3xl">{certificateCount}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('courses')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Khóa học của tôi
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === 'progress' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Tiến độ học tập
            </button>
            <button
              onClick={() => setActiveTab('internship')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === 'internship' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Chương trình đã hoàn thành
            </button>
            <button
              onClick={() => setActiveTab('certificates')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === 'certificates' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Chứng chỉ
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'courses' && !showExam && (
          <div className="space-y-6">
            {enrolledCoursesData.map(course => (
              <div key={course.id} className="p-6 bg-card border border-border rounded-lg hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-48 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3>{course.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        course.progress === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {course.progress === 100 ? 'Hoàn thành' : 'Đang học'}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4 text-sm">{course.description}</p>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span>Tiến độ</span>
                        <span className="text-primary">{course.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all" 
                          style={{ width: `${course.progress}%` }} 
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                        <Play className="h-4 w-4" />
                        {course.progress === 100 ? 'Xem lại' : 'Tiếp tục học'}
                      </button>
                      {course.progress >= 75 && !course.examScore && (
                        <button
                          onClick={() => handleTakeExam(course.id)}
                          className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
                        >
                          Làm bài thi
                        </button>
                      )}
                      {course.examScore && (
                        <div className="px-4 py-2 bg-accent rounded-lg flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          <span>Điểm: {course.examScore}/100</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Tab with Detailed Statistics */}
        {activeTab === 'progress' && (
          <div className="space-y-8">
            <div>
              <h2 className="mb-6">Dashboard thống kê học tập</h2>
              
              {enrolledCoursesData.map((course) => (
                <div key={course.id} className="mb-8 p-6 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden">
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="mb-1">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.category} • {course.level}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <span className="text-sm text-blue-900">Tiến độ hoàn thành</span>
                      </div>
                      <div className="text-2xl text-blue-900">{course.progress}%</div>
                      <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600" 
                          style={{ width: `${course.progress}%` }} 
                        />
                      </div>
                    </div>

                    {course.examScore !== null && (
                      <>
                        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-900">Điểm số của bạn</span>
                          </div>
                          <div className="text-2xl text-green-900">{course.examScore}/100</div>
                          <p className="text-sm text-green-700 mt-1">
                            Điểm TB lớp: {course.averageScore}
                          </p>
                        </div>

                        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            <span className="text-sm text-purple-900">Xếp hạng</span>
                          </div>
                          <div className="text-2xl text-purple-900">#{course.rank}</div>
                          <p className="text-sm text-purple-700 mt-1">
                            Trong {course.totalEnrolled} học viên
                          </p>
                        </div>
                      </>
                    )}

                    {course.examScore === null && course.progress < 100 && (
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <span className="text-sm text-orange-900">Trạng thái</span>
                        </div>
                        <p className="text-orange-900">
                          Hoàn thành ít nhất 75% để có thể thi
                        </p>
                        <p className="text-sm text-orange-700 mt-1">
                          Còn {100 - course.progress}% nữa
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Performance Comparison */}
                  {course.examScore !== null && (
                    <div className="p-4 bg-accent rounded-lg">
                      <h4 className="mb-3">So sánh hiệu suất</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Điểm của bạn</span>
                            <span className="text-primary">{course.examScore}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-secondary" 
                              style={{ width: `${course.examScore}%` }} 
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Điểm trung bình lớp</span>
                            <span className="text-muted-foreground">{course.averageScore}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gray-400" 
                              style={{ width: `${course.averageScore}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                      {course.examScore > course.averageScore && (
                        <p className="mt-3 text-sm text-green-600 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Bạn đang học tốt hơn {Math.round(((course.examScore - course.averageScore) / course.averageScore) * 100)}% so với trung bình lớp!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exam Section */}
        {showExam && !examScore && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="mb-2">Bài thi cuối khóa</h2>
              <p className="text-muted-foreground">
                Bạn cần đạt ít nhất 75% để hoàn thành khóa học và nhận chứng chỉ
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {[1, 2, 3, 4, 5].map(num => (
                <div key={num} className="p-6 bg-card border border-border rounded-lg">
                  <h4 className="mb-4">Câu {num}: Câu hỏi mẫu về nội dung khóa học?</h4>
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map(option => (
                      <label key={option} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer">
                        <input type="radio" name={`q${num}`} value={option} className="w-4 h-4" />
                        <span>Đáp án {option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSubmitExam}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Nộp bài
              </button>
              <button
                onClick={() => setShowExam(false)}
                className="flex-1 py-3 border border-border rounded-lg hover:bg-accent"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {showExam && examScore !== null && (
          <div className="max-w-2xl mx-auto text-center">
            <div className={`mb-6 p-8 rounded-lg ${examScore >= 75 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-6xl mb-4">{examScore >= 75 ? '🎉' : '😔'}</div>
              <h2 className="mb-2">{examScore >= 75 ? 'Chúc mừng!' : 'Chưa đạt'}</h2>
              <p className="text-2xl mb-2">Điểm của bạn: {examScore}%</p>
              <p className="text-muted-foreground">
                {examScore >= 75
                  ? 'Bạn đã hoàn thành xuất sắc! Vui lòng đánh giá khóa học để nhận chứng chỉ.'
                  : 'Bạn cần đạt ít nhất 75% để hoàn thành. Hãy ôn lại và thử lại nhé!'}
              </p>
            </div>

            {examScore >= 75 ? (
              <div className="p-6 bg-card border border-border rounded-lg">
                <h3 className="mb-4">Đánh giá khóa học</h3>
                <div className="mb-4">
                  <div className="flex justify-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} className="text-3xl hover:scale-110 transition-transform">⭐</button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Chia sẻ trải nghiệm của bạn về khóa học..."
                    rows={4}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <button
                  onClick={handleRateCourse}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  Gửi đánh giá và nhận chứng chỉ
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setExamScore(null);
                  setShowExam(false);
                }}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Quay lại
              </button>
            )}
          </div>
        )}

        {/* Completed Internships Tab */}
        {activeTab === 'internship' && (
          <div>
            {completedInternships.length > 0 ? (
              <div className="space-y-6">
                {completedInternships.map(internship => (
                  <div key={internship.id} className="p-6 bg-card border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="mb-2">{internship.title}</h3>
                        <p className="text-muted-foreground">{internship.position}</p>
                      </div>
                      <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Hoàn thành
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-accent rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Ngày hoàn thành</div>
                        <div>{new Date(internship.completedDate).toLocaleDateString('vi-VN')}</div>
                      </div>
                      <div className="p-4 bg-accent rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Điểm đánh giá</div>
                        <div className="text-primary">{internship.score}/100</div>
                      </div>
                      <div className="p-4 bg-accent rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Trạng thái</div>
                        <div className="text-green-600">Đã cấp chứng chỉ</div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                      <h4 className="mb-2 text-green-900">Nhận xét từ Recruiter</h4>
                      <p className="text-green-800">{internship.feedback}</p>
                    </div>

                    <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                      Tải chứng chỉ
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">Chưa hoàn thành chương trình thực tập nào</h3>
                <p className="text-muted-foreground mb-6">
                  Tham gia chương trình thực tập sinh ảo để tích lũy kinh nghiệm thực tế
                </p>
                <Link to="/internships" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                  Xem chương trình thực tập
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedCourses
              .filter(c => c.examScore && c.examScore >= 75)
              .map(course => (
                <div key={course.id} className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg">
                  <div className="text-center">
                    <Award className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <h3 className="mb-2">Chứng chỉ hoàn thành</h3>
                    <p className="mb-1">{course.title}</p>
                    <p className="text-sm text-muted-foreground mb-2">Điểm: {course.examScore}/100</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ngày cấp: {new Date(course.lastAccessed).toLocaleDateString('vi-VN')}
                    </p>
                    <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                      Tải xuống
                    </button>
                  </div>
                </div>
              ))}
            {completedInternships.map(internship => (
              <div key={internship.id} className="p-8 bg-gradient-to-br from-secondary/10 to-secondary/5 border-2 border-secondary/20 rounded-lg">
                <div className="text-center">
                  <Award className="h-16 w-16 mx-auto mb-4 text-secondary" />
                  <h3 className="mb-2">Chứng chỉ Thực tập</h3>
                  <p className="mb-1">{internship.title}</p>
                  <p className="text-sm text-muted-foreground mb-2">Điểm: {internship.score}/100</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ngày cấp: {new Date(internship.completedDate).toLocaleDateString('vi-VN')}
                  </p>
                  <button className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90">
                    Tải xuống
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}