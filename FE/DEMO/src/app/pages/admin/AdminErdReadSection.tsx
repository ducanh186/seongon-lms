import { Button, Chip, Stack, Typography } from '@mui/material';
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
const courseFilter: AdminReadFilter = { key: 'course_id', label: 'Course ID', kind: 'number' };
const examFilter: AdminReadFilter = { key: 'exam_id', label: 'Exam ID', kind: 'number' };

const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const money = (value: string | number) => Number(value).toLocaleString('vi-VN') + ' đ';

const identity = (name: string, email: string) => (
  <Stack spacing={0.25} sx={{ minWidth: 180 }}>
    <Typography fontWeight={750}>{name}</Typography>
    <Typography variant="body2" color="text.secondary">{email}</Typography>
  </Stack>
);

export function AdminErdReadSection({ section, token, onOpenCourse }: Props) {
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
            { key: 'id', header: 'ID', align: 'right', render: (role) => role.id },
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
            { key: 'id', header: 'Cart ID', align: 'right', render: (cart) => cart.id },
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
            { key: 'id', header: 'Item ID', align: 'right', render: (item) => item.id },
            { key: 'cart', header: 'Cart ID', align: 'right', render: (item) => item.cart_id },
            { key: 'student', header: 'Học viên', render: (item) => identity(item.user.name, item.user.email) },
            { key: 'course', header: 'Khóa học', render: (item) => <Typography fontWeight={750}>{item.course.title}</Typography> },
            { key: 'price', header: 'Giá hiện tại', align: 'right', render: (item) => money(item.course.price) },
            { key: 'added', header: 'Ngày thêm', render: (item) => date(item.created_at) },
          ] satisfies AdminColumn<ApiAdminCartItem>[]}
        />
      );

    case 'orders':
      return (
        <AdminReadOnlyIndex<ApiAdminOrder>
          key={section}
          token={token}
          label="Danh sách đơn hàng"
          emptyTitle="Không có đơn hàng phù hợp."
          filters={[
            searchFilter,
            courseFilter,
            {
              key: 'status',
              label: 'Trạng thái',
              kind: 'select',
              options: [
                { value: 'pending', label: 'Chờ thanh toán' },
                { value: 'paid', label: 'Đã thanh toán' },
                { value: 'failed', label: 'Thất bại' },
              ],
            },
          ]}
          loader={adminRepositories.orders.list}
          getRowKey={(order) => order.id}
          columns={[
            { key: 'id', header: 'Order ID', align: 'right', render: (order) => order.id },
            { key: 'student', header: 'Học viên', render: (order) => identity(order.user.name, order.user.email) },
            { key: 'course', header: 'Khóa học', render: (order) => order.course.title },
            { key: 'total', header: 'Tổng tiền', align: 'right', render: (order) => money(order.total_amount) },
            { key: 'status', header: 'Trạng thái', render: (order) => <Chip size="small" label={{ pending: 'Chờ thanh toán', paid: 'Đã thanh toán', failed: 'Thất bại' }[order.status]} color={order.status === 'paid' ? 'primary' : 'default'} /> },
            { key: 'reference', header: 'Mã giao dịch', render: (order) => order.transaction_ref || '—' },
            { key: 'created', header: 'Ngày tạo', render: (order) => date(order.created_at) },
          ] satisfies AdminColumn<ApiAdminOrder>[]}
        />
      );

    case 'courseCategories':
      return (
        <AdminReadOnlyIndex<ApiAdminCourseCategory>
          key={section}
          token={token}
          label="Danh sách gán danh mục"
          emptyTitle="Không có quan hệ danh mục phù hợp."
          filters={[courseFilter, { key: 'category_id', label: 'Category ID', kind: 'number' }]}
          loader={adminRepositories.courseCategories.list}
          getRowKey={(assignment) => assignment.id}
          columns={[
            { key: 'id', header: 'Pivot ID', align: 'right', render: (assignment) => assignment.id },
            { key: 'courseId', header: 'Course ID', align: 'right', render: (assignment) => assignment.course_id },
            { key: 'course', header: 'Khóa học', render: (assignment) => <Typography fontWeight={750}>{assignment.course.title}</Typography> },
            { key: 'categoryId', header: 'Category ID', align: 'right', render: (assignment) => assignment.category_id },
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
            { key: 'id', header: 'Progress ID', align: 'right', render: (progress) => progress.id },
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
            { key: 'id', header: 'Question ID', align: 'right', render: (question) => question.id },
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
            { key: 'id', header: 'Answer ID', align: 'right', render: (answer) => answer.id },
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
