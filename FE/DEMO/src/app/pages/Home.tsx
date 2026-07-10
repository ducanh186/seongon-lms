import { useState } from 'react';
import { Link } from 'react-router';
import { Play, Users, Award, TrendingUp, BookOpen, Clock, Star, ArrowRight, CheckCircle, GraduationCap, Briefcase } from 'lucide-react';
import { mockCourses, mockCombos } from '../data/mockData';

export function Home() {
  const [activeSlogan, setActiveSlogan] = useState(0);
  
  const slogans = [
    "Học từ chuyên gia - Làm việc như chuyên nghiệp",
    "Đầu tư cho bản thân - Thu hoạch thành công",
    "Kỹ năng thực tế - Cơ hội việc làm đích thực"
  ];

  const categories = [
    { name: 'SEO', icon: TrendingUp, color: 'from-[#00D4E7] to-[#E91E8C]' },
    { name: 'Content', icon: BookOpen, color: 'from-[#E91E8C] to-[#00D4E7]' },
    { name: 'Social Media', icon: Users, color: 'from-[#00D4E7] to-[#E91E8C]' },
    { name: 'Email Marketing', icon: Star, color: 'from-[#E91E8C] to-[#00D4E7]' },
    { name: 'Analytics', icon: TrendingUp, color: 'from-[#00D4E7] to-[#E91E8C]' },
    { name: 'Advertising', icon: Award, color: 'from-[#E91E8C] to-[#00D4E7]' },
  ];

  const featuredCourses = mockCourses.slice(0, 3);

  const teamMembers = [
    {
      name: 'Nguyễn Văn A',
      role: 'CEO & Founder',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      description: '10+ năm kinh nghiệm trong Marketing và đào tạo'
    },
    {
      name: 'Trần Thị B',
      role: 'Head of Education',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      description: 'Chuyên gia đào tạo với nhiều chứng chỉ quốc tế'
    },
    {
      name: 'Lê Văn C',
      role: 'Senior Marketing Manager',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      description: 'Giảng viên hàng đầu về Digital Marketing'
    }
  ];

  const testimonials = [
    {
      name: 'Phạm Minh D',
      role: 'Digital Marketing Executive',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      rating: 5,
      content: 'Khóa học rất thực tế và dễ hiểu. Tôi đã tìm được việc ngay sau khi hoàn thành.'
    },
    {
      name: 'Hoàng Thu E',
      role: 'Content Creator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      rating: 5,
      content: 'Đội ngũ giảng viên nhiệt tình, luôn sẵn sàng hỗ trợ. Chương trình thực tập ảo rất hữu ích!'
    },
    {
      name: 'Đặng Quốc F',
      role: 'SEO Specialist',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      rating: 5,
      content: 'Nội dung cập nhật, phù hợp với xu hướng thị trường. Rất đáng để đầu tư!'
    }
  ];

  return (
    <div>
      {/* Hero Banner with Slogans */}
      <section className="relative bg-gradient-to-br from-[#00D4E7] via-[#E91E8C] to-[#00D4E7] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1758873271824-a3216c80d1ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwbWFya2V0aW5nJTIwcGVyc29uJTIwY29sbGFib3JhdGlvbnxlbnwxfHx8fDE3NzM4MDU5OTg?ixlib=rb-4.1.0&q=80&w=1080')] opacity-10 bg-cover bg-center"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="inline-block px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                  <span className="text-sm">✨ Nền tảng đào tạo Marketing hàng đầu</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight">
                  Đào tạo nghề<br />Marketing thực chiến
                </h1>
                <div className="space-y-3 text-lg md:text-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 flex-shrink-0" />
                    <span>Học cùng chuyên gia thực chiến</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 flex-shrink-0" />
                    <span>Tham gia Cộng Đồng SEONGON</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 flex-shrink-0" />
                    <span>Đạt Chứng Nhận Google Marketing Expert</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link
                    to="/courses"
                    className="px-8 py-4 bg-white text-primary rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    Khám phá khóa học
                  </Link>
                  <Link
                    to="/combos"
                    className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all"
                  >
                    Xem Combo khóa học
                  </Link>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJrZXRpbmclMjBhbmFseXRpY3MlMjBkYXNoYm9hcmR8ZW58MXx8fHwxNzc0MDE2MzQ3fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="SEONGON Marketing Education"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Danh mục khóa học</h2>
            <p className="text-muted-foreground">Chọn lĩnh vực bạn muốn theo đuổi</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to="/courses"
                className="group"
              >
                <div className="p-6 bg-white border border-border rounded-xl hover:shadow-lg transition-all transform hover:scale-105">
                  <div className={`w-14 h-14 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mb-3 mx-auto group-hover:rotate-6 transition-transform`}>
                    <category.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-center text-sm">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Khóa học nổi bật</h2>
            <p className="text-muted-foreground">Được học viên yêu thích nhất</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredCourses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all transform hover:scale-105"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded">
                      {course.level}
                    </span>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span>{course.rating}</span>
                    </div>
                  </div>
                  <h3 className="mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary">
                      {course.price.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {course.totalStudents} học viên
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/courses"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Xem tất cả khóa học
            </Link>
          </div>
        </div>
      </section>

      {/* Stats - Con số ấn tượng */}
      <section className="relative py-20 bg-gradient-to-br from-[#00D4E7] via-[#E91E8C] to-[#0BC4D9] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1758691736934-e5d6d0c7f875?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwYnJhaW5zdG9ybWluZyUyMGNyZWF0aXZlJTIwaWRlYXN8ZW58MXx8fHwxNzc0MDE2MzQ4fDA&ixlib=rb-4.1.0&q=80&w=1080')] opacity-10 bg-cover bg-center"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Con số ấn tượng</h2>
            <p className="text-lg opacity-90">Thành tích của SEONGON Academy</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all transform hover:scale-105">
              <div className="flex items-center justify-center mb-3">
                <Users className="h-10 w-10" />
              </div>
              <div className="text-4xl md:text-5xl mb-2">5,000+</div>
              <div className="opacity-90">Học viên đã đào tạo</div>
            </div>
            <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all transform hover:scale-105">
              <div className="flex items-center justify-center mb-3">
                <BookOpen className="h-10 w-10" />
              </div>
              <div className="text-4xl md:text-5xl mb-2">50+</div>
              <div className="opacity-90">Khóa học chất lượng</div>
            </div>
            <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all transform hover:scale-105">
              <div className="flex items-center justify-center mb-3">
                <Award className="h-10 w-10" />
              </div>
              <div className="text-4xl md:text-5xl mb-2">98%</div>
              <div className="opacity-90">Học viên hài lòng</div>
            </div>
            <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all transform hover:scale-105">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="h-10 w-10" />
              </div>
              <div className="text-4xl md:text-5xl mb-2">85%</div>
              <div className="opacity-90">Có việc làm sau tốt nghiệp</div>
            </div>
          </div>
        </div>
      </section>

      {/* Virtual Internship Banner */}
      <section className="relative py-20 bg-gradient-to-r from-[#E91E8C] to-[#00D4E7] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1680459575544-c6cb51abdc84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZW1vdGUlMjB3b3JrJTIwbGFwdG9wJTIwb2ZmaWNlfGVufDF8fHx8MTc3Mzg4NjU3N3ww&ixlib=rb-4.1.0&q=80&w=1080')] opacity-5 bg-cover bg-center\"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
                <GraduationCap className="h-5 w-5" />
                <span className="text-sm">Chương trình độc quyền</span>
              </div>
              <h2 className="text-4xl mb-6">Chương trình Thực tập sinh ảo</h2>
              <p className="text-xl opacity-90 mb-8">
                Trải nghiệm môi trường làm việc thực tế trong 8 giờ. Hoàn thành các nhiệm vụ như một nhân viên chính thức tại SEONGON.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 flex-shrink-0" />
                  <span>Thực hành dự án thực tế</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 flex-shrink-0" />
                  <span>Được mentor 1-1 từ chuyên gia</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 flex-shrink-0" />
                  <span>Cơ hội được tuyển dụng chính thức</span>
                </li>
              </ul>
              <Link
                to="/internships"
                className="inline-block px-8 py-4 bg-white text-[#E91E8C] rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                Tìm hiểu thêm
              </Link>
            </div>
            <div className="hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1680459575544-c6cb51abdc84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZW1vdGUlMjB3b3JrJTIwbGFwdG9wJTIwb2ZmaWNlfGVufDF8fHx8MTc3Mzg4NjU3N3ww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Virtual Internship"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Recruitment Banner */}
      <section className="relative py-20 bg-gradient-to-r from-[#00D4E7] to-[#E91E8C] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1770669564689-d3e8ec8d1595?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNydWl0bWVudCUyMGhpcmluZyUyMHByb2Zlc3Npb25hbHN8ZW58MXx8fHwxNzczODg2NTc0fDA&ixlib=rb-4.1.0&q=80&w=1080')] opacity-5 bg-cover bg-center\"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <img
                src="https://images.unsplash.com/photo-1758518731027-78a22c8852ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWNjZXNzJTIwY2VsZWJyYXRpb24lMjBhY2hpZXZlbWVudHxlbnwxfHx8fDE3NzM4MjY2NzV8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Join SEONGON"
                className="rounded-2xl shadow-2xl"
              />
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
                <Briefcase className="h-5 w-5" />
                <span className="text-sm">Cơ hội nghề nghiệp</span>
              </div>
              <h2 className="text-4xl mb-6">Tuyển dụng tại SEONGON</h2>
              <p className="text-xl opacity-90 mb-8">
                Chúng tôi luôn tìm kiếm những tài năng trẻ, nhiệt huyết để cùng phát triển. Ưu tiên tuyển dụng học viên xuất sắc từ các khóa học.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                  <div className="text-3xl mb-2">20+</div>
                  <div className="opacity-90">Vị trí tuyển dụng</div>
                </div>
                <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                  <div className="text-3xl mb-2">Hấp dẫn</div>
                  <div className="opacity-90">Mức lương</div>
                </div>
              </div>
              <Link
                to="/jobs"
                className="inline-block px-8 py-4 bg-white text-[#00D4E7] rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                Xem cơ hội việc làm
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Team Introduction */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Đội ngũ SEONGON</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Đội ngũ chuyên gia giàu kinh nghiệm, tận tâm đào tạo và hỗ trợ học viên
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="mb-2">{member.name}</h3>
                  <p className="text-secondary mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Nhận xét học viên</h2>
            <p className="text-muted-foreground">Những chia sẻ chân thật từ học viên SEONGON</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-6 bg-card border border-border rounded-xl hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div>{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-[#00D4E7] via-[#E91E8C] to-[#00D4E7] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl mb-6">Sẵn sàng bắt đầu hành trình của bạn?</h2>
          <p className="text-xl opacity-90 mb-8">
            Đăng ký ngay hôm nay để nhận ưu đãi đặc biệt cho học viên mới
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/courses"
              className="px-8 py-4 bg-white text-primary rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Xem các khóa học
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}