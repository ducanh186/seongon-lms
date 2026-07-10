export type UserRole = 'guest' | 'student' | 'admin' | 'recruiter';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: string;
  price: number;
  thumbnail: string;
  category: string;
  rating: number;
  totalStudents: number;
  lessons: Lesson[];
  reviews?: CourseReview[];
}

export interface CourseReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  completed?: boolean;
}

export interface CourseCombo {
  id: string;
  title: string;
  description: string;
  courses: string[];
  price: number;
  discount: number;
  linkedInternship?: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: Date;
  progress: number;
  completed: boolean;
  examScore?: number;
  certificateIssued: boolean;
  expiresAt: Date;
}

export interface VirtualInternship {
  id: string;
  title: string;
  position: string;
  requiredComboId: string;
  description: string;
  tasks: InternshipTask[];
  duration: number; // in hours
}

export interface InternshipTask {
  id: string;
  title: string;
  description: string;
  deliverable: string;
}

export interface InternshipSubmission {
  id: string;
  internshipId: string;
  userId: string;
  submittedAt: Date;
  tasks: { taskId: string; answer: string }[];
  feedback?: string;
  passed?: boolean;
  certificateIssued?: boolean;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  postedDate: Date;
  recruiterId: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  cvUrl: string;
  coverLetter: string;
  submittedAt: Date;
  status: 'pending' | 'reviewed' | 'rejected' | 'accepted';
}