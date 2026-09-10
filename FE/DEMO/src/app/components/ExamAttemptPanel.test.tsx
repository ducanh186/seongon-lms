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

    render(<ExamAttemptPanel quiz={quiz} startAttempt={startAttempt} saveAnswers={vi.fn()} submitAttempt={vi.fn()} onResult={vi.fn()} />);

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
    render(<ExamAttemptPanel quiz={quiz} startAttempt={startAttempt} saveAnswers={saveAnswers} submitAttempt={vi.fn()} onResult={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }));
    await user.click(await screen.findByRole('radio', { name: 'Đáp án A' }));

    await waitFor(() => expect(saveAnswers).toHaveBeenCalledWith(9, [{ question_id: 11, option_id: 101 }]), { timeout: 2000 });
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
  });
});
