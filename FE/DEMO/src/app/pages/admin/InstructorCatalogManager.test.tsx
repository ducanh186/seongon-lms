import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructorCatalogManager } from './InstructorCatalogManager';

const list = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const uploadImage = vi.hoisted(() => vi.fn());

vi.mock('../../data/repositories/adminRepositories', () => ({
  adminRepositories: { instructors: { list, create, update, remove, uploadImage } },
}));

describe('InstructorCatalogManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue({ data: [{ id: 1, name: 'Nguyễn Minh Anh', bio: 'SEO strategist', avatar: '/storage/teacher-profile-images/teacher.jpg', courses_count: 3, created_at: '', updated_at: '' }] });
    create.mockResolvedValue({ data: { id: 2 } });
    update.mockResolvedValue({ data: { id: 1 } });
    remove.mockResolvedValue(null);
  });

  it('renders the instructor catalog form and course count', async () => {
    render(<InstructorCatalogManager token="admin-token" />);

    expect(await screen.findByRole('heading', { name: 'Tạo danh mục giảng viên' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Tên giảng viên/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Danh sách giảng viên' })).toBeInTheDocument();
    expect(screen.getByText('3 khóa học')).toBeInTheDocument();
  });

  it('creates an instructor from the catalog form', async () => {
    render(<InstructorCatalogManager token="admin-token" />);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Tên giảng viên/ }), 'Lê An');
    await user.type(screen.getByRole('textbox', { name: /Giới thiệu giảng viên/ }), 'Chuyên gia SEO');
    await user.click(screen.getByRole('button', { name: 'Lưu giảng viên' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('admin-token', { name: 'Lê An', bio: 'Chuyên gia SEO', avatar: null }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Đã lưu danh mục giảng viên.');
  });

  it('shows the teacher avatar and uploads a replacement image', async () => {
    uploadImage.mockResolvedValue({ url: '/storage/teacher-profile-images/new.jpg' });
    render(<InstructorCatalogManager token="admin-token" />);
    const user = userEvent.setup();

    expect(await screen.findByRole('img', { name: 'Ảnh giảng viên Nguyễn Minh Anh' })).toHaveAttribute('src', 'http://127.0.0.1:8000/storage/teacher-profile-images/teacher.jpg');
    const input = screen.getByLabelText('Ảnh giảng viên');
    const file = new File(['avatar'], 'new.jpg', { type: 'image/jpeg' });
    await user.upload(input, file);

    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith('admin-token', file));
  });
});
