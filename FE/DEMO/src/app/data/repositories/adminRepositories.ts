import { api } from '../../lib/api';

// Persistence adapter: approved Laravel JSON API contracts.
export const adminRepositories = {
  catalogs: {
    list: api.adminCatalogs,
    create: api.createCatalog,
    update: api.updateCatalog,
    remove: api.deleteCatalog,
  },
  dashboard: {
    getStats: api.adminStats,
  },
  roles: {
    list: api.adminRoles,
  },
  carts: {
    list: api.adminCarts,
  },
  cartItems: {
    list: api.adminCartItems,
  },
  orders: {
    list: api.adminOrders,
  },
  courseCategories: {
    list: api.adminCourseCategories,
  },
  learningProgress: {
    list: api.adminLearningProgress,
  },
  questions: {
    list: api.adminQuestions,
  },
  answers: {
    list: api.adminAnswers,
  },
  users: {
    list: api.adminUsers,
    get: api.adminUser,
    records: api.adminUserRecords,
    updateStatus: api.updateUserStatus,
    updateRole: api.updateUserRole,
  },
  categories: {
    list: api.adminCategories,
    create: api.createCategory,
    update: api.updateCategory,
    remove: api.deleteCategory,
  },
  courses: {
    list: api.adminCourses,
    get: api.adminCourse,
    uploadImage: api.uploadCourseImage,
    save: api.saveCourse,
    publish: api.publishCourse,
    remove: api.deleteCourse,
    saveLesson: api.saveLesson,
    reorderLessons: api.reorderLessons,
    removeLesson: api.deleteLesson,
    saveQuiz: api.saveQuiz,
    removeQuiz: api.deleteQuiz,
    saveQuestion: api.saveQuestion,
    updateQuestion: api.updateQuestion,
    removeQuestion: api.deleteQuestion,
  },
  lessons: {
    list: api.adminLessons,
  },
  exams: {
    list: api.adminExams,
  },
  enrollments: {
    list: api.adminEnrollments,
  },
  attempts: {
    list: api.adminAttempts,
  },
  certificates: {
    list: api.adminCertificates,
  },
  reviews: {
    list: api.adminReviews,
    updateStatus: api.updateReviewStatus,
    remove: api.deleteReview,
  },
  news: {
    list: api.adminNews,
    save: api.saveNews,
    uploadImage: api.uploadNewsImage,
    remove: api.deleteNews,
  },
} as const;

export type DashboardRepository = typeof adminRepositories.dashboard;
