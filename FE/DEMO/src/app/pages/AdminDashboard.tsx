import { useState } from 'react';
import { Users, BookOpen, Award, TrendingUp, Plus, Edit, Trash2 } from 'lucide-react';
import { mockCourses, mockCombos } from '../data/mockData';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'students' | 'combos'>('overview');
  const [showAddCourse, setShowAddCourse] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="mb-2">Quản trị hệ thống</h1>
        <p className="text-muted-foreground">Quản lý khóa học, học viên và chương trình đào tạo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Tổng học viên</span>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl mb-1">5,230</div>
          <div className="text-sm text-green-600">+12% tháng này</div>
        </div>
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Khóa học</span>
            <BookOpen className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl mb-1">{mockCourses.length}</div>
          <div className="text-sm text-green-600">+3 khóa mới</div>
        </div>
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Doanh thu tháng</span>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl mb-1">₫125M</div>
          <div className="text-sm text-green-600">+18% tháng trước</div>
        </div>
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Chứng chỉ cấp</span>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-3xl mb-1">342</div>
          <div className="text-sm text-muted-foreground">Tháng này</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Quản lý khóa học
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === 'students' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Quản lý học viên
          </button>
          <button
            onClick={() => setActiveTab('combos')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === 'combos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Combo lộ trình
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-card border border-border rounded-lg">
              <h3 className="mb-4">Khóa học phổ biến</h3>
              <div className="space-y-3">
                {mockCourses.slice(0, 5).map(course => (
                  <div key={course.id} className="flex items-center justify-between">
                    <span>{course.title}</span>
                    <span className="text-primary">{course.totalStudents} HV</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-lg">
              <h3 className="mb-4">Hoạt động gần đây</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <div>
                    <p>Học viên mới đăng ký: Nguyễn Văn A</p>
                    <p className="text-muted-foreground">5 phút trước</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p>Khóa học mới được tạo: React Advanced</p>
                    <p className="text-muted-foreground">2 giờ trước</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5" />
                  <div>
                    <p>Chứng chỉ được cấp cho: Trần Thị B</p>
                    <p className="text-muted-foreground">3 giờ trước</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2>Danh sách khóa học</h2>
            <button
              onClick={() => setShowAddCourse(!showAddCourse)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Thêm khóa học
            </button>
          </div>

          {showAddCourse && (
            <div className="mb-6 p-6 bg-card border border-border rounded-lg">
              <h3 className="mb-4">Tạo khóa học mới</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Tên khóa học" className="px-4 py-2 border border-border rounded-lg bg-background" />
                <input type="text" placeholder="Danh mục" className="px-4 py-2 border border-border rounded-lg bg-background" />
                <input type="text" placeholder="Giá (VND)" className="px-4 py-2 border border-border rounded-lg bg-background" />
                <input type="text" placeholder="Thời lượng" className="px-4 py-2 border border-border rounded-lg bg-background" />
                <textarea placeholder="Mô tả" rows={3} className="md:col-span-2 px-4 py-2 border border-border rounded-lg bg-background" />
              </div>
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">Lưu</button>
                <button onClick={() => setShowAddCourse(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent">Hủy</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {mockCourses.map(course => (
              <div key={course.id} className="p-6 bg-card border border-border rounded-lg flex items-center justify-between">
                <div className="flex gap-6 items-center flex-1">
                  <div className="w-32 aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-1">{course.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{course.category} • {course.level}</p>
                    <div className="flex gap-4 text-sm">
                      <span>{course.totalStudents} học viên</span>
                      <span>{course.price.toLocaleString('vi-VN')} đ</span>
                      <span>⭐ {course.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div>
          <h2 className="mb-6">Quản lý học viên</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left">Họ tên</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Khóa học</th>
                  <th className="px-6 py-3 text-left">Trạng thái</th>
                  <th className="px-6 py-3 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {['Nguyễn Văn A', 'Trần Thị B', 'Lê Minh C'].map((name, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-6 py-4">{name}</td>
                    <td className="px-6 py-4">student{idx + 1}@example.com</td>
                    <td className="px-6 py-4">{idx + 2}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Active</span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-primary hover:underline text-sm">Xem chi tiết</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'combos' && (
        <div>
          <h2 className="mb-6">Combo lộ trình khóa học</h2>
          <div className="space-y-6">
            {mockCombos.map(combo => {
              const comboCourses = mockCourses.filter(c => combo.courses.includes(c.id));
              return (
                <div key={combo.id} className="p-6 bg-card border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="mb-2">{combo.title}</h3>
                      <p className="text-muted-foreground">{combo.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl mb-1">{combo.price.toLocaleString('vi-VN')} đ</div>
                      <div className="text-sm text-green-600">Tiết kiệm {combo.discount.toLocaleString('vi-VN')} đ</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h4 className="mb-2">Các khóa học bao gồm:</h4>
                    <ul className="space-y-1">
                      {comboCourses.map(course => (
                        <li key={course.id} className="flex items-center gap-2 text-sm">
                          <BookOpen className="h-4 w-4 text-primary" />
                          {course.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                      <Edit className="h-4 w-4 inline mr-2" />
                      Chỉnh sửa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
