import { useState } from 'react';
import { Briefcase, FileText, Users, Plus, Send } from 'lucide-react';

export function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'internships'>('jobs');
  const [showAddJob, setShowAddJob] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [selectedInternship, setSelectedInternship] = useState<string | null>(null);

  const mockApplications = [
    { id: '1', name: 'Nguyễn Văn A', position: 'Content Creator', status: 'pending', appliedDate: '2026-03-10' },
    { id: '2', name: 'Trần Thị B', position: 'Digital Marketing Specialist', status: 'reviewed', appliedDate: '2026-03-09' },
    { id: '3', name: 'Lê Minh C', position: 'Content Creator', status: 'pending', appliedDate: '2026-03-08' },
  ];

  const mockInternshipSubmissions = [
    { id: '1', studentName: 'Nguyễn Văn D', program: 'Content Creator', submittedDate: '2026-03-11', status: 'pending' },
    { id: '2', studentName: 'Phạm Thị E', program: 'Digital Marketing', submittedDate: '2026-03-10', status: 'pending' },
  ];

  const handleSendFeedback = (submissionId: string, passed: boolean) => {
    if (!feedback) {
      alert('Vui lòng nhập feedback');
      return;
    }
    alert(`Feedback đã được gửi! ${passed ? 'Học viên đạt và nhận chứng chỉ.' : 'Học viên chưa đạt.'}`);
    setFeedback('');
    setSelectedInternship(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="mb-2">Bảng điều khiển nhà tuyển dụng</h1>
        <p className="text-muted-foreground">Quản lý tuyển dụng và đánh giá thực tập sinh</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Vị trí đang tuyển</span>
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl">3</div>
        </div>
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Hồ sơ mới</span>
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl">12</div>
        </div>
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">TTS cần đánh giá</span>
            <Users className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-3xl">2</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === 'jobs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Tin tuyển dụng
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === 'applications' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Hồ sơ ứng tuyển
          </button>
          <button
            onClick={() => setActiveTab('internships')}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === 'internships' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Thực tập sinh ảo
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'jobs' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2>Danh sách tin tuyển dụng</h2>
            <button
              onClick={() => setShowAddJob(!showAddJob)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Đăng tin tuyển dụng
            </button>
          </div>

          {showAddJob && (
            <div className="mb-6 p-6 bg-card border border-border rounded-lg">
              <h3 className="mb-4">Tạo tin tuyển dụng mới</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Vị trí tuyển dụng" className="w-full px-4 py-2 border border-border rounded-lg bg-background" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="Phòng ban" className="px-4 py-2 border border-border rounded-lg bg-background" />
                  <input type="text" placeholder="Địa điểm" className="px-4 py-2 border border-border rounded-lg bg-background" />
                  <select className="px-4 py-2 border border-border rounded-lg bg-background">
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                  </select>
                </div>
                <textarea placeholder="Mô tả công việc" rows={4} className="w-full px-4 py-2 border border-border rounded-lg bg-background" />
                <textarea placeholder="Yêu cầu (mỗi yêu cầu 1 dòng)" rows={6} className="w-full px-4 py-2 border border-border rounded-lg bg-background" />
              </div>
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">Đăng tin</button>
                <button onClick={() => setShowAddJob(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent">Hủy</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {['Content Creator', 'Digital Marketing Specialist', 'Social Media Manager'].map((job, idx) => (
              <div key={idx} className="p-6 bg-card border border-border rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="mb-2">{job}</h3>
                    <p className="text-sm text-muted-foreground">Marketing • Hồ Chí Minh • Full-time</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">Đang tuyển</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span>Ngày đăng: 01/03/2026</span>
                  <span className="text-primary">• 8 hồ sơ ứng tuyển</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm">Chỉnh sửa</button>
                  <button className="px-4 py-2 border border-border rounded-lg hover:bg-accent text-sm">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div>
          <h2 className="mb-6">Hồ sơ ứng tuyển</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left">Ứng viên</th>
                  <th className="px-6 py-3 text-left">Vị trí</th>
                  <th className="px-6 py-3 text-left">Ngày nộp</th>
                  <th className="px-6 py-3 text-left">Trạng thái</th>
                  <th className="px-6 py-3 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {mockApplications.map(app => (
                  <tr key={app.id} className="border-t border-border">
                    <td className="px-6 py-4">{app.name}</td>
                    <td className="px-6 py-4">{app.position}</td>
                    <td className="px-6 py-4">{app.appliedDate}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {app.status === 'pending' ? 'Chờ xử lý' : 'Đã xem'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-primary hover:underline text-sm mr-3">Xem CV</button>
                      <button className="text-primary hover:underline text-sm">Liên hệ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'internships' && (
        <div>
          <h2 className="mb-6">Đánh giá Thực tập sinh ảo</h2>
          <div className="space-y-6">
            {mockInternshipSubmissions.map(submission => (
              <div key={submission.id} className="p-6 bg-card border border-border rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="mb-2">{submission.studentName}</h3>
                    <p className="text-sm text-muted-foreground mb-1">Chương trình: {submission.program}</p>
                    <p className="text-sm text-muted-foreground">Ngày nộp: {submission.submittedDate}</p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">Chờ đánh giá</span>
                </div>

                <div className="mb-4 p-4 bg-accent rounded-lg">
                  <h4 className="mb-3">Bài làm của học viên</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-primary">1.</span>
                      <div>
                        <p>Nghiên cứu đối thủ cạnh tranh</p>
                        <p className="text-muted-foreground">Link: https://docs.google.com/document/...</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">2.</span>
                      <div>
                        <p>Content plan 1 tuần</p>
                        <p className="text-muted-foreground">Link: https://docs.google.com/spreadsheets/...</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedInternship === submission.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2">Feedback cho học viên *</label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={6}
                        placeholder="Nhập đánh giá chi tiết về bài làm của học viên..."
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSendFeedback(submission.id, true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90"
                      >
                        <Send className="h-4 w-4" />
                        Đạt - Gửi feedback & chứng chỉ
                      </button>
                      <button
                        onClick={() => handleSendFeedback(submission.id, false)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:opacity-90"
                      >
                        <Send className="h-4 w-4" />
                        Chưa đạt - Gửi feedback
                      </button>
                      <button
                        onClick={() => setSelectedInternship(null)}
                        className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedInternship(submission.id)}
                    className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                  >
                    Đánh giá
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
