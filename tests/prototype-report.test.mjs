import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from '../FE/DEMO/node_modules/jsdom/lib/api.js';

const html = await readFile(new URL('../SPEC/seongon_learning_prototype_v3.html', import.meta.url), 'utf8');
const DAY = 86_400_000;

function createApp(state) {
  let printCalls = 0;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://prototype.test/#/admin',
    beforeParse(window) {
      window.scrollTo = () => {};
      window.print = () => { printCalls += 1; };
      window.confirm = () => true;
      window.localStorage.setItem('seongon_learning_state_v1', JSON.stringify(state));
    },
  });
  return { dom, window: dom.window, getPrintCalls: () => printCalls };
}

function baseState() {
  return {
    users: [
      { id: 'admin-1', fullName: 'Admin Test', email: 'admin@test.local', role: 'admin', status: 'active' },
      { id: 'student-1', fullName: 'Student Test', email: 'student@test.local', role: 'student', status: 'active' },
    ],
    currentUser: { id: 'admin-1', fullName: 'Admin Test', email: 'admin@test.local', role: 'admin', status: 'active' },
    courses: [
      { id: 'paid-course', title: 'Paid Course', category: 'SEO', price: 1_000_000, status: 'PUBLISHED', students: 0, lessons: [] },
      { id: 'free-course', title: 'Free Course', category: 'SEO', price: 0, status: 'PUBLISHED', students: 0, lessons: [] },
    ],
    categories: ['SEO'],
    enrollments: [],
    orders: [],
    report_exports: [],
    reviews: [],
    quizResults: [],
    quizzes: {},
    cartItems: [],
    blogPosts: [],
    activeCourseId: null,
    activeLessonId: null,
  };
}

test('BC-01 derives the latest 12 calendar months from enrollments', () => {
  const { window } = createApp(baseState());
  const referenceDate = new Date('2026-09-10T12:00:00+07:00');
  const enrollments = [
    { enrolledAt: new Date('2026-08-03T10:00:00+07:00').getTime() },
    { enrolledAt: new Date('2026-09-01T10:00:00+07:00').getTime() },
    { enrolledAt: new Date('2026-09-05T10:00:00+07:00').getTime() },
    { enrolledAt: new Date('2025-09-05T10:00:00+07:00').getTime() },
  ];

  const report = window.buildEnrollmentReportData(enrollments, referenceDate);

  assert.equal(report.monthly.length, 12);
  assert.equal(report.monthly[0].key, '2025-10');
  assert.equal(report.monthly.at(-1).key, '2026-09');
  assert.equal(report.monthly.at(-2).count, 1);
  assert.equal(report.monthly.at(-1).count, 2);
  assert.equal(report.summary.total, 3);
  assert.equal(report.summary.latestGrowth, 100);
});

test('BC-05 counts paid orders only and groups revenue without equating free enrollments to orders', () => {
  const { window } = createApp(baseState());
  const referenceDate = new Date('2026-09-10T12:00:00+07:00');
  const orders = [
    { id: 'o1', status: 'PAID', paymentMethod: 'qr', paidAt: referenceDate.getTime() - DAY, amount: 1_000_000, items: [{ courseId: 'paid-course', title: 'Paid Course', amount: 1_000_000 }] },
    { id: 'o2', status: 'PAID', paymentMethod: 'card', paidAt: referenceDate.getTime(), amount: 500_000, items: [{ courseId: 'paid-course', title: 'Paid Course', amount: 500_000 }] },
    { id: 'o3', status: 'PENDING', paymentMethod: 'qr', createdAt: referenceDate.getTime(), amount: 9_000_000, items: [{ courseId: 'paid-course', title: 'Paid Course', amount: 9_000_000 }] },
  ];

  const report = window.buildRevenueReportData(orders, baseState().courses, referenceDate);

  assert.equal(report.summary.totalRevenue, 1_500_000);
  assert.equal(report.summary.paidOrderCount, 2);
  assert.equal(report.summary.averageOrderValue, 750_000);
  assert.deepEqual(Array.from(report.byPayment, row => [row.method, row.revenue]), [['qr', 1_000_000], ['card', 500_000]]);
  assert.equal(report.byCourse[0].revenue, 1_500_000);
});

test('admin dashboard exposes one report dropdown and renders real enrollment and revenue charts', () => {
  const state = baseState();
  state.enrollments.push({ id: 'e1', userId: 'student-1', courseId: 'free-course', enrolledAt: Date.now(), progress: { completed: [], total: 0 } });
  state.orders.push({ id: 'o1', userId: 'student-1', status: 'PAID', paymentMethod: 'qr', paidAt: Date.now(), amount: 1_000_000, items: [{ courseId: 'paid-course', title: 'Paid Course', amount: 1_000_000 }] });
  const { window } = createApp(state);

  assert.equal(window.document.querySelectorAll('#report-export-menu').length, 1);
  assert.match(window.document.body.textContent, /Báo cáo ghi danh \(BC-01\)/);
  assert.match(window.document.body.textContent, /Báo cáo doanh thu \(BC-05\)/);
  assert.match(window.document.body.textContent, /Doanh thu 12 tháng gần nhất/);
  assert.match(window.document.body.textContent, /1\.000\.000/);
});

test('exporting BC-01 renders the report sheet, records trace data, and invokes print', () => {
  const state = baseState();
  const { window, getPrintCalls } = createApp(state);

  window.exportReport('BC-01');

  const sheet = window.document.querySelector('#report-sheet');
  assert.ok(sheet);
  assert.equal(sheet.dataset.reportCode, 'BC-01');
  assert.equal(sheet.querySelectorAll('[data-report-block]').length, 6);
  assert.match(sheet.textContent, /Admin Test/);
  assert.equal(getPrintCalls(), 1);
  const saved = JSON.parse(window.localStorage.getItem('seongon_learning_state_v1'));
  assert.equal(saved.report_exports.length, 1);
  assert.equal(saved.report_exports[0].report_code, 'BC-01');
  assert.equal(saved.report_exports[0].admin_id, 'admin-1');
});

test('exporting BC-05 renders three tables and states the paid-order and free-course rules', () => {
  const state = baseState();
  state.enrollments.push({ id: 'free-enrollment', userId: 'student-1', courseId: 'free-course', enrolledAt: Date.now(), progress: { completed: [], total: 0 } });
  state.orders.push({ id: 'paid-order', userId: 'student-1', status: 'PAID', paymentMethod: 'qr', paidAt: Date.now(), amount: 1_000_000, items: [{ courseId: 'paid-course', title: 'Paid Course', amount: 1_000_000 }] });
  const { window } = createApp(state);

  window.exportReport('BC-05');

  const sheet = window.document.querySelector('#report-sheet');
  assert.equal(sheet.dataset.reportCode, 'BC-05');
  assert.equal(sheet.querySelectorAll('.report-table').length, 3);
  assert.match(sheet.textContent, /đã thanh toán, chưa trừ hoàn tiền/);
  assert.match(sheet.textContent, /khóa học miễn phí/i);
  assert.equal(JSON.parse(window.localStorage.getItem('seongon_learning_state_v1')).report_exports[0].report_code, 'BC-05');
});

test('checkout creates one paid order while enrolling paid and free courses separately', () => {
  const state = baseState();
  state.currentUser = state.users[1];
  state.cartItems = [
    { id: 'cart-paid', userId: 'student-1', courseId: 'paid-course' },
    { id: 'cart-free', userId: 'student-1', courseId: 'free-course' },
  ];
  const { window } = createApp(state);
  window._checkout = { method: 'qr' };

  window.confirmCheckout();

  const saved = JSON.parse(window.localStorage.getItem('seongon_learning_state_v1'));
  assert.equal(saved.enrollments.length, 2);
  assert.equal(saved.orders.length, 1);
  assert.equal(saved.orders[0].status, 'PAID');
  assert.equal(saved.orders[0].paymentMethod, 'qr');
  assert.equal(saved.orders[0].amount, 1_000_000);
  assert.equal(saved.orders[0].items.length, 2);
});
