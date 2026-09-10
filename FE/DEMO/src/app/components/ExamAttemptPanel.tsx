import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import type { ApiAttemptLifecycleResponse, ApiQuiz, ApiQuizSubmissionResponse } from '../lib/contracts';

type DraftAnswer = { question_id: number; option_id: number | null };

type ExamAttemptPanelProps = {
  quiz: ApiQuiz;
  startAttempt: () => Promise<ApiAttemptLifecycleResponse>;
  saveAnswers: (attemptId: number, answers: DraftAnswer[]) => Promise<ApiAttemptLifecycleResponse>;
  submitAttempt: (attemptId: number) => Promise<ApiQuizSubmissionResponse>;
  onResult: (result: ApiQuizSubmissionResponse) => void;
};

export function ExamAttemptPanel({ quiz, startAttempt, saveAnswers, submitAttempt, onResult }: ExamAttemptPanelProps) {
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
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
    () => quiz.questions.map((question) => ({ question_id: question.id, option_id: answers[question.id] ?? null })),
    [answers, quiz.questions],
  );

  useEffect(() => {
    answersRef.current = answers;
    attemptIdRef.current = attemptId;
  }, [answers, attemptId]);

  const persist = async (id = attemptIdRef.current, rows = quiz.questions.map((question) => ({
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
      setResult(response);
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
    try {
      const response = await startAttempt();
      const restored = Object.fromEntries(
        (response.attempt.answers ?? [])
          .filter((answer) => answer.selected_option_id !== null)
          .map((answer) => [answer.question_id, answer.selected_option_id as number]),
      );
      setAttemptId(response.attempt.id);
      attemptIdRef.current = response.attempt.id;
      setAnswers(restored);
      answersRef.current = restored;
      const serverRemaining = Date.parse(response.attempt.expires_at ?? response.server_now) - Date.parse(response.server_now);
      setDeadline(Date.now() + Math.max(0, serverRemaining));
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
      void persist(attemptIdRef.current, quiz.questions.map((question) => ({
        question_id: question.id,
        option_id: next[question.id] ?? null,
      })));
    }, 500);
  };

  if (attemptId === null) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Alert severity="warning">
          Thời gian được tính theo máy chủ ngay khi bắt đầu. Đóng trang không làm dừng đồng hồ.
        </Alert>
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
      {result && (
        <Alert severity={result.passed ? 'success' : 'warning'}>
          <Typography component="h3" fontWeight={800}>Kết quả bài kiểm tra</Typography>
          {result.passed
            ? `Bạn đã đạt ${result.score}%. Chứng chỉ đã được cấp.`
            : `Bạn đạt ${result.score}%. Hãy ôn lại và thử lần tiếp theo.`}
        </Alert>
      )}
      {quiz.questions.map((question, index) => {
        const submittedAnswer = result?.attempt.answers?.find((answer) => answer.question_id === question.id);
        return (
          <FormControl key={question.id} component="fieldset" fullWidth disabled={Boolean(result)}>
            <Typography component="legend" fontWeight={800}>{index + 1}. {question.content}</Typography>
            <RadioGroup value={String(answers[question.id] ?? '')} onChange={(event) => selectAnswer(question.id, Number(event.target.value))} sx={{ mt: 1 }}>
              {question.options.map((option) => {
                const selected = submittedAnswer?.selected_option_id === option.id;
                const resultColor = selected ? (submittedAnswer?.is_correct ? 'success' : 'error') : null;
                return (
                  <FormControlLabel
                    key={option.id}
                    value={String(option.id)}
                    control={<Radio />}
                    label={resultColor ? `${option.content} · ${resultColor === 'success' ? 'Đúng' : 'Chưa đúng'}` : option.content}
                    sx={{ m: 0, px: 1, border: '1px solid', borderColor: resultColor ? `${resultColor}.main` : 'transparent', borderRadius: 1.5, bgcolor: resultColor ? `${resultColor}.light` : 'transparent', '&:has(.Mui-checked)': { bgcolor: resultColor ? `${resultColor}.light` : 'primary.light' } }}
                  />
                );
              })}
            </RadioGroup>
          </FormControl>
        );
      })}
      <Button variant="contained" disabled={submitting || Boolean(result) || answerRows.some((answer) => answer.option_id === null)} onClick={() => void finish()} sx={{ alignSelf: 'flex-start' }}>
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
