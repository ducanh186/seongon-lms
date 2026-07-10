import { Link, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Briefcase, GraduationCap, LogOut, User, Menu, X, Settings, BarChart3, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import logoSeongon from 'figma:asset/dd45f331e8a4458443255a6f01a8333b19d6c86a.png';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoSeongon} alt="SEONGON" className="h-12" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="hover:text-primary transition-colors">
                Trang chủ
              </Link>
              <Link to="/courses" className="hover:text-primary transition-colors">
                Khóa học
              </Link>
              <Link to="/combos" className="hover:text-primary transition-colors">
                Combo khóa học
              </Link>
              <Link to="/internships" className="hover:text-primary transition-colors">
                Chương trình Thực tập sinh ảo
              </Link>
              <Link to="/jobs" className="hover:text-primary transition-colors">
                Tuyển dụng
              </Link>
            </nav>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="relative">
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <User className="h-4 w-4" />
                    Tài khoản
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-lg z-50">
                      <Link
                        to={user.role === 'admin' ? '/admin' : user.role === 'recruiter' ? '/recruiter' : '/dashboard'}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Trang cá nhân
                      </Link>
                      {user.role === 'student' && (
                        <Link
                          to="/learning-stats"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Thống kê học tập
                        </Link>
                      )}
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Cài đặt
                      </Link>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-border"
                        onClick={handleLogout}
                      >
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Đăng nhập / Đăng ký
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <nav className="flex flex-col gap-4">
                <Link
                  to="/"
                  className="hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Trang chủ
                </Link>
                <Link
                  to="/courses"
                  className="hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Khóa học
                </Link>
                <Link
                  to="/combos"
                  className="hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Combo khóa học
                </Link>
                <Link
                  to="/internships"
                  className="hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Chương trình Thực tập sinh ảo
                </Link>
                <Link
                  to="/jobs"
                  className="hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Tuyển dụng
                </Link>
                {user ? (
                  <Link
                    to={user.role === 'admin' ? '/admin' : user.role === 'recruiter' ? '/recruiter' : '/dashboard'}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Tài khoản
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Đăng nhập / Đăng ký
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-primary text-primary-foreground mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="mb-4">SEONGON Academy</h3>
              <p className="text-sm opacity-90">
                Nền tảng học trực tuyến hàng đầu về Marketing với chương trình Thực tập sinh ảo độc quyền.
              </p>
            </div>
            <div>
              <h4 className="mb-4">Liên kết</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><Link to="/courses" className="hover:opacity-100">Khóa học</Link></li>
                <li><Link to="/internships" className="hover:opacity-100">Thực tập sinh ảo</Link></li>
                <li><Link to="/jobs" className="hover:opacity-100">Tuyển dụng</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Liên hệ</h4>
              <p className="text-sm opacity-90">
                Email: contact@seongon.vn<br />
                Hotline: 1900 xxxx
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-primary-foreground/20 text-center text-sm opacity-75">
            © 2026 SEONGON Academy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}