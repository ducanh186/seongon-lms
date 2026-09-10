import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  LinearProgress,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useParams } from 'react-router';
import { ApiError, resolveMaterialUrl } from '../lib/api';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { ApiEnrollment, ApiLesson, ApiProgress, ApiQuiz } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { StudentWorkspaceShell } from '../components/StudentWorkspaceShell';
import { TrackedLessonVideo } from '../components/TrackedLessonVideo';
import { ExamAttemptPanel } from '../components/ExamAttemptPanel';

export function LearnCoursePage() {
  const { courseId: courseIdParam = '' } = useParams();
  const courseId = Number(courseIdParam);
  const { token } = useAuth();
  const [enrollment, setEnrollment] = useState<ApiEnrollment | null>(null);
  const [lessons, setLessons] = useState<ApiLesson[]>([]);
  const [progress, setProgress] = useState<ApiProgress | null>(null);
  const [activeLesson, setActiveLesson] = useState<ApiLesson | null>(null);
  const [quiz, setQuiz] = useState<ApiQuiz | null>(null);
  const [quizResult, setQuizResult] = useState<Awaited<ReturnType<typeof applicationRepositories.learning.submitQuiz>> | null>(null);
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!token || !courseId) return;
    const [enrollmentResponse, lessonResponse, progressResponse] = await Promise.all([
      applicationRepositories.learning.listMyCourses(token),
      applicationRepositories.learning.listLessons(token, courseId),
      applicationRepositories.learning.getProgress(token, courseId),
    ]);
    const current = enrollmentResponse.data.find((item) => item.course_id === courseId) ?? null;
    setEnrollment(current);
    setLessons(lessonResponse.data);
    setActiveLesson((currentLesson) => currentLesson ?? lessonResponse.data[0] ?? null);
    setProgress(progressResponse);
  };

  useEffect(() => {
    refresh()
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Không thể tải nội dung khóa học.'))
      .finally(() => setLoading(false));
  }, [courseId, token]);

  const savePlayback = async (lesson: ApiLesson, positionSeconds: number, durationSeconds: number) => {
    if (!token) return;
    setError(null);
    try {
      const response = await applicationRepositories.learning.saveLessonProgress(token, lesson.id, positionSeconds, durationSeconds);
      const updatedLesson: ApiLesson = {
        ...lesson,
        is_completed: response.lesson.is_completed,
        resume_position_seconds: response.lesson.resume_position_seconds,
        furthest_position_seconds: response.lesson.furthest_position_seconds,
        video_duration_seconds: response.lesson.video_duration_seconds,
        watched_percent: response.lesson.watched_percent,
      };
      setLessons((current) => current.map((item) => item.id === lesson.id ? updatedLesson : item));
      setActiveLesson((current) => current?.id === lesson.id ? updatedLesson : current);
      setProgress(response.course_progress);
      if (response.lesson.is_completed && !lesson.is_completed) setNotice(`Đã hoàn thành: ${lesson.title}`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể cập nhật tiến độ.');
      throw reason;
    }
  };

  const openQuiz = async () => {
    if (!token || !progress?.can_take_exam) return;
    try {
      setQuiz((await applicationRepositories.learning.getQuiz(token, courseId)).data);
      setQuizResult(null);
      setNotice(null);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể tải bài kiểm tra.');
    }
  };

  const submitReview = async () => {
    if (!token || !rating) return;
    try {
      await applicationRepositories.learning.reviewCourse(token, courseId, rating, comment);
      setNotice('Cảm ơn bạn đã gửi đánh giá.');
      setComment('');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể gửi đánh giá.');
    }
  };

  const downloadCertificate = async () => {
    if (!token) return;
    try {
      const blob = await applicationRepositories.learning.downloadCertificate(token, courseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'seongon-certificate.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Bạn chưa có chứng chỉ để tải.');
    }
  };

  if (loading) return <Container sx={{ py: 6 }}><PageSkeleton rows={4} /></Container>;
  if (error && !enrollment) return <Container sx={{ py: 6 }}><Alert severity="error">{error}</Alert></Container>;

  const curriculum = (
    <Card variant="outlined" sx={{ position: { lg: 'sticky' }, top: 92 }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography component="h2" variant="h6">Nội dung</Typography>
          <Chip size="small" label={`${lessons.length} bài`} variant="outlined" />
        </Stack>
        {lessons.length === 0 ? (
          <Alert severity="info">Khóa học chưa có bài học.</Alert>
        ) : (
          <Stack divider={<Divider flexItem />}>
            {lessons.map((lesson) => (
              <Button
                key={lesson.id}
                onClick={() => setActiveLesson(lesson)}
                aria-pressed={lesson.id === activeLesson?.id}
                color="inherit"
                startIcon={lesson.is_completed ? <CheckCircleOutlineIcon color="primary" /> : <PlayCircleOutlineIcon />}
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  py: 1.25,
                  px: 1,
                  borderRadius: 1.5,
                  bgcolor: lesson.id === activeLesson?.id ? 'primary.light' : 'transparent',
                  color: lesson.id === activeLesson?.id ? 'primary.dark' : 'text.primary',
                  fontWeight: lesson.id === activeLesson?.id ? 800 : 600,
                  overflowWrap: 'anywhere',
                }}
              >
                <Box component="span" sx={{ minWidth: 0 }}>
                  <Box component="span" sx={{ display: 'block' }}>{lesson.position}. {lesson.title}</Box>
                  {typeof lesson.watched_percent === 'number' && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {lesson.watched_percent}% đã xem
                    </Typography>
                  )}
                </Box>
              </Button>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  const content = (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
              <Typography component="h2" variant="h5">{activeLesson?.title ?? 'Chọn một bài học'}</Typography>
              {activeLesson?.duration && (
                <Chip size="small" label={`${Math.ceil(activeLesson.duration / 60)} phút`} variant="outlined" />
              )}
            </Stack>
            {activeLesson?.video_url ? (
              <TrackedLessonVideo
                url={activeLesson.video_url}
                title={activeLesson.title}
                progress={{
                  resumePositionSeconds: activeLesson.resume_position_seconds,
                  furthestPositionSeconds: activeLesson.furthest_position_seconds,
                  durationSeconds: activeLesson.video_duration_seconds ?? activeLesson.duration,
                }}
                onProgress={({ positionSeconds, durationSeconds }) => savePlayback(activeLesson, positionSeconds, durationSeconds)}
              />
            ) : (
              <Alert severity="info">Bài học này chưa có video.</Alert>
            )}
            {activeLesson?.description && <Typography color="text.secondary">{activeLesson.description}</Typography>}
            {resolveMaterialUrl(activeLesson?.material_url) && (
              <Button component="a" href={resolveMaterialUrl(activeLesson?.material_url)} target="_blank" rel="noopener noreferrer" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
                Mở tài liệu PDF
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography component="h2" variant="h5">Bài kiểm tra cuối khóa</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Hoàn thành bài học trước khi bắt đầu bài kiểm tra.
              </Typography>
            </Box>
            {!progress?.can_take_exam ? (
              <Alert severity="info">Hoàn thành 100% bài học để mở bài kiểm tra.</Alert>
            ) : !quiz ? (
              <Button variant="contained" onClick={() => void openQuiz()} sx={{ alignSelf: 'flex-start' }}>Mở bài kiểm tra</Button>
            ) : (
              <ExamAttemptPanel
                quiz={quiz}
                startAttempt={() => applicationRepositories.learning.startQuizAttempt(token!, courseId)}
                saveAnswers={(attemptId, draft) => applicationRepositories.learning.saveQuizAnswers(token!, attemptId, draft)}
                submitAttempt={(attemptId) => applicationRepositories.learning.finalizeQuizAttempt(token!, attemptId)}
                onResult={setQuizResult}
              />
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  const aside = (
    <Stack direction={{ xs: 'column', md: 'row', lg: 'column' }} spacing={2} sx={{ position: { lg: 'sticky' }, top: 92 }}>
      <Card component="section" aria-label="Tiến độ học tập" variant="outlined" sx={{ flex: 1 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1.25}>
            <Typography component="h2" variant="h6">Tiến độ</Typography>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Bài học</Typography>
              <Typography variant="body2" fontWeight={800}>{progress?.completed ?? 0}/{progress?.total ?? 0}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress?.video_percent ?? progress?.percent ?? 0} aria-label="Tiến độ khóa học" sx={{ height: 8, borderRadius: 1 }} />
            <Typography variant="h5" fontWeight={800}>{progress?.video_percent ?? progress?.percent ?? 0}%</Typography>
          </Stack>
        </CardContent>
      </Card>

      {(enrollment?.certificate || quizResult?.certificate) && <Card variant="outlined" sx={{ flex: 1 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography component="h2" variant="h6">Chứng chỉ</Typography>
            <Typography variant="body2" color="text.secondary">Tải chứng chỉ PDF sau khi đạt bài kiểm tra.</Typography>
            <Button variant="outlined" onClick={() => void downloadCertificate()}>
              Tải chứng chỉ
            </Button>
          </Stack>
        </CardContent>
      </Card>}

      <Card variant="outlined" sx={{ flex: 1 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography component="h2" variant="h6">Đánh giá khóa học</Typography>
            <Rating aria-label="Đánh giá khóa học" value={rating} onChange={(_, value) => setRating(value)} />
            <TextField label="Nhận xét của bạn" multiline minRows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
            <Button variant="outlined" onClick={() => void submitReview()} disabled={!rating}>Gửi đánh giá</Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  return (
    <Box sx={{ py: { xs: 3, md: 5 }, minHeight: '70dvh' }}>
      <Container maxWidth={false} sx={{ maxWidth: 1280 }}>
        <Stack spacing={3}>
          <PageHeader
            eyebrow="KHÔNG GIAN HỌC"
            title={enrollment?.course?.title ?? 'Học khóa học'}
            description="Học theo từng bài, theo dõi tiến độ và hoàn thành bài kiểm tra cuối khóa."
          />
          {notice && <Alert severity="success">{notice}</Alert>}
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <StudentWorkspaceShell curriculum={curriculum} content={content} aside={aside} />
        </Stack>
      </Container>
    </Box>
  );
}
