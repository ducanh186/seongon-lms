export type UserRole = 'student' | 'admin';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published';
export type EnrollmentStatus = 'active' | 'expired';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar: string | null;
  status: 'active' | 'locked';
  created_at: string;
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
  description: string | null;
  duration: number | null;
  position: number;
  is_completed?: boolean;
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
  reviews_count?: number;
  rating?: number | null;
  category?: ApiCategory | null;
  lessons?: ApiLesson[];
  has_quiz?: boolean;
  created_at: string;
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
  can_take_exam: boolean;
}

export interface ApiEnrollment {
  id: number;
  course_id: number;
  enrolled_at: string;
  expires_at: string;
  status: EnrollmentStatus;
  is_expired: boolean;
  course?: ApiCourse;
  progress?: ApiProgress;
}

export interface ApiOrder {
  id: number;
  user_id: number;
  course_id: number;
  amount: string | number;
  status: 'pending' | 'paid' | 'failed';
  payment_method: 'card' | 'qr' | null;
  transaction_ref: string | null;
  paid_at: string | null;
  course?: ApiCourse;
  created_at: string;
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
  questions: ApiQuizQuestion[];
}

export interface ApiAdminCourse extends ApiCourse {
  quiz: ApiAdminQuiz | null;
}

export interface ApiQuizAttempt {
  id: number;
  quiz_id: number;
  score: number;
  passed: boolean;
  attempt_no: number;
  submitted_at: string;
  answers?: Array<{
    question_id: number;
    selected_option_id: number | null;
    is_correct: boolean;
  }>;
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
