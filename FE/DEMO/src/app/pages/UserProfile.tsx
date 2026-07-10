import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, MapPin, Calendar, Save, Camera } from 'lucide-react';

export function UserProfile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '0123 456 789',
    location: 'Hồ Chí Minh',
    birthDate: '1995-01-15',
    bio: 'Passionate về Digital Marketing và Content Creation. Luôn tìm kiếm cơ hội học hỏi và phát triển.',
  });

  const handleSave = () => {
    // Mock save functionality
    alert('Thông tin đã được cập nhật thành công!');
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="mb-2">Thông tin cá nhân</h1>
        <p className="text-muted-foreground">Quản lý thông tin và cài đặt tài khoản của bạn</p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-8 text-white">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <User className="h-12 w-12" />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-shadow">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <h2 className="text-2xl mb-1">{formData.name}</h2>
              <p className="opacity-90">{user?.role === 'student' ? 'Học viên' : user?.role === 'admin' ? 'Quản trị viên' : 'Nhà tuyển dụng'}</p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3>Thông tin chi tiết</h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Chỉnh sửa
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Save className="h-4 w-4" />
                  Lưu
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <User className="h-4 w-4" />
                Họ và tên
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                />
              ) : (
                <p className="px-4 py-2">{formData.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                />
              ) : (
                <p className="px-4 py-2">{formData.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Phone className="h-4 w-4" />
                Số điện thoại
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                />
              ) : (
                <p className="px-4 py-2">{formData.phone}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" />
                Địa chỉ
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                />
              ) : (
                <p className="px-4 py-2">{formData.location}</p>
              )}
            </div>

            {/* Birth Date */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                Ngày sinh
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                />
              ) : (
                <p className="px-4 py-2">{new Date(formData.birthDate).toLocaleDateString('vi-VN')}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                Giới thiệu bản thân
              </label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background resize-none"
                />
              ) : (
                <p className="px-4 py-2 text-muted-foreground">{formData.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="mt-8 bg-card border border-border rounded-lg p-8">
        <h3 className="mb-6">Bảo mật</h3>
        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
            <div className="text-left">
              <div className="mb-1">Đổi mật khẩu</div>
              <div className="text-sm text-muted-foreground">Cập nhật mật khẩu của bạn</div>
            </div>
            <span className="text-primary">Thay đổi</span>
          </button>
          <button className="w-full flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
            <div className="text-left">
              <div className="mb-1">Xác thực hai yếu tố</div>
              <div className="text-sm text-muted-foreground">Tăng cường bảo mật tài khoản</div>
            </div>
            <span className="text-muted-foreground">Bật</span>
          </button>
        </div>
      </div>
    </div>
  );
}
