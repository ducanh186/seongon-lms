<?php

use App\Http\Controllers\Api\Admin\AnswerController as AdminAnswerController;
use App\Http\Controllers\Api\Admin\AttemptController as AdminAttemptController;
use App\Http\Controllers\Api\Admin\CartController as AdminCartController;
use App\Http\Controllers\Api\Admin\CartItemController as AdminCartItemController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\CertificateController as AdminCertificateController;
use App\Http\Controllers\Api\Admin\CourseCategoryController as AdminCourseCategoryController;
use App\Http\Controllers\Api\Admin\CourseController as AdminCourseController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\EnrollmentController as AdminEnrollmentController;
use App\Http\Controllers\Api\Admin\ExamController as AdminExamController;
use App\Http\Controllers\Api\Admin\LearningProgressController as AdminLearningProgressController;
use App\Http\Controllers\Api\Admin\LessonController as AdminLessonController;
use App\Http\Controllers\Api\Admin\NewsController as AdminNewsController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\QuestionController as AdminQuestionController;
use App\Http\Controllers\Api\Admin\QuizController as AdminQuizController;
use App\Http\Controllers\Api\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Api\Admin\RoleController as AdminRoleController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\Student\CartController as StudentCartController;
use App\Http\Controllers\Api\Student\CertificateController;
use App\Http\Controllers\Api\Student\LessonController as StudentLessonController;
use App\Http\Controllers\Api\Student\MyCourseController;
use App\Http\Controllers\Api\Student\OrderController;
use App\Http\Controllers\Api\Student\QuizController as StudentQuizController;
use App\Http\Controllers\Api\Student\ReviewController as StudentReviewController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ---------- Public (Guest) ----------
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('courses', [CourseController::class, 'index']);
    Route::get('courses/{slug}', [CourseController::class, 'show']);
    Route::get('courses/{slug}/reviews', [CourseController::class, 'reviews']);
    Route::get('news', [NewsController::class, 'index']);
    Route::get('news/{slug}', [NewsController::class, 'show']);

    // ---------- Authenticated ----------
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::put('auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('auth/password', [AuthController::class, 'updatePassword']);

        // ----- Student -----
        Route::middleware('role:student')->group(function () {
            Route::get('cart', [StudentCartController::class, 'show']);
            Route::post('cart/items', [StudentCartController::class, 'storeItem']);
            Route::delete('cart/items/{cartItem}', [StudentCartController::class, 'destroyItem']);
            Route::delete('cart', [StudentCartController::class, 'destroy']);

            Route::post('orders', [OrderController::class, 'store']);
            Route::post('orders/{order}/pay', [OrderController::class, 'pay']);

            Route::get('my/courses', [MyCourseController::class, 'index']);
            Route::get('my/courses/{course}/lessons', [MyCourseController::class, 'lessons']);
            Route::get('my/courses/{course}/progress', [MyCourseController::class, 'progress']);
            Route::post('my/lessons/{lesson}/complete', [StudentLessonController::class, 'complete']);

            Route::get('my/courses/{course}/quiz', [StudentQuizController::class, 'show']);
            Route::post('my/courses/{course}/quiz/attempts', [StudentQuizController::class, 'submit']);
            Route::get('my/quiz-attempts/{attempt}', [StudentQuizController::class, 'showAttempt']);

            Route::post('my/courses/{course}/reviews', [StudentReviewController::class, 'store']);
            Route::get('my/courses/{course}/certificate', [CertificateController::class, 'download']);
        });

        // ----- Admin -----
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('roles', [AdminRoleController::class, 'index']);
            Route::get('carts', [AdminCartController::class, 'index']);
            Route::get('cart-items', [AdminCartItemController::class, 'index']);
            Route::get('orders', [AdminOrderController::class, 'index']);
            Route::get('course-categories', [AdminCourseCategoryController::class, 'index']);
            Route::get('learning-progress', [AdminLearningProgressController::class, 'index']);
            Route::get('questions', [AdminQuestionController::class, 'index']);
            Route::get('answers', [AdminAnswerController::class, 'index']);
            Route::get('orders/{order}', [AdminOrderController::class, 'show']);
            Route::get('enrollments', [AdminEnrollmentController::class, 'index']);
            Route::get('enrollments/{enrollment}', [AdminEnrollmentController::class, 'show']);
            Route::get('lessons', [AdminLessonController::class, 'index']);
            Route::get('exams', [AdminExamController::class, 'index']);
            Route::get('attempts', [AdminAttemptController::class, 'index']);
            Route::get('certificates', [AdminCertificateController::class, 'index']);

            Route::apiResource('news', AdminNewsController::class);

            Route::get('users', [AdminUserController::class, 'index']);
            Route::patch('users/{user}/status', [AdminUserController::class, 'updateStatus']);

            Route::get('categories', [AdminCategoryController::class, 'index']);
            Route::post('categories', [AdminCategoryController::class, 'store']);
            Route::put('categories/{category}', [AdminCategoryController::class, 'update']);
            Route::delete('categories/{category}', [AdminCategoryController::class, 'destroy']);

            Route::get('courses', [AdminCourseController::class, 'index']);
            Route::post('courses', [AdminCourseController::class, 'store']);
            Route::get('courses/{course}', [AdminCourseController::class, 'show']);
            Route::put('courses/{course}', [AdminCourseController::class, 'update']);
            Route::delete('courses/{course}', [AdminCourseController::class, 'destroy']);
            Route::patch('courses/{course}/publish', [AdminCourseController::class, 'publish']);

            Route::post('courses/{course}/lessons', [AdminLessonController::class, 'store']);
            Route::patch('courses/{course}/lessons/reorder', [AdminLessonController::class, 'reorder']);
            Route::put('lessons/{lesson}', [AdminLessonController::class, 'update']);
            Route::delete('lessons/{lesson}', [AdminLessonController::class, 'destroy']);

            Route::match(['post', 'put'], 'courses/{course}/quiz', [AdminQuizController::class, 'upsert']);
            Route::post('quizzes/{quiz}/questions', [AdminQuestionController::class, 'store']);
            Route::put('questions/{question}', [AdminQuestionController::class, 'update']);
            Route::delete('questions/{question}', [AdminQuestionController::class, 'destroy']);

            Route::get('reviews', [AdminReviewController::class, 'index']);
            Route::patch('reviews/{review}/status', [AdminReviewController::class, 'updateStatus']);
            Route::delete('reviews/{review}', [AdminReviewController::class, 'destroy']);

            Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        });
    });
});
