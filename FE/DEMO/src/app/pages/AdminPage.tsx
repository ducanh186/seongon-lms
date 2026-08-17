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
import { ApiError } from '../lib/api';
import type { ApiAdminAttempt, ApiAdminCertificateStatus, ApiAdminCourse, ApiAdminExam, ApiAdminLesson, ApiAdminQuestion, ApiAdminStats, ApiCategory, ApiCourse, ApiEnrollment, ApiNewsList, ApiNewsPost, ApiReview, ApiUser, Paginated } from '../lib/contracts';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { useAuth } from '../contexts/AuthContext';
import { AdminSectionHeader } from '../components/AdminSectionHeader';
import { StatusChip } from '../components/StatusChip';
import { AdminDataTable, type AdminColumn } from '../components/AdminDataTable';
import { AdminShell, type AdminSection } from '../components/AdminShell';
import { AdminOverview } from './AdminOverview';
import { AdminErdReadSection, type AdminErdReadSectionKey } from './admin/AdminErdReadSection';
import { adminRepositories } from '../data/repositories/adminRepositories';
import { DashboardService } from '../application/services/DashboardService';

const dashboardService = new DashboardService(adminRepositories.dashboard);

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
  category: string;
  page: number;
};

type AppliedAdminFilters = {
  q: string;
  status: string;
  page: number;
};

type OperationSection = 'lessons' | 'quizzes' | 'enrollments' | 'quizAttempts' | 'certificates';

type OperationFilters = {
  q: string;
  courseId: string;
  status: string;
  page: number;
};

const operationSections: OperationSection[] = ['lessons', 'quizzes', 'enrollments', 'quizAttempts', 'certificates'];

const createOperationFilterMap = (): Record<OperationSection, OperationFilters> => ({
  lessons: { q: '', courseId: '', status: '', page: 1 },
  quizzes: { q: '', courseId: '', status: '', page: 1 },
  enrollments: { q: '', courseId: '', status: '', page: 1 },
  quizAttempts: { q: '', courseId: '', status: '', page: 1 },
  certificates: { q: '', courseId: '', status: '', page: 1 },
});

const isOperationSection = (section: AdminSection): section is OperationSection => operationSections.includes(section as OperationSection);

const erdReadSections: AdminErdReadSectionKey[] = [
  'roles',
  'carts',
  'cartItems',
  'orders',
  'courseCategories',
  'learningProgress',
  'questions',
  'answers',
];

const isErdReadSection = (section: AdminSection): section is AdminErdReadSectionKey => erdReadSections.includes(section as AdminErdReadSectionKey);

const operationStatusOptions: Partial<Record<OperationSection, Array<{ value: string; label: string }>>> = {
  enrollments: [{ value: 'active', label: 'Đang học' }, { value: 'expired', label: 'Hết hạn' }],
  quizAttempts: [{ value: '1', label: 'Đạt' }, { value: '0', label: 'Chưa đạt' }],
  certificates: [
    { value: 'not_eligible', label: 'Chưa đủ điều kiện' },
    { value: 'eligible', label: 'Đủ điều kiện' },
    { value: 'issued', label: 'Đã cấp' },
  ],
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
  roles: { title: 'Quản lý vai trò', description: 'Đối chiếu vai trò hệ thống và số tài khoản đang sử dụng từng vai trò.' },
  users: { title: 'Quản lý học viên', description: 'Tìm kiếm, kiểm tra ghi danh và quản lý trạng thái tài khoản.' },
  carts: { title: 'Quản lý giỏ hàng', description: 'Theo dõi giỏ hàng hiện tại của học viên từ dữ liệu trong carts.' },
  cartItems: { title: 'Mục giỏ hàng', description: 'Đối chiếu từng khóa học đang nằm trong cart_items.' },
  orders: { title: 'Quản lý đơn hàng', description: 'Theo dõi đơn hàng, trạng thái thanh toán và quan hệ học viên - khóa học.' },
  categories: { title: 'Danh mục khóa học', description: 'Tổ chức chủ đề để học viên khám phá nội dung dễ dàng.' },
  courseCategories: { title: 'Gán danh mục khóa học', description: 'Đối chiếu quan hệ nhiều-nhiều từ course_categories.' },
  courses: { title: 'Quản lý khóa học', description: 'Quản lý nội dung, bài học, bài kiểm tra và trạng thái xuất bản.' },
  lessons: { title: 'Quản lý bài học', description: 'Tra cứu bài học theo khóa học và mở trình biên tập nội dung thống nhất.' },
  quizzes: { title: 'Quản lý bài kiểm tra', description: 'Theo dõi bài kiểm tra, câu hỏi và lượt làm từ dữ liệu thực.' },
  enrollments: { title: 'Quản lý ghi danh', description: 'Theo dõi quan hệ ghi danh giữa học viên và khóa học.' },
  learningProgress: { title: 'Tiến độ học tập', description: 'Theo dõi tiến độ từng bài học theo bản ghi learning_progress.' },
  questions: { title: 'Quản lý câu hỏi', description: 'Tra cứu câu hỏi theo bài kiểm tra và khóa học.' },
  answers: { title: 'Quản lý đáp án', description: 'Tra cứu đáp án, tính đúng sai và câu hỏi liên quan.' },
  quizAttempts: { title: 'Kết quả bài kiểm tra', description: 'Theo dõi điểm, kết quả đạt và lịch sử làm bài của học viên.' },
  certificates: { title: 'Quản lý chứng chỉ', description: 'Theo dõi điều kiện hoàn thành và chứng chỉ đã được cấp.' },
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
  const [adminLessons, setAdminLessons] = useState<Paginated<ApiAdminLesson> | null>(null);
  const [adminExams, setAdminExams] = useState<Paginated<ApiAdminExam> | null>(null);
  const [adminEnrollments, setAdminEnrollments] = useState<Paginated<ApiEnrollment> | null>(null);
  const [adminAttempts, setAdminAttempts] = useState<Paginated<ApiAdminAttempt> | null>(null);
  const [adminCertificates, setAdminCertificates] = useState<Paginated<ApiAdminCertificateStatus> | null>(null);
  const [reviews, setReviews] = useState<Paginated<ApiReview> | null>(null);
  const [news, setNews] = useState<ApiNewsList | null>(null);
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
  const [newsCategory, setNewsCategory] = useState('');
  const [appliedNewsFilters, setAppliedNewsFilters] = useState<AppliedNewsFilters>({ q: '', status: '', category: '', page: 1 });
  const [operationDrafts, setOperationDrafts] = useState<Record<OperationSection, OperationFilters>>(createOperationFilterMap);
  const [operationFilters, setOperationFilters] = useState<Record<OperationSection, OperationFilters>>(createOperationFilterMap);

  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCourse, setEditingCourse] = useState<ApiCourse | null>(null);
  const [courseCategoryIds, setCourseCategoryIds] = useState<number[]>([]);
  const [courseForm, setCourseForm] = useState<CourseDraft>(blankCourse);
  const [isCourseEditorOpen, setIsCourseEditorOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<ApiAdminCourse | null>(null);
  const [courseEnrollments, setCourseEnrollments] = useState<Paginated<ApiEnrollment> | null>(null);
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
        return `${section}:${appliedNewsFilters.q}:${appliedNewsFilters.status}:${appliedNewsFilters.category}:${appliedNewsFilters.page}`;
      default:
        return isOperationSection(section)
          ? `${section}:${operationFilters[section].q}:${operationFilters[section].courseId}:${operationFilters[section].status}:${operationFilters[section].page}`
          : section;
    }
  }, [appliedCourseFilters, appliedNewsFilters, appliedUserFilters, operationFilters, reviewPage, reviewStatus]);

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
          const nextStats = await dashboardService.getOverview(token);
          if (requestId !== loadRequestId.current) return;
          setStats(nextStats);
          break;
        }
        case 'users': {
          const nextUsers = await adminRepositories.users.list(token, {
            q: appliedUserFilters.q || undefined,
            status: appliedUserFilters.status || undefined,
            page: appliedUserFilters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setUsers(nextUsers);
          break;
        }
        case 'categories': {
          const nextCategories = await adminRepositories.categories.list(token);
          if (requestId !== loadRequestId.current) return;
          setCategories(nextCategories.data);
          break;
        }
        case 'courses': {
          const needsCategories = loadedKeyBySection.current.categories === undefined;
          const [nextCourses, nextCategories] = await Promise.all([
            adminRepositories.courses.list(token, {
              q: appliedCourseFilters.q || undefined,
              status: appliedCourseFilters.status || undefined,
              page: appliedCourseFilters.page,
            }),
            needsCategories ? adminRepositories.categories.list(token) : Promise.resolve(null),
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
          const nextReviews = await adminRepositories.reviews.list(token, { status: reviewStatus || undefined, page: reviewPage });
          if (requestId !== loadRequestId.current) return;
          setReviews(nextReviews);
          break;
        }
        case 'news': {
          const nextNews = await adminRepositories.news.list(token, {
            q: appliedNewsFilters.q || undefined,
            status: appliedNewsFilters.status || undefined,
            ...(appliedNewsFilters.category ? { category: appliedNewsFilters.category } : {}),
            page: appliedNewsFilters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setNews(nextNews);
          break;
        }
        case 'lessons': {
          const filters = operationFilters.lessons;
          const response = await adminRepositories.lessons.list(token, {
            q: filters.q || undefined,
            course_id: filters.courseId ? Number(filters.courseId) : undefined,
            page: filters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setAdminLessons(response);
          break;
        }
        case 'quizzes': {
          const filters = operationFilters.quizzes;
          const response = await adminRepositories.exams.list(token, {
            q: filters.q || undefined,
            course_id: filters.courseId ? Number(filters.courseId) : undefined,
            page: filters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setAdminExams(response);
          break;
        }
        case 'enrollments': {
          const filters = operationFilters.enrollments;
          const response = await adminRepositories.enrollments.list(token, {
            q: filters.q || undefined,
            course_id: filters.courseId ? Number(filters.courseId) : undefined,
            status: filters.status || undefined,
            page: filters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setAdminEnrollments(response);
          break;
        }
        case 'quizAttempts': {
          const filters = operationFilters.quizAttempts;
          const response = await adminRepositories.attempts.list(token, {
            q: filters.q || undefined,
            course_id: filters.courseId ? Number(filters.courseId) : undefined,
            passed: filters.status === '' ? undefined : Number(filters.status),
            page: filters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setAdminAttempts(response);
          break;
        }
        case 'certificates': {
          const filters = operationFilters.certificates;
          const response = await adminRepositories.certificates.list(token, {
            q: filters.q || undefined,
            course_id: filters.courseId ? Number(filters.courseId) : undefined,
            status: filters.status || undefined,
            page: filters.page,
          });
          if (requestId !== loadRequestId.current) return;
          setAdminCertificates(response);
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
  }, [appliedCourseFilters, appliedNewsFilters, appliedUserFilters, cacheKeyFor, operationFilters, reviewPage, reviewStatus, token]);

  useEffect(() => {
    if (isErdReadSection(tab)) {
      setLoading(false);
      setError(null);
      return;
    }

    void load(tab);
  }, [load, tab]);

  const loadCourseEnrollments = useCallback(async (courseId: number, page = 1) => {
    if (!token) return;
    const response = await adminRepositories.enrollments.list(token, { course_id: courseId, page });
    setCourseEnrollments(response);
  }, [token]);

  const loadCourseDetail = useCallback(async (courseId: number, enrollmentPage = 1) => {
    if (!token) return;
    const [response] = await Promise.all([
      adminRepositories.courses.get(token, courseId),
      loadCourseEnrollments(courseId, enrollmentPage),
    ]);
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
  }, [loadCourseEnrollments, token]);

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
      await loadCourseDetail(selectedCourse.id, courseEnrollments?.meta.current_page ?? 1);
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
      () => editingCategory ? adminRepositories.categories.update(token, editingCategory.id, body) : adminRepositories.categories.create(token, body),
      editingCategory ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục.',
    ).then(() => {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
    });
  };

  const submitCourse = (event: FormEvent) => {
    event.preventDefault();
    if (!token || courseCategoryIds.length === 0) return;
    const body = {
      ...courseForm,
      category_ids: courseCategoryIds,
      price: Number(courseForm.price),
      description: courseForm.description || null,
      thumbnail: courseForm.thumbnail || null,
      instructor_name: courseForm.instructor_name || null,
      instructor_bio: courseForm.instructor_bio || null,
    };
    void runMutation(
      () => adminRepositories.courses.save(token, body, editingCourse?.id),
      editingCourse ? 'Đã cập nhật khóa học.' : 'Đã tạo khóa học.',
    ).then((didSucceed) => {
      if (!didSucceed) return;
      setEditingCourse(null);
      setCourseCategoryIds([]);
      setCourseForm(blankCourse);
      setIsCourseEditorOpen(false);
    });
  };

  const beginCourseEdit = (course: ApiCourse) => {
    setEditingCourse(course);
    setCourseCategoryIds(course.categories?.map((category) => category.id) ?? [course.category_id]);
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
      () => adminRepositories.news.save(token, body, editingNews?.id),
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
      () => adminRepositories.news.save(token, body, newsPost.id),
      nextStatus === 'published' ? 'Đã xuất bản tin tức.' : 'Đã chuyển tin tức về bản nháp.',
    );
  };

  const applyNewsFilters = () => {
    setAppliedNewsFilters({ q: newsQuery, status: newsStatus, category: newsCategory, page: 1 });
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
      () => adminRepositories.courses.saveLesson(token, body, selectedCourse.id, editingLessonId ?? undefined),
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
      () => adminRepositories.courses.reorderLessons(token, selectedCourse.id, next.map((lesson) => lesson.id)),
      'Đã cập nhật thứ tự bài học.',
      true,
    );
  };

  const submitQuiz = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !selectedCourse) return;
    void runMutation(
      () => adminRepositories.courses.saveQuiz(token, selectedCourse.id, { title: quizTitle, pass_score: Number(quizPassScore), max_attempts: Number(quizMaxAttempts) }),
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
      () => editingQuestionId ? adminRepositories.courses.updateQuestion(token, editingQuestionId, body) : adminRepositories.courses.saveQuestion(token, selectedCourse.quiz!.id, body),
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

  const updateOperationDraft = (section: OperationSection, patch: Partial<OperationFilters>) => {
    setOperationDrafts((drafts) => ({
      ...drafts,
      [section]: { ...drafts[section], ...patch },
    }));
  };

  const applyOperationFilters = (section: OperationSection) => {
    setOperationFilters((filters) => ({
      ...filters,
      [section]: { ...operationDrafts[section], page: 1 },
    }));
  };

  const changeOperationPage = (section: OperationSection, page: number) => {
    setOperationFilters((filters) => ({
      ...filters,
      [section]: { ...filters[section], page },
    }));
  };

  const operationPages: Record<OperationSection, Paginated<unknown> | null> = {
    lessons: adminLessons,
    quizzes: adminExams,
    enrollments: adminEnrollments,
    quizAttempts: adminAttempts,
    certificates: adminCertificates,
  };

  const courseColumns: AdminColumn<ApiCourse>[] = [
    { key: 'id', header: 'ID', align: 'right', render: (course) => course.id },
    { key: 'course', header: 'Khóa học', render: (course) => <Typography fontWeight={750} sx={{ minWidth: 210 }}>{course.title}</Typography> },
    { key: 'categories', header: 'Danh mục', render: (course) => course.categories?.map((category) => category.name).join(', ') || course.category?.name || '—' },
    { key: 'level', header: 'Cấp độ', render: (course) => ({ beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }[course.level ?? 'beginner']) },
    { key: 'instructor', header: 'Giảng viên', render: (course) => course.instructor_name || '—' },
    { key: 'price', header: 'Học phí', align: 'right', render: (course) => `${Number(course.price).toLocaleString('vi-VN')} đ` },
    { key: 'lessons', header: 'Bài học', align: 'center', render: (course) => course.lessons_count ?? 0 },
    { key: 'exam', header: 'Bài kiểm tra', render: (course) => course.exam_exists ? 'Đã cấu hình' : 'Chưa có' },
    { key: 'enrollments', header: 'Ghi danh', align: 'center', render: (course) => course.enrollments_count ?? 0 },
    { key: 'rating', header: 'Đánh giá', align: 'center', render: (course) => course.rating == null ? '—' : `${course.rating}/5` },
    { key: 'status', header: 'Trạng thái', render: (course) => <StatusChip status={course.status} /> },
    { key: 'updated_at', header: 'Cập nhật', render: (course) => course.updated_at ? new Date(course.updated_at).toLocaleDateString('vi-VN') : '—' },
    { key: 'actions', header: 'Thao tác', align: 'right', render: (course) => <Stack direction="row" spacing={0.5} justifyContent="flex-end"><Button size="small" sx={{ minWidth: 'auto', px: 0.75, whiteSpace: 'nowrap' }} onClick={() => void selectContent(course.id)}>Nội dung</Button><Button size="small" sx={{ minWidth: 'auto', px: 0.75, whiteSpace: 'nowrap' }} onClick={() => beginCourseEdit(course)}>Sửa</Button><Button size="small" variant="outlined" sx={{ minWidth: 'auto', px: 0.75, whiteSpace: 'nowrap' }} onClick={() => token && void runMutation(() => adminRepositories.courses.publish(token, course.id, course.status === 'published' ? 'draft' : 'published'), 'Đã cập nhật trạng thái xuất bản.')}>{course.status === 'published' ? 'Ẩn' : 'Xuất bản'}</Button><Button size="small" color="error" sx={{ minWidth: 'auto', px: 0.75, whiteSpace: 'nowrap' }} onClick={() => token && requestConfirmation('Xóa khóa học', course.title, () => adminRepositories.courses.remove(token, course.id), 'Đã xóa khóa học.')}>Xóa</Button></Stack> },
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

          {token && isErdReadSection(tab) && (
            <AdminErdReadSection
              key={tab}
              section={tab}
              token={token}
              onOpenCourse={(courseId) => void selectContent(courseId)}
            />
          )}

          {isOperationSection(tab) && <Stack spacing={2}>
            <Box component="section" role="region" aria-label={`Bộ lọc ${adminSectionCopy[tab].title.toLowerCase()}`} data-admin-toolbar="true" sx={{ display: 'grid', gridTemplateColumns: operationStatusOptions[tab] ? 'minmax(240px, 1fr) minmax(150px, .45fr) minmax(180px, .55fr) auto' : 'minmax(240px, 1fr) minmax(150px, .45fr) auto', gap: 2, alignItems: 'stretch', p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <TextField label="Tìm kiếm" value={operationDrafts[tab].q} onChange={(event) => updateOperationDraft(tab, { q: event.target.value })} fullWidth />
              <TextField label="Course ID" type="number" inputProps={{ min: 1 }} value={operationDrafts[tab].courseId} onChange={(event) => updateOperationDraft(tab, { courseId: event.target.value })} fullWidth />
              {operationStatusOptions[tab] && <FormControl fullWidth>
                <InputLabel id={`${tab}-status-filter`}>Trạng thái</InputLabel>
                <Select labelId={`${tab}-status-filter`} label="Trạng thái" value={operationDrafts[tab].status} onChange={(event) => updateOperationDraft(tab, { status: event.target.value })}>
                  <MenuItem value="">Tất cả</MenuItem>
                  {operationStatusOptions[tab]?.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>}
              <Button variant="contained" onClick={() => applyOperationFilters(tab)}>Áp dụng</Button>
            </Box>

            {loading && <PageSkeleton rows={4} />}

            {!loading && tab === 'lessons' && <Card sx={{ minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {adminLessons?.data.length ? <AdminDataTable<ApiAdminLesson>
                label="Danh sách bài học"
                rows={adminLessons.data}
                getRowKey={(lesson) => lesson.id}
                minWidth={1250}
                stickyFirstColumn
                stickyLastColumn
                columns={[
                  { key: 'id', header: 'ID', align: 'right', render: (lesson) => lesson.id },
                  { key: 'lesson', header: 'Bài học', render: (lesson) => <Typography fontWeight={750} sx={{ minWidth: 220 }}>{lesson.title}</Typography> },
                  { key: 'course', header: 'Khóa học', render: (lesson) => lesson.course.title },
                  { key: 'categories', header: 'Danh mục', render: (lesson) => lesson.course.categories?.map((category) => category.name).join(', ') || lesson.course.category?.name || '—' },
                  { key: 'position', header: 'Thứ tự', align: 'center', render: (lesson) => lesson.position },
                  { key: 'duration', header: 'Thời lượng', render: (lesson) => lesson.duration ? `${Math.ceil(lesson.duration / 60)} phút` : '—' },
                  { key: 'progress', header: 'Đã bắt đầu', align: 'center', render: (lesson) => lesson.learning_progress_count },
                  { key: 'updated', header: 'Cập nhật', render: (lesson) => new Date(lesson.updated_at).toLocaleDateString('vi-VN') },
                  { key: 'actions', header: 'Thao tác', align: 'right', render: (lesson) => <Button size="small" onClick={() => void selectContent(lesson.course_id)} aria-label="Mở nội dung khóa học">Mở nội dung</Button> },
                ] satisfies AdminColumn<ApiAdminLesson>[]}
              /> : <EmptyState title="Không có bài học phù hợp." />}
            </CardContent></Card>}

            {!loading && tab === 'quizzes' && <Card sx={{ minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {adminExams?.data.length ? <AdminDataTable<ApiAdminExam>
                label="Danh sách bài kiểm tra"
                rows={adminExams.data}
                getRowKey={(exam) => exam.id}
                minWidth={1150}
                stickyFirstColumn
                stickyLastColumn
                columns={[
                  { key: 'id', header: 'ID', align: 'right', render: (exam) => exam.id },
                  { key: 'exam', header: 'Bài kiểm tra', render: (exam) => <Typography fontWeight={750} sx={{ minWidth: 210 }}>{exam.title}</Typography> },
                  { key: 'course', header: 'Khóa học', render: (exam) => exam.course.title },
                  { key: 'passScore', header: 'Điểm đạt', align: 'center', render: (exam) => exam.pass_score },
                  { key: 'maxAttempts', header: 'Lượt tối đa', align: 'center', render: (exam) => exam.max_attempts },
                  { key: 'questions', header: 'Câu hỏi', align: 'center', render: (exam) => exam.questions_count },
                  { key: 'attempts', header: 'Lượt làm', align: 'center', render: (exam) => exam.attempts_count },
                  { key: 'updated', header: 'Cập nhật', render: (exam) => new Date(exam.updated_at).toLocaleDateString('vi-VN') },
                  { key: 'actions', header: 'Thao tác', align: 'right', render: (exam) => <Button size="small" onClick={() => void selectContent(exam.course_id)} aria-label="Mở nội dung khóa học">Mở nội dung</Button> },
                ] satisfies AdminColumn<ApiAdminExam>[]}
              /> : <EmptyState title="Không có bài kiểm tra phù hợp." />}
            </CardContent></Card>}

            {!loading && tab === 'enrollments' && <Card sx={{ minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {adminEnrollments?.data.length ? <AdminDataTable<ApiEnrollment>
                label="Danh sách ghi danh"
                rows={adminEnrollments.data}
                getRowKey={(enrollment) => enrollment.id}
                minWidth={1180}
                columns={[
                  { key: 'id', header: 'ID', align: 'right', render: (enrollment) => enrollment.id },
                  { key: 'student', header: 'Học viên', render: (enrollment) => <Box sx={{ minWidth: 190 }}><Typography fontWeight={750}>{enrollment.user?.name ?? `#${enrollment.user_id}`}</Typography><Typography variant="body2" color="text.secondary">{enrollment.user?.email ?? '—'}</Typography></Box> },
                  { key: 'course', header: 'Khóa học', render: (enrollment) => enrollment.course?.title ?? `#${enrollment.course_id}` },
                  { key: 'status', header: 'Trạng thái', render: (enrollment) => enrollment.status === 'active' ? 'Đang học' : 'Hết hạn' },
                  { key: 'enrolled', header: 'Ghi danh', render: (enrollment) => new Date(enrollment.enrolled_at).toLocaleDateString('vi-VN') },
                  { key: 'expires', header: 'Hết hạn', render: (enrollment) => new Date(enrollment.expires_at).toLocaleDateString('vi-VN') },
                  { key: 'order', header: 'Order ID', align: 'right', render: (enrollment) => enrollment.order_id ?? '—' },
                  { key: 'updated', header: 'Cập nhật', render: (enrollment) => enrollment.updated_at ? new Date(enrollment.updated_at).toLocaleDateString('vi-VN') : '—' },
                ] satisfies AdminColumn<ApiEnrollment>[]}
              /> : <EmptyState title="Không có ghi danh phù hợp." />}
            </CardContent></Card>}

            {!loading && tab === 'quizAttempts' && <Card sx={{ minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {adminAttempts?.data.length ? <AdminDataTable<ApiAdminAttempt>
                label="Danh sách kết quả bài kiểm tra"
                rows={adminAttempts.data}
                getRowKey={(attempt) => attempt.id}
                minWidth={1320}
                columns={[
                  { key: 'id', header: 'ID', align: 'right', render: (attempt) => attempt.id },
                  { key: 'student', header: 'Học viên', render: (attempt) => attempt.user.name },
                  { key: 'course', header: 'Khóa học', render: (attempt) => attempt.course.title },
                  { key: 'exam', header: 'Bài kiểm tra', render: (attempt) => attempt.exam.title },
                  { key: 'attempt', header: 'Lần làm', align: 'center', render: (attempt) => attempt.attempt_number },
                  { key: 'score', header: 'Điểm', align: 'center', render: (attempt) => attempt.score },
                  { key: 'correct', header: 'Đúng/Sai', align: 'center', render: (attempt) => `${attempt.correct_count}/${attempt.wrong_count}` },
                  { key: 'passed', header: 'Kết quả', render: (attempt) => attempt.passed ? 'Đạt' : 'Chưa đạt' },
                  { key: 'submitted', header: 'Nộp bài', render: (attempt) => new Date(attempt.submitted_at).toLocaleString('vi-VN') },
                ] satisfies AdminColumn<ApiAdminAttempt>[]}
              /> : <EmptyState title="Không có kết quả bài kiểm tra phù hợp." />}
            </CardContent></Card>}

            {!loading && tab === 'certificates' && <Card sx={{ minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {adminCertificates?.data.length ? <AdminDataTable<ApiAdminCertificateStatus>
                label="Danh sách chứng chỉ"
                rows={adminCertificates.data}
                getRowKey={(record) => record.enrollment_id}
                minWidth={1450}
                columns={[
                  { key: 'enrollment', header: 'Enrollment ID', align: 'right', render: (record) => record.enrollment_id },
                  { key: 'student', header: 'Học viên', render: (record) => <Box sx={{ minWidth: 180 }}><Typography fontWeight={750}>{record.user.name}</Typography><Typography variant="body2" color="text.secondary">{record.user.email}</Typography></Box> },
                  { key: 'course', header: 'Khóa học', render: (record) => record.course.title },
                  { key: 'lessons', header: 'Bài học hoàn thành', align: 'center', render: (record) => `${record.completed_lessons}/${record.total_lessons}` },
                  { key: 'attempt', header: 'Lượt đạt gần nhất', render: (record) => record.latest_passing_attempt ? `#${record.latest_passing_attempt.id} · ${record.latest_passing_attempt.score} điểm` : '—' },
                  { key: 'eligibility', header: 'Điều kiện', render: (record) => record.eligible ? 'Đủ điều kiện' : 'Chưa đủ điều kiện' },
                  { key: 'code', header: 'Mã chứng chỉ', render: (record) => record.certificate?.certificate_code ?? '—' },
                  { key: 'issued', header: 'Ngày cấp', render: (record) => record.certificate ? new Date(record.certificate.issued_at).toLocaleDateString('vi-VN') : '—' },
                  { key: 'state', header: 'Trạng thái', render: (record) => ({ not_eligible: 'Chưa đủ điều kiện', eligible: 'Đủ điều kiện', issued: 'Đã cấp' }[record.state]) },
                ] satisfies AdminColumn<ApiAdminCertificateStatus>[]}
              /> : <EmptyState title="Không có dữ liệu chứng chỉ phù hợp." />}
            </CardContent></Card>}

            {operationPages[tab] && operationPages[tab]!.meta.last_page > 1 && <Pagination count={operationPages[tab]!.meta.last_page} page={operationFilters[tab].page} onChange={(_, page) => changeOperationPage(tab, page)} color="primary" sx={{ alignSelf: 'center' }} />}
          </Stack>}

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
                  { key: 'actions', header: 'Thao tác', align: 'right', render: (user) => <Button size="small" variant="outlined" color={user.status === 'active' ? 'error' : 'primary'} onClick={() => token && void runMutation(() => adminRepositories.users.updateStatus(token, user.id, user.status === 'active' ? 'locked' : 'active'), 'Đã cập nhật trạng thái tài khoản.')}>{user.status === 'active' ? 'Khóa' : 'Kích hoạt'}</Button> },
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
            <Card sx={{ borderRadius: 3 }}><CardContent><Stack divider={<Divider flexItem />}>{categories.map((category) => <Stack key={category.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 1.25 }}><Box sx={{ flexGrow: 1 }}><Typography fontWeight={700}>{category.name}</Typography><Typography variant="body2" color="text.secondary">{category.description || 'Chưa có mô tả'}</Typography></Box><Button size="small" onClick={() => { setEditingCategory(category); setCategoryName(category.name); setCategoryDescription(category.description ?? ''); }}>Sửa</Button><Button color="error" size="small" onClick={() => token && requestConfirmation('Xóa danh mục', category.name, () => adminRepositories.categories.remove(token, category.id), 'Đã xóa danh mục.')}>Xóa</Button></Stack>)}{categories.length === 0 && <EmptyState title="Chưa có danh mục." />}</Stack></CardContent></Card>
          </Box>}

          {tab === 'courses' && <Stack spacing={2}>
            <Box component="section" role="region" aria-label="Bộ lọc khóa học" data-admin-toolbar="true" sx={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, .7fr) auto auto', gap: 2, alignItems: 'stretch', p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}><TextField label="Tìm khóa học" value={courseQuery} onChange={(event) => setCourseQuery(event.target.value)} fullWidth /><FormControl fullWidth><InputLabel id="course-status-filter">Trạng thái</InputLabel><Select labelId="course-status-filter" label="Trạng thái" value={courseStatus} onChange={(event) => setCourseStatus(event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="published">Xuất bản</MenuItem></Select></FormControl><Button variant="contained" onClick={() => setAppliedCourseFilters({ q: courseQuery, status: courseStatus, page: 1 })} sx={{ whiteSpace: 'nowrap' }}>Áp dụng</Button><Button variant="outlined" onClick={() => { setEditingCourse(null); setCourseCategoryIds([]); setCourseForm(blankCourse); setIsCourseEditorOpen(true); }} sx={{ whiteSpace: 'nowrap' }}>Tạo khóa học mới</Button></Box>
            {isCourseEditorOpen && <Card component="form" onSubmit={submitCourse} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>{editingCourse ? 'Sửa khóa học' : 'Tạo khóa học'}</Typography><FormControl required><InputLabel id="course-category">Danh mục</InputLabel><Select multiple labelId="course-category" label="Danh mục" value={courseCategoryIds} onChange={(event) => { const value = event.target.value; setCourseCategoryIds(typeof value === 'string' ? value.split(',').map(Number) : value); }} renderValue={(selected) => selected.map((id) => categories.find((category) => category.id === id)?.name ?? id).join(', ')}>{categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</Select></FormControl><TextField required label="Tiêu đề" value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} /><TextField label="Mô tả" multiline minRows={2} value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} /><TextField label="Ảnh thumbnail URL" value={courseForm.thumbnail} onChange={(event) => setCourseForm({ ...courseForm, thumbnail: event.target.value })} /><TextField required label="Giá" type="number" value={courseForm.price} onChange={(event) => setCourseForm({ ...courseForm, price: event.target.value })} /><TextField label="Tên giảng viên" value={courseForm.instructor_name} onChange={(event) => setCourseForm({ ...courseForm, instructor_name: event.target.value })} /><TextField label="Giới thiệu giảng viên" multiline minRows={2} value={courseForm.instructor_bio} onChange={(event) => setCourseForm({ ...courseForm, instructor_bio: event.target.value })} /><FormControl><InputLabel id="course-level">Cấp độ</InputLabel><Select labelId="course-level" label="Cấp độ" value={courseForm.level} onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value as CourseDraft['level'] })}><MenuItem value="beginner">Cơ bản</MenuItem><MenuItem value="intermediate">Trung cấp</MenuItem><MenuItem value="advanced">Nâng cao</MenuItem></Select></FormControl><FormControl><InputLabel id="course-status">Trạng thái</InputLabel><Select labelId="course-status" label="Trạng thái" value={courseForm.status} onChange={(event) => setCourseForm({ ...courseForm, status: event.target.value as CourseDraft['status'] })}><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="published">Xuất bản</MenuItem></Select></FormControl><Stack direction="row" spacing={1}><Button type="submit" variant="contained">{editingCourse ? 'Cập nhật' : 'Lưu khóa học'}</Button><Button onClick={() => { setEditingCourse(null); setCourseCategoryIds([]); setCourseForm(blankCourse); setIsCourseEditorOpen(false); }}>Hủy</Button></Stack></Stack></CardContent></Card>}
              <Card sx={{ borderRadius: 3, minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {courses?.data.length ? <AdminDataTable<ApiCourse>
                  label="Danh sách khóa học"
                  rows={courses.data}
                  getRowKey={(course) => course.id}
                  columns={courseColumns}
                  minWidth={1760}
                  stickyFirstColumn
                  stickyLastColumn
                /> : <EmptyState title="Không có khóa học phù hợp." />}
              </CardContent></Card>
            {courses && courses.meta.last_page > 1 && <Pagination count={courses.meta.last_page} page={appliedCourseFilters.page} onChange={(_, page) => setAppliedCourseFilters((filters) => ({ ...filters, page }))} color="primary" sx={{ alignSelf: 'center' }} />}
          </Stack>}

          {tab === 'courses' && selectedCourse && <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(270px, .55fr) 1fr', gap: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Card sx={{ borderRadius: 3 }}><CardContent><Typography component="h2" variant="h6" fontWeight={800}>Chọn khóa học</Typography><Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>{courses?.data.map((course) => <Button key={course.id} onClick={() => void selectContent(course.id)} color="inherit" sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.5, fontWeight: selectedCourse?.id === course.id ? 800 : 400 }}>{course.title}</Button>)}</Stack></CardContent></Card>
            <Stack spacing={3}><>
              <Card sx={{ borderRadius: 3 }}><CardContent><Typography component="h2" variant="h6" fontWeight={800}>Tổng quan khóa học</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5, mt: 2 }}><Typography><strong>ID:</strong> {selectedCourse.id}</Typography><Typography><strong>Trạng thái:</strong> {selectedCourse.status === 'published' ? 'Xuất bản' : 'Bản nháp'}</Typography><Typography><strong>Danh mục:</strong> {selectedCourse.categories?.map((category) => category.name).join(', ') || selectedCourse.category?.name || '—'}</Typography><Typography><strong>Ghi danh:</strong> {selectedCourse.enrollments_count ?? 0}</Typography><Typography><strong>Bài học:</strong> {selectedCourse.lessons_count ?? selectedCourse.lessons?.length ?? 0}</Typography><Typography><strong>Bài kiểm tra:</strong> {selectedCourse.quiz ? 'Đã cấu hình' : 'Chưa có'}</Typography></Box></CardContent></Card>
              <Card sx={{ borderRadius: 3 }}><CardContent><Typography component="h2" variant="h6" fontWeight={800}>Danh sách ghi danh</Typography><Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>{courseEnrollments?.data.map((enrollment) => <Stack key={enrollment.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" sx={{ py: 1.25 }}><Box><Typography fontWeight={700}>{enrollment.user?.name ?? `Học viên #${enrollment.user_id}`}</Typography><Typography variant="body2" color="text.secondary">{enrollment.user?.email ?? '—'}</Typography></Box><Box sx={{ textAlign: { sm: 'right' } }}><Typography variant="body2">{enrollment.status === 'active' ? 'Đang học' : 'Hết hạn'}</Typography><Typography variant="caption" color="text.secondary">Ghi danh {new Date(enrollment.enrolled_at).toLocaleDateString('vi-VN')}</Typography></Box></Stack>)}{courseEnrollments?.data.length === 0 && <EmptyState title="Khóa học chưa có ghi danh." />}</Stack>{courseEnrollments && courseEnrollments.meta.last_page > 1 && <Pagination count={courseEnrollments.meta.last_page} page={courseEnrollments.meta.current_page} onChange={(_, page) => void loadCourseEnrollments(selectedCourse.id, page)} color="primary" sx={{ mt: 2 }} />}</CardContent></Card>
              <Card component="form" onSubmit={submitLesson} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>{editingLessonId ? 'Sửa bài học' : `Thêm bài học cho ${selectedCourse.title}`}</Typography><TextField required label="Tiêu đề bài học" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} /><TextField required label="Video embed URL" value={lessonForm.video_url} onChange={(event) => setLessonForm({ ...lessonForm, video_url: event.target.value })} /><TextField label="Mô tả" multiline minRows={2} value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} /><TextField label="Thời lượng (giây)" type="number" value={lessonForm.duration} onChange={(event) => setLessonForm({ ...lessonForm, duration: event.target.value })} /><Stack direction="row" spacing={1}><Button type="submit" variant="contained">{editingLessonId ? 'Cập nhật bài học' : 'Thêm bài học'}</Button>{editingLessonId && <Button onClick={() => { setEditingLessonId(null); setLessonForm(blankLesson); }}>Hủy</Button>}</Stack></Stack></CardContent></Card>
              <Card sx={{ borderRadius: 3 }}><CardContent><Typography component="h2" variant="h6" fontWeight={800}>Thứ tự bài học</Typography><Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>{orderedLessons.map((lesson, index) => <Stack key={lesson.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 1.25 }}><Box sx={{ flexGrow: 1 }}><Typography fontWeight={700}>{lesson.position}. {lesson.title}</Typography><Typography variant="body2" color="text.secondary">{lesson.duration ? `${lesson.duration} giây` : 'Chưa có thời lượng'}</Typography></Box><Button size="small" disabled={index === 0} onClick={() => moveLesson(lesson.id, -1)} aria-label={`Di chuyển bài học ${lesson.position} lên`}>Lên</Button><Button size="small" disabled={index === orderedLessons.length - 1} onClick={() => moveLesson(lesson.id, 1)} aria-label={`Di chuyển bài học ${lesson.position} xuống`}>Xuống</Button><Button size="small" onClick={() => { setEditingLessonId(lesson.id); setLessonForm({ title: lesson.title, video_url: lesson.video_url, description: lesson.description ?? '', duration: lesson.duration === null ? '' : String(lesson.duration) }); }}>Sửa</Button><Button size="small" color="error" onClick={() => token && requestConfirmation('Xóa bài học', lesson.title, () => adminRepositories.courses.removeLesson(token, lesson.id), 'Đã xóa bài học.', true)}>Xóa</Button></Stack>)}{orderedLessons.length === 0 && <EmptyState title="Khóa học chưa có bài học." />}</Stack></CardContent></Card>
              <Card component="form" onSubmit={submitQuiz} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>Bài kiểm tra cuối khóa</Typography><TextField required label="Tiêu đề bài kiểm tra" value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} /><TextField required label="Điểm đạt" type="number" inputProps={{ min: 1, max: 100 }} value={quizPassScore} onChange={(event) => setQuizPassScore(event.target.value)} /><TextField required label="Số lần làm tối đa" type="number" inputProps={{ min: 1, max: 20 }} value={quizMaxAttempts} onChange={(event) => setQuizMaxAttempts(event.target.value)} /><Button type="submit" variant="outlined">Lưu bài kiểm tra</Button></Stack></CardContent></Card>
              {selectedCourse.quiz && <Card component="form" onSubmit={submitQuestion} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography component="h2" variant="h6" fontWeight={800}>{editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</Typography>{editingQuestionId && <Button size="small" onClick={() => { setEditingQuestionId(null); setQuestionContent(''); setQuestionOptions(blankQuestionOptions); }}>Tạo câu hỏi mới</Button>}</Stack><Stack direction="row" spacing={1} flexWrap="wrap">{selectedCourse.quiz.questions.map((question) => <Button key={question.id} size="small" variant={question.id === editingQuestionId ? 'contained' : 'outlined'} onClick={() => chooseQuestion(question)}>Câu hỏi {question.id}</Button>)}</Stack><TextField required label="Câu hỏi" value={questionContent} onChange={(event) => setQuestionContent(event.target.value)} />{questionOptions.map((option, index) => <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}><TextField required fullWidth label={`Phương án ${index + 1}`} value={option.content} onChange={(event) => updateQuestionOption(index, { content: event.target.value })} /><RadioGroup row value={String(index)} onChange={() => markCorrectOption(index)}><FormControlLabel value={String(index)} control={<Radio checked={option.is_correct} />} label="Đáp án đúng" /></RadioGroup>{questionOptions.length > 2 && <Button color="error" onClick={() => setQuestionOptions((options) => options.filter((_, optionIndex) => optionIndex !== index))}>Xóa</Button>}</Stack>)}<Button onClick={() => setQuestionOptions((options) => [...options, { content: '', is_correct: false }])}>Thêm phương án</Button><Button type="submit" variant="contained">{editingQuestionId ? 'Cập nhật câu hỏi' : 'Lưu câu hỏi'}</Button>{editingQuestionId && <Button color="error" onClick={() => token && requestConfirmation('Xóa câu hỏi', questionContent || `Câu hỏi ${editingQuestionId}`, () => adminRepositories.courses.removeQuestion(token, editingQuestionId), 'Đã xóa câu hỏi.', true)}>Xóa câu hỏi</Button>}</Stack></CardContent></Card>}
            </></Stack>
          </Box>}

          {tab === 'news' && <Stack spacing={2}>
            <Box component="section" role="region" aria-label="Bộ lọc tin tức" data-admin-toolbar="true" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(240px, 1.1fr) minmax(180px, .8fr) minmax(180px, .8fr) auto auto' }, gap: 2, alignItems: 'stretch', p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <TextField label="Tìm tin tức" value={newsQuery} onChange={(event) => setNewsQuery(event.target.value)} fullWidth />
              <FormControl fullWidth>
                <InputLabel id="news-status-filter">Trạng thái tin tức</InputLabel>
                <Select labelId="news-status-filter" label="Trạng thái tin tức" value={newsStatus} onChange={(event) => setNewsStatus(event.target.value)}>
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="draft">Bản nháp</MenuItem>
                  <MenuItem value="published">Xuất bản</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="news-category-filter">Danh mục tin tức</InputLabel>
                <Select labelId="news-category-filter" label="Danh mục tin tức" value={newsCategory} onChange={(event) => setNewsCategory(event.target.value)}>
                  <MenuItem value="">Tất cả</MenuItem>
                  {news?.categories?.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
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
                    { key: 'title', header: 'Tin tức', render: (newsPost) => <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 320 }}>{newsPost.thumbnail && <Box component="img" src={newsPost.thumbnail} alt={newsPost.title} sx={{ width: 72, height: 48, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />}<Box><Typography fontWeight={750}>{newsPost.title}</Typography><Typography variant="body2" color="text.secondary">{newsPost.excerpt}</Typography></Box></Stack> },
                    { key: 'category', header: 'Danh mục', render: (newsPost) => newsPost.category },
                    { key: 'status', header: 'Trạng thái', render: (newsPost) => <StatusChip status={newsPost.status} /> },
                    { key: 'published', header: 'Ngày xuất bản', render: (newsPost) => newsPost.published_at ? new Date(newsPost.published_at).toLocaleDateString('vi-VN') : '—' },
                    { key: 'updated', header: 'Cập nhật', render: (newsPost) => new Date(newsPost.updated_at).toLocaleDateString('vi-VN') },
                    { key: 'actions', header: 'Thao tác', align: 'right', render: (newsPost) => <Stack direction="row" spacing={0.5} justifyContent="flex-end"><Button size="small" onClick={() => beginNewsEdit(newsPost)}>Sửa</Button><Button size="small" variant="outlined" onClick={() => changeNewsStatus(newsPost)}>{newsPost.status === 'draft' ? 'Xuất bản' : 'Chuyển về nháp'}</Button><Button size="small" color="error" onClick={() => token && requestConfirmation('Xóa tin tức', newsPost.title, () => adminRepositories.news.remove(token, newsPost.id), 'Đã xóa tin tức.')}>Xóa</Button></Stack> },
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
                  { key: 'actions', header: 'Thao tác', align: 'right', render: (review) => <Stack direction="row" spacing={0.5} justifyContent="flex-end"><Button size="small" variant="outlined" onClick={() => token && void runMutation(() => adminRepositories.reviews.updateStatus(token, review.id, review.status === 'visible' ? 'hidden' : 'visible'), 'Đã cập nhật trạng thái đánh giá.')}>{review.status === 'visible' ? 'Ẩn' : 'Hiện'}</Button><Button size="small" color="error" onClick={() => token && requestConfirmation('Xóa đánh giá', `${review.user.name}, ${review.rating}/5`, () => adminRepositories.reviews.remove(token, review.id), 'Đã xóa đánh giá.')}>Xóa</Button></Stack> },
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
