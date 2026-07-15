import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { useParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiEnrollment, ApiLesson, ApiProgress, ApiQuiz } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { StudentWorkspaceShell } from '../components/StudentWorkspaceShell';

export function LearnCoursePage() {
  const { courseId: courseIdParam = '' } = useParams();
  const courseId = Number(courseIdParam);
  const { token } = useAuth();
  const [enrollment, setEnrollment] = useState<ApiEnrollment | null>(null);
  const [lessons, setLessons] = useState<ApiLesson[]>([]);
  const [progress, setProgress] = useState<ApiProgress | null>(null);
  const [activeLesson, setActiveLesson] = useState<ApiLesson | null>(null);
  const [quiz, setQuiz] = useState<ApiQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!token || !courseId) return;
    const [enrollmentResponse, lessonResponse, progressResponse] = await Promise.all([
      api.myCourses(token),
      api.lessons(token, courseId),
      api.progress(token, courseId),
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

  const canSubmitQuiz = useMemo(
    () => quiz && quiz.questions.every((question) => answers[question.id]),
    [answers, quiz],
  );

  const completeLesson = async (lesson: ApiLesson) => {
    if (!token) return;
    setError(null);
    try {
      await api.completeLesson(token, lesson.id);
      setNotice(`Đã hoàn thành: ${lesson.title}`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể cập nhật tiến độ.');
    }
  };

  const openQuiz = async () => {
    if (!token || !progress?.can_take_exam) return;
    try {
      setQuiz((await api.quiz(token, courseId)).data);
      setNotice(null);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể tải bài kiểm tra.');
    }
  };

  const submitQuiz = async () => {
    if (!token || !quiz) return;
    try {
      const result = await api.submitQuiz(
        token,
        courseId,
        quiz.questions.map((question) => ({ question_id: question.id, option_id: answers[question.id] ?? null })),
      );
      setNotice(result.passed ? `Bạn đã đạt ${result.score}%. Chứng chỉ đã được cấp.` : `Bạn đạt ${result.score}%. Hãy ôn lại và thử lần tiếp theo.`);
      setQuiz(null);
      setAnswers({});
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể nộp bài kiểm tra.');
    }
  };

  const submitReview = async () => {
    if (!token || !rating) return;
    try {
      await api.reviewCourse(token, courseId, rating, comment);
      setNotice('Cảm ơn bạn đã gửi đánh giá.');
      setComment('');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể gửi đánh giá.');
    }
  };

  const downloadCertificate = async () => {
    if (!token) return;
    try {
      const blob = await api.downloadCertificate(token, courseId);
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
                {lesson.position}. {lesson.title}
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
                <Chip size="small" icon={<ScheduleOutlinedIcon />} label={`${activeLesson.duration} phút`} variant="outlined" />
              )}
            </Stack>
            {activeLesson?.video_url ? (
              <Box
                component="iframe"
                src={activeLesson.video_url}
                title={activeLesson.title}
                sx={{ width: '100%', maxWidth: '100%', aspectRatio: '16 / 9', display: 'block', border: 0, borderRadius: 2, bgcolor: '#102E38' }}
                allowFullScreen
              />
            ) : (
              <Alert severity="info">Bài học này chưa có video.</Alert>
            )}
            {activeLesson?.description && <Typography color="text.secondary">{activeLesson.description}</Typography>}
            {activeLesson && (
              <Button
                variant={activeLesson.is_completed ? 'outlined' : 'contained'}
                startIcon={<CheckCircleOutlineIcon />}
                disabled={activeLesson.is_completed}
                onClick={() => void completeLesson(activeLesson)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {activeLesson.is_completed ? 'Đã hoàn thành' : 'Đánh dấu đã hoàn thành'}
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
              <Stack spacing={3}>
                {quiz.questions.map((question, index) => (
                  <FormControl key={question.id} component="fieldset" fullWidth>
                    <Typography component="legend" fontWeight={800}>{index + 1}. {question.content}</Typography>
                    <RadioGroup
                      value={String(answers[question.id] ?? '')}
                      onChange={(event) => setAnswers((value) => ({ ...value, [question.id]: Number(event.target.value) }))}
                      sx={{ mt: 1 }}
                    >
                      {question.options.map((option) => (
                        <FormControlLabel
                          key={option.id}
                          value={String(option.id)}
                          control={<Radio />}
                          label={option.content}
                          sx={{ m: 0, px: 1, borderRadius: 1.5, '&:has(.Mui-checked)': { bgcolor: 'primary.light' } }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                ))}
                <Button variant="contained" disabled={!canSubmitQuiz} onClick={() => void submitQuiz()} sx={{ alignSelf: 'flex-start' }}>
                  Nộp bài kiểm tra
                </Button>
              </Stack>
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
            <LinearProgress variant="determinate" value={progress?.percent ?? 0} aria-label="Tiến độ khóa học" sx={{ height: 8, borderRadius: 1 }} />
            <Typography variant="h5" fontWeight={800}>{progress?.percent ?? 0}%</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ flex: 1 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography component="h2" variant="h6">Chứng chỉ</Typography>
            <Typography variant="body2" color="text.secondary">Tải chứng chỉ PDF sau khi đạt bài kiểm tra.</Typography>
            <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => void downloadCertificate()}>
              Tải chứng chỉ
            </Button>
          </Stack>
        </CardContent>
      </Card>

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
