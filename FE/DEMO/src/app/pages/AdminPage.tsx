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
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Pagination,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  StepButton,
  Stepper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ApiError, resolveMaterialUrl } from '../lib/api';
import type { ApiAdminAttempt, ApiAdminCertificateStatus, ApiAdminCourse, ApiAdminExam, ApiAdminLesson, ApiAdminQuestion, ApiAdminStats, ApiCategory, ApiCourse, ApiEnrollment, ApiNewsList, ApiNewsPost, ApiReview, ApiUser, ApiUserRecord, Paginated } from '../lib/contracts';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { useAuth } from '../contexts/AuthContext';
import { AdminSectionHeader } from '../components/AdminSectionHeader';
import { StatusChip } from '../components/StatusChip';
import { AdminDataTable, type AdminColumn } from '../components/AdminDataTable';
import { AdminFilterToolbar } from '../components/AdminFilterToolbar';
import { AdminShell, type AdminSection } from '../components/AdminShell';
import { AdminOverview } from './AdminOverview';
import { RichTextEditor } from '../components/RichTextEditor';
import { PaymentSettingsPanel } from './admin/PaymentSettingsPanel';
import { NewsCatalogManager } from './admin/NewsCatalogManager';
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
  role: string;
  page: number;
};

type CourseAdminFilters = {
  categoryId: string;
  courseId: string;
  q: string;
  status: string;
  price: string;
  publishedOn: string;
  page: number;
};

const blankCourseFilters: CourseAdminFilters = {
  categoryId: '', courseId: '', q: '', status: '', price: '', publishedOn: '', page: 1,
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
  price: '299000',
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
  overview: { title: 'Tổng quan vận hành', description: '' },
  paymentSettings: { title: 'Cài đặt thanh toán', description: 'Quản lý phương thức thanh toán và tài khoản nhận tiền.' },
  roles: { title: 'Quản lý vai trò', description: 'Đối chiếu vai trò hệ thống và số tài khoản đang sử dụng từng vai trò.' },
  users: { title: 'Quản lý tài khoản', description: '' },
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

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
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
  const [teachers, setTeachers] = useState<ApiUser[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [categoryTab, setCategoryTab] = useState<'courses' | 'news'>('courses');
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
  const [appliedUserFilters, setAppliedUserFilters] = useState<AppliedAdminFilters>({ q: '', status: '', role: '', page: 1 });
  const [userRole, setUserRole] = useState('');
  const [courseFilters, setCourseFilters] = useState<CourseAdminFilters>(blankCourseFilters);
  const [appliedCourseFilters, setAppliedCourseFilters] = useState<CourseAdminFilters>(blankCourseFilters);
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
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false);
  const [isCourseEditorOpen, setIsCourseEditorOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<ApiAdminCourse | null>(null);
  // Course Detail must reach Enrollments (acceptance checklist §3.4) with the
  // per-course progress and certificate columns the global section lacks.
  const [courseEnrollments, setCourseEnrollments] = useState<Paginated<ApiEnrollment> | null>(null);
  const [courseReviews, setCourseReviews] = useState<Paginated<ApiReview> | null>(null);
  const [courseStep, setCourseStep] = useState(0);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonDraft>(blankLesson);
  const [lessonMaterial, setLessonMaterial] = useState<File | null>(null);
  const [quizTitle, setQuizTitle] = useState('Bài kiểm tra cuối khóa');
  const [quizPassScore, setQuizPassScore] = useState('75');
  const [quizMaxAttempts, setQuizMaxAttempts] = useState('2');
  const [quizClosesAt, setQuizClosesAt] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionContent, setQuestionContent] = useState('');
  const [questionOptions, setQuestionOptions] = useState<QuestionOptionDraft[]>(blankQuestionOptions);
  const [editingNews, setEditingNews] = useState<ApiNewsPost | null>(null);
  const [isNewsEditorOpen, setIsNewsEditorOpen] = useState(false);
  const [newsForm, setNewsForm] = useState<NewsDraft>(blankNews);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [detailUser, setDetailUser] = useState<ApiUser | null>(null);
  const [userMenu, setUserMenu] = useState<{ anchor: HTMLElement; user: ApiUser } | null>(null);
  const [courseMenu, setCourseMenu] = useState<{ anchor: HTMLElement; course: ApiCourse } | null>(null);
  const [newsMenu, setNewsMenu] = useState<{ anchor: HTMLElement; newsPost: ApiNewsPost } | null>(null);
  const [reviewMenu, setReviewMenu] = useState<{ anchor: HTMLElement; review: ApiReview } | null>(null);

  const [userRecords, setUserRecords] = useState<ApiUserRecord[] | null>(null);
  const [statusUser, setStatusUser] = useState<ApiUser | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const loadRequestId = useRef(0);
  const loadedKeyBySection = useRef<Partial<Record<AdminSection, string>>>({});

  useEffect(() => {
    if (!token) return;
    adminRepositories.users.list(token, { role: 'teacher' })
      .then((response) => setTeachers(response.data))
      .catch(() => setTeachers([]));
  }, [token]);

  const cacheKeyFor = useCallback((section: AdminSection) => {
    switch (section) {
      case 'users':
        return `${section}:${appliedUserFilters.q}:${appliedUserFilters.status}:${appliedUserFilters.role}:${appliedUserFilters.page}`;
      case 'courses':
        return `${section}:${Object.values(appliedCourseFilters).join(':')}`;
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
    if (section !== 'overview' && !force && loadedKeyBySection.current[section] === cacheKey) {
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
            ...(appliedUserFilters.role ? { role: appliedUserFilters.role } : {}),
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
              category_id: appliedCourseFilters.categoryId ? Number(appliedCourseFilters.categoryId) : undefined,
              course_id: appliedCourseFilters.courseId ? Number(appliedCourseFilters.courseId) : undefined,
              q: appliedCourseFilters.q || undefined,
              status: appliedCourseFilters.status || undefined,
              price: appliedCourseFilters.price === '' ? undefined : Number(appliedCourseFilters.price),
              published_on: appliedCourseFilters.publishedOn || undefined,
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

  useEffect(() => {
    // Menus are anchored to table buttons; discard their anchors when the
    // active Admin tab changes so a detached menu cannot reopen later.
    setUserMenu(null);
    setCourseMenu(null);
    setNewsMenu(null);
    setReviewMenu(null);
  }, [tab]);

  const loadCourseDetail = useCallback(async (courseId: number) => {
    if (!token) return;
    const response = await adminRepositories.courses.get(token, courseId);
    setSelectedCourse(response.data);
    setCourseEnrollments(null);
    setCourseReviews(null);
    adminRepositories.enrollments
      .list(token, { course_id: courseId, page: 1 })
      .then((enrollments) => setCourseEnrollments(enrollments))
      .catch(() => setCourseEnrollments(null));
    adminRepositories.reviews
      .list(token, { course_id: courseId, page: 1 })
      .then((nextReviews) => setCourseReviews(nextReviews))
      .catch(() => setCourseReviews(null));
    setEditingCourse(response.data);
    setCourseCategoryIds(response.data.categories?.map((category) => category.id) ?? [response.data.category_id]);
    setCourseForm(courseDraftFrom(response.data));
    setQuizTitle(response.data.quiz?.title ?? 'Bài kiểm tra cuối khóa');
    setQuizPassScore(String(response.data.quiz?.pass_score ?? 75));
    setQuizMaxAttempts(String(response.data.quiz?.max_attempts ?? 2));
    setQuizClosesAt(toDateTimeLocal(response.data.quiz?.closes_at));
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
    return response.data;
  }, [token]);

  const selectContent = async (courseId: number) => {
    setError(null);
    try {
      setCourseStep(0);
      setIsCourseEditorOpen(false);
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

  const editContent = async (courseId: number) => {
    setError(null);
    try {
      setCourseStep(0);
      // loadCourseDetail already hydrates editingCourse, courseCategoryIds and
      // courseForm — only the editor-mode switches are left to do here.
      const course = await loadCourseDetail(courseId);
      if (!course) return;
      setIsCourseEditorOpen(true);
      setTab('courses');
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể mở trình chỉnh sửa khóa học.'));
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

  const saveCourseBasics = async (advanceToLessons = false): Promise<boolean> => {
    if (!token || courseCategoryIds.length === 0) return false;
    const body = {
      ...courseForm,
      category_ids: courseCategoryIds,
      price: Number(courseForm.price),
      description: courseForm.description || null,
      thumbnail: courseForm.thumbnail || null,
      instructor_name: courseForm.instructor_name || null,
      instructor_bio: courseForm.instructor_bio || null,
    };
    setError(null);

    try {
      const response = await adminRepositories.courses.save(token, body, editingCourse?.id);
      setNotice(editingCourse ? 'Đã cập nhật khóa học.' : 'Đã tạo khóa học.');
      delete loadedKeyBySection.current.overview;
      delete loadedKeyBySection.current.courses;
      await loadCourseDetail(response.data.id);
      await load('courses', true);
      if (advanceToLessons) setCourseStep(1);
      return true;
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể lưu khóa học.'));
      return false;
    }
  };

  const uploadCourseImage = async (file: File) => {
    if (!token) return;
    setUploadingCourseImage(true);
    setError(null);
    try {
      const { url } = await adminRepositories.courses.uploadImage(token, file);
      setCourseForm((form) => ({ ...form, thumbnail: url }));
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể tải ảnh khóa học.'));
    } finally {
      setUploadingCourseImage(false);
    }
  };

  const submitCourse = (event: FormEvent) => {
    event.preventDefault();
    void saveCourseBasics(false);
  };

  const beginCourseEdit = (course: ApiCourse) => {
    setEditingCourse(course);
    setCourseCategoryIds(course.categories?.map((category) => category.id) ?? [course.category_id]);
    setCourseForm(courseDraftFrom(course));
    setIsCourseEditorOpen(true);
    setCourseStep(0);
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

  const uploadNewsImage = async (file: File): Promise<string> => {
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
    return (await adminRepositories.news.uploadImage(token, file)).url;
  };

  const submitLesson = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !selectedCourse) return;
    const body: Record<string, unknown> | FormData = lessonMaterial
      ? (() => {
          const formData = new FormData();
          formData.append('title', lessonForm.title);
          formData.append('video_url', lessonForm.video_url);
          if (lessonForm.description) formData.append('description', lessonForm.description);
          if (lessonForm.duration !== '') formData.append('duration', lessonForm.duration);
          formData.append('material', lessonMaterial);
          return formData;
        })()
      : {
          title: lessonForm.title,
          video_url: lessonForm.video_url,
          description: lessonForm.description || null,
          duration: lessonForm.duration === '' ? null : Number(lessonForm.duration),
        };
    void runMutation(
      () => adminRepositories.courses.saveLesson(token, body, selectedCourse.id, editingLessonId ?? undefined),
      editingLessonId ? 'Đã cập nhật bài học.' : 'Đã thêm bài học.',
      true,
    ).then((didSucceed) => {
      if (!didSucceed) return;
      setEditingLessonId(null);
      setLessonForm(blankLesson);
      setLessonMaterial(null);
    });
  };

  const openUserDetail = async (user: ApiUser) => {
    if (!token) return;
    setUserRecords(null);
    try {
      const detail = await adminRepositories.users.get(token, user.id);
      setDetailUser(detail.data);
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể tải chi tiết tài khoản.'));
      return;
    }
    try {
      const response = await adminRepositories.users.records(token, user.id);
      setUserRecords(response.data);
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể tải lịch sử tài khoản.'));
      setUserRecords([]);
    }
  };

  const confirmUserStatusChange = async () => {
    if (!token || !statusUser || !statusReason.trim()) return;
    const targetStatus = statusUser.status === 'active' ? 'locked' : 'active';
    const didSucceed = await runMutation(
      () => adminRepositories.users.updateStatus(token, statusUser.id, targetStatus, statusReason.trim()),
      targetStatus === 'locked' ? 'Đã khóa tài khoản.' : 'Đã kích hoạt tài khoản.',
    );
    if (!didSucceed) return;
    setStatusUser(null);
    setStatusReason('');
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
      () => adminRepositories.courses.saveQuiz(token, selectedCourse.id, {
        title: quizTitle,
        pass_score: Number(quizPassScore),
        max_attempts: Number(quizMaxAttempts),
        closes_at: quizClosesAt ? new Date(quizClosesAt).toISOString() : null,
      }),
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
    { key: 'id', header: 'ID', width: 46, align: 'center', render: (course) => course.id },
    { key: 'course', header: 'Khóa học', render: (course) => <Typography fontWeight={750}>{course.title}</Typography> },
    { key: 'categories', header: 'Danh mục', width: 140, render: (course) => course.categories?.map((category) => category.name).join(', ') || course.category?.name || '—' },
    { key: 'price', header: 'Học phí', width: 108, align: 'center', render: (course) => <Typography sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(course.price).toLocaleString('vi-VN')} đ</Typography> },
    { key: 'enrollments', header: 'Ghi danh', width: 84, align: 'center', render: (course) => course.enrollments_count ?? 0 },
    { key: 'status', header: 'Trạng thái', width: 136, render: (course) => <StatusChip status={course.status} /> },
    { key: 'updated_at', header: 'Cập nhật', width: 104, render: (course) => <Typography sx={{ whiteSpace: 'nowrap' }}>{course.updated_at ? new Date(course.updated_at).toLocaleDateString('vi-VN') : '—'}</Typography> },
    { key: 'actions', header: 'Thao tác', width: 88, align: 'center', render: (course) => <IconButton
      id={`course-actions-${course.id}`}
      aria-label={`Thao tác ${course.title}`}
      aria-haspopup="menu"
      aria-expanded={courseMenu?.course.id === course.id}
      aria-controls={courseMenu?.course.id === course.id ? 'course-actions-menu' : undefined}
      onClick={(event) => setCourseMenu({ anchor: event.currentTarget, course })}
      color="primary"
      sx={{ width: 36, height: 36, border: 1, borderColor: 'divider', borderRadius: 1 }}
    ><MenuRoundedIcon fontSize="small" /></IconButton> },
  ];

  const courseBasicEditor = (
    <Card component="form" onSubmit={submitCourse} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography component="h2" variant="h6" fontWeight={800}>{editingCourse ? 'Sửa khóa học' : 'Tạo khóa học'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {editingCourse ? 'Thông tin hiện có đã được điền sẵn. Thay đổi chỉ được lưu khi bạn bấm nút lưu.' : 'Khóa học mới bắt đầu với dữ liệu trống và trạng thái bản nháp.'}
            </Typography>
          </Box>
          <FormControl required>
            <InputLabel id="course-category">Danh mục</InputLabel>
            <Select multiple labelId="course-category" label="Danh mục" value={courseCategoryIds} onChange={(event) => { const value = event.target.value; setCourseCategoryIds(typeof value === 'string' ? value.split(',').map(Number) : value); }} renderValue={(selected) => selected.map((id) => categories.find((category) => category.id === id)?.name ?? id).join(', ')}>
              {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField required label="Tiêu đề khóa học" value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} />
          <TextField label="Mô tả" multiline minRows={4} value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} />
          <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
            <Typography fontWeight={700}>Ảnh thumbnail</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>Tải ảnh JPG, JPEG hoặc PNG, tối đa 5 MB.</Typography>
            <Button component="label" variant="outlined" disabled={uploadingCourseImage}>
              {uploadingCourseImage ? 'Đang tải ảnh' : 'Chọn ảnh từ máy'}
              <input hidden type="file" accept="image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadCourseImage(file); }} />
            </Button>
            {courseForm.thumbnail && <Box component="img" src={courseForm.thumbnail} alt="Xem trước thumbnail khóa học" sx={{ display: 'block', width: 200, height: 112, objectFit: 'cover', borderRadius: 1.5, mt: 1.5 }} />}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            <TextField required label="Giá" type="number" inputProps={{ min: 1 }} value={courseForm.price} onChange={(event) => setCourseForm({ ...courseForm, price: event.target.value })} />
            <FormControl>
              <InputLabel id="course-level">Cấp độ</InputLabel>
              <Select labelId="course-level" label="Cấp độ" value={courseForm.level} onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value as CourseDraft['level'] })}>
                <MenuItem value="beginner">Cơ bản</MenuItem>
                <MenuItem value="intermediate">Trung cấp</MenuItem>
                <MenuItem value="advanced">Nâng cao</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <FormControl>
            <InputLabel id="course-instructor">Giảng viên</InputLabel>
            <Select labelId="course-instructor" label="Giảng viên" value={courseForm.instructor_name} onChange={(event) => {
              const name = event.target.value;
              setCourseForm((form) => ({
                ...form,
                instructor_name: name,
                instructor_bio: name ? `${name} là giảng viên SEONGON có kinh nghiệm triển khai Digital Marketing thực tế.` : '',
              }));
            }}>
              {courseForm.instructor_name && !teachers.some((teacher) => teacher.name === courseForm.instructor_name) && <MenuItem value={courseForm.instructor_name}>{courseForm.instructor_name}</MenuItem>}
              {teachers.map((teacher) => <MenuItem key={teacher.id} value={teacher.name}>{teacher.name}</MenuItem>)}
              {teachers.length === 0 && !courseForm.instructor_name && <MenuItem value="" disabled>Chưa có tài khoản giáo viên</MenuItem>}
            </Select>
          </FormControl>
          <TextField label="Giới thiệu giảng viên" multiline minRows={3} value={courseForm.instructor_bio} onChange={(event) => setCourseForm({ ...courseForm, instructor_bio: event.target.value })} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button type="submit" variant="contained">{editingCourse ? 'Cập nhật' : 'Lưu khóa học'}</Button>
              {!selectedCourse && <Button onClick={() => { setEditingCourse(null); setCourseCategoryIds([]); setCourseForm(blankCourse); setIsCourseEditorOpen(false); }}>Hủy</Button>}
            </Stack>
            <Button variant="outlined" onClick={() => void saveCourseBasics(true)}>Tiếp: Bài học & tài liệu</Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading && !stats) {
    return <Container sx={{ py: 6 }}><PageSkeleton rows={5} /></Container>;
  }

  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AdminShell active={tab} onChange={(section) => { setNotice(null); setError(null); setTab(section); }}>
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

          {token && tab === 'paymentSettings' && <PaymentSettingsPanel token={token} />}

          {isOperationSection(tab) && <Stack spacing={2}>
            <Box component="section" role="region" aria-label={`Bộ lọc ${adminSectionCopy[tab].title.toLowerCase()}`} data-admin-toolbar="true" sx={{ display: 'grid', gridTemplateColumns: operationStatusOptions[tab] ? 'minmax(240px, 1fr) minmax(150px, .45fr) minmax(180px, .55fr) auto' : 'minmax(240px, 1fr) minmax(150px, .45fr) auto', gap: 2, alignItems: 'stretch', p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <TextField label="Tìm kiếm" value={operationDrafts[tab].q} onChange={(event) => updateOperationDraft(tab, { q: event.target.value })} fullWidth />
              <TextField label="Mã khóa học" inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} value={operationDrafts[tab].courseId} onChange={(event) => updateOperationDraft(tab, { courseId: event.target.value.replace(/[^0-9]/g, '') })} fullWidth />
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
                  { key: 'id', header: 'ID', align: 'center', render: (lesson) => lesson.id },
                  { key: 'lesson', header: 'Bài học', render: (lesson) => <Typography fontWeight={750} sx={{ minWidth: 220 }}>{lesson.title}</Typography> },
                  { key: 'course', header: 'Khóa học', render: (lesson) => lesson.course.title },
                  { key: 'categories', header: 'Danh mục', render: (lesson) => lesson.course.categories?.map((category) => category.name).join(', ') || lesson.course.category?.name || '—' },
                  { key: 'position', header: 'Thứ tự', align: 'center', render: (lesson) => lesson.position },
                  { key: 'duration', header: 'Thời lượng', render: (lesson) => lesson.duration ? `${Math.ceil(lesson.duration / 60)} phút` : '—' },
                  { key: 'progress', header: 'Đã bắt đầu', align: 'center', render: (lesson) => lesson.learning_progress_count },
                  { key: 'updated', header: 'Cập nhật', render: (lesson) => new Date(lesson.updated_at).toLocaleDateString('vi-VN') },
                  { key: 'actions', header: 'Thao tác', render: (lesson) => <Button size="small" onClick={() => void selectContent(lesson.course_id)} aria-label="Mở nội dung khóa học">Mở nội dung</Button> },
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
                  { key: 'id', header: 'ID', align: 'center', render: (exam) => exam.id },
                  { key: 'exam', header: 'Bài kiểm tra', render: (exam) => <Typography fontWeight={750} sx={{ minWidth: 210 }}>{exam.title}</Typography> },
                  { key: 'course', header: 'Khóa học', render: (exam) => exam.course.title },
                  { key: 'passScore', header: 'Điểm đạt', align: 'center', render: (exam) => exam.pass_score },
                  { key: 'maxAttempts', header: 'Lượt tối đa', align: 'center', render: (exam) => exam.max_attempts },
                  { key: 'questions', header: 'Câu hỏi', align: 'center', render: (exam) => exam.questions_count },
                  { key: 'attempts', header: 'Lượt làm', align: 'center', render: (exam) => exam.attempts_count },
                  { key: 'updated', header: 'Cập nhật', render: (exam) => new Date(exam.updated_at).toLocaleDateString('vi-VN') },
                  { key: 'actions', header: 'Thao tác', render: (exam) => <Button size="small" onClick={() => void selectContent(exam.course_id)} aria-label="Mở nội dung khóa học">Mở nội dung</Button> },
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
                  { key: 'id', header: 'ID', align: 'center', render: (enrollment) => enrollment.id },
                  { key: 'student', header: 'Học viên', render: (enrollment) => <Box sx={{ minWidth: 190 }}><Typography fontWeight={750}>{enrollment.user?.name ?? `#${enrollment.user_id}`}</Typography><Typography variant="body2" color="text.secondary">{enrollment.user?.email ?? '—'}</Typography></Box> },
                  { key: 'course', header: 'Khóa học', render: (enrollment) => enrollment.course?.title ?? `#${enrollment.course_id}` },
                  { key: 'status', header: 'Trạng thái', render: (enrollment) => enrollment.status === 'active' ? 'Đang học' : 'Hết hạn' },
                  { key: 'enrolled', header: 'Ghi danh', render: (enrollment) => new Date(enrollment.enrolled_at).toLocaleDateString('vi-VN') },
                  { key: 'expires', header: 'Hết hạn', render: (enrollment) => new Date(enrollment.expires_at).toLocaleDateString('vi-VN') },
                  { key: 'order', header: 'Mã đơn hàng', align: 'center', render: (enrollment) => enrollment.order_id ?? '—' },
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
                  { key: 'id', header: 'ID', align: 'center', render: (attempt) => attempt.id },
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
                  { key: 'enrollment', header: 'Mã ghi danh', align: 'center', render: (record) => record.enrollment_id },
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

          {tab === 'users' && !detailUser && <Card sx={{ borderRadius: 3, minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Stack spacing={2} sx={{ p: 2.5, bgcolor: '#F8FBFC', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography component="h2" variant="h6" fontWeight={800}>Danh sách tài khoản</Typography>
              <AdminFilterToolbar label="Bộ lọc tài khoản" action={<Button variant="contained" onClick={() => setAppliedUserFilters({ q: userQuery, status: userStatus, role: userRole, page: 1 })}>Áp dụng</Button>}>
                <TextField label="Tìm tài khoản" value={userQuery} onChange={(event) => setUserQuery(event.target.value)} fullWidth />
                <FormControl fullWidth><InputLabel id="student-status">Trạng thái</InputLabel><Select labelId="student-status" label="Trạng thái" value={userStatus} onChange={(event) => setUserStatus(event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="active">Đang hoạt động</MenuItem><MenuItem value="locked">Đã khóa</MenuItem></Select></FormControl>
                <FormControl fullWidth><InputLabel id="user-role-filter">Vai trò</InputLabel><Select labelId="user-role-filter" label="Vai trò" value={userRole} onChange={(event) => setUserRole(event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="admin">Quản trị viên</MenuItem><MenuItem value="teacher">Giáo viên</MenuItem><MenuItem value="student">Học viên</MenuItem></Select></FormControl>
              </AdminFilterToolbar>
            </Stack>
            {users?.data.length ? <Box sx={{ width: '100%', minWidth: 0 }}><AdminDataTable<ApiUser>
              label="Danh sách tài khoản"
              rows={users.data}
              getRowKey={(user) => user.id}
              columns={[
                // Account Management displays fields returned by UserResource.
                // The reference ERD has no phone field, so this table omits it.
                { key: 'account', header: 'Tài khoản', width: '21%', render: (user) => <Typography fontWeight={750}>{user.name}</Typography> },
                { key: 'email', header: 'Email', width: '26%', render: (user) => <Tooltip title={user.email} describeChild><Typography variant="body2" noWrap tabIndex={0}>{user.email}</Typography></Tooltip> },
                { key: 'role', header: 'Vai trò', width: '12%', render: (user) => <Typography sx={{ whiteSpace: 'nowrap' }}>{user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? 'Giáo viên' : 'Học viên'}</Typography> },
                { key: 'created', header: 'Ngày tạo', width: '14%', render: (user) => <Typography sx={{ whiteSpace: 'nowrap' }}>{new Date(user.created_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</Typography> },
                { key: 'status', header: 'Trạng thái', width: '17%', render: (user) => <StatusChip status={user.status} /> },
                { key: 'actions', header: 'Thao tác', width: '10%', render: (user) => <IconButton
                  id={`user-actions-${user.id}`}
                  aria-label={`Thao tác ${user.name}`}
                  aria-haspopup="menu"
                  aria-expanded={userMenu?.user.id === user.id}
                  aria-controls={userMenu?.user.id === user.id ? 'user-actions-menu' : undefined}
                  color="primary"
                  size="small"
                  onClick={(event) => setUserMenu({ anchor: event.currentTarget, user })}
                  sx={{ width: 36, height: 36, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                ><MoreVertIcon fontSize="small" /></IconButton> },
              ] satisfies AdminColumn<ApiUser>[]}
              minWidth={1120}
              fixedLayout
              cellPaddingX={2.5}
              stickyFirstColumn
            /></Box> : <Box sx={{ p: 2.5, pt: 0 }}><EmptyState title="Không có người dùng phù hợp." /></Box>}
            <Menu
              id="user-actions-menu"
              disableScrollLock
              anchorEl={userMenu?.anchor ?? null}
              open={Boolean(userMenu)}
              onClose={() => setUserMenu(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ list: { 'aria-labelledby': userMenu ? `user-actions-${userMenu.user.id}` : undefined }, paper: { sx: { mt: 0.5, minWidth: 192 } } }}
            >
              <MenuItem onClick={() => { if (!userMenu) return; void openUserDetail(userMenu.user); setUserMenu(null); }}>Xem chi tiết</MenuItem>
              <MenuItem onClick={() => { if (!userMenu) return; setStatusUser(userMenu.user); setStatusReason(''); setUserMenu(null); }} sx={{ color: userMenu?.user.status === 'active' ? 'error.main' : 'primary.main' }}>
                {userMenu?.user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
              </MenuItem>
            </Menu>
            {users && users.meta.last_page > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><Pagination count={users.meta.last_page} page={appliedUserFilters.page} onChange={(_, page) => setAppliedUserFilters((filters) => ({ ...filters, page }))} color="primary" /></Box>}
          </CardContent></Card>}
          {tab === 'users' && detailUser && <Card sx={{ borderRadius: 3, minWidth: 0 }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box><Typography component="h2" variant="h5" fontWeight={800}>Chi tiết tài khoản</Typography><Typography color="text.secondary">Thông tin tài khoản và lịch sử thay đổi trạng thái.</Typography></Box>
                  <Button onClick={() => { setDetailUser(null); setUserRecords(null); }} sx={{ whiteSpace: 'nowrap' }}>Quay lại danh sách</Button>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                  <Box component="section" aria-label="Thông tin liên hệ" sx={{ p: 2.5, bgcolor: '#F8FBFC', borderRadius: 2 }}>
                    <Typography component="h3" variant="h6" fontWeight={800} sx={{ mb: 1 }}>Thông tin liên hệ</Typography>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{detailUser.email}</Typography>
                  </Box>
                  <Box component="section" aria-label="Thông tin cơ bản" sx={{ p: 2.5, bgcolor: '#F8FBFC', borderRadius: 2 }}>
                    <Typography component="h3" variant="h6" fontWeight={800} sx={{ mb: 1 }}>Thông tin cơ bản</Typography>
                    {[
                      ['Họ tên', detailUser.name],
                      ['Vai trò', detailUser.role === 'admin' ? 'Quản trị viên' : detailUser.role === 'teacher' ? 'Giáo viên' : 'Học viên'],
                      ['Trạng thái', detailUser.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'],
                      ['Khóa đã đăng ký', String(detailUser.enrollments_count ?? 0)],
                    ].map(([label, value]) => <Box key={label} sx={{ py: 0.75 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={700}>{value}</Typography></Box>)}
                  </Box>
                </Box>
                <Box component="section" aria-label="Thông tin kiểm tra" sx={{ p: 2.5, bgcolor: '#F8FBFC', borderRadius: 2 }}>
                  <Typography component="h3" variant="h6" fontWeight={800}>Thông tin kiểm tra</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2, my: 2 }}>
                    <Box><Typography variant="caption" color="text.secondary">Ngày tạo</Typography><Typography fontWeight={700}>{new Date(detailUser.created_at).toLocaleString('vi-VN')}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Ngày thay đổi</Typography><Typography fontWeight={700}>{detailUser.updated_at ? new Date(detailUser.updated_at).toLocaleString('vi-VN') : '—'}</Typography></Box>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <Typography component="h4" variant="subtitle1" fontWeight={800}>Lịch sử trạng thái</Typography>
                  <Stack divider={<Divider flexItem />}>
                    {userRecords?.map((record) => <Box key={record.id} sx={{ py: 1.25 }}>
                      <Typography fontWeight={700}>{record.old_status === 'active' ? 'Đang hoạt động' : 'Đã khóa'} → {record.new_status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</Typography>
                      <Typography variant="body2">{record.reason}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(record.created_at).toLocaleString('vi-VN')}{record.changed_by?.name ? ` · ${record.changed_by.name}` : ''}</Typography>
                    </Box>)}
                    {userRecords === null && <Typography color="text.secondary">Đang tải lịch sử...</Typography>}
                    {userRecords?.length === 0 && <Typography color="text.secondary">Tài khoản chưa có lịch sử thay đổi trạng thái.</Typography>}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>}

          {tab === 'categories' && <Stack spacing={3}>
            <Tabs value={categoryTab} onChange={(_, value) => setCategoryTab(value)} aria-label="Loại danh mục">
              <Tab id="course-categories-tab" aria-controls="course-categories-panel" value="courses" label="Danh mục khóa học" />
              <Tab id="news-categories-tab" aria-controls="news-categories-panel" value="news" label="Danh mục tin tức" />
            </Tabs>
            {categoryTab === 'courses' && <Box role="tabpanel" id="course-categories-panel" aria-labelledby="course-categories-tab" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, .6fr) 1fr' }, gap: 3 }}>
            <Card component="form" onSubmit={submitCategory} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>{editingCategory ? 'Sửa danh mục' : 'Tạo danh mục'}</Typography><TextField required label="Tên danh mục" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><TextField label="Mô tả" multiline minRows={3} value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} /><Stack direction="row" spacing={1}><Button type="submit" variant="contained">{editingCategory ? 'Cập nhật' : 'Lưu danh mục'}</Button>{editingCategory && <Button onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryDescription(''); }}>Hủy</Button>}</Stack></Stack></CardContent></Card>
            <Card sx={{ borderRadius: 3 }}><CardContent><Stack divider={<Divider flexItem />}>{categories.map((category) => <Stack key={category.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 1.25 }}><Box sx={{ flexGrow: 1 }}><Typography fontWeight={700}>{category.name}</Typography><Typography variant="body2" color="text.secondary">{category.description || 'Chưa có mô tả'}</Typography></Box><Button size="small" onClick={() => { setEditingCategory(category); setCategoryName(category.name); setCategoryDescription(category.description ?? ''); }}>Sửa</Button><Button color="error" size="small" onClick={() => token && requestConfirmation('Xóa danh mục', category.name, () => adminRepositories.categories.remove(token, category.id), 'Đã xóa danh mục.')}>Xóa</Button></Stack>)}{categories.length === 0 && <EmptyState title="Chưa có danh mục." />}</Stack></CardContent></Card>
            </Box>}
            {categoryTab === 'news' && token && <Box role="tabpanel" id="news-categories-panel" aria-labelledby="news-categories-tab"><NewsCatalogManager token={token} /></Box>}
          </Stack>}

          {tab === 'courses' && !selectedCourse && <Stack spacing={2}>
            {isCourseEditorOpen && <Stack spacing={2}>
              <Stepper nonLinear activeStep={0} sx={{ px: { xs: 0, md: 2 } }}>
                {['Thông tin cơ bản', 'Bài học & tài liệu', 'Bài kiểm tra'].map((label, index) => <Step key={label}><StepButton disabled={index > 0} aria-current={index === 0 ? 'step' : undefined}>{label}</StepButton></Step>)}
              </Stepper>
              {courseBasicEditor}
            </Stack>}
            <Card sx={{ borderRadius: 3, minWidth: 0 }}><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack spacing={2} sx={{ p: 2.5, bgcolor: '#F8FBFC', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                  <Typography component="h2" variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>Danh sách khóa học</Typography>
                  <Button variant="contained" onClick={() => { setEditingCourse(null); setSelectedCourse(null); setCourseCategoryIds([]); setCourseForm(blankCourse); setCourseStep(0); setIsCourseEditorOpen(true); }} sx={{ whiteSpace: 'nowrap', minWidth: 164 }}>Tạo khóa học mới</Button>
                </Stack>
                <AdminFilterToolbar label="Bộ lọc khóa học" action={<Button variant="contained" onClick={() => setAppliedCourseFilters({ ...courseFilters, page: 1 })}>Áp dụng</Button>}>
                  <FormControl fullWidth><InputLabel id="course-category-filter">Lọc danh mục</InputLabel><Select labelId="course-category-filter" label="Lọc danh mục" value={courseFilters.categoryId} onChange={(event) => setCourseFilters((current) => ({ ...current, categoryId: event.target.value }))}><MenuItem value="">Tất cả</MenuItem>{categories.map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}</Select></FormControl>
                  <TextField fullWidth label="Mã khóa học" inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} value={courseFilters.courseId} onChange={(event) => setCourseFilters((current) => ({ ...current, courseId: event.target.value.replace(/[^0-9]/g, '') }))} />
                  <TextField fullWidth label="Tên khóa học" value={courseFilters.q} onChange={(event) => setCourseFilters((current) => ({ ...current, q: event.target.value }))} />
                  <FormControl fullWidth><InputLabel id="course-status-filter">Trạng thái</InputLabel><Select labelId="course-status-filter" label="Trạng thái" value={courseFilters.status} onChange={(event) => setCourseFilters((current) => ({ ...current, status: event.target.value }))}><MenuItem value="">Tất cả</MenuItem><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="published">Xuất bản</MenuItem></Select></FormControl>
                  <TextField fullWidth label="Giá" type="number" inputProps={{ min: 0 }} value={courseFilters.price} onChange={(event) => setCourseFilters((current) => ({ ...current, price: event.target.value }))} />
                  <TextField fullWidth label="Ngày xuất bản" type="date" InputLabelProps={{ shrink: true }} value={courseFilters.publishedOn} onChange={(event) => setCourseFilters((current) => ({ ...current, publishedOn: event.target.value }))} />
                </AdminFilterToolbar>
              </Stack>
              {courses?.data.length ? <Box sx={{ maxWidth: 1120, mx: 'auto', width: '100%' }}><AdminDataTable<ApiCourse>
                label="Danh sách khóa học"
                rows={courses.data}
                getRowKey={(course) => course.id}
                columns={courseColumns}
                minWidth={0}
                fixedLayout
                stickyFirstColumn
              /></Box> : <EmptyState title="Không có khóa học phù hợp." />}
              <Menu
                id="course-actions-menu"
                anchorEl={courseMenu?.anchor ?? null}
                open={Boolean(courseMenu)}
                onClose={() => setCourseMenu(null)}
                disableScrollLock
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ list: { 'aria-labelledby': courseMenu ? `course-actions-${courseMenu.course.id}` : undefined }, paper: { sx: { mt: 0.5, minWidth: 192 } } }}
              >
                <MenuItem onClick={() => { if (!courseMenu) return; void selectContent(courseMenu.course.id); setCourseMenu(null); }}>Xem chi tiết</MenuItem>
                <MenuItem onClick={() => { if (!courseMenu) return; void editContent(courseMenu.course.id); setCourseMenu(null); }}>Sửa khóa học</MenuItem>
              </Menu>
            </CardContent></Card>
            {courses && courses.meta.last_page > 1 && <Pagination count={courses.meta.last_page} page={appliedCourseFilters.page} onChange={(_, page) => setAppliedCourseFilters((filters) => ({ ...filters, page }))} color="primary" sx={{ alignSelf: 'center' }} />}
          </Stack>}

          {tab === 'courses' && selectedCourse && <Stack spacing={3} sx={{ minWidth: 0 }}>
            {!isCourseEditorOpen && <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <CardContent sx={{ pb: 1.5 }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} alignItems={{ lg: 'center' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography component="h2" variant="h5" fontWeight={850}>{selectedCourse.title}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>Mã khóa học #{selectedCourse.id} · {selectedCourse.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</Typography>
                  </Box>
                  <Button onClick={() => { setSelectedCourse(null); setEditingCourse(null); setIsCourseEditorOpen(false); }}>Quay lại danh sách</Button>
                  <Button variant="contained" onClick={() => beginCourseEdit(selectedCourse)}>Sửa khóa học</Button>
                  <Button variant="outlined" onClick={() => token && void runMutation(() => adminRepositories.courses.publish(token, selectedCourse.id, selectedCourse.status === 'published' ? 'draft' : 'published'), 'Đã cập nhật trạng thái xuất bản.', true)} sx={{ whiteSpace: 'nowrap' }}>
                    {selectedCourse.status === 'published' ? 'Ẩn khóa học' : 'Xuất bản khóa học'}
                  </Button>
                  <Button color="error" onClick={() => token && requestConfirmation('Xóa khóa học', selectedCourse.title, async () => { await adminRepositories.courses.remove(token, selectedCourse.id); setSelectedCourse(null); }, 'Đã xóa khóa học.')} sx={{ whiteSpace: 'nowrap' }}>Xóa khóa học</Button>
                </Stack>
              </CardContent>
            </Card>}

            {isCourseEditorOpen && <Card component="section" role="region" aria-label={`Chỉnh sửa khóa học ${selectedCourse.title}`} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography component="h2" variant="h5" fontWeight={850}>Chỉnh sửa {selectedCourse.title}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>Hoàn thiện thông tin, bài học và bài kiểm tra theo quy trình 3 bước.</Typography>
                  </Box>
                  <Button variant="outlined" onClick={() => setIsCourseEditorOpen(false)}>Quay lại chi tiết</Button>
                </Stack>
              </CardContent>
            </Card>}

            {!isCourseEditorOpen && <Stack component="section" role="region" aria-label={`Thông tin khóa học ${selectedCourse.title}`} spacing={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
                {[
                  { key: 'lessons', label: 'Bài học', value: selectedCourse.lessons_count ?? 0 },
                  { key: 'enrollments', label: 'Học viên ghi danh', value: selectedCourse.enrollments_count ?? 0 },
                  { key: 'rating', label: 'Điểm đánh giá', value: selectedCourse.rating == null ? '—' : `${selectedCourse.rating}/5`, helper: `${selectedCourse.reviews_count ?? 0} đánh giá` },
                ].map((metric) => <Card key={metric.key} data-course-metric={metric.key} variant="outlined" sx={{ borderRadius: 3 }}><CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}><Typography variant="body2" color="text.secondary" fontWeight={700}>{metric.label}</Typography><Typography variant="h4" fontWeight={850} color="primary.main" sx={{ mt: 0.75 }}>{metric.value}</Typography>{metric.helper && <Typography variant="caption" color="text.secondary">{metric.helper}</Typography>}</CardContent></Card>)}
              </Box>

              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 }, '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                  <Typography component="h2" variant="h6" fontWeight={850}>Thông tin khóa học</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{selectedCourse.description || 'Chưa có mô tả.'}</Typography>
                  <Divider sx={{ my: 2.5 }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
                    {[
                      ['Danh mục', selectedCourse.categories?.map((category) => category.name).join(', ') || selectedCourse.category?.name || '—'],
                      ['Cấp độ', ({ beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }[selectedCourse.level ?? 'beginner'])],
                      ['Học phí', `${Number(selectedCourse.price).toLocaleString('vi-VN')} đ`],
                      ['Thời hạn truy cập', '730 ngày (2 năm) từ ngày ghi danh'],
                      ['Giảng viên', selectedCourse.instructor_name || '—'],
                      ['Bài kiểm tra', selectedCourse.exam_exists ? 'Đã cấu hình' : 'Chưa có'],
                      ['Ngày tạo', selectedCourse.created_at ? new Date(selectedCourse.created_at).toLocaleDateString('vi-VN') : '—'],
                      ['Ngày cập nhật', selectedCourse.updated_at ? new Date(selectedCourse.updated_at).toLocaleDateString('vi-VN') : '—'],
                      ['Ngày xuất bản', selectedCourse.published_at ? new Date(selectedCourse.published_at).toLocaleDateString('vi-VN') : 'Chưa xuất bản'],
                    ].map(([label, value]) => <Box key={label}><Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography><Typography fontWeight={700} sx={{ mt: 0.25 }}>{value}</Typography></Box>)}
                  </Box>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 }, '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                  <Typography component="h2" variant="h6" fontWeight={850}>Bài kiểm tra cuối khóa</Typography>
                  {selectedCourse.quiz ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2.5, mt: 2 }}>
                      {[
                        ['Tiêu đề', selectedCourse.quiz.title],
                        ['Điểm đạt', `${selectedCourse.quiz.pass_score}%`],
                        ['Số lần làm tối đa', String(selectedCourse.quiz.max_attempts)],
                        ['Câu mỗi lượt', String(selectedCourse.quiz.total_questions ?? selectedCourse.quiz.questions.length)],
                        ['Ngân hàng câu hỏi', String(selectedCourse.quiz.questions.length)],
                      ].map(([label, value]) => <Box key={label}><Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography><Typography fontWeight={700} sx={{ mt: 0.25 }}>{value}</Typography></Box>)}
                    </Box>
                  ) : <Typography color="text.secondary" sx={{ mt: 1 }}>Khóa học chưa cấu hình bài kiểm tra.</Typography>}
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box sx={{ p: { xs: 2.5, md: 3 }, pb: 2 }}>
                    <Typography component="h2" variant="h6" fontWeight={850}>Học viên ghi danh</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Tiến độ học và tình trạng chứng chỉ của từng học viên trong khóa này.</Typography>
                  </Box>
                  {courseEnrollments?.data.length ? <AdminDataTable<ApiEnrollment>
                    label={`Học viên ghi danh khóa ${selectedCourse.title}`}
                    rows={courseEnrollments.data}
                    getRowKey={(enrollment) => enrollment.id}
                    minWidth={860}
                    columns={[
                      { key: 'student', header: 'Học viên', render: (enrollment) => <Typography fontWeight={750}>{enrollment.user?.name ?? '—'}</Typography> },
                      { key: 'email', header: 'Email', render: (enrollment) => <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{enrollment.user?.email ?? '—'}</Typography> },
                      { key: 'enrolled', header: 'Ngày ghi danh', render: (enrollment) => <Typography sx={{ whiteSpace: 'nowrap' }}>{new Date(enrollment.enrolled_at).toLocaleDateString('vi-VN')}</Typography> },
                      { key: 'progress', header: 'Trạng thái học', align: 'center', render: (enrollment) => enrollment.progress ? `${enrollment.progress.percent}%` : '—' },
                      { key: 'certificate', header: 'Chứng chỉ', render: (enrollment) => enrollment.certificate?.certificate_code ?? '—' },
                      { key: 'status', header: 'Trạng thái', render: (enrollment) => <StatusChip status={enrollment.status} /> },
                    ] satisfies AdminColumn<ApiEnrollment>[]}
                  /> : <Box sx={{ px: { xs: 2.5, md: 3 }, pb: 3 }}><EmptyState title={courseEnrollments ? 'Chưa có học viên ghi danh khóa này.' : 'Đang tải danh sách ghi danh...'} /></Box>}
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box sx={{ p: { xs: 2.5, md: 3 }, pb: 2 }}>
                    <Typography component="h2" variant="h6" fontWeight={850}>Đánh giá khóa học</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Chỉ hiển thị đánh giá của học viên cho khóa học đang chọn.</Typography>
                  </Box>
                  {courseReviews?.data.length ? <AdminDataTable<ApiReview>
                    label={`Đánh giá khóa ${selectedCourse.title}`}
                    rows={courseReviews.data}
                    getRowKey={(review) => review.id}
                    minWidth={760}
                    columns={[
                      { key: 'reviewer', header: 'Học viên', render: (review) => <Typography fontWeight={750}>{review.user.name}</Typography> },
                      { key: 'rating', header: 'Điểm', align: 'center', render: (review) => `${review.rating}/5` },
                      { key: 'comment', header: 'Nhận xét', render: (review) => <Typography variant="body2" sx={{ minWidth: 220, maxWidth: 420, overflowWrap: 'anywhere' }}>{review.comment || 'Không có nhận xét'}</Typography> },
                      { key: 'status', header: 'Trạng thái', render: (review) => <StatusChip status={review.status} /> },
                      { key: 'actions', header: 'Thao tác', render: (review) => <Stack direction="row" spacing={0.5}><Button size="small" variant="outlined" onClick={() => token && void runMutation(() => adminRepositories.reviews.updateStatus(token, review.id, review.status === 'visible' ? 'hidden' : 'visible'), 'Đã cập nhật trạng thái đánh giá.', true)}>{review.status === 'visible' ? 'Ẩn' : 'Hiện'}</Button><Button size="small" color="error" onClick={() => token && requestConfirmation('Xóa đánh giá', `${review.user.name}, ${review.rating}/5`, () => adminRepositories.reviews.remove(token, review.id), 'Đã xóa đánh giá.', true)}>Xóa</Button></Stack> },
                    ] satisfies AdminColumn<ApiReview>[]}
                  /> : <Box sx={{ px: { xs: 2.5, md: 3 }, pb: 3 }}><EmptyState title={courseReviews ? 'Khóa học chưa có đánh giá.' : 'Đang tải đánh giá...'} /></Box>}
                </CardContent>
              </Card>
            </Stack>}

            {isCourseEditorOpen && <Stack aria-label="Chỉnh sửa nội dung khóa học" spacing={3}>
              <Stepper nonLinear activeStep={courseStep} sx={{ px: { xs: 0, md: 4 }, py: 1 }}>
                {['Thông tin cơ bản', 'Bài học & tài liệu', 'Bài kiểm tra'].map((label, index) => <Step key={label} completed={courseStep > index}><StepButton onClick={() => setCourseStep(index)} aria-current={courseStep === index ? 'step' : undefined}>{label}</StepButton></Step>)}
              </Stepper>

              {courseStep === 0 && courseBasicEditor}

              {courseStep === 1 && <Stack spacing={2}>
                <Card component="form" onSubmit={submitLesson} sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography component="h2" variant="h6" fontWeight={800}>{editingLessonId ? 'Sửa bài học' : `Thêm bài học cho ${selectedCourse.title}`}</Typography>
                      <TextField required label="Tiêu đề bài học" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} />
                      <TextField required label="Video URL" value={lessonForm.video_url} onChange={(event) => setLessonForm({ ...lessonForm, video_url: event.target.value })} />
                      <TextField label="Mô tả" multiline minRows={3} value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} />
                      <TextField label="Thời lượng (giây)" type="number" value={lessonForm.duration} onChange={(event) => setLessonForm({ ...lessonForm, duration: event.target.value })} />
                      <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography component="label" htmlFor="lesson-material" fontWeight={700}>Tài liệu PDF</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>Tải lên một file PDF tối đa 10 MB cho bài học này.</Typography>
                        <input id="lesson-material" aria-label="Tài liệu PDF" type="file" accept="application/pdf,.pdf" onChange={(event) => setLessonMaterial(event.target.files?.[0] ?? null)} />
                        {lessonMaterial && <Typography variant="body2" sx={{ mt: 1 }}>{lessonMaterial.name}</Typography>}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button type="submit" variant="contained">{editingLessonId ? 'Cập nhật bài học' : 'Thêm bài học'}</Button>
                        {editingLessonId && <Button onClick={() => { setEditingLessonId(null); setLessonForm(blankLesson); setLessonMaterial(null); }}>Hủy</Button>}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
<Card sx={{ borderRadius: 3 }}><CardContent><Typography component="h2" variant="h6" fontWeight={800}>Bài học & tài liệu</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Mỗi bài học có thể dùng Video URL và một tài liệu PDF.</Typography><Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>{orderedLessons.map((lesson, index) => <Stack key={lesson.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 1.25 }}><Box sx={{ flexGrow: 1 }}><Typography fontWeight={700}>{lesson.position}. {lesson.title}</Typography><Typography variant="body2" color="text.secondary">{lesson.duration ? `${lesson.duration} giây` : 'Chưa có thời lượng'}</Typography>{lesson.material_url && <Button component="a" href={resolveMaterialUrl(lesson.material_url)} target="_blank" rel="noreferrer" size="small" sx={{ px: 0, mt: 0.5 }}>Mở tài liệu PDF</Button>}</Box><Button size="small" disabled={index === 0} onClick={() => moveLesson(lesson.id, -1)} aria-label={`Di chuyển bài học ${lesson.position} lên`}>Lên</Button><Button size="small" disabled={index === orderedLessons.length - 1} onClick={() => moveLesson(lesson.id, 1)} aria-label={`Di chuyển bài học ${lesson.position} xuống`}>Xuống</Button><Button size="small" onClick={() => { setEditingLessonId(lesson.id); setLessonMaterial(null); setLessonForm({ title: lesson.title, video_url: lesson.video_url, description: lesson.description ?? '', duration: lesson.duration === null ? '' : String(lesson.duration) }); }}>Sửa</Button><Button size="small" color="error" onClick={() => token && requestConfirmation('Xóa bài học', lesson.title, () => adminRepositories.courses.removeLesson(token, lesson.id), 'Đã xóa bài học.', true)}>Xóa</Button></Stack>)}{orderedLessons.length === 0 && <EmptyState title="Khóa học chưa có bài học." />}</Stack></CardContent></Card>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Button onClick={() => setCourseStep(0)}>Quay lại: Thông tin cơ bản</Button><Button variant="contained" disabled={orderedLessons.length === 0} onClick={() => setCourseStep(2)}>Tiếp: Bài kiểm tra</Button></Stack>
              </Stack>}

              {courseStep === 2 && <Stack spacing={2}>
                <Card component="form" onSubmit={submitQuiz} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>Bài kiểm tra cuối khóa</Typography><TextField required label="Tiêu đề bài kiểm tra" value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} /><TextField required label="Điểm đạt" type="number" inputProps={{ min: 1, max: 100 }} value={quizPassScore} onChange={(event) => setQuizPassScore(event.target.value)} /><TextField required label="Số lần làm tối đa" type="number" inputProps={{ min: 1, max: 20 }} value={quizMaxAttempts} onChange={(event) => setQuizMaxAttempts(event.target.value)} /><TextField label="Thời điểm đóng bài" type="datetime-local" value={quizClosesAt} onChange={(event) => setQuizClosesAt(event.target.value)} InputLabelProps={{ shrink: true }} helperText="Để trống nếu bài kiểm tra không có hạn đóng." /><Button type="submit" variant="outlined" sx={{ alignSelf: 'flex-start' }}>Lưu bài kiểm tra</Button></Stack></CardContent></Card>
                {selectedCourse.quiz && <Card component="form" onSubmit={submitQuestion} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography component="h2" variant="h6" fontWeight={800}>{editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</Typography>{editingQuestionId && <Button size="small" onClick={() => { setEditingQuestionId(null); setQuestionContent(''); setQuestionOptions(blankQuestionOptions); }}>Tạo câu hỏi mới</Button>}</Stack><Stack direction="row" spacing={1} flexWrap="wrap">{selectedCourse.quiz.questions.map((question) => <Button key={question.id} size="small" variant={question.id === editingQuestionId ? 'contained' : 'outlined'} onClick={() => chooseQuestion(question)}>Câu hỏi {question.id}</Button>)}</Stack><TextField required label="Câu hỏi" value={questionContent} onChange={(event) => setQuestionContent(event.target.value)} />{questionOptions.map((option, index) => <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}><TextField required fullWidth label={`Phương án ${index + 1}`} value={option.content} onChange={(event) => updateQuestionOption(index, { content: event.target.value })} /><RadioGroup row value={String(index)} onChange={() => markCorrectOption(index)}><FormControlLabel value={String(index)} control={<Radio checked={option.is_correct} />} label="Đáp án đúng" /></RadioGroup>{questionOptions.length > 2 && <Button color="error" onClick={() => setQuestionOptions((options) => options.filter((_, optionIndex) => optionIndex !== index))}>Xóa</Button>}</Stack>)}<Button onClick={() => setQuestionOptions((options) => [...options, { content: '', is_correct: false }])}>Thêm phương án</Button><Button type="submit" variant="contained">{editingQuestionId ? 'Cập nhật câu hỏi' : 'Lưu câu hỏi'}</Button>{editingQuestionId && <Button color="error" onClick={() => token && requestConfirmation('Xóa câu hỏi', questionContent || `Câu hỏi ${editingQuestionId}`, () => adminRepositories.courses.removeQuestion(token, editingQuestionId), 'Đã xóa câu hỏi.', true)}>Xóa câu hỏi</Button>}</Stack></CardContent></Card>}
                <Card sx={{ borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}><Button onClick={() => setCourseStep(1)}>Quay lại: Bài học & tài liệu</Button><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" onClick={() => token && void runMutation(() => adminRepositories.courses.publish(token, selectedCourse.id, 'draft'), 'Đã lưu khóa học ở trạng thái bản nháp.', true)}>Lưu bản nháp</Button><Button variant="contained" onClick={() => token && void runMutation(() => adminRepositories.courses.publish(token, selectedCourse.id, 'published'), 'Đã xuất bản khóa học.', true)}>Xuất bản</Button></Stack></Stack></CardContent></Card>
              </Stack>}
            </Stack>}

          </Stack>}

          {tab === 'news' && <Stack spacing={2}>
            {!isNewsEditorOpen && <Card sx={{ borderRadius: 3, minWidth: 0 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Stack spacing={2} sx={{ p: 2.5, bgcolor: '#F8FBFC', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Typography component="h2" variant="h6" fontWeight={800}>Danh sách tin tức</Typography>
                    <Button variant="contained" onClick={() => { setEditingNews(null); setNewsForm(blankNews); setIsNewsEditorOpen(true); }} sx={{ whiteSpace: 'nowrap', minWidth: 164 }}>Tạo tin tức mới</Button>
                  </Stack>
                  <AdminFilterToolbar label="Bộ lọc tin tức" action={<Button variant="contained" onClick={applyNewsFilters}>Áp dụng</Button>}>
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
                  </AdminFilterToolbar>
                </Stack>
                {news?.data.length ? <AdminDataTable<ApiNewsPost>
                  label="Danh sách tin tức"
                  minWidth={0}
                  fixedLayout
                  rows={news.data}
                  getRowKey={(newsPost) => newsPost.id}
                  columns={[
                    { key: 'title', header: 'Tin tức', render: (newsPost) => <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>{newsPost.thumbnail && <Box component="img" src={newsPost.thumbnail} alt={newsPost.title} sx={{ width: 56, height: 42, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />}<Box sx={{ minWidth: 0 }}><Typography fontWeight={750}>{newsPost.title}</Typography><Typography variant="body2" color="text.secondary">{newsPost.excerpt}</Typography></Box></Stack> },
                    { key: 'category', header: 'Danh mục', width: 100, render: (newsPost) => newsPost.category },
                    { key: 'author', header: 'Tác giả', width: 140, render: (newsPost) => newsPost.author?.name ?? '—' },
                    { key: 'status', header: 'Trạng thái', width: 136, render: (newsPost) => <StatusChip status={newsPost.status} /> },
                    { key: 'published', header: 'Ngày xuất bản', width: 132, render: (newsPost) => newsPost.published_at ? new Date(newsPost.published_at).toLocaleDateString('vi-VN') : '—' },
                    { key: 'updated', header: 'Cập nhật', width: 98, render: (newsPost) => new Date(newsPost.updated_at).toLocaleDateString('vi-VN') },
                    { key: 'actions', header: 'Thao tác', width: 96, align: 'center', render: (newsPost) => <IconButton
                      id={`news-actions-${newsPost.id}`}
                      aria-label={`Thao tác ${newsPost.title}`}
                      aria-haspopup="menu"
                      aria-expanded={newsMenu?.newsPost.id === newsPost.id}
                      aria-controls={newsMenu?.newsPost.id === newsPost.id ? 'news-actions-menu' : undefined}
                      color="primary"
                      size="small"
                      onClick={(event) => setNewsMenu({ anchor: event.currentTarget, newsPost })}
                      sx={{ width: 36, height: 36, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    ><MenuRoundedIcon fontSize="small" /></IconButton> },
                  ] satisfies AdminColumn<ApiNewsPost>[]}
                  cellPaddingX={2}
                  stickyLastColumn
                /> : <EmptyState title="Không có tin tức phù hợp." />}
              </CardContent>
            </Card>}
            <Menu
              id="news-actions-menu"
              disableScrollLock
              anchorEl={newsMenu?.anchor ?? null}
              open={Boolean(newsMenu)}
              onClose={() => setNewsMenu(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ list: { 'aria-labelledby': newsMenu ? `news-actions-${newsMenu.newsPost.id}` : undefined }, paper: { sx: { mt: 0.5, minWidth: 192 } } }}
            >
              <MenuItem onClick={() => { if (!newsMenu) return; beginNewsEdit(newsMenu.newsPost); setNewsMenu(null); }}>Sửa</MenuItem>
              <MenuItem onClick={() => { if (!newsMenu) return; changeNewsStatus(newsMenu.newsPost); setNewsMenu(null); }}>
                {newsMenu?.newsPost.status === 'draft' ? 'Xuất bản' : 'Chuyển về nháp'}
              </MenuItem>
              <MenuItem sx={{ color: 'error.main' }} onClick={() => { if (!newsMenu) return; const post = newsMenu.newsPost; setNewsMenu(null); if (token) requestConfirmation('Xóa tin tức', post.title, () => adminRepositories.news.remove(token, post.id), 'Đã xóa tin tức.'); }}>Xóa</MenuItem>
            </Menu>
            {!isNewsEditorOpen && news && news.meta.last_page > 1 && <Pagination count={news.meta.last_page} page={appliedNewsFilters.page} onChange={(_, page) => setAppliedNewsFilters((filters) => ({ ...filters, page }))} color="primary" sx={{ alignSelf: 'center' }} />}
            {isNewsEditorOpen && <Card component="form" onSubmit={submitNews} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                    <Typography component="h2" variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>{editingNews ? 'Sửa tin tức' : 'Tạo tin tức'}</Typography>
                    <Button onClick={() => { setEditingNews(null); setNewsForm(blankNews); setIsNewsEditorOpen(false); }}>Quay lại danh sách</Button>
                  </Stack>
                  <TextField id="news-title" required label="Tiêu đề" value={newsForm.title} onChange={(event) => setNewsForm({ ...newsForm, title: event.target.value })} />
                  <TextField id="news-category" required label="Danh mục" value={newsForm.category} onChange={(event) => setNewsForm({ ...newsForm, category: event.target.value })} />
                  <TextField id="news-excerpt" required label="Tóm tắt" multiline minRows={2} value={newsForm.excerpt} onChange={(event) => setNewsForm({ ...newsForm, excerpt: event.target.value })} />
                  <Box>
                    <Typography component="label" htmlFor="news-content" variant="body2" fontWeight={700} sx={{ display: 'block', mb: 0.75 }}>Nội dung *</Typography>
                    <RichTextEditor value={newsForm.content} onChange={(content) => setNewsForm({ ...newsForm, content })} onUploadImage={uploadNewsImage} />
                  </Box>
                  <Stack spacing={1}>
                    <TextField id="news-thumbnail" label="Ảnh thumbnail URL (tuỳ chọn)" value={newsForm.thumbnail} onChange={(event) => setNewsForm({ ...newsForm, thumbnail: event.target.value })} />
                    <Button component="label" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
                      Tải ảnh thumbnail
                      <input hidden type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadNewsImage(file).then((url) => setNewsForm((form) => ({ ...form, thumbnail: url }))); }} />
                    </Button>
                    {newsForm.thumbnail && <Box component="img" src={newsForm.thumbnail} alt="Xem trước thumbnail" sx={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 1 }} />}
                  </Stack>
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
                  { key: 'actions', header: 'Thao tác', width: 96, align: 'center', render: (review) => <IconButton
                    id={`review-actions-${review.id}`}
                    aria-label={`Thao tác đánh giá của ${review.user.name}`}
                    aria-haspopup="menu"
                    aria-expanded={reviewMenu?.review.id === review.id}
                    aria-controls={reviewMenu?.review.id === review.id ? 'review-actions-menu' : undefined}
                    color="primary"
                    size="small"
                    onClick={(event) => setReviewMenu({ anchor: event.currentTarget, review })}
                    sx={{ width: 36, height: 36, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  ><MenuRoundedIcon fontSize="small" /></IconButton> },
                ] satisfies AdminColumn<ApiReview>[]}
                minWidth={0}
                fixedLayout
                cellPaddingX={2}
                stickyLastColumn
              /> : <EmptyState title="Không có đánh giá phù hợp." />}
            </CardContent></Card>
            <Menu
              id="review-actions-menu"
              disableScrollLock
              anchorEl={reviewMenu?.anchor ?? null}
              open={Boolean(reviewMenu)}
              onClose={() => setReviewMenu(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ list: { 'aria-labelledby': reviewMenu ? `review-actions-${reviewMenu.review.id}` : undefined }, paper: { sx: { mt: 0.5, minWidth: 192 } } }}
            >
              <MenuItem onClick={() => { if (!reviewMenu || !token) return; const review = reviewMenu.review; setReviewMenu(null); void runMutation(() => adminRepositories.reviews.updateStatus(token, review.id, review.status === 'visible' ? 'hidden' : 'visible'), 'Đã cập nhật trạng thái đánh giá.'); }}>
                {reviewMenu?.review.status === 'visible' ? 'Ẩn đánh giá' : 'Hiện đánh giá'}
              </MenuItem>
              <MenuItem sx={{ color: 'error.main' }} onClick={() => { if (!reviewMenu) return; const review = reviewMenu.review; setReviewMenu(null); if (token) requestConfirmation('Xóa đánh giá', `${review.user.name}, ${review.rating}/5`, () => adminRepositories.reviews.remove(token, review.id), 'Đã xóa đánh giá.'); }}>Xóa</MenuItem>
            </Menu>
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
          <Dialog open={Boolean(statusUser)} onClose={() => { setStatusUser(null); setStatusReason(''); }} aria-labelledby="user-status-title" maxWidth="xs" fullWidth>
            <Box sx={{ p: 3 }}>
              <Typography id="user-status-title" component="h2" variant="h6" fontWeight={800}>{statusUser?.status === 'active' ? 'Khóa' : 'Kích hoạt'} tài khoản {statusUser?.name ?? ''}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Lý do sẽ được lưu vào lịch sử trạng thái tài khoản.</Typography>
              <TextField fullWidth required multiline minRows={3} label="Lý do thay đổi trạng thái" value={statusReason} onChange={(event) => setStatusReason(event.target.value)} sx={{ mt: 2 }} />
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button onClick={() => { setStatusUser(null); setStatusReason(''); }}>Hủy</Button>
                <Button variant="contained" color={statusUser?.status === 'active' ? 'error' : 'primary'} disabled={!statusReason.trim()} onClick={() => void confirmUserStatusChange()}>{statusUser?.status === 'active' ? 'Xác nhận khóa' : 'Xác nhận kích hoạt'}</Button>
              </Stack>
            </Box>
          </Dialog>
        </Stack>
      </AdminShell>
    </Box>
  );
}
