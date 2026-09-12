import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExamAttemptPanel } from './ExamAttemptPanel';
import type { ApiQuiz } from '../lib/contracts';

const quiz: ApiQuiz = {
  id: 7,
  course_id: 10,
  title: 'Bài kiểm tra',
  pass_score: 80,
  max_attempts: 3,
  duration_minutes: 30,
  questions: [{ id: 11, content: 'Câu hỏi', options: [{ id: 101, content: 'Đáp án A' }] }],
};

describe('ExamAttemptPanel', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts only after confirmation and restores a saved draft', async () => {
    const startAttempt = vi.fn().mockResolvedValue({
      server_now: '2026-09-10T08:00:00Z',
      attempt: {
        id: 9, quiz_id: 7, score: null, passed: null, attempt_no: 1, status: 'in_progress',
        started_at: '2026-09-10T08:00:00Z', expires_at: '2026-09-10T08:30:00Z', finished_at: null, submitted_at: null,
        answers: [{ question_id: 11, selected_option_id: 101 }],
      },
    });
    const user = userEvent.setup();

    render(<ExamAttemptPanel quiz={quiz} startAttempt={startAttempt} saveAnswers={vi.fn()} submitAttempt={vi.fn()} onResult={vi.fn()} onBackToCourse={vi.fn()} />);

    expect(startAttempt).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }));
    expect(await screen.findByRole('radio', { name: 'Đáp án A' })).toBeChecked();
    expect(screen.getByText(/Còn lại/)).toBeInTheDocument();
  });

  it('autosaves changed answers and exposes saved state', async () => {
    const startAttempt = vi.fn().mockResolvedValue({
      server_now: new Date().toISOString(),
      attempt: {
        id: 9, quiz_id: 7, score: null, passed: null, attempt_no: 1, status: 'in_progress',
        started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 1_800_000).toISOString(), finished_at: null, submitted_at: null,
        answers: [],
      },
    });
    const saveAnswers = vi.fn().mockResolvedValue({
      server_now: new Date().toISOString(),
      attempt: { id: 9, status: 'in_progress', answers: [{ question_id: 11, selected_option_id: 101 }] },
    });
    const user = userEvent.setup();
    render(<ExamAttemptPanel quiz={quiz} startAttempt={startAttempt} saveAnswers={saveAnswers} submitAttempt={vi.fn()} onResult={vi.fn()} onBackToCourse={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }));
    await user.click(await screen.findByRole('radio', { name: 'Đáp án A' }));

    await waitFor(() => expect(saveAnswers).toHaveBeenCalledWith(9, [{ question_id: 11, option_id: 101 }]), { timeout: 2000 });
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
  });

  it('shows attempt history and lets the learner review only wrong answers', async () => {
    const user = userEvent.setup();
    const historyQuiz: ApiQuiz = {
      ...quiz,
      max_attempts: 2,
      attempts_remaining: 1,
      best_score: 50,
      ended: false,
      questions: [
        {
          id: 11,
          content: 'Câu nào đã trả lời sai?',
          options: [
            { id: 101, content: 'Đáp án đã chọn' },
            { id: 102, content: 'Đáp án đúng' },
          ],
        },
        {
          id: 12,
          content: 'Câu đã trả lời đúng',
          options: [{ id: 201, content: 'Đáp án đúng khác' }],
        },
      ],
      attempts: [{
        id: 9,
        quiz_id: 7,
        score: 50,
        passed: false,
        attempt_no: 1,
        status: 'submitted',
        started_at: '2026-09-10T08:00:00Z',
        expires_at: '2026-09-10T08:30:00Z',
        finished_at: '2026-09-10T08:10:00Z',
        submitted_at: '2026-09-10T08:10:00Z',
        answers: [
          { question_id: 11, selected_option_id: 101, correct_answer_id: 102, is_correct: false },
          { question_id: 12, selected_option_id: 201, correct_answer_id: 201, is_correct: true },
        ],
      }],
    };

    render(<ExamAttemptPanel quiz={historyQuiz} startAttempt={vi.fn()} saveAnswers={vi.fn()} submitAttempt={vi.fn()} onResult={vi.fn()} onBackToCourse={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Tổng quan các lần làm bài' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Làm lại' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Xem lại lượt 1' })[0]);
    expect(screen.getByText(/Câu nào đã trả lời sai/)).toBeInTheDocument();
    expect(screen.getByText(/Bạn đã chọn: Đáp án đã chọn/)).toBeInTheDocument();
    expect(screen.getByText(/Đáp án đúng: Đáp án đúng/)).toBeInTheDocument();
    expect(screen.queryByText('Câu đã trả lời đúng')).not.toBeInTheDocument();
  });

  it('shows the ended state without a retake action', () => {
    render(<ExamAttemptPanel quiz={{ ...quiz, max_attempts: 2, attempts_remaining: 0, ended: true, attempts: [] }} startAttempt={vi.fn()} saveAnswers={vi.fn()} submitAttempt={vi.fn()} onResult={vi.fn()} onBackToCourse={vi.fn()} />);

    expect(screen.getByText('Bài kiểm tra đã kết thúc')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Làm lại' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trở về khóa học' })).toBeInTheDocument();
  });
});
