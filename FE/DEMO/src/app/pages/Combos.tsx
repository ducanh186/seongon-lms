import { Link } from 'react-router';
import { mockCombos, mockCourses } from '../data/mockData';
import { BookOpen, CheckCircle, GraduationCap, TrendingUp } from 'lucide-react';

export function Combos() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#DA1564] via-[#8F349C] to-[#DA1564] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl mb-6">Combo khóa học</h1>
            <p className="text-xl opacity-90">
              Tiết kiệm hơn khi học theo lộ trình và mở khóa chương trình Thực tập sinh ảo
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2">Tiết kiệm chi phí</h3>
                <p className="text-muted-foreground">Giảm giá đến 20% khi mua combo so với mua lẻ từng khóa</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2">Lộ trình rõ ràng</h3>
                <p className="text-muted-foreground">Học theo lộ trình bài bản từ cơ bản đến nâng cao</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="mb-2">Mở khóa Thực tập ảo</h3>
                <p className="text-muted-foreground">Truy cập chương trình Thực tập sinh ảo độc quyền</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Combo List */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {mockCombos.map((combo) => {
              const comboCourses = mockCourses.filter(course => combo.courses.includes(course.id));
              const originalPrice = comboCourses.reduce((sum, course) => sum + course.price, 0);

              return (
                <div key={combo.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl mb-2">{combo.title}</h2>
                        <p className="opacity-90">{combo.description}</p>
                      </div>
                      <div className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                        {combo.courses.length} khóa học
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="p-6 bg-accent/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground line-through mb-1">
                          {originalPrice.toLocaleString('vi-VN')}đ
                        </div>
                        <div className="text-3xl text-primary">
                          {combo.price.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-block px-4 py-2 bg-secondary text-white rounded-lg">
                          Tiết kiệm {combo.discount.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course List */}
                  <div className="p-6">
                    <h3 className="mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Các khóa học trong combo
                    </h3>
                    <div className="space-y-3 mb-6">
                      {comboCourses.map((course, index) => (
                        <div key={course.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="mb-1">{course.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {course.level} • {course.duration}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {course.price.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Internship Badge */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg mb-6 border border-purple-200">
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-6 w-6 text-secondary flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-secondary mb-1">🎉 Mở khóa đặc quyền</div>
                          <div className="text-sm text-muted-foreground">
                            Hoàn thành combo này để tham gia chương trình Thực tập sinh ảo
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Truy cập trọn đời các khóa học</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Hỗ trợ 1-1 từ giảng viên</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Chứng chỉ hoàn thành</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Tham gia cộng đồng học viên SEONGON</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      to="/login"
                      className="block w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white text-center rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Đăng ký combo ngay
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Combo */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mb-6">Tại sao nên chọn combo khóa học?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Combo khóa học được thiết kế để giúp bạn học theo lộ trình bài bản, tiết kiệm chi phí và
            mở khóa nhiều lợi ích đặc biệt. Đặc biệt, hoàn thành combo là điều kiện để tham gia
            chương trình Thực tập sinh ảo độc quyền của SEONGON.
          </p>
          <Link
            to="/internships"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Tìm hiểu về Thực tập sinh ảo
          </Link>
        </div>
      </section>
    </div>
  );
}