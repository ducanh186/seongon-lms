import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import { useParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiEnrollment, ApiLesson, ApiProgress, ApiQuiz } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';

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
    const [enrollmentResponse, lessonResponse, progressResponse] = await Promise.all([api.myCourses(token), api.lessons(token, courseId), api.progress(token, courseId)]);
    const current = enrollmentResponse.data.find((item) => item.course_id === courseId) ?? null;
    setEnrollment(current);
    setLessons(lessonResponse.data);
    setActiveLesson((currentLesson) => currentLesson ?? lessonResponse.data[0] ?? null);
    setProgress(progressResponse);
  };

  useEffect(() => {
    refresh().catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Không thể tải nội dung khóa học.')).finally(() => setLoading(false));
  }, [courseId, token]);

  const canSubmitQuiz = useMemo(() => quiz && quiz.questions.every((question) => answers[question.id]), [answers, quiz]);

  const completeLesson = async (lesson: ApiLesson) => {
    if (!token) return;
    setError(null);
    try {
      await api.completeLesson(token, lesson.id);
      setNotice(`Đã hoàn thành: ${lesson.title}`);
      await refresh();
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Không thể cập nhật tiến độ.'); }
  };

  const openQuiz = async () => {
    if (!token || !progress?.can_take_exam) return;
    try { setQuiz((await api.quiz(token, courseId)).data); setNotice(null); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Không thể tải bài kiểm tra.'); }
  };

  const submitQuiz = async () => {
    if (!token || !quiz) return;
    try {
      const result = await api.submitQuiz(token, courseId, quiz.questions.map((question) => ({ question_id: question.id, option_id: answers[question.id] ?? null })));
      setNotice(result.passed ? `Bạn đã đạt ${result.score}%. Chứng chỉ đã được cấp.` : `Bạn đạt ${result.score}%. Hãy ôn lại và thử lần tiếp theo.`);
      setQuiz(null);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Không thể nộp bài kiểm tra.'); }
  };

  const submitReview = async () => {
    if (!token || !rating) return;
    try { await api.reviewCourse(token, courseId, rating, comment); setNotice('Cảm ơn bạn đã gửi đánh giá.'); setComment(''); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Không thể gửi đánh giá.'); }
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
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Bạn chưa có chứng chỉ để tải.'); }
  };

  if (loading) return <Container sx={{ py: 6 }}><PageSkeleton rows={4} /></Container>;
  if (error && !enrollment) return <Container sx={{ py: 6 }}><Alert severity="error">{error}</Alert></Container>;

  return <Box sx={{ py: { xs: 4, md: 6 }, minHeight: '70dvh' }}><Container maxWidth="lg"><Stack spacing={4}>
    <PageHeader eyebrow="KHÔNG GIAN HỌC" title={enrollment?.course?.title ?? 'Học khóa học'} description="Hoàn thành từng bài học để mở bài kiểm tra cuối khóa." />
    {notice && <Alert severity="success">{notice}</Alert>}{error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
    <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>Tiến độ: {progress?.percent ?? 0}%</Typography><Typography color="text.secondary">{progress?.completed ?? 0}/{progress?.total ?? 0} bài học</Typography></Stack>
    <LinearProgress variant="determinate" value={progress?.percent ?? 0} aria-label="Tiến độ khóa học" sx={{ height: 12, borderRadius: 6, bgcolor: 'primary.light' }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.6fr) minmax(300px, .75fr)' }, gap: 3, alignItems: 'start' }}>
      <Card><CardContent sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
        <Typography component="h2" variant="h5">{activeLesson?.title ?? 'Chọn một bài học'}</Typography>
        {activeLesson?.video_url ? <Box component="iframe" src={activeLesson.video_url} title={activeLesson.title} sx={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 2.5, bgcolor: '#102E38' }} allowFullScreen /> : <Alert severity="info">Bài học này chưa có video.</Alert>}
        {activeLesson?.description && <Typography color="text.secondary">{activeLesson.description}</Typography>}
        {activeLesson && <Button variant={activeLesson.is_completed ? 'outlined' : 'contained'} startIcon={<CheckCircleOutlineIcon />} disabled={activeLesson.is_completed} onClick={() => void completeLesson(activeLesson)}>{activeLesson.is_completed ? 'Đã hoàn thành' : 'Đánh dấu đã hoàn thành'}</Button>}
      </Stack></CardContent></Card>
      <Card sx={{ position: { lg: 'sticky' }, top: 96 }}><CardContent><Typography component="h2" variant="h6">Danh sách bài học</Typography><Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
        {lessons.map((lesson) => <Button key={lesson.id} onClick={() => setActiveLesson(lesson)} aria-pressed={lesson.id === activeLesson?.id} color="inherit" sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.5, px: 1.5, bgcolor: lesson.id === activeLesson?.id ? 'primary.light' : 'transparent', fontWeight: lesson.id === activeLesson?.id ? 800 : 500 }} startIcon={lesson.is_completed ? <CheckCircleOutlineIcon color="primary" /> : undefined}>{lesson.position}. {lesson.title}</Button>)}
      </Stack></CardContent></Card>
    </Box>
    <Card><CardContent sx={{ p: { xs: 3, md: 4 } }}><Stack spacing={2}><Typography component="h2" variant="h5">Bài kiểm tra cuối khóa</Typography>
      {!progress?.can_take_exam ? <Alert severity="info">Hoàn thành 100% bài học để mở bài kiểm tra.</Alert> : !quiz ? <Button variant="contained" onClick={() => void openQuiz()}>Mở bài kiểm tra</Button> : <Stack spacing={3}>{quiz.questions.map((question, index) => <FormControl key={question.id}><Typography fontWeight={700}>{index + 1}. {question.content}</Typography><RadioGroup value={String(answers[question.id] ?? '')} onChange={(event) => setAnswers((value) => ({ ...value, [question.id]: Number(event.target.value) }))}>{question.options.map((option) => <FormControlLabel key={option.id} value={String(option.id)} control={<Radio />} label={option.content} />)}</RadioGroup></FormControl>)}<Button variant="contained" disabled={!canSubmitQuiz} onClick={() => void submitQuiz()}>Nộp bài kiểm tra</Button></Stack>}
    </Stack></CardContent></Card>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      <Card><CardContent sx={{ p: 3 }}><Stack spacing={2}><Typography component="h2" variant="h6">Đánh giá khóa học</Typography><Rating value={rating} onChange={(_, value) => setRating(value)} /><TextField label="Nhận xét của bạn" multiline minRows={3} value={comment} onChange={(event) => setComment(event.target.value)} /><Button variant="outlined" onClick={() => void submitReview()} disabled={!rating}>Gửi đánh giá</Button></Stack></CardContent></Card>
      <Card sx={{ bgcolor: '#E9F7F5' }}><CardContent sx={{ p: 3 }}><Stack spacing={2}><Typography component="h2" variant="h6">Chứng chỉ</Typography><Typography color="text.secondary">Sau khi đạt bài kiểm tra, bạn có thể tải chứng chỉ PDF tại đây.</Typography><Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => void downloadCertificate()}>Tải chứng chỉ</Button></Stack></CardContent></Card>
    </Box>
  </Stack></Container></Box>;
}
