import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type {
  ApiAttemptLifecycleResponse,
  ApiQuiz,
  ApiQuizAttempt,
  ApiQuizSubmissionResponse,
} from '../lib/contracts';

type DraftAnswer = { question_id: number; option_id: number | null };

type ExamAttemptPanelProps = {
  quiz: ApiQuiz;
  startAttempt: () => Promise<ApiAttemptLifecycleResponse>;
  saveAnswers: (attemptId: number, answers: DraftAnswer[]) => Promise<ApiAttemptLifecycleResponse>;
  submitAttempt: (attemptId: number) => Promise<ApiQuizSubmissionResponse>;
  onResult: (result: ApiQuizSubmissionResponse) => void;
  onBackToCourse: () => void;
};

export function ExamAttemptPanel({
  quiz,
  startAttempt,
  saveAnswers,
  submitAttempt,
  onResult,
  onBackToCourse,
}: ExamAttemptPanelProps) {
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [activeQuestionIds, setActiveQuestionIds] = useState<number[] | null>(null);
  const activeQuestions = useMemo(() => activeQuestionIds === null
    ? quiz.questions
    : activeQuestionIds.flatMap((id) => quiz.questions.find((question) => question.id === id) ?? []),
  [activeQuestionIds, quiz.questions]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [attempts, setAttempts] = useState<ApiQuizAttempt[]>(quiz.attempts ?? []);
  const [attemptsRemaining, setAttemptsRemaining] = useState(
    quiz.attempts_remaining ?? Math.max(0, quiz.max_attempts - (quiz.attempts?.length ?? 0)),
  );
  const [reviewAttemptId, setReviewAttemptId] = useState<number | null>(null);
  const [showOverview, setShowOverview] = useState(Boolean(quiz.ended || quiz.attempts?.length));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiQuizSubmissionResponse | null>(null);
  const answersRef = useRef(answers);
  const attemptIdRef = useRef(attemptId);
  const saveTimerRef = useRef<number | null>(null);
  const autoSubmittedRef = useRef(false);

  const answerRows = useMemo(
    () => activeQuestions.map((question) => ({ question_id: question.id, option_id: answers[question.id] ?? null })),
    [answers, activeQuestions],
  );
  const closesAtPassed = Boolean(quiz.closes_at && Date.parse(quiz.closes_at) <= Date.now());
  const ended = Boolean(quiz.ended || attemptsRemaining === 0 || closesAtPassed);
  const bestScore = attempts.length > 0
    ? Math.max(...attempts.map((attempt) => attempt.score ?? 0))
    : quiz.best_score;
  const reviewAttempt = attempts.find((attempt) => attempt.id === reviewAttemptId) ?? null;
  const wrongAnswers = (reviewAttempt?.answers ?? []).filter((answer) => answer.is_correct === false);

  useEffect(() => {
    answersRef.current = answers;
    attemptIdRef.current = attemptId;
  }, [answers, attemptId]);

  const persist = async (id = attemptIdRef.current, rows = activeQuestions.map((question) => ({
    question_id: question.id,
    option_id: answersRef.current[question.id] ?? null,
  }))) => {
    if (!id) return;
    setSaveState('saving');
    try {
      await saveAnswers(id, rows);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const finish = async () => {
    const id = attemptIdRef.current;
    if (!id || submitting || result) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    setSubmitting(true);
    setError(null);
    await persist(id);
    try {
      const response = await submitAttempt(id);
      setAttempts((current) => [...current.filter((attempt) => attempt.id !== response.attempt.id), response.attempt]);
      setAttemptsRemaining((current) => Math.max(0, current - 1));
      setResult(response);
      setShowOverview(true);
      setAttemptId(null);
      setActiveQuestionIds(null);
      attemptIdRef.current = null;
      setDeadline(null);
      onResult(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể nộp bài kiểm tra.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (deadline === null || result) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void finish();
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadline, result]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') void persist();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const begin = async () => {
    setStarting(true);
    setError(null);
    setResult(null);
    setReviewAttemptId(null);
    autoSubmittedRef.current = false;
    try {
      const response = await startAttempt();
      const restored = Object.fromEntries(
        (response.attempt.answers ?? [])
          .filter((answer) => answer.selected_option_id !== null)
          .map((answer) => [answer.question_id, answer.selected_option_id as number]),
      );
      setAttemptId(response.attempt.id);
      setActiveQuestionIds(response.attempt.question_ids ?? null);
      attemptIdRef.current = response.attempt.id;
      setAnswers(restored);
      answersRef.current = restored;
      const serverRemaining = Date.parse(response.attempt.expires_at ?? response.server_now) - Date.parse(response.server_now);
      setDeadline(Date.now() + Math.max(0, serverRemaining));
      setShowOverview(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể bắt đầu bài kiểm tra.');
    } finally {
      setStarting(false);
    }
  };

  const selectAnswer = (questionId: number, optionId: number) => {
    const next = { ...answersRef.current, [questionId]: optionId };
    setAnswers(next);
    answersRef.current = next;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void persist(attemptIdRef.current, activeQuestions.map((question) => ({
        question_id: question.id,
        option_id: next[question.id] ?? null,
      })));
    }, 500);
  };

  if (showOverview) {
    return (
      <Stack spacing={3}>
        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ py: { xs: 1, sm: 2 } }}>
          {ended && <Chip color="default" label="Bài kiểm tra đã kết thúc" sx={{ fontWeight: 800 }} />}
          {quiz.closes_at && (
            <Typography color="text.secondary">Thời điểm kết thúc: {formatDateTime(quiz.closes_at)}</Typography>
          )}
          <Typography color="text.secondary">Thời gian làm bài: {quiz.duration_minutes ?? 30} phút</Typography>
          <Typography color="text.secondary">Cách chấm điểm: Lần cao nhất</Typography>
        </Stack>

        {result && (
          <Alert severity={result.passed ? 'success' : 'warning'}>
            {result.passed ? `Bạn đã đạt ${result.score}%.` : `Bạn đạt ${result.score}%.`}
          </Alert>
        )}

        <Box>
          <Typography component="h3" variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
            Tổng quan các lần làm bài
          </Typography>
          {attempts.length === 0 ? (
            <Alert severity="info">Bạn chưa có lượt làm bài nào.</Alert>
          ) : (
            <>
              <TableContainer component={Card} variant="outlined" sx={{ display: { xs: 'none', sm: 'block' }, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'primary.main' }}>
                    <TableRow>
                      {['Lượt làm', 'Trạng thái', 'Điểm', 'Nộp lúc', 'Xem lại'].map((label) => (
                        <TableCell key={label} sx={{ color: 'primary.contrastText', fontWeight: 800 }}>{label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attempts.map((attempt) => (
                      <TableRow key={attempt.id} hover>
                        <TableCell>Lần {attempt.attempt_no}</TableCell>
                        <TableCell>{attempt.status === 'expired' ? 'Hết thời gian' : 'Đã hoàn thành'}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{attempt.score ?? 0}%</TableCell>
                        <TableCell>{formatDateTime(attempt.submitted_at ?? attempt.finished_at)}</TableCell>
                        <TableCell>
                          <Button size="small" aria-label={`Xem lại lượt ${attempt.attempt_no}`} onClick={() => setReviewAttemptId(attempt.id)}>
                            Xem lại
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                {attempts.map((attempt) => (
                  <Card key={attempt.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                        <Box>
                          <Typography fontWeight={800}>Lần {attempt.attempt_no}: {attempt.score ?? 0}%</Typography>
                          <Typography variant="body2" color="text.secondary">{formatDateTime(attempt.submitted_at ?? attempt.finished_at)}</Typography>
                        </Box>
                        <Button size="small" aria-label={`Xem lại lượt ${attempt.attempt_no}`} onClick={() => setReviewAttemptId(attempt.id)}>
                          Xem lại
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </>
          )}
        </Box>

        {reviewAttempt && (
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'error.light' }}>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography component="h4" variant="h6" fontWeight={800}>Câu trả lời sai ở lần {reviewAttempt.attempt_no}</Typography>
                  <Typography variant="body2" color="text.secondary">Xem lại đáp án đã chọn và đáp án đúng.</Typography>
                </Box>
                {wrongAnswers.length === 0 ? (
                  <Alert severity="success">Lượt này không có câu trả lời sai.</Alert>
                ) : wrongAnswers.map((answer, index) => {
                  const question = quiz.questions.find((item) => item.id === answer.question_id);
                  const selected = question?.options.find((option) => option.id === answer.selected_option_id);
                  const correct = question?.options.find((option) => option.id === answer.correct_answer_id);
                  return (
                    <Box key={answer.question_id} sx={{ p: 2, bgcolor: 'error.50', borderLeft: 3, borderColor: 'error.main', borderRadius: 1 }}>
                      <Typography fontWeight={800}>{index + 1}. {question?.content}</Typography>
                      <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>Bạn đã chọn: {selected?.content ?? 'Chưa trả lời'}</Typography>
                      <Typography variant="body2" color="success.main" fontWeight={700}>Đáp án đúng: {correct?.content ?? 'Không có dữ liệu'}</Typography>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        {bestScore !== null && bestScore !== undefined && (
          <Typography variant="h6" fontWeight={800} textAlign="center">Điểm tổng kết của bạn: {bestScore}%</Typography>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" spacing={1.5}>
          {!ended && (
            <Button variant="contained" onClick={() => void begin()} disabled={starting}>
              {starting ? 'Đang bắt đầu' : 'Làm lại'}
            </Button>
          )}
          <Button variant={ended ? 'contained' : 'outlined'} onClick={onBackToCourse}>Trở về khóa học</Button>
        </Stack>
      </Stack>
    );
  }

  if (attemptId === null) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Alert severity="warning">
          Thời gian được tính theo máy chủ ngay khi bắt đầu. Đóng trang không làm dừng đồng hồ.
        </Alert>
        {quiz.closes_at && <Typography variant="body2" color="text.secondary">Bài kiểm tra đóng lúc {formatDateTime(quiz.closes_at)}.</Typography>}
        <Typography variant="body2" color="text.secondary">Bạn có tối đa {quiz.max_attempts} lượt làm.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Button variant="contained" onClick={() => void begin()} disabled={starting}>
          {starting ? 'Đang bắt đầu' : 'Bắt đầu làm bài'}
        </Button>
      </Stack>
    );
  }

  const timerColor = remainingSeconds < 60 ? 'error' : remainingSeconds < 300 ? 'warning' : 'default';

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ position: 'sticky', top: 76, zIndex: 2, bgcolor: 'background.paper', py: 1 }}>
        <Chip color={timerColor} label={`Còn lại ${formatRemaining(remainingSeconds)}`} aria-live="polite" />
        {saveState === 'saving' && <Typography variant="caption" color="text.secondary">Đang lưu</Typography>}
        {saveState === 'saved' && <Typography variant="caption" color="success.main">Đã lưu</Typography>}
        {saveState === 'error' && <Button size="small" color="error" onClick={() => void persist()}>Thử lưu lại</Button>}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {activeQuestions.map((question, index) => (
        <FormControl key={question.id} component="fieldset" fullWidth>
          <Typography component="legend" fontWeight={800}>{index + 1}. {question.content}</Typography>
          <RadioGroup value={String(answers[question.id] ?? '')} onChange={(event) => selectAnswer(question.id, Number(event.target.value))} sx={{ mt: 1 }}>
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
      <Button variant="contained" disabled={submitting || answerRows.some((answer) => answer.option_id === null)} onClick={() => void finish()} sx={{ alignSelf: 'flex-start' }}>
        {submitting ? 'Đang nộp bài' : 'Nộp bài kiểm tra'}
      </Button>
    </Stack>
  );
}

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Không có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
