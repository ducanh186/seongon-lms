import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Pagination,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { api, ApiError } from '../lib/api';
import type { ApiAdminCourse, ApiAdminQuestion, ApiAdminStats, ApiCategory, ApiCourse, ApiNewsPost, ApiReview, ApiUser, Paginated } from '../lib/contracts';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { useAuth } from '../contexts/AuthContext';
import { AdminSectionHeader } from '../components/AdminSectionHeader';
import { StatusChip } from '../components/StatusChip';
import { AdminDataTable, type AdminColumn } from '../components/AdminDataTable';
import { AdminShell, type AdminSection } from '../components/AdminShell';
import { AdminOverview } from './AdminOverview';

type CourseDraft = {
  title: string;
  description: string;
  thumbnail: string;
  price: string;
  instructor_name: string;
  instructor_bio: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published';
};

type LessonDraft = {
  title: string;
  video_url: string;
  description: string;
  duration: string;
};

type NewsDraft = {
  title: string;
  category: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  status: 'draft' | 'published';
};

type QuestionOptionDraft = { content: string; is_correct: boolean };

type PendingConfirmation = {
  title: string;
  recordName: string;
  work: () => Promise<unknown>;
  successMessage: string;
  refreshContent: boolean;
};

type AppliedNewsFilters = {
  q: string;
  status: string;
  page: number;
};

type AppliedAdminFilters = {
  q: string;
  status: string;
  page: number;
};

const blankCourse: CourseDraft = {
  title: '',
  description: '',
  thumbnail: '',
  price: '0',
  instructor_name: '',
  instructor_bio: '',
  level: 'beginner',
  status: 'draft',
};

const blankLesson: LessonDraft = { title: '', video_url: '', description: '', duration: '' };
const blankNews: NewsDraft = { title: '', category: '', excerpt: '', content: '', thumbnail: '', status: 'draft' };
const blankQuestionOptions: QuestionOptionDraft[] = [
  { content: '', is_correct: true },
  { content: '', is_correct: false },
];

const adminSectionCopy: Record<AdminSection, { title: string; description: string }> = {
  overview: { title: 'Tổng quan vận hành', description: 'Theo dõi nhanh hoạt động học tập và hiệu quả nội dung.' },
  users: { title: 'Quản lý học viên', description: 'Tìm kiếm, kiểm tra ghi danh và quản lý trạng thái tài khoản.' },
  categories: { title: 'Danh mục khóa học', description: 'Tổ chức chủ đề để học viên khám phá nội dung dễ dàng.' },
  courses: { title: 'Quản lý khóa học', description: 'Quản lý nội dung, bài học, bài kiểm tra và trạng thái xuất bản.' },
  reviews: { title: 'Kiểm duyệt đánh giá', description: 'Theo dõi và kiểm soát đánh giá hiển thị trên hệ thống.' },
  news: { title: 'Tin tức và kiến thức', description: 'Biên tập nội dung công khai theo quy trình nháp và xuất bản.' },
};

function getErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof ApiError ? reason.message : fallback;
}

function courseDraftFrom(course: ApiCourse): CourseDraft {
  return {
    title: course.title,
    description: course.description ?? '',
    thumbnail: course.thumbnail ?? '',
    price: String(course.price),
    instructor_name: course.instructor_name ?? '',
    instructor_bio: course.instructor_bio ?? '',
    level: course.level ?? 'beginner',
    status: course.status,
  };
}

function questionDraftFrom(question: ApiAdminQuestion): { content: string; options: QuestionOptionDraft[] } {
  return {
    content: question.content,
    options: question.options.map((option) => ({ content: option.content, is_correct: option.is_correct })),
  };
}

function newsDraftFrom(newsPost: ApiNewsPost): NewsDraft {
  return {
    title: newsPost.title,
    category: newsPost.category,
    excerpt: newsPost.excerpt,
    content: newsPost.content,
    thumbnail: newsPost.thumbnail ?? '',
    status: newsPost.status,
  };
}

export function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<AdminSection>('overview');
  const [stats, setStats] = useState<ApiAdminStats | null>(null);
  const [users, setUsers] = useState<Paginated<ApiUser> | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [courses, setCourses] = useState<Paginated<ApiCourse> | null>(null);
  const [reviews, setReviews] = useState<Paginated<ApiReview> | null>(null);
  const [news, setNews] = useState<Paginated<ApiNewsPost> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [appliedUserFilters, setAppliedUserFilters] = useState<AppliedAdminFilters>({ q: '', status: '', page: 1 });
  const [courseQuery, setCourseQuery] = useState('');
  const [courseStatus, setCourseStatus] = useState('');
  const [appliedCourseFilters, setAppliedCourseFilters] = useState<AppliedAdminFilters>({ q: '', status: '', page: 1 });
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewPage, setReviewPage] = useState(1);
  const [newsQuery, setNewsQuery] = useState('');
  const [newsStatus, setNewsStatus] = useState('');
  const [appliedNewsFilters, setAppliedNewsFilters] = useState<AppliedNewsFilters>({ q: '', status: '', page: 1 });

  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCourse, setEditingCourse] = useState<ApiCourse | null>(null);
  const [courseCategoryId, setCourseCategoryId] = useState('');
  const [courseForm, setCourseForm] = useState<CourseDraft>(blankCourse);
  const [isCourseEditorOpen, setIsCourseEditorOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<ApiAdminCourse | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonDraft>(blankLesson);
  const [quizTitle, setQuizTitle] = useState('Bài kiểm tra cuối khóa');
  const [quizPassScore, setQuizPassScore] = useState('75');
  const [quizMaxAttempts, setQuizMaxAttempts] = useState('3');
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionContent, setQuestionContent] = useState('');
  const [questionOptions, setQuestionOptions] = useState<QuestionOptionDraft[]>(blankQuestionOptions);
  const [editingNews, setEditingNews] = useState<ApiNewsPost | null>(null);
  const [isNewsEditorOpen, setIsNewsEditorOpen] = useState(false);
  const [newsForm, setNewsForm] = useState<NewsDraft>(blankNews);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const loadRequestId = useRef(0);
  const loadedKeyBySection = useRef<Partial<Record<AdminSection, string>>>({});

  const cacheKeyFor = useCallback((section: AdminSection) => {
    switch (section) {
      case 'users':
        return `${section}:${appliedUserFilters.q}:${appliedUserFilters.status}:${appliedUserFilters.page}`;
      case 'courses':
        return `${section}:${appliedCourseFilters.q}:${appliedCourseFilters.status}:${appliedCourseFilters.page}`;
      case 'reviews':
        return `${section}:${reviewStatus}:${reviewPage}`;
      case 'news':
        return `${section}:${appliedNewsFilters.q}:${appliedNewsFilters.status}:${appliedNewsFilters.page}`;
      default:
        return section;
    }
  }, [appliedCourseFilters, appliedNewsFilters, appliedUserFilters, reviewPage, reviewStatus]);

  const load = useCallback(async (section: AdminSection, force = false) => {
    if (!token) return;
    const requestId = ++loadRequestId.current;
    const cacheKey = cacheKeyFor(section);
    if (!force && loadedKeyBySection.current[section] === cacheKey) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      switch (section) {
        case 'overview': {
          const nextStats = await api.adminStats(token);
          if (requestId !== loadRequestId.current) return;
          setStats(nextStats);
          break;
        }
        case 'users': {
          const nextUsers = await api.adminUsers(token, {
            q: appliedUserFilters.q || undefined,
            status: appliedUserFilters.status || undefined,
            page: appliedUserFilters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setUsers(nextUsers);
          break;
        }
        case 'categories': {
          const nextCategories = await api.adminCategories(token);
          if (requestId !== loadRequestId.current) return;
          setCategories(nextCategories.data);
          break;
        }
        case 'courses': {
          const needsCategories = loadedKeyBySection.current.categories === undefined;
          const [nextCourses, nextCategories] = await Promise.all([
            api.adminCourses(token, {
              q: appliedCourseFilters.q || undefined,
              status: appliedCourseFilters.status || undefined,
              page: appliedCourseFilters.page,
            }),
            needsCategories ? api.adminCategories(token) : Promise.resolve(null),
          ]);
          if (requestId !== loadRequestId.current) return;
          setCourses(nextCourses);
          if (nextCategories) {
            setCategories(nextCategories.data);
            loadedKeyBySection.current.categories = 'categories';
          }
          break;
        }
        case 'reviews': {
          const nextReviews = await api.adminReviews(token, { status: reviewStatus || undefined, page: reviewPage });
          if (requestId !== loadRequestId.current) return;
          setReviews(nextReviews);
          break;
        }
        case 'news': {
          const nextNews = await api.adminNews(token, {
            q: appliedNewsFilters.q || undefined,
            status: appliedNewsFilters.status || undefined,
            page: appliedNewsFilters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setNews(nextNews);
          break;
        }
      }
      loadedKeyBySection.current[section] = cacheKey;
    } catch (reason) {
      if (requestId === loadRequestId.current) {
        setError(getErrorMessage(reason, 'Không thể tải dữ liệu quản trị.'));
      }
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [appliedCourseFilters, appliedNewsFilters, appliedUserFilters, cacheKeyFor, reviewPage, reviewStatus, token]);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  const loadCourseDetail = useCallback(async (courseId: number) => {
    if (!token) return;
    const response = await api.adminCourse(token, courseId);
    setSelectedCourse(response.data);
    setQuizTitle(response.data.quiz?.title ?? 'Bài kiểm tra cuối khóa');
    setQuizPassScore(String(response.data.quiz?.pass_score ?? 75));
    setQuizMaxAttempts(String(response.data.quiz?.max_attempts ?? 3));
    const firstQuestion = response.data.quiz?.questions[0];
    if (firstQuestion) {
      const draft = questionDraftFrom(firstQuestion);
      setEditingQuestionId(firstQuestion.id);
      setQuestionContent(draft.content);
      setQuestionOptions(draft.options);
    } else {
      setEditingQuestionId(null);
      setQuestionContent('');
      setQuestionOptions(blankQuestionOptions);
    }
  }, [token]);

  const selectContent = async (courseId: number) => {
    setError(null);
    try {
      await loadCourseDetail(courseId);
      setTab('courses');
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể tải nội dung khóa học.'));
    }
  };

  const refreshSelectedCourse = async () => {
    if (selectedCourse) {
      await loadCourseDetail(selectedCourse.id);
    }
  };

  const runMutation = async (work: () => Promise<unknown>, successMessage: string, refreshContent = false): Promise<boolean> => {
    setError(null);
    try {
      await work();
      setNotice(successMessage);
      delete loadedKeyBySection.current.overview;
      await load(tab, true);
      if (refreshContent) {
        await refreshSelectedCourse();
      }
      return true;
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể hoàn tất yêu cầu quản trị.'));
      return false;
    }
  };

  const submitCategory = (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const body = { name: categoryName, description: categoryDescription || undefined };
    void runMutation(
      () => editingCategory ? api.updateCategory(token, editingCategory.id, body) : api.createCategory(token, body),
      editingCategory ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục.',
    ).then(() => {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
    });
  };

  const submitCourse = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !courseCategoryId) return;
    const body = {
      ...courseForm,
      category_id: Number(courseCategoryId),
      price: Number(courseForm.price),
      description: courseForm.description || null,
      thumbnail: courseForm.thumbnail || null,
      instructor_name: courseForm.instructor_name || null,
      instructor_bio: courseForm.instructor_bio || null,
    };
    void runMutation(
      () => api.saveCourse(token, body, editingCourse?.id),
      editingCourse ? 'Đã cập nhật khóa học.' : 'Đã tạo khóa học.',
    ).then(() => {
      setEditingCourse(null);
      setCourseCategoryId('');
      setCourseForm(blankCourse);
      setIsCourseEditorOpen(false);
    });
  };

  const beginCourseEdit = (course: ApiCourse) => {
    setEditingCourse(course);
    setCourseCategoryId(String(course.category_id));
    setCourseForm(courseDraftFrom(course));
    setIsCourseEditorOpen(true);
    setTab('courses');
  };

  const submitNews = (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const body = {
      ...newsForm,
      thumbnail: newsForm.thumbnail || null,
    };
    void runMutation(
      () => api.saveNews(token, body, editingNews?.id),
      editingNews ? 'Đã cập nhật tin tức.' : 'Đã tạo tin tức.',
    ).then((didSucceed) => {
      if (!didSucceed) return;
      setEditingNews(null);
      setIsNewsEditorOpen(false);
      setNewsForm(blankNews);
    });
  };

  const beginNewsEdit = (newsPost: ApiNewsPost) => {
    setEditingNews(newsPost);
    setNewsForm(newsDraftFrom(newsPost));
    setIsNewsEditorOpen(true);
  };

  const changeNewsStatus = (newsPost: ApiNewsPost) => {
    if (!token) return;
    const nextStatus = newsPost.status === 'draft' ? 'published' : 'draft';
    const body = {
      ...newsDraftFrom(newsPost),
      thumbnail: newsPost.thumbnail,
      status: nextStatus,
    };
    void runMutation(
      () => api.saveNews(token, body, newsPost.id),
      nextStatus === 'published' ? 'Đã xuất bản tin tức.' : 'Đã chuyển tin tức về bản nháp.',
    );
  };

  const applyNewsFilters = () => {
    setAppliedNewsFilters({ q: newsQuery, status: newsStatus, page: 1 });
  };

  const submitLesson = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !selectedCourse) return;
    const body = {
      title: lessonForm.title,
      video_url: lessonForm.video_url,
      description: lessonForm.description || null,
      duration: lessonForm.duration === '' ? null : Number(lessonForm.duration),
    };
    void runMutation(
      () => api.saveLesson(token, body, selectedCourse.id, editingLessonId ?? undefined),
      editingLessonId ? 'Đã cập nhật bài học.' : 'Đã thêm bài học.',
      true,
    ).then(() => {
      setEditingLessonId(null);
      setLessonForm(blankLesson);
    });
  };

  const orderedLessons = useMemo(
    () => [...(selectedCourse?.lessons ?? [])].sort((left, right) => left.position - right.position),
    [selectedCourse],
  );

  const moveLesson = (lessonId: number, direction: -1 | 1) => {
    if (!token || !selectedCourse) return;
    const index = orderedLessons.findIndex((lesson) => lesson.id === lessonId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= orderedLessons.length) return;
    const next = [...orderedLessons];
    [next[index], next[target]] = [next[target], next[index]];
    void runMutation(
      () => api.reorderLessons(token, selectedCourse.id, next.map((lesson) => lesson.id)),
      'Đã cập nhật thứ tự bài học.',
      true,
    );
  };

  const submitQuiz = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !selectedCourse) return;
    void runMutation(
      () => api.saveQuiz(token, selectedCourse.id, { title: quizTitle, pass_score: Number(quizPassScore), max_attempts: Number(quizMaxAttempts) }),
      'Đã lưu cấu hình bài kiểm tra.',
      true,
    );
  };

  const chooseQuestion = (question: ApiAdminQuestion) => {
    const draft = questionDraftFrom(question);
    setEditingQuestionId(question.id);
    setQuestionContent(draft.content);
    setQuestionOptions(draft.options);
  };

  const submitQuestion = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !selectedCourse?.quiz) return;
    const body = { content: questionContent, options: questionOptions };
    void runMutation(
      () => editingQuestionId ? api.updateQuestion(token, editingQuestionId, body) : api.saveQuestion(token, selectedCourse.quiz!.id, body),
      editingQuestionId ? 'Đã cập nhật câu hỏi.' : 'Đã thêm câu hỏi.',
      true,
    ).then(() => {
      setEditingQuestionId(null);
      setQuestionContent('');
      setQuestionOptions(blankQuestionOptions);
    });
  };

  const updateQuestionOption = (index: number, next: Partial<QuestionOptionDraft>) => {
    setQuestionOptions((options) => options.map((option, optionIndex) => optionIndex === index ? { ...option, ...next } : option));
  };

  const markCorrectOption = (index: number) => {
    setQuestionOptions((options) => options.map((option, optionIndex) => ({ ...option, is_correct: optionIndex === index })));
  };

  const requestConfirmation = (
    title: string,
    recordName: string,
    work: () => Promise<unknown>,
    successMessage: string,
    refreshContent = false,
  ) => {
    setPendingConfirmation({ title, recordName, work, successMessage, refreshContent });
  };

  const confirmPendingAction = () => {
    if (!pendingConfirmation) return;
    const pending = pendingConfirmation;
    setPendingConfirmation(null);
    void runMutation(pending.work, pending.successMessage, pending.refreshContent);
  };

  const courseColumns: AdminColumn<ApiCourse>[] = [
    { key: 'course', header: 'Khóa học', render: (course) => <Typography fontWeight={750} sx={{ minWidth: 210 }}>{course.title}</Typography> },
    { key: 'category', header: 'Danh mục', render: (course) => course.category?.name ?? '—' },
    { key: 'level', header: 'Cấp độ', render: (course) => ({ beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }[course.level ?? 'beginner']) },
    { key: 'price', header: 'Học phí', align: 'right', render: (course) => `${Number(course.price).toLocaleString('vi-VN')} đ` },
    { key: 'lessons', header: 'Bài học', align: 'center', render: (course) => course.lessons_count ?? 0 },
    { key: 'questions', header: 'Câu hỏi', align: 'center', render: (course) => course.questions_count ?? 0 },
    { key: 'enrollments', header: 'Ghi danh', align: 'center', render: (course) => course.enrollments_count ?? 0 },
    { key: 'status', header: 'Trạng thái', render: (course) => <StatusChip status={course.status} /> },
    { key: 'actions', header: 'Thao tác', align: 'right', render: (course) => <Stack direction="row" spacing={0.5} justifyContent="flex-end"><Button size="small" sx={{ minWidth: 'auto', px: 0.75, whiteSpace: 'nowrap' }} onClick={() => void selectContent(course.id)}>Nội dung</Button><Button size="small" sx={{ minWidth: 'auto', px: 0.75, whiteSpace: 'nowrap' }} onClick={() => beginCourseEdit(course)}>Sửa</Button><Button size="small" variant="outlined" sx={{ minWidth: 'auto', px: 0.75, whiteSpace: 'nowrap' }} onClick={() => token && void runMutation(() => api.publishCourse(token, course.id, course.status === 'published' ? 'draft' : 'published'), 'Đã cập nhật trạng thái xuất bản.')}>{course.status === 'published' ? 'Ẩn' : 'Xuất bản'}</Button><Button size="small" color="error" sx={{ minWidth: 'auto', px: 0.75, whiteSpace: 'nowrap' }} onClick={() => token && requestConfirmation('Xóa khóa học', course.title, () => api.deleteCourse(token, course.id), 'Đã xóa khóa học.')}>Xóa</Button></Stack> },
  ];

  if (loading && !stats) {
    return <Container sx={{ py: 6 }}><PageSkeleton rows={5} /></Container>;
  }

  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AdminShell active={tab} onChange={setTab}>
        <Stack spacing={3}>
          <AdminSectionHeader title={adminSectionCopy[tab].title} description={adminSectionCopy[tab].description} />
          {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
          {error && <RequestError message={error} onRetry={() => void load(tab, true)} />}
          <Stack spacing={3} sx={{ minWidth: 0 }}>

          {tab === 'overview' && stats && <AdminOverview stats={stats} />}

          {tab === 'users' && <Stack spacing={2}>
            <Stack component="section" role="region" aria-label="Bộ lọc học viên" data-admin-toolbar="true" direction="row" spacing={2} alignItems="stretch" sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <TextField label="Tìm học viên" value={userQuery} onChange={(event) => setUserQuery(event.target.value)} fullWidth />
              <FormControl fullWidth><InputLabel id="student-status">Trạng thái</InputLabel><Select labelId="student-status" label="Trạng thái" value={userStatus} onChange={(event) => setUserStatus(event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="active">Đang hoạt động</MenuItem><MenuItem value="locked">Đã khóa</MenuItem></Select></FormControl>
              <Button variant="contained" onClick={() => setAppliedUserFilters({ q: userQuery, status: userStatus, page: 1 })} sx={{ whiteSpace: 'nowrap' }}>Áp dụng</Button>
            </Stack>
            <Card sx={{ borderRadius: 3, minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {users?.data.length ? <AdminDataTable<ApiUser>
                label="Danh sách học viên"
                rows={users.data}
                getRowKey={(user) => user.id}
                columns={[
                  { key: 'student', header: 'Học viên', render: (user) => <Typography fontWeight={750} sx={{ minWidth: 180 }}>{user.name}</Typography> },
                  { key: 'email', header: 'Email', render: (user) => <Typography variant="body2" sx={{ minWidth: 200, overflowWrap: 'anywhere' }}>{user.email}</Typography> },
                  { key: 'phone', header: 'SĐT', render: (user) => user.phone || '—' },
                  { key: 'enrollments', header: 'Khóa đã đăng ký', align: 'center', render: (user) => user.enrollments_count ?? 0 },
                  { key: 'createdAt', header: 'Ngày tạo', render: (user) => new Date(user.created_at).toLocaleDateString('vi-VN') },
                  { key: 'status', header: 'Trạng thái', render: (user) => <StatusChip status={user.status} /> },
                  { key: 'actions', header: 'Thao tác', align: 'right', render: (user) => <Button size="small" variant="outlined" color={user.status === 'active' ? 'error' : 'primary'} onClick={() => token && void runMutation(() => api.updateUserStatus(token, user.id, user.status === 'active' ? 'locked' : 'active'), 'Đã cập nhật trạng thái tài khoản.')}>{user.status === 'active' ? 'Khóa' : 'Kích hoạt'}</Button> },
                ] satisfies AdminColumn<ApiUser>[]}
                minWidth={980}
                stickyFirstColumn
                stickyLastColumn
              /> : <EmptyState title="Không có người dùng phù hợp." />}
            </CardContent></Card>
            {users && users.meta.last_page > 1 && <Pagination count={users.meta.last_page} page={appliedUserFilters.page} onChange={(_, page) => setAppliedUserFilters((filters) => ({ ...filters, page }))} color="primary" sx={{ alignSelf: 'center' }} />}
          </Stack>}

          {tab === 'categories' && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, .6fr) 1fr' }, gap: 3 }}>
            <Card component="form" onSubmit={submitCategory} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>{editingCategory ? 'Sửa danh mục' : 'Tạo danh mục'}</Typography><TextField required label="Tên danh mục" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><TextField label="Mô tả" multiline minRows={3} value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} /><Stack direction="row" spacing={1}><Button type="submit" variant="contained">{editingCategory ? 'Cập nhật' : 'Lưu danh mục'}</Button>{editingCategory && <Button onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryDescription(''); }}>Hủy</Button>}</Stack></Stack></CardContent></Card>
            <Card sx={{ borderRadius: 3 }}><CardContent><Stack divider={<Divider flexItem />}>{categories.map((category) => <Stack key={category.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 1.25 }}><Box sx={{ flexGrow: 1 }}><Typography fontWeight={700}>{category.name}</Typography><Typography variant="body2" color="text.secondary">{category.description || 'Chưa có mô tả'}</Typography></Box><Button size="small" onClick={() => { setEditingCategory(category); setCategoryName(category.name); setCategoryDescription(category.description ?? ''); }}>Sửa</Button><Button color="error" size="small" onClick={() => token && requestConfirmation('Xóa danh mục', category.name, () => api.deleteCategory(token, category.id), 'Đã xóa danh mục.')}>Xóa</Button></Stack>)}{categories.length === 0 && <EmptyState title="Chưa có danh mục." />}</Stack></CardContent></Card>
          </Box>}

          {tab === 'courses' && <Stack spacing={2}>
            <Box component="section" role="region" aria-label="Bộ lọc khóa học" data-admin-toolbar="true" sx={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, .7fr) auto auto', gap: 2, alignItems: 'stretch', p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}><TextField label="Tìm khóa học" value={courseQuery} onChange={(event) => setCourseQuery(event.target.value)} fullWidth /><FormControl fullWidth><InputLabel id="course-status-filter">Trạng thái</InputLabel><Select labelId="course-status-filter" label="Trạng thái" value={courseStatus} onChange={(event) => setCourseStatus(event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="published">Xuất bản</MenuItem></Select></FormControl><Button variant="contained" onClick={() => setAppliedCourseFilters({ q: courseQuery, status: courseStatus, page: 1 })} sx={{ whiteSpace: 'nowrap' }}>Áp dụng</Button><Button variant="outlined" onClick={() => { setEditingCourse(null); setCourseCategoryId(''); setCourseForm(blankCourse); setIsCourseEditorOpen(true); }} sx={{ whiteSpace: 'nowrap' }}>Tạo khóa học mới</Button></Box>
            {isCourseEditorOpen && <Card component="form" onSubmit={submitCourse} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>{editingCourse ? 'Sửa khóa học' : 'Tạo khóa học'}</Typography><FormControl required><InputLabel id="course-category">Danh mục</InputLabel><Select labelId="course-category" label="Danh mục" value={courseCategoryId} onChange={(event) => setCourseCategoryId(event.target.value)}>{categories.map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}</Select></FormControl><TextField required label="Tiêu đề" value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} /><TextField label="Mô tả" multiline minRows={2} value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} /><TextField label="Ảnh thumbnail URL" value={courseForm.thumbnail} onChange={(event) => setCourseForm({ ...courseForm, thumbnail: event.target.value })} /><TextField required label="Giá" type="number" value={courseForm.price} onChange={(event) => setCourseForm({ ...courseForm, price: event.target.value })} /><TextField label="Tên giảng viên" value={courseForm.instructor_name} onChange={(event) => setCourseForm({ ...courseForm, instructor_name: event.target.value })} /><TextField label="Giới thiệu giảng viên" multiline minRows={2} value={courseForm.instructor_bio} onChange={(event) => setCourseForm({ ...courseForm, instructor_bio: event.target.value })} /><FormControl><InputLabel id="course-level">Cấp độ</InputLabel><Select labelId="course-level" label="Cấp độ" value={courseForm.level} onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value as CourseDraft['level'] })}><MenuItem value="beginner">Cơ bản</MenuItem><MenuItem value="intermediate">Trung cấp</MenuItem><MenuItem value="advanced">Nâng cao</MenuItem></Select></FormControl><FormControl><InputLabel id="course-status">Trạng thái</InputLabel><Select labelId="course-status" label="Trạng thái" value={courseForm.status} onChange={(event) => setCourseForm({ ...courseForm, status: event.target.value as CourseDraft['status'] })}><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="published">Xuất bản</MenuItem></Select></FormControl><Stack direction="row" spacing={1}><Button type="submit" variant="contained">{editingCourse ? 'Cập nhật' : 'Lưu khóa học'}</Button><Button onClick={() => { setEditingCourse(null); setCourseCategoryId(''); setCourseForm(blankCourse); setIsCourseEditorOpen(false); }}>Hủy</Button></Stack></Stack></CardContent></Card>}
              <Card sx={{ borderRadius: 3, minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {courses?.data.length ? <AdminDataTable<ApiCourse>
                  label="Danh sách khóa học"
                  rows={courses.data}
                  getRowKey={(course) => course.id}
                  columns={courseColumns}
                  minWidth={1120}
                  stickyFirstColumn
                  stickyLastColumn
                /> : <EmptyState title="Không có khóa học phù hợp." />}
              </CardContent></Card>
            {courses && courses.meta.last_page > 1 && <Pagination count={courses.meta.last_page} page={appliedCourseFilters.page} onChange={(_, page) => setAppliedCourseFilters((filters) => ({ ...filters, page }))} color="primary" sx={{ alignSelf: 'center' }} />}
          </Stack>}

          {tab === 'courses' && selectedCourse && <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(270px, .55fr) 1fr', gap: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Card sx={{ borderRadius: 3 }}><CardContent><Typography component="h2" variant="h6" fontWeight={800}>Chọn khóa học</Typography><Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>{courses?.data.map((course) => <Button key={course.id} onClick={() => void selectContent(course.id)} color="inherit" sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.5, fontWeight: selectedCourse?.id === course.id ? 800 : 400 }}>{course.title}</Button>)}</Stack></CardContent></Card>
            <Stack spacing={3}><>
              <Card component="form" onSubmit={submitLesson} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>{editingLessonId ? 'Sửa bài học' : `Thêm bài học cho ${selectedCourse.title}`}</Typography><TextField required label="Tiêu đề bài học" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} /><TextField required label="Video embed URL" value={lessonForm.video_url} onChange={(event) => setLessonForm({ ...lessonForm, video_url: event.target.value })} /><TextField label="Mô tả" multiline minRows={2} value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} /><TextField label="Thời lượng (giây)" type="number" value={lessonForm.duration} onChange={(event) => setLessonForm({ ...lessonForm, duration: event.target.value })} /><Stack direction="row" spacing={1}><Button type="submit" variant="contained">{editingLessonId ? 'Cập nhật bài học' : 'Thêm bài học'}</Button>{editingLessonId && <Button onClick={() => { setEditingLessonId(null); setLessonForm(blankLesson); }}>Hủy</Button>}</Stack></Stack></CardContent></Card>
              <Card sx={{ borderRadius: 3 }}><CardContent><Typography component="h2" variant="h6" fontWeight={800}>Thứ tự bài học</Typography><Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>{orderedLessons.map((lesson, index) => <Stack key={lesson.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 1.25 }}><Box sx={{ flexGrow: 1 }}><Typography fontWeight={700}>{lesson.position}. {lesson.title}</Typography><Typography variant="body2" color="text.secondary">{lesson.duration ? `${lesson.duration} giây` : 'Chưa có thời lượng'}</Typography></Box><Button size="small" disabled={index === 0} onClick={() => moveLesson(lesson.id, -1)} aria-label={`Di chuyển bài học ${lesson.position} lên`}>Lên</Button><Button size="small" disabled={index === orderedLessons.length - 1} onClick={() => moveLesson(lesson.id, 1)} aria-label={`Di chuyển bài học ${lesson.position} xuống`}>Xuống</Button><Button size="small" onClick={() => { setEditingLessonId(lesson.id); setLessonForm({ title: lesson.title, video_url: lesson.video_url, description: lesson.description ?? '', duration: lesson.duration === null ? '' : String(lesson.duration) }); }}>Sửa</Button><Button size="small" color="error" onClick={() => token && requestConfirmation('Xóa bài học', lesson.title, () => api.deleteLesson(token, lesson.id), 'Đã xóa bài học.', true)}>Xóa</Button></Stack>)}{orderedLessons.length === 0 && <EmptyState title="Khóa học chưa có bài học." />}</Stack></CardContent></Card>
              <Card component="form" onSubmit={submitQuiz} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>Bài kiểm tra cuối khóa</Typography><TextField required label="Tiêu đề bài kiểm tra" value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} /><TextField required label="Điểm đạt" type="number" inputProps={{ min: 1, max: 100 }} value={quizPassScore} onChange={(event) => setQuizPassScore(event.target.value)} /><TextField required label="Số lần làm tối đa" type="number" inputProps={{ min: 1, max: 20 }} value={quizMaxAttempts} onChange={(event) => setQuizMaxAttempts(event.target.value)} /><Button type="submit" variant="outlined">Lưu bài kiểm tra</Button></Stack></CardContent></Card>
              {selectedCourse.quiz && <Card component="form" onSubmit={submitQuestion} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography component="h2" variant="h6" fontWeight={800}>{editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</Typography>{editingQuestionId && <Button size="small" onClick={() => { setEditingQuestionId(null); setQuestionContent(''); setQuestionOptions(blankQuestionOptions); }}>Tạo câu hỏi mới</Button>}</Stack><Stack direction="row" spacing={1} flexWrap="wrap">{selectedCourse.quiz.questions.map((question) => <Button key={question.id} size="small" variant={question.id === editingQuestionId ? 'contained' : 'outlined'} onClick={() => chooseQuestion(question)}>Câu hỏi {question.id}</Button>)}</Stack><TextField required label="Câu hỏi" value={questionContent} onChange={(event) => setQuestionContent(event.target.value)} />{questionOptions.map((option, index) => <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}><TextField required fullWidth label={`Phương án ${index + 1}`} value={option.content} onChange={(event) => updateQuestionOption(index, { content: event.target.value })} /><RadioGroup row value={String(index)} onChange={() => markCorrectOption(index)}><FormControlLabel value={String(index)} control={<Radio checked={option.is_correct} />} label="Đáp án đúng" /></RadioGroup>{questionOptions.length > 2 && <Button color="error" onClick={() => setQuestionOptions((options) => options.filter((_, optionIndex) => optionIndex !== index))}>Xóa</Button>}</Stack>)}<Button onClick={() => setQuestionOptions((options) => [...options, { content: '', is_correct: false }])}>Thêm phương án</Button><Button type="submit" variant="contained">{editingQuestionId ? 'Cập nhật câu hỏi' : 'Lưu câu hỏi'}</Button>{editingQuestionId && <Button color="error" onClick={() => token && requestConfirmation('Xóa câu hỏi', questionContent || `Câu hỏi ${editingQuestionId}`, () => api.deleteQuestion(token, editingQuestionId), 'Đã xóa câu hỏi.', true)}>Xóa câu hỏi</Button>}</Stack></CardContent></Card>}
            </></Stack>
          </Box>}

          {tab === 'news' && <Stack spacing={2}>
            <Box component="section" role="region" aria-label="Bộ lọc tin tức" data-admin-toolbar="true" sx={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.1fr) minmax(220px, 1fr) auto auto', gap: 2, alignItems: 'stretch', p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <TextField label="Tìm tin tức" value={newsQuery} onChange={(event) => setNewsQuery(event.target.value)} fullWidth />
              <FormControl fullWidth>
                <InputLabel id="news-status-filter">Trạng thái tin tức</InputLabel>
                <Select labelId="news-status-filter" label="Trạng thái tin tức" value={newsStatus} onChange={(event) => setNewsStatus(event.target.value)}>
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="draft">Bản nháp</MenuItem>
                  <MenuItem value="published">Xuất bản</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={applyNewsFilters} sx={{ whiteSpace: 'nowrap' }}>Áp dụng</Button>
              <Button variant="outlined" onClick={() => { setEditingNews(null); setNewsForm(blankNews); setIsNewsEditorOpen(true); }} sx={{ whiteSpace: 'nowrap', minWidth: 132 }}>Tạo tin tức mới</Button>
            </Box>
            <Card sx={{ borderRadius: 3, minWidth: 0 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {news?.data.length ? <AdminDataTable<ApiNewsPost>
                  label="Danh sách tin tức"
                  rows={news.data}
                  getRowKey={(newsPost) => newsPost.id}
                  columns={[
                    { key: 'title', header: 'Tin tức', render: (newsPost) => <Box sx={{ minWidth: 220 }}><Typography fontWeight={750}>{newsPost.title}</Typography><Typography variant="body2" color="text.secondary">{newsPost.excerpt}</Typography></Box> },
                    { key: 'category', header: 'Danh mục', render: (newsPost) => newsPost.category },
                    { key: 'status', header: 'Trạng thái', render: (newsPost) => <StatusChip status={newsPost.status} /> },
                    { key: 'published', header: 'Ngày xuất bản', render: (newsPost) => newsPost.published_at ? new Date(newsPost.published_at).toLocaleDateString('vi-VN') : '—' },
                    { key: 'actions', header: 'Thao tác', align: 'right', render: (newsPost) => <Stack direction="row" spacing={0.5} justifyContent="flex-end"><Button size="small" onClick={() => beginNewsEdit(newsPost)}>Sửa</Button><Button size="small" variant="outlined" onClick={() => changeNewsStatus(newsPost)}>{newsPost.status === 'draft' ? 'Xuất bản' : 'Chuyển về nháp'}</Button><Button size="small" color="error" onClick={() => token && requestConfirmation('Xóa tin tức', newsPost.title, () => api.deleteNews(token, newsPost.id), 'Đã xóa tin tức.')}>Xóa</Button></Stack> },
                  ] satisfies AdminColumn<ApiNewsPost>[]}
                /> : <EmptyState title="Không có tin tức phù hợp." />}
              </CardContent>
            </Card>
            {news && news.meta.last_page > 1 && <Pagination count={news.meta.last_page} page={appliedNewsFilters.page} onChange={(_, page) => setAppliedNewsFilters((filters) => ({ ...filters, page }))} color="primary" sx={{ alignSelf: 'center' }} />}
            {isNewsEditorOpen && <Card component="form" onSubmit={submitNews} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography component="h2" variant="h6" fontWeight={800}>{editingNews ? 'Sửa tin tức' : 'Tạo tin tức'}</Typography>
                  <TextField id="news-title" required label="Tiêu đề" value={newsForm.title} onChange={(event) => setNewsForm({ ...newsForm, title: event.target.value })} />
                  <TextField id="news-category" required label="Danh mục" value={newsForm.category} onChange={(event) => setNewsForm({ ...newsForm, category: event.target.value })} />
                  <TextField id="news-excerpt" required label="Tóm tắt" multiline minRows={2} value={newsForm.excerpt} onChange={(event) => setNewsForm({ ...newsForm, excerpt: event.target.value })} />
                  <TextField id="news-content" required label="Nội dung" multiline minRows={6} value={newsForm.content} onChange={(event) => setNewsForm({ ...newsForm, content: event.target.value })} />
                  <TextField id="news-thumbnail" label="Ảnh thumbnail URL" value={newsForm.thumbnail} onChange={(event) => setNewsForm({ ...newsForm, thumbnail: event.target.value })} />
                  <FormControl>
                    <InputLabel id="news-editor-status">Trạng thái xuất bản</InputLabel>
                    <Select labelId="news-editor-status" label="Trạng thái xuất bản" value={newsForm.status} onChange={(event) => setNewsForm({ ...newsForm, status: event.target.value as NewsDraft['status'] })}>
                      <MenuItem value="draft">Bản nháp</MenuItem>
                      <MenuItem value="published">Xuất bản</MenuItem>
                    </Select>
                  </FormControl>
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained">Lưu tin tức</Button>
                    <Button onClick={() => { setEditingNews(null); setNewsForm(blankNews); setIsNewsEditorOpen(false); }}>Hủy</Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>}
          </Stack>}

          {tab === 'reviews' && <Stack spacing={2}>
            <Stack component="section" role="region" aria-label="Bộ lọc đánh giá" data-admin-toolbar="true" direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}><FormControl fullWidth><InputLabel id="review-status">Trạng thái</InputLabel><Select labelId="review-status" label="Trạng thái" value={reviewStatus} onChange={(event) => { setReviewStatus(event.target.value); setReviewPage(1); }}><MenuItem value="">Tất cả</MenuItem><MenuItem value="visible">Hiển thị</MenuItem><MenuItem value="hidden">Đã ẩn</MenuItem></Select></FormControl><Button variant="contained" onClick={() => void load('reviews', true)}>Áp dụng</Button></Stack>
            <Card sx={{ minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {reviews?.data.length ? <AdminDataTable<ApiReview>
                label="Danh sách đánh giá"
                rows={reviews.data}
                getRowKey={(review) => review.id}
                columns={[
                  { key: 'reviewer', header: 'Người đánh giá', render: (review) => <Typography fontWeight={750} sx={{ minWidth: 160 }}>{review.user.name}</Typography> },
                  { key: 'rating', header: 'Điểm', align: 'center', render: (review) => `${review.rating}/5` },
                  { key: 'comment', header: 'Nhận xét', render: (review) => <Typography variant="body2" sx={{ minWidth: 220, maxWidth: 360, overflowWrap: 'anywhere' }}>{review.comment || 'Không có nhận xét'}</Typography> },
                  { key: 'status', header: 'Trạng thái', render: (review) => <StatusChip status={review.status} /> },
                  { key: 'actions', header: 'Thao tác', align: 'right', render: (review) => <Stack direction="row" spacing={0.5} justifyContent="flex-end"><Button size="small" variant="outlined" onClick={() => token && void runMutation(() => api.updateReviewStatus(token, review.id, review.status === 'visible' ? 'hidden' : 'visible'), 'Đã cập nhật trạng thái đánh giá.')}>{review.status === 'visible' ? 'Ẩn' : 'Hiện'}</Button><Button size="small" color="error" onClick={() => token && requestConfirmation('Xóa đánh giá', `${review.user.name}, ${review.rating}/5`, () => api.deleteReview(token, review.id), 'Đã xóa đánh giá.')}>Xóa</Button></Stack> },
                ] satisfies AdminColumn<ApiReview>[]}
              /> : <EmptyState title="Không có đánh giá phù hợp." />}
            </CardContent></Card>
            {reviews && reviews.meta.last_page > 1 && <Pagination count={reviews.meta.last_page} page={reviewPage} onChange={(_, page) => setReviewPage(page)} color="primary" sx={{ alignSelf: 'center' }} />}
          </Stack>}
          </Stack>
          <Dialog
            open={Boolean(pendingConfirmation)}
            onClose={() => setPendingConfirmation(null)}
            aria-labelledby="admin-confirmation-title"
            maxWidth="xs"
            fullWidth
          >
            <Box sx={{ p: 3 }}>
              <Typography id="admin-confirmation-title" component="h2" variant="h6" fontWeight={800}>
                {pendingConfirmation ? `${pendingConfirmation.title} ${pendingConfirmation.recordName}?` : ''}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Hành động này không thể hoàn tác. Hãy kiểm tra đúng dữ liệu trước khi tiếp tục.
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button onClick={() => setPendingConfirmation(null)}>Hủy</Button>
                <Button color="error" variant="contained" onClick={confirmPendingAction}>Xác nhận xóa</Button>
              </Stack>
            </Box>
          </Dialog>
        </Stack>
      </AdminShell>
    </Box>
  );
}
