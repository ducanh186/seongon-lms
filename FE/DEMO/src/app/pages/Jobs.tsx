import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Briefcase, MapPin, Clock, Building2, Upload } from 'lucide-react';
import { mockJobs } from '../data/mockData';
import { format } from 'date-fns';

export function Jobs() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
    cv: null as File | null,
  });

  const navigate = useNavigate();

  const handleApply = (jobId: string) => {
    setSelectedJob(jobId);
    setShowApplicationForm(true);
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Hồ sơ ứng tuyển đã được gửi thành công! Chúng tôi sẽ liên hệ với bạn sớm.');
    setShowApplicationForm(false);
    setApplicationData({ name: '', email: '', phone: '', coverLetter: '', cv: null });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setApplicationData({ ...applicationData, cv: e.target.files[0] });
    }
  };

  return (
    <div>
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-[#E91E8C] via-[#00D4E7] to-[#D91E7C] text-white overflow-hidden py-16">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1770669564689-d3e8ec8d1595?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNydWl0bWVudCUyMGhpcmluZyUyMHByb2Zlc3Npb25hbHN8ZW58MXx8fHwxNzczODg2NTc0fDA&ixlib=rb-4.1.0&q=80&w=1080')] opacity-10 bg-cover bg-center\"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-4xl md:text-5xl">Cơ hội việc làm tại SEONGON</h1>
          <p className="text-lg opacity-90">
            Khám phá các vị trí tuyển dụng và phát triển sự nghiệp cùng chúng tôi
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!showApplicationForm ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockJobs.map(job => (
              <div key={job.id} className="p-6 border border-border rounded-lg bg-card hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3>{job.title}</h3>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded text-sm whitespace-nowrap">
                      {job.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>{job.department}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{format(job.postedDate, 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                </div>

                <p className="mb-4 text-muted-foreground">{job.description}</p>

                <div className="mb-4">
                  <h4 className="mb-2">Yêu cầu:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {job.requirements.slice(0, 3).map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                    {job.requirements.length > 3 && (
                      <li className="text-primary">+ {job.requirements.length - 3} yêu cầu khác</li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={() => handleApply(job.id)}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Ứng tuyển ngay
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => setShowApplicationForm(false)}
                className="text-primary hover:underline mb-4"
              >
                ← Quay lại danh sách
              </button>
              <h2 className="mb-2">Ứng tuyển vị trí</h2>
              <h3 className="text-muted-foreground">
                {mockJobs.find(j => j.id === selectedJob)?.title}
              </h3>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-6">
              <div>
                <label className="block mb-2">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={applicationData.name}
                  onChange={(e) => setApplicationData({ ...applicationData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={applicationData.email}
                  onChange={(e) => setApplicationData({ ...applicationData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block mb-2">Số điện thoại *</label>
                <input
                  type="tel"
                  required
                  value={applicationData.phone}
                  onChange={(e) => setApplicationData({ ...applicationData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="0123456789"
                />
              </div>

              <div>
                <label className="block mb-2">CV/Resume *</label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-accent transition-colors">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="cv-upload"
                  />
                  <label htmlFor="cv-upload" className="cursor-pointer">
                    {applicationData.cv ? (
                      <div>
                        <p className="text-primary">{applicationData.cv.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">Click để chọn file khác</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-primary">Click để tải lên CV</p>
                        <p className="text-sm text-muted-foreground mt-1">PDF, DOC, DOCX (tối đa 5MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block mb-2">Thư giới thiệu</label>
                <textarea
                  value={applicationData.coverLetter}
                  onChange={(e) => setApplicationData({ ...applicationData, coverLetter: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Chia sẻ lý do bạn phù hợp với vị trí này..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Gửi hồ sơ
                </button>
                <button
                  type="button"
                  onClick={() => setShowApplicationForm(false)}
                  className="flex-1 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}