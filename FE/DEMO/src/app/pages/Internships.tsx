import { Link } from 'react-router';
import { GraduationCap, Clock, CheckCircle, Award, BookOpen, Lock } from 'lucide-react';
import { mockInternships, mockCombos, mockCourses } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';

export function Internships() {
  const { user } = useAuth();
  
  // Mock: Completed combos for logged-in users
  const completedCombos = user ? ['combo1'] : [];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4">Chương Trình Thực Tập Sinh Ảo</h1>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Trải nghiệm làm việc thực tế tại SEONGON sau khi hoàn thành combo lộ trình khóa học.
            Chương trình được thiết kế để giúp bạn vừa học vừa thực hành, đảm bảo đầu ra có việc làm ngay.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-16 p-8 bg-gradient-to-br from-primary/10 to-accent rounded-lg">
          <h2 className="mb-8 text-center">Quy trình tham gia</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#DA1564] to-[#8F349C] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1</span>
              </div>
              <h4 className="mb-2">Hoàn thành Combo</h4>
              <p className="text-sm text-muted-foreground">
                Học xong tất cả khóa trong combo lộ trình
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#8F349C] to-[#DA1564] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2</span>
              </div>
              <h4 className="mb-2">Kích hoạt chương trình</h4>
              <p className="text-sm text-muted-foreground">
                Đủ điều kiện để tham gia thực tập
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#DA1564] to-[#8F349C] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3</span>
              </div>
              <h4 className="mb-2">Hoàn thành nhiệm vụ</h4>
              <p className="text-sm text-muted-foreground">
                8 giờ để làm việc như nhân viên thực
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#8F349C] to-[#DA1564] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">4</span>
              </div>
              <h4 className="mb-2">Nhận chứng chỉ</h4>
              <p className="text-sm text-muted-foreground">
                Được ưu tiên phỏng vấn trực tiếp
              </p>
            </div>
          </div>
        </div>

        {/* Internship Programs */}
        <div className="mb-12">
          <h2 className="mb-8">
            {user && completedCombos.length > 0 
              ? 'Chương trình bạn có quyền tham gia' 
              : 'Các chương trình thực tập'}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {mockInternships.map(internship => {
              const combo = mockCombos.find(c => c.id === internship.requiredComboId);
              const comboCourses = combo ? mockCourses.filter(c => combo.courses.includes(c.id)) : [];
              const isEligible = user && completedCombos.includes(internship.requiredComboId);

              return (
                <div key={internship.id} className={`border rounded-lg overflow-hidden ${
                  isEligible ? 'border-primary shadow-lg' : 'border-border'
                }`}>
                  <div className={`p-6 ${
                    isEligible 
                      ? 'bg-gradient-to-br from-[#DA1564] to-[#8F349C]' 
                      : 'bg-gradient-to-br from-gray-100 to-gray-200'
                  } text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isEligible ? (
                          <GraduationCap className="h-6 w-6" />
                        ) : (
                          <Lock className="h-6 w-6 text-gray-500" />
                        )}
                        <span className={`text-sm ${isEligible ? 'opacity-90' : 'text-black'}`}>
                          {isEligible ? 'Sẵn sàng tham gia' : 'Cần hoàn thành combo'}
                        </span>
                      </div>
                      {isEligible && (
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs backdrop-blur-sm">
                          Đủ điều kiện
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 text-gray-900">{internship.position}</h3>
                    <p className={isEligible ? 'opacity-90' : 'text-gray-600'}>{internship.description}</p>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{internship.duration} giờ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span>{internship.tasks.length} nhiệm vụ</span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="mb-3">Điều kiện tham gia</h4>
                      {combo && (
                        <div className={`p-4 rounded-lg ${
                          isEligible ? 'bg-green-50 border border-green-200' : 'bg-accent'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Award className={`h-5 w-5 ${isEligible ? 'text-green-600' : 'text-primary'}`} />
                            <span className={isEligible ? 'text-green-900' : ''}>{combo.title}</span>
                            {isEligible && (
                              <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                            )}
                          </div>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {comboCourses.map(course => (
                              <li key={course.id} className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                {course.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <h4 className="mb-3">Nhiệm vụ thực tập</h4>
                      <ul className="space-y-2">
                        {internship.tasks.slice(0, 3).map((task, index) => (
                          <li key={task.id} className="flex items-start gap-2 text-sm">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                              {index + 1}
                            </span>
                            <div>
                              <div>{task.title}</div>
                              <div className="text-muted-foreground">{task.description}</div>
                            </div>
                          </li>
                        ))}
                        {internship.tasks.length > 3 && (
                          <li className="text-sm text-muted-foreground pl-8">
                            +{internship.tasks.length - 3} nhiệm vụ khác...
                          </li>
                        )}
                      </ul>
                    </div>

                    {isEligible ? (
                      <Link
                        to={`/internships/${internship.id}`}
                        className="block w-full py-3 text-center bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Bắt đầu chương trình
                      </Link>
                    ) : combo ? (
                      <Link
                        to={`/combos`}
                        className="block w-full py-3 text-center bg-muted text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                      >
                        Xem combo lộ trình
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits */}
        <div className="p-8 bg-gradient-to-br from-accent to-white rounded-lg border border-primary/20">
          <h2 className="mb-6 text-center">Lợi ích khi tham gia</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#DA1564] to-[#8F349C] rounded-lg flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h4 className="mb-2">Kinh nghiệm thực tế</h4>
              <p className="text-sm text-muted-foreground">
                Làm việc với dự án thực tế của doanh nghiệp
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#8F349C] to-[#DA1564] rounded-lg flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6 text-white" />
              </div>
              <h4 className="mb-2">Chứng chỉ có giá trị</h4>
              <p className="text-sm text-muted-foreground">
                Được công ty công nhận, bỏ qua vòng đánh giá nghiệp vụ
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#DA1564] to-[#8F349C] rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h4 className="mb-2">Ưu tiên tuyển dụng</h4>
              <p className="text-sm text-muted-foreground">
                Tham gia phỏng vấn trực tiếp khi có vị trí tuyển dụng
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}