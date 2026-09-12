export type UserRole = 'student' | 'admin' | 'teacher';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published';
export type EnrollmentStatus = 'active' | 'expired';

export interface ApiAdminStats {
  students: number;
  courses: number;
  published_courses: number;
  draft_courses: number;
  enrollments: number;
  certificates: number;
  completion_rate: number;
  revenue: number;
  monthly_enrollments: Array<{ month: string; total: number }>;
  popular_courses: Array<{ id: number; title: string; enrollments_count: number }>;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar: string | null;
  status: 'active' | 'locked';
  created_at: string;
  enrollments_count?: number;
}

export interface ApiUserRecord {
  id: number;
  user_id: number;
  old_status: 'active' | 'locked';
  new_status: 'active' | 'locked';
  reason: string;
  created_at: string;
}

export interface ApiCatalog {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  news_count?: number;
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  courses_count?: number;
}

export interface ApiLesson {
  id: number;
  course_id: number;
  title: string;
  video_url: string;
  material_url: string | null;
  description: string | null;
  duration: number | null;
  position: number;
  is_completed?: boolean;
  resume_position_seconds?: number | null;
  furthest_position_seconds?: number | null;
  video_duration_seconds?: number | null;
  watched_percent?: number;
}

export interface ApiCourseEnrollment {
  id: number;
  expires_at: string;
  status: EnrollmentStatus;
  is_expired: boolean;
}

export interface ApiCourse {
  id: number;
  category_id: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  price: string | number;
  instructor_name: string | null;
  instructor_bio: string | null;
  level: CourseLevel | null;
  status: CourseStatus;
  lessons_count?: number;
  questions_count?: number;
  enrollments_count?: number;
  reviews_count?: number;
  rating?: number | null;
  exam_exists?: boolean;
  category?: ApiCategory | null;
  categories?: ApiCategory[];
  lessons?: ApiLesson[];
  has_quiz?: boolean;
  enrollment?: ApiCourseEnrollment | null;
  created_at: string;
  published_at?: string | null;
  updated_at?: string;
}

export interface ApiCartItem {
  id: number;
  course_id: number;
  course: ApiCourse;
  created_at: string;
}

export interface ApiCart {
  id: number | null;
  user_id: number;
  items: ApiCartItem[];
  count: number;
  total_amount: string;
  updated_at: string | null;
}

export interface ApiAdminRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
  users_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiAdminCartItem {
  id: number;
  cart_id: number;
  user_id: number;
  course_id: number;
  user: ApiUser;
  course: ApiCourse;
  created_at: string;
  updated_at: string;
}

export interface ApiAdminCart {
  id: number;
  user_id: number;
  user: ApiUser;
  items_count: number;
  items: ApiAdminCartItem[];
  current_total: string;
  created_at: string;
  updated_at: string;
}

export interface ApiNewsPost {
  id: number;
  title: string;
  slug: string;
  category: string;
  author?: { id: number; name: string } | null;
  excerpt: string;
  content: string;
  thumbnail: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiReview {
  id: number;
  course_id: number;
  rating: number;
  comment: string | null;
  status: 'visible' | 'hidden';
  user: Pick<ApiUser, 'id' | 'name'>;
  created_at: string;
}

export interface ApiProgress {
  completed: number;
  total: number;
  percent: number;
  video_percent?: number;
  can_take_exam: boolean;
}

export interface ApiLessonProgressResponse {
  lesson: {
    lesson_id: number;
    resume_position_seconds: number;
    furthest_position_seconds: number;
    video_duration_seconds: number;
    watched_percent: number;
    is_completed: boolean;
  };
  course_progress: ApiProgress;
}

export interface ApiEnrollment {
  id: number;
  user_id?: number;
  course_id: number;
  order_id?: number | null;
  enrolled_at: string;
  expires_at: string;
  status: EnrollmentStatus;
  is_expired: boolean;
  user?: ApiUser;
  course?: ApiCourse;
  progress?: ApiProgress;
  certificate?: ApiCertificate | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiEnrollmentSummary {
  total: number;
  active: number;
  completed: number;
}

export interface ApiMyCoursesResponse extends Paginated<ApiEnrollment> {
  summary?: ApiEnrollmentSummary;
}

export type PaymentMethod = 'momo' | 'bank';
export type PaymentStatus = 'draft' | 'pending' | 'paid' | 'cancelled' | 'expired';
export interface PaymentSettings {
  momo: { enabled: boolean; mode: 'mock'; merchant_name: string };
  bank: { enabled: boolean; is_active: boolean; bank_name: string; account_name: string; account_number: string; branch: string; qr_payload: string; instructions: string };
}
export interface PaymentSession {
  token: string;
  mode: 'mock';
  reference: string;
  merchant_name: string;
  qr_payload: string | null;
  bank: PaymentSettings['bank'] | null;
}

export interface ApiOrder {
  id: number;
  user_id: number;
  course_id: number;
  amount: string | number;
  status: 'pending' | 'paid' | 'failed';
  payment_method: PaymentMethod | 'card' | 'qr' | null;
  payment_status?: PaymentStatus;
  payment_session?: PaymentSession | null;
  payment_started_at?: string | null;
  payment_expires_at?: string | null;
  mock_callback_allowed?: boolean;
  transaction_ref: string | null;
  paid_at: string | null;
  course?: ApiCourse;
  created_at: string;
}

export interface ApiAdminOrder extends ApiOrder {
  total_amount: string | number;
  user: ApiUser;
  course: ApiCourse;
  updated_at: string;
}

export interface ApiAdminCourseCategory {
  id: number;
  course_id: number;
  category_id: number;
  course: Pick<ApiCourse, 'id' | 'title'>;
  category: Pick<ApiCategory, 'id' | 'name'>;
  created_at: string;
  updated_at: string;
}

export interface ApiAdminLearningProgress {
  id: number;
  enrollment_id: number;
  lesson_id: number;
  is_completed: boolean;
  completed_at: string | null;
  user: ApiUser;
  course: ApiCourse;
  lesson: Pick<ApiLesson, 'id' | 'course_id' | 'title'>;
  created_at: string;
  updated_at: string;
}

export interface ApiAdminQuestionIndex {
  id: number;
  exam_id: number;
  content: string;
  sort_order: number | null;
  answers_count: number;
  exam: { id: number; title: string };
  course: Pick<ApiCourse, 'id' | 'title'>;
  created_at: string;
  updated_at: string;
}

export interface ApiAdminAnswerIndex {
  id: number;
  question_id: number;
  content: string;
  is_correct: boolean;
  question: { id: number; content: string };
  exam: { id: number; title: string };
  course: Pick<ApiCourse, 'id' | 'title'>;
  created_at: string;
  updated_at: string;
}

export interface ApiQuizOption {
  id: number;
  content: string;
}

export interface ApiAdminQuestionOption extends ApiQuizOption {
  is_correct: boolean;
}

export interface ApiAdminQuestion {
  id: number;
  content: string;
  options: ApiAdminQuestionOption[];
}

export interface ApiAdminQuiz {
  id: number;
  course_id: number;
  title: string;
  pass_score: number;
  max_attempts: number;
  duration_minutes?: number | null;
  closes_at?: string | null;
  questions: ApiAdminQuestion[];
}

export interface ApiQuizQuestion {
  id: number;
  content: string;
  options: ApiQuizOption[];
}

export interface ApiQuiz {
  id: number;
  course_id: number;
  title: string;
  pass_score: number;
  max_attempts: number;
  duration_minutes: number | null;
  closes_at?: string | null;
  attempts_remaining?: number;
  best_score?: number | null;
  ended?: boolean;
  attempts?: ApiQuizAttempt[];
  questions_count?: number;
  questions: ApiQuizQuestion[];
}

export interface ApiAdminCourse extends ApiCourse {
  quiz: ApiAdminQuiz | null;
}

export interface ApiAdminLesson extends ApiLesson {
  learning_progress_count: number;
  course: ApiCourse;
  created_at: string;
  updated_at: string;
}

export interface ApiAdminExam {
  id: number;
  course_id: number;
  title: string;
  pass_score: number;
  max_attempts: number;
  duration_minutes: number | null;
  questions_count: number;
  attempts_count: number;
  course: ApiCourse;
  created_at: string;
  updated_at: string;
}

export interface ApiAdminAttempt {
  id: number;
  enrollment_id: number;
  exam_id: number;
  score: number;
  passed: boolean;
  attempt_number: number;
  correct_count: number;
  wrong_count: number;
  submitted_at: string;
  user: ApiUser;
  course: ApiCourse;
  exam: Pick<ApiAdminExam, 'id' | 'course_id' | 'title'>;
  created_at: string;
  updated_at: string;
}

export type ApiCertificateState = 'not_eligible' | 'eligible' | 'issued';

export interface ApiAdminCertificateStatus {
  enrollment_id: number;
  user_id: number;
  course_id: number;
  user: ApiUser;
  course: ApiCourse;
  completed_lessons: number;
  total_lessons: number;
  eligible: boolean;
  latest_passing_attempt: Pick<ApiAdminAttempt, 'id' | 'exam_id' | 'score' | 'submitted_at'> | null;
  certificate: ApiCertificate | null;
  state: ApiCertificateState;
  created_at: string;
  updated_at: string;
}

export interface ApiQuizAttempt {
  id: number;
  quiz_id: number;
  score: number | null;
  passed: boolean | null;
  attempt_no: number;
  status: 'in_progress' | 'submitted' | 'expired';
  started_at: string;
  expires_at: string | null;
  finished_at: string | null;
  submitted_at: string | null;
  correct_count?: number | null;
  wrong_count?: number | null;
  total_questions?: number | null;
  answers?: Array<{
    question_id: number;
    selected_option_id: number | null;
    is_correct?: boolean;
    correct_answer_id?: number | null;
  }>;
}

export interface ApiAttemptLifecycleResponse {
  attempt: ApiQuizAttempt;
  server_now: string;
}

export interface ApiQuizSubmissionResponse extends ApiAttemptLifecycleResponse {
  passed: boolean;
  score: number;
  certificate: ApiCertificate | null;
}

export interface ApiCertificate {
  id: number;
  enrollment_id: number;
  certificate_code: string;
  issued_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiNewsList extends Paginated<ApiNewsPost> {
  categories: string[];
}
