import { api } from '../../lib/api';

// Current persistence adapter: Laravel JSON API.
// ERD_PENDING: repository contracts may change only after the final ERD is approved.
export const adminRepositories = {
  dashboard: {
    getStats: api.adminStats,
  },
  users: {
    list: api.adminUsers,
    updateStatus: api.updateUserStatus,
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
    save: api.saveCourse,
    publish: api.publishCourse,
    remove: api.deleteCourse,
    saveLesson: api.saveLesson,
    reorderLessons: api.reorderLessons,
    removeLesson: api.deleteLesson,
    saveQuiz: api.saveQuiz,
    saveQuestion: api.saveQuestion,
    updateQuestion: api.updateQuestion,
    removeQuestion: api.deleteQuestion,
  },
  enrollments: {
    list: api.adminEnrollments,
  },
  reviews: {
    list: api.adminReviews,
    updateStatus: api.updateReviewStatus,
    remove: api.deleteReview,
  },
  news: {
    list: api.adminNews,
    save: api.saveNews,
    remove: api.deleteNews,
  },
} as const;

export type DashboardRepository = typeof adminRepositories.dashboard;
