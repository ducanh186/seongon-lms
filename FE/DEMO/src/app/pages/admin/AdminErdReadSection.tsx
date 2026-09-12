import { useState } from 'react';
import { paymentMethodLabel } from '../../lib/payment';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import type {
  ApiAdminAnswerIndex,
  ApiAdminCart,
  ApiAdminCartItem,
  ApiAdminCourseCategory,
  ApiAdminLearningProgress,
  ApiAdminOrder,
  ApiAdminQuestionIndex,
  ApiAdminRole,
} from '../../lib/contracts';
import { adminRepositories } from '../../data/repositories/adminRepositories';
import { AdminReadOnlyIndex, type AdminReadFilter } from '../../components/AdminReadOnlyIndex';
import type { AdminColumn } from '../../components/AdminDataTable';

export type AdminErdReadSectionKey =
  | 'roles'
  | 'carts'
  | 'cartItems'
  | 'orders'
  | 'courseCategories'
  | 'learningProgress'
  | 'questions'
  | 'answers';

type Props = {
  section: AdminErdReadSectionKey;
  token: string;
  onOpenCourse: (courseId: number) => void;
};

const searchFilter: AdminReadFilter = { key: 'q', label: 'Tìm kiếm', kind: 'text' };
const courseFilter: AdminReadFilter = { key: 'course_id', label: 'Mã khóa học', kind: 'number' };
const examFilter: AdminReadFilter = { key: 'exam_id', label: 'Mã bài kiểm tra', kind: 'number' };

const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
// Currency must never wrap between the amount and the đ symbol.
const money = (value: string | number) => (
  <Typography component="span" sx={{ whiteSpace: 'nowrap' }}>{Number(value).toLocaleString('vi-VN')} đ</Typography>
);

const identity = (name: string, email: string) => (
  <Stack spacing={0.25} sx={{ minWidth: 180 }}>
    <Typography fontWeight={750}>{name}</Typography>
    <Typography variant="body2" color="text.secondary">{email}</Typography>
  </Stack>
);

const loadFinishedOrders = (token: string, filters: Record<string, string | number | undefined>) =>
  adminRepositories.orders.list(token, { ...filters, payment_result: filters.payment_result || 'finished' });

const orderResultLabel = (order: ApiAdminOrder) => order.status === 'paid' ? 'Đã thanh toán' : 'Thanh toán thất bại';

export function AdminErdReadSection({ section, token, onOpenCourse }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<ApiAdminOrder | null>(null);
  switch (section) {
    case 'roles':
      return (
        <AdminReadOnlyIndex<ApiAdminRole>
          key={section}
          token={token}
          label="Danh sách vai trò"
          emptyTitle="Không có vai trò phù hợp."
          filters={[searchFilter]}
          loader={adminRepositories.roles.list}
          getRowKey={(role) => role.id}
          columns={[
            { key: 'id', header: 'ID', align: 'center', render: (role) => role.id },
            { key: 'code', header: 'Mã', render: (role) => role.code },
            { key: 'name', header: 'Vai trò', render: (role) => <Typography fontWeight={750}>{role.name}</Typography> },
            { key: 'description', header: 'Mô tả', render: (role) => role.description || '—' },
            { key: 'users', header: 'Người dùng', align: 'center', render: (role) => role.users_count },
            { key: 'updated', header: 'Cập nhật', render: (role) => date(role.updated_at) },
          ] satisfies AdminColumn<ApiAdminRole>[]}
        />
      );

    case 'carts':
      return (
        <AdminReadOnlyIndex<ApiAdminCart>
          key={section}
          token={token}
          label="Danh sách giỏ hàng"
          emptyTitle="Không có giỏ hàng phù hợp."
          filters={[
            searchFilter,
            {
              key: 'state',
              label: 'Trạng thái',
              kind: 'select',
              options: [
                { value: 'non_empty', label: 'Có sản phẩm' },
                { value: 'empty', label: 'Trống' },
              ],
            },
          ]}
          loader={adminRepositories.carts.list}
          getRowKey={(cart) => cart.id}
          columns={[
            { key: 'id', header: 'Mã giỏ hàng', align: 'center', render: (cart) => cart.id },
            { key: 'student', header: 'Học viên', render: (cart) => identity(cart.user.name, cart.user.email) },
            { key: 'items', header: 'Số mục', align: 'center', render: (cart) => cart.items_count },
            { key: 'total', header: 'Giá trị hiện tại', align: 'right', render: (cart) => money(cart.current_total) },
            { key: 'updated', header: 'Cập nhật', render: (cart) => date(cart.updated_at) },
          ] satisfies AdminColumn<ApiAdminCart>[]}
        />
      );

    case 'cartItems':
      return (
        <AdminReadOnlyIndex<ApiAdminCartItem>
          key={section}
          token={token}
          label="Danh sách mục giỏ hàng"
          emptyTitle="Không có mục giỏ hàng phù hợp."
          filters={[searchFilter, courseFilter]}
          loader={adminRepositories.cartItems.list}
          getRowKey={(item) => item.id}
          columns={[
            { key: 'id', header: 'Mã mục', align: 'center', render: (item) => item.id },
            { key: 'cart', header: 'Mã giỏ hàng', align: 'center', render: (item) => item.cart_id },
            { key: 'student', header: 'Học viên', render: (item) => identity(item.user.name, item.user.email) },
            { key: 'course', header: 'Khóa học', render: (item) => <Typography fontWeight={750}>{item.course.title}</Typography> },
            { key: 'price', header: 'Giá hiện tại', align: 'right', render: (item) => money(item.course.price) },
            { key: 'added', header: 'Ngày thêm', render: (item) => date(item.created_at) },
          ] satisfies AdminColumn<ApiAdminCartItem>[]}
        />
      );

    case 'orders':
      return (
        <>
        <AdminReadOnlyIndex<ApiAdminOrder>
          key={section}
          token={token}
          label="Danh sách đơn hàng"
          minWidth={0}
          fixedLayout
          emptyTitle="Không có đơn hàng phù hợp."
          filters={[
            { key: 'order_id', label: 'Mã đơn hàng', kind: 'number' },
            courseFilter,
            { key: 'course_title', label: 'Tên khóa học', kind: 'text' },
            { key: 'student', label: 'Tài khoản học viên', kind: 'text' },
            {
              key: 'payment_result',
              label: 'Trạng thái',
              kind: 'select',
              options: [
                { value: 'paid', label: 'Đã thanh toán' },
                { value: 'failed', label: 'Thanh toán thất bại' },
              ],
              disableScrollLock: true,
            },
            { key: 'created_on', label: 'Ngày tạo', kind: 'date' },
          ]}
          loader={loadFinishedOrders}
          getRowKey={(order) => order.id}
          onRowClick={setSelectedOrder}
          columns={[
            { key: 'id', header: 'Mã đơn hàng', width: 108, align: 'center', render: (order) => order.id },
            { key: 'student', header: 'Học viên', width: 195, render: (order) => identity(order.user.name, order.user.email) },
            { key: 'courseId', header: 'Mã khóa học', width: 106, align: 'center', render: (order) => order.course.id },
            { key: 'course', header: 'Khóa học', render: (order) => order.course.title },
            { key: 'total', header: 'Tổng tiền', width: 120, align: 'center', render: (order) => <Typography sx={{ whiteSpace: 'nowrap', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{Number(order.total_amount).toLocaleString('vi-VN')} đ</Typography> },
            { key: 'status', header: 'Trạng thái', width: 166, render: (order) => <Chip size="small" label={orderResultLabel(order)} color={order.status === 'paid' ? 'primary' : 'default'} /> },
            { key: 'created', header: 'Ngày tạo', width: 112, render: (order) => <Typography sx={{ whiteSpace: 'nowrap' }}>{date(order.created_at)}</Typography> },
          ] satisfies AdminColumn<ApiAdminOrder>[]}
        />
        <Dialog open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} aria-labelledby="order-detail-title" maxWidth="sm" fullWidth>
          <DialogTitle id="order-detail-title">Chi tiết đơn hàng #{selectedOrder?.id}</DialogTitle>
          {selectedOrder && <DialogContent><Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr)', gap: 2 }}>
            {[
              ['Mã đơn hàng', selectedOrder.id],
              ['Học viên', selectedOrder.user?.name ?? '—'],
              ['Email học viên', selectedOrder.user?.email ?? '—'],
              ['Khóa học', selectedOrder.course?.title ?? '—'],
              ['Mã khóa học', selectedOrder.course?.id ?? selectedOrder.course_id ?? '—'],
              ['Tổng tiền', selectedOrder.total_amount == null ? '—' : money(selectedOrder.total_amount)],
              ['Phương thức thanh toán', paymentMethodLabel(selectedOrder.payment_method)],
              ['Trạng thái', orderResultLabel(selectedOrder)],
              ['Lý do', selectedOrder.failure_reason ?? '—'],
              ['Mã giao dịch', selectedOrder.status === 'paid' ? selectedOrder.transaction_ref ?? '—' : '—'],
              ['Thời gian thanh toán', selectedOrder.paid_at ? new Date(selectedOrder.paid_at).toLocaleString('vi-VN') : '—'],
              ['Ngày tạo đơn', selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('vi-VN') : '—'],
            ].map(([label, value]) => <Box key={String(label)} sx={{ display: 'contents' }}><Typography component="dt" color="text.secondary">{label}</Typography><Box component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>{value}</Box></Box>)}
          </Box></DialogContent>}
          <DialogActions><Button onClick={() => setSelectedOrder(null)}>Đóng</Button></DialogActions>
        </Dialog>
        </>
      );

    case 'courseCategories':
      return (
        <AdminReadOnlyIndex<ApiAdminCourseCategory>
          key={section}
          token={token}
          label="Danh sách gán danh mục"
          emptyTitle="Không có quan hệ danh mục phù hợp."
          filters={[courseFilter, { key: 'category_id', label: 'Mã danh mục', kind: 'number' }]}
          loader={adminRepositories.courseCategories.list}
          getRowKey={(assignment) => assignment.id}
          columns={[
            { key: 'id', header: 'Mã gán', align: 'center', render: (assignment) => assignment.id },
            { key: 'courseId', header: 'Mã khóa học', align: 'center', render: (assignment) => assignment.course_id },
            { key: 'course', header: 'Khóa học', render: (assignment) => <Typography fontWeight={750}>{assignment.course.title}</Typography> },
            { key: 'categoryId', header: 'Mã danh mục', align: 'center', render: (assignment) => assignment.category_id },
            { key: 'category', header: 'Danh mục', render: (assignment) => assignment.category.name },
            { key: 'created', header: 'Ngày gán', render: (assignment) => date(assignment.created_at) },
          ] satisfies AdminColumn<ApiAdminCourseCategory>[]}
        />
      );

    case 'learningProgress':
      return (
        <AdminReadOnlyIndex<ApiAdminLearningProgress>
          key={section}
          token={token}
          label="Danh sách tiến độ học tập"
          emptyTitle="Không có tiến độ học tập phù hợp."
          filters={[
            searchFilter,
            courseFilter,
            {
              key: 'completed',
              label: 'Hoàn thành',
              kind: 'select',
              options: [
                { value: '1', label: 'Đã hoàn thành' },
                { value: '0', label: 'Chưa hoàn thành' },
              ],
            },
          ]}
          loader={adminRepositories.learningProgress.list}
          getRowKey={(progress) => progress.id}
          columns={[
            { key: 'id', header: 'Mã tiến độ', align: 'center', render: (progress) => progress.id },
            { key: 'student', header: 'Học viên', render: (progress) => identity(progress.user.name, progress.user.email) },
            { key: 'course', header: 'Khóa học', render: (progress) => progress.course.title },
            { key: 'lesson', header: 'Bài học', render: (progress) => <Typography fontWeight={750}>{progress.lesson.title}</Typography> },
            { key: 'state', header: 'Trạng thái', render: (progress) => progress.is_completed ? 'Đã hoàn thành' : 'Chưa hoàn thành' },
            { key: 'completed', header: 'Hoàn thành lúc', render: (progress) => date(progress.completed_at) },
          ] satisfies AdminColumn<ApiAdminLearningProgress>[]}
        />
      );

    case 'questions':
      return (
        <AdminReadOnlyIndex<ApiAdminQuestionIndex>
          key={section}
          token={token}
          label="Danh sách câu hỏi"
          emptyTitle="Không có câu hỏi phù hợp."
          filters={[searchFilter, courseFilter, examFilter]}
          loader={adminRepositories.questions.list}
          getRowKey={(question) => question.id}
          minWidth={1100}
          columns={[
            { key: 'id', header: 'Mã câu hỏi', align: 'center', render: (question) => question.id },
            { key: 'course', header: 'Khóa học', render: (question) => question.course.title },
            { key: 'exam', header: 'Bài kiểm tra', render: (question) => question.exam.title },
            { key: 'content', header: 'Câu hỏi', render: (question) => <Typography fontWeight={750} sx={{ minWidth: 260 }}>{question.content}</Typography> },
            { key: 'answers', header: 'Đáp án', align: 'center', render: (question) => question.answers_count },
            { key: 'order', header: 'Thứ tự', align: 'center', render: (question) => question.sort_order ?? '—' },
            { key: 'updated', header: 'Cập nhật', render: (question) => date(question.updated_at) },
            { key: 'action', header: 'Thao tác', align: 'right', render: (question) => <Button size="small" onClick={() => onOpenCourse(question.course.id)}>Mở bài kiểm tra</Button> },
          ] satisfies AdminColumn<ApiAdminQuestionIndex>[]}
        />
      );

    case 'answers':
      return (
        <AdminReadOnlyIndex<ApiAdminAnswerIndex>
          key={section}
          token={token}
          label="Danh sách đáp án"
          emptyTitle="Không có đáp án phù hợp."
          filters={[
            searchFilter,
            courseFilter,
            examFilter,
            {
              key: 'correct',
              label: 'Kết quả',
              kind: 'select',
              options: [
                { value: '1', label: 'Đáp án đúng' },
                { value: '0', label: 'Đáp án sai' },
              ],
            },
          ]}
          loader={adminRepositories.answers.list}
          getRowKey={(answer) => answer.id}
          minWidth={1200}
          columns={[
            { key: 'id', header: 'Mã đáp án', align: 'center', render: (answer) => answer.id },
            { key: 'course', header: 'Khóa học', render: (answer) => answer.course.title },
            { key: 'exam', header: 'Bài kiểm tra', render: (answer) => answer.exam.title },
            { key: 'question', header: 'Câu hỏi', render: (answer) => <Typography sx={{ minWidth: 240 }}>{answer.question.content}</Typography> },
            { key: 'answer', header: 'Đáp án', render: (answer) => <Typography fontWeight={750} sx={{ minWidth: 220 }}>{answer.content}</Typography> },
            { key: 'correct', header: 'Kết quả', render: (answer) => answer.is_correct ? 'Đúng' : 'Sai' },
            { key: 'updated', header: 'Cập nhật', render: (answer) => date(answer.updated_at) },
            { key: 'action', header: 'Thao tác', align: 'right', render: (answer) => <Button size="small" onClick={() => onOpenCourse(answer.course.id)}>Mở bài kiểm tra</Button> },
          ] satisfies AdminColumn<ApiAdminAnswerIndex>[]}
        />
      );
  }
}
