import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Star, Clock, Users, BookOpen, Check, ChevronDown, ChevronUp, CreditCard, QrCode } from 'lucide-react';
import { mockCourses } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';

export function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'qr'>('card');
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  const course = mockCourses.find(c => c.id === id);

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2>Không tìm thấy khóa học</h2>
        <button onClick={() => navigate('/courses')} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const handleEnroll = () => {
    if (!user || user.role === 'guest') {
      navigate('/login', { state: { from: `/courses/${id}` } });
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = () => {
    alert('Thanh toán thành công! Khóa học đã được kích hoạt.');
    setShowPayment(false);
    navigate('/dashboard');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded">
                {course.category}
              </span>
              <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded">
                {course.level}
              </span>
            </div>
            <h1 className="mb-4">{course.title}</h1>
            <p className="text-muted-foreground mb-4">{course.description}</p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span>{course.rating} ({course.totalStudents} đánh giá)</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span>{course.totalStudents} học viên</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>{course.duration}</span>
              </div>
            </div>
          </div>

          {/* Course Image */}
          <div className="mb-8 aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* What You'll Learn */}
          <div className="mb-8 p-6 bg-accent rounded-lg">
            <h3 className="mb-4">Bạn sẽ học được gì?</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Kiến thức nền tảng vững chắc</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Kỹ năng thực hành thực tế</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Dự án thực tế từ doanh nghiệp</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Chứng chỉ được công nhận</span>
              </li>
            </ul>
          </div>

          {/* Course Content */}
          <div className="mb-8">
            <h3 className="mb-4">Nội dung khóa học</h3>
            <div className="space-y-2">
              {course.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <div>Bài {index + 1}: {lesson.title}</div>
                        <div className="text-sm text-muted-foreground">{lesson.duration}</div>
                      </div>
                    </div>
                    {expandedLesson === lesson.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  {expandedLesson === lesson.id && (
                    <div className="px-4 pb-4 pt-2 bg-accent/50">
                      <p className="text-sm text-muted-foreground">
                        Nội dung chi tiết của bài học sẽ được hiển thị sau khi đăng ký khóa học.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructor */}
          <div className="p-6 border border-border rounded-lg mb-8">
            <h3 className="mb-4">Giảng viên</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="mb-1">{course.instructor}</div>
                <p className="text-sm text-muted-foreground">
                  Chuyên gia Marketing với 10+ năm kinh nghiệm
                </p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          {course.reviews && course.reviews.length > 0 && (
            <div>
              <h3 className="mb-6">Đánh giá từ học viên</h3>
              <div className="space-y-6">
                {course.reviews.map((review) => (
                  <div key={review.id} className="p-6 border border-border rounded-lg">
                    <div className="flex items-start gap-4">
                      <img
                        src={review.userAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                        alt={review.userName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="mb-1">{review.userName}</div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 p-6 border border-border rounded-lg bg-card">
            <div className="mb-6">
              <div className="text-3xl mb-2">
                {course.price.toLocaleString('vi-VN')} đ
              </div>
              <p className="text-sm text-muted-foreground">Truy cập trong 1 năm</p>
            </div>

            {!showPayment ? (
              <button
                onClick={handleEnroll}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity mb-4"
              >
                Đăng ký ngay
              </button>
            ) : (
              <div className="space-y-4">
                <h4>Chọn phương thức thanh toán</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span>Thẻ tín dụng/ghi nợ</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('qr')}
                    className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      paymentMethod === 'qr' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                    }`}
                  >
                    <QrCode className="h-5 w-5" />
                    <span>QR Code ngân hàng</span>
                  </button>
                </div>

                {paymentMethod === 'card' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Số thẻ"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="px-3 py-2 border border-border rounded-lg bg-background"
                      />
                      <input
                        type="text"
                        placeholder="CVV"
                        className="px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'qr' && (
                  <div className="bg-white p-4 rounded-lg">
                    <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                      <QrCode className="h-32 w-32 text-gray-400" />
                    </div>
                    <p className="text-sm text-center mt-2 text-muted-foreground">
                      Quét mã QR để thanh toán
                    </p>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Xác nhận thanh toán
                </button>
                <button
                  onClick={() => setShowPayment(false)}
                  className="w-full py-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Hủy
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Truy cập trọn đời</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Chứng chỉ hoàn thành</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Hỗ trợ 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}