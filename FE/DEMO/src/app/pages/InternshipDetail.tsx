import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Clock, Send, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { mockInternships } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';

export function InternshipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const internship = mockInternships.find(i => i.id === id);
  
  const [hasStarted, setHasStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(internship ? internship.duration * 3600 : 0); // Convert hours to seconds
  const [submissions, setSubmissions] = useState<{[key: string]: string}>({});
  const [showConfirmStart, setShowConfirmStart] = useState(false);

  useEffect(() => {
    if (!hasStarted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('Hết thời gian! Vui lòng nộp bài ngay.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, timeRemaining]);

  if (!internship) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2>Không tìm thấy chương trình thực tập</h2>
        <button 
          onClick={() => navigate('/internships')} 
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="mb-4">Vui lòng đăng nhập</h2>
        <p className="text-muted-foreground mb-6">
          Bạn cần đăng nhập để tham gia chương trình thực tập
        </p>
        <button 
          onClick={() => navigate('/login')} 
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setHasStarted(true);
    setShowConfirmStart(false);
  };

  const handleSubmit = () => {
    const allCompleted = internship.tasks.every(task => submissions[task.id]?.trim());
    
    if (!allCompleted) {
      alert('Vui lòng hoàn thành tất cả các nhiệm vụ trước khi nộp!');
      return;
    }

    if (window.confirm('Bạn có chắc chắn muốn nộp bài? Sau khi nộp bạn không thể chỉnh sửa.')) {
      alert('Bài làm đã được nộp thành công! Nhà tuyển dụng sẽ đánh giá và gửi feedback sớm.');
      navigate('/dashboard');
    }
  };

  const progressPercentage = (Object.keys(submissions).filter(key => submissions[key]?.trim()).length / internship.tasks.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className={`sticky top-0 z-50 border-b ${
        hasStarted 
          ? timeRemaining < 1800 
            ? 'bg-red-600 border-red-700' 
            : 'bg-gradient-to-r from-[#2DD0D1] to-[#489EE2] border-primary'
          : 'bg-gray-800 border-gray-700'
      } text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-1">{internship.title}</h2>
              <p className="text-sm opacity-90">{internship.position}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-5 w-5" />
                <span className="text-sm opacity-90">Thời gian còn lại</span>
              </div>
              <div className={`text-3xl font-mono ${
                hasStarted && timeRemaining < 1800 ? 'animate-pulse' : ''
              }`}>
                {hasStarted ? formatTime(timeRemaining) : formatTime(internship.duration * 3600)}
              </div>
            </div>
          </div>
          {hasStarted && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Tiến độ hoàn thành</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-300" 
                  style={{ width: `${progressPercentage}%` }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!hasStarted ? (
          /* Start Screen */
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#2DD0D1] to-[#489EE2] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-10 w-10 text-white" />
                </div>
                <h1 className="mb-4">Sẵn sàng bắt đầu?</h1>
                <p className="text-muted-foreground">
                  Bạn sẽ có {internship.duration} giờ để hoàn thành tất cả {internship.tasks.length} nhiệm vụ.
                  Đồng hồ sẽ bắt đầu đếm ngược ngay khi bạn nhấn "Bắt đầu".
                </p>
              </div>

              <div className="bg-accent rounded-lg p-6 mb-8">
                <h3 className="mb-4">Lưu ý quan trọng:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Đồng hồ sẽ chạy liên tục cho đến khi hết thời gian hoặc bạn nộp bài</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Bạn cần hoàn thành tất cả nhiệm vụ để có thể nộp bài</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Sau khi nộp bài, bạn không thể chỉnh sửa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Hãy chuẩn bị đầy đủ trước khi bắt đầu</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="mb-4">Danh sách nhiệm vụ:</h3>
                {internship.tasks.map((task, index) => (
                  <div key={task.id} className="p-4 border border-border rounded-lg">
                    <h4 className="mb-2">Nhiệm vụ {index + 1}: {task.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    <p className="text-sm">
                      <span className="text-primary">Deliverable:</span> {task.deliverable}
                    </p>
                  </div>
                ))}
              </div>

              {!showConfirmStart ? (
                <button
                  onClick={() => setShowConfirmStart(true)}
                  className="w-full py-4 bg-gradient-to-r from-[#2DD0D1] to-[#489EE2] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Bắt đầu chương trình thực tập
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Bạn có chắc chắn muốn bắt đầu? Đồng hồ sẽ bắt đầu đếm ngược ngay lập tức.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowConfirmStart(false)}
                      className="py-3 border border-border rounded-lg hover:bg-accent"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleStart}
                      className="py-3 bg-gradient-to-r from-[#2DD0D1] to-[#489EE2] text-white rounded-lg hover:opacity-90"
                    >
                      Xác nhận bắt đầu
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Task Screen */
          <div>
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <h2 className="mb-2">Hướng dẫn làm việc</h2>
              <p className="text-muted-foreground">
                {internship.description}
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {internship.tasks.map((task, index) => {
                const isCompleted = submissions[task.id]?.trim();
                
                return (
                  <div 
                    key={task.id} 
                    className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all ${
                      isCompleted ? 'border-2 border-green-500' : 'border border-border'
                    }`}
                  >
                    <div className={`p-6 ${
                      isCompleted 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
                        : 'bg-gradient-to-r from-gray-50 to-white'
                    }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted 
                              ? 'bg-green-500 text-white' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="mb-2">{task.title}</h3>
                            <p className="text-muted-foreground mb-2">{task.description}</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                              <span>Deliverable: {task.deliverable}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-2">
                          Câu trả lời của bạn {isCompleted && <span className="text-green-600">✓ Đã hoàn thành</span>}
                        </label>
                        <textarea
                          placeholder="Nhập câu trả lời hoặc link tài liệu của bạn (Google Drive, Dropbox, v.v.)..."
                          rows={5}
                          value={submissions[task.id] || ''}
                          onChange={(e) => setSubmissions({ ...submissions, [task.id]: e.target.value })}
                          className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 Tip: Bạn có thể upload file lên Google Drive và paste link vào đây
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Button */}
            <div className="sticky bottom-0 bg-white border-t border-border shadow-lg p-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Hoàn thành {Object.keys(submissions).filter(key => submissions[key]?.trim()).length}/{internship.tasks.length} nhiệm vụ
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Thời gian còn lại: {formatTime(timeRemaining)}
                  </div>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={progressPercentage < 100}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg transition-all ${
                    progressPercentage === 100
                      ? 'bg-gradient-to-r from-[#2DD0D1] to-[#489EE2] text-white hover:opacity-90'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="h-5 w-5" />
                  Nộp bài
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
