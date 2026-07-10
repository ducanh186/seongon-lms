import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/dashboard';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegistering) {
      alert('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
      setIsRegistering(false);
      return;
    }

    const success = login(email, password);
    if (success) {
      navigate(from);
    } else {
      alert('Đăng nhập thất bại. Vui lòng thử:\nstudent@example.com\nadmin@example.com\nrecruiter@example.com\nMật khẩu: bất kỳ');
    }
  };

  const quickLogin = (role: 'student' | 'admin' | 'recruiter') => {
    const emails = {
      student: 'student@example.com',
      admin: 'admin@example.com',
      recruiter: 'recruiter@example.com',
    };

    setEmail(emails[role]);
    setPassword('password');
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <GraduationCap className="h-10 w-10 text-primary" />
            <span className="text-2xl">SEONGON Academy</span>
          </Link>
          <h2 className="mb-2">{isRegistering ? 'Đăng ký tài khoản' : 'Đăng nhập'}</h2>
          <p className="text-muted-foreground">
            {isRegistering ? 'Tạo tài khoản để bắt đầu học' : 'Chào mừng bạn quay lại'}
          </p>
        </div>

        <div className="p-8 bg-card border border-border rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>

            {isRegistering && (
              <>
                <div>
                  <label className="block mb-2">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block mb-2">Họ và tên</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              {isRegistering ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-primary hover:underline"
            >
              {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3 text-center">Demo - Đăng nhập nhanh:</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickLogin('student')}
                className="w-full py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
              >
                Học viên
              </button>
              <button
                type="button"
                onClick={() => quickLogin('admin')}
                className="w-full py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
              >
                Quản trị viên
              </button>
              <button
                type="button"
                onClick={() => quickLogin('recruiter')}
                className="w-full py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
              >
                Nhà tuyển dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
