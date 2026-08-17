import { api } from '../../lib/api';

// Persistence adapter: approved Laravel JSON API contracts.
export const applicationRepositories = {
  auth: {
    me: api.me,
    login: api.login,
    register: api.register,
    logout: api.logout,
  },
  catalog: {
    listCategories: api.categories,
    listCourses: api.courses,
    getCourse: api.course,
    listReviews: api.reviews,
  },
  learning: {
    listMyCourses: api.myCourses,
    listLessons: api.lessons,
    getProgress: api.progress,
    completeLesson: api.completeLesson,
    getQuiz: api.quiz,
    submitQuiz: api.submitQuiz,
    reviewCourse: api.reviewCourse,
    downloadCertificate: api.downloadCertificate,
  },
  checkout: {
    createOrder: api.createOrder,
    payOrder: api.payOrder,
  },
  cart: {
    get: api.getCart,
    add: api.addCartItem,
    remove: api.deleteCartItem,
    clear: api.clearCart,
  },
  news: {
    list: api.news,
    get: api.newsPost,
  },
  profile: {
    update: api.updateProfile,
    updatePassword: api.updatePassword,
  },
} as const;
