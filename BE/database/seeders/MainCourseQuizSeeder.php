<?php

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\Course;
use App\Models\Exam;
use App\Models\Question;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Original scenario questions based on the linked primary-source guides.
 * Each course has 20 distinct concepts and five workplace contexts (100 items).
 */
class MainCourseQuizSeeder extends Seeder
{
    private const CONTEXTS = [
        'Khi bắt đầu một dự án mới',
        'Khi rà soát kết quả tháng đầu',
        'Khi hướng dẫn một đồng nghiệp',
        'Khi xử lý một chiến dịch đang chậm tiến độ',
        'Khi trình bày kế hoạch với khách hàng',
    ];

    // https://developers.google.com/search/docs/fundamentals/seo-starter-guide
    // https://developers.google.com/search/docs/fundamentals/creating-helpful-content
    private const SEO = [
        ['SEO giúp người dùng và công cụ tìm kiếm làm gì?', 'Tìm và hiểu nội dung hữu ích', 'Mua vị trí xếp hạng tự nhiên', 'Ẩn toàn bộ trang khỏi tìm kiếm'],
        ['Sitemap XML hỗ trợ việc gì?', 'Giúp công cụ tìm kiếm khám phá URL quan trọng', 'Bảo đảm mọi URL đứng đầu', 'Thay thế hoàn toàn liên kết nội bộ'],
        ['Thẻ title nên phục vụ mục đích gì?', 'Mô tả chính xác nội dung trang', 'Lặp từ khóa càng nhiều càng tốt', 'Ẩn chủ đề chính của trang'],
        ['Nội dung hữu ích ưu tiên ai?', 'Người đọc có nhu cầu thực', 'Thuật toán thay cho người đọc', 'Chỉ người viết nội dung'],
        ['Liên kết nội bộ tốt giúp ích gì?', 'Giúp người dùng và crawler tìm trang liên quan', 'Tự động tăng ngân sách quảng cáo', 'Chặn trang đích khỏi index'],
        ['Một URL không muốn xuất hiện trong kết quả tìm kiếm nên dùng gì?', 'Chỉ thị noindex phù hợp', 'Chỉ tăng số từ trên trang', 'Thêm nhiều quảng cáo'],
        ['Vì sao cần kiểm tra trang có được index?', 'Để phân biệt lỗi khám phá với lỗi xếp hạng', 'Để thay thế nghiên cứu người dùng', 'Để bỏ qua nội dung trang'],
        ['Alt text của ảnh nên làm gì?', 'Mô tả nội dung ảnh trong ngữ cảnh', 'Nhồi mọi từ khóa có thể', 'Để trống cho mọi ảnh có ý nghĩa'],
        ['Khi đổi URL quan trọng nên làm gì?', 'Thiết lập chuyển hướng phù hợp', 'Xóa mọi liên kết đến trang cũ', 'Giữ hai bản trùng lặp mãi mãi'],
        ['Canonical được dùng để làm gì?', 'Báo phiên bản URL đại diện khi nội dung trùng', 'Đặt giá thầu quảng cáo', 'Tạo chứng chỉ khóa học'],
        ['Từ khóa nên được chọn dựa trên điều gì?', 'Nhu cầu tìm kiếm và chủ đề thực của trang', 'Mật độ lặp từ khóa cố định', 'Độ dài tên miền'],
        ['Khi viết mô tả cho trang sản phẩm, ưu tiên gì?', 'Thông tin cụ thể giúp người mua quyết định', 'Văn bản sao chép hàng loạt', 'Chỉ liệt kê từ khóa'],
        ['Cấu trúc heading tốt giúp gì?', 'Giúp người đọc quét và hiểu các phần', 'Tự tạo backlink', 'Bỏ qua nội dung chính'],
        ['Vì sao trang di động cần dễ dùng?', 'Người dùng cần trải nghiệm rõ ràng trên thiết bị của họ', 'Vì chỉ trang desktop được index', 'Vì quảng cáo luôn miễn phí'],
        ['Dữ liệu Search Console giúp kiểm tra điều gì?', 'Hiệu suất và trạng thái hiện diện trên Google Search', 'Doanh thu mọi kênh không cần cấu hình', 'Số lượng đơn hàng trong CRM'],
        ['Khi traffic organic giảm, bước đầu hợp lý là gì?', 'Đối chiếu trang, truy vấn và thời điểm thay đổi', 'Viết lại toàn bộ website ngay', 'Xóa tài khoản Search Console'],
        ['Nội dung cập nhật nên dựa trên điều gì?', 'Thông tin mới thực sự giúp người đọc', 'Chỉ đổi ngày xuất bản', 'Chỉ thêm số từ'],
        ['Trang quan trọng bị chặn crawl nên kiểm tra gì?', 'Quy tắc robots và khả năng truy cập URL', 'Màu nút mua hàng', 'Ảnh đại diện giảng viên'],
        ['Một đoạn anchor text hữu ích nên thế nào?', 'Cho biết đích liên kết nói về gì', 'Luôn là cùng một từ chung chung', 'Không liên quan nội dung đích'],
        ['Khi đánh giá hiệu quả SEO, cần gắn chỉ số với gì?', 'Mục tiêu kinh doanh và nhu cầu người dùng', 'Chỉ số lượt xem bất kỳ', 'Số lượng tab trình duyệt'],
    ];

    // https://support.google.com/google-ads/answer/6167118
    // https://support.google.com/google-ads/answer/14996023
    // https://support.google.com/google-ads/answer/9451527
    private const ADS = [
        ['Quality Score có vai trò gì?', 'Chỉ số chẩn đoán chất lượng từ khóa', 'Giá thầu bắt buộc', 'Điểm doanh thu cuối cùng'],
        ['Thành phần nào ảnh hưởng Quality Score?', 'CTR kỳ vọng, mức liên quan quảng cáo và trang đích', 'Màu logo và số nhân viên', 'Chỉ số lượt theo dõi mạng xã hội'],
        ['Quality Score có trực tiếp được dùng trong đấu giá không?', 'Không, đây là chỉ số chẩn đoán', 'Có, là đầu vào duy nhất', 'Có, thay thế giá thầu'],
        ['Keyword match giúp làm gì?', 'Ghép quảng cáo với truy vấn phù hợp', 'Bảo đảm mọi click chuyển đổi', 'Tự viết nội dung trang đích'],
        ['Negative keyword hữu ích khi nào?', 'Khi muốn loại truy vấn không phù hợp', 'Khi muốn tăng mọi lượt hiển thị', 'Khi không cần kiểm tra search terms'],
        ['Search terms report cho biết gì?', 'Truy vấn thực đã kích hoạt quảng cáo', 'Mật khẩu tài khoản đối thủ', 'Toàn bộ hành vi offline'],
        ['Conversion tracking phục vụ mục đích gì?', 'Đo hành động có giá trị sau tương tác', 'Tự động thiết kế logo', 'Thay thế nội dung quảng cáo'],
        ['Conversion rate nên đọc cùng điều gì?', 'Định nghĩa chuyển đổi và chất lượng traffic', 'Chỉ màu của banner', 'Số nhân viên trong đội'],
        ['Impression là gì?', 'Một lần quảng cáo được hiển thị', 'Một đơn hàng đã thanh toán', 'Một khóa học hoàn thành'],
        ['CTR được tính như thế nào?', 'Click chia cho impression', 'Chi phí chia cho click', 'Doanh thu chia cho đơn hàng'],
        ['Khi trang đích không liên quan truy vấn, nên cải thiện gì?', 'Nội dung và trải nghiệm trang đích', 'Chỉ tăng ngân sách', 'Xóa toàn bộ từ khóa tốt'],
        ['Ad relevance phản ánh điều gì?', 'Mức khớp giữa quảng cáo và ý định tìm kiếm', 'Độ dài tên công ty', 'Số lượng tài khoản quản trị'],
        ['Expected CTR thể hiện điều gì?', 'Khả năng quảng cáo được nhấp khi hiển thị', 'Giá bán sản phẩm', 'Số lượng bài học'],
        ['Khi chiến dịch tốn tiền nhưng ít lead, nên xem gì trước?', 'Truy vấn, chuyển đổi và trải nghiệm trang đích', 'Chỉ đổi ảnh đại diện', 'Chỉ tăng giá thầu mọi từ khóa'],
        ['CPC được hiểu là gì?', 'Chi phí trung bình cho một click', 'Tổng doanh thu mỗi ngày', 'Số khách hàng trung thành'],
        ['ROAS được dùng để xem gì?', 'Doanh thu quy về quảng cáo so với chi phí', 'Số lượng từ khóa âm', 'Tốc độ tải trang đơn lẻ'],
        ['Khi tối ưu quảng cáo tìm kiếm, mục tiêu đầu tiên là gì?', 'Chọn chỉ số gắn với kết quả kinh doanh', 'Chỉ tăng impression', 'Chỉ giảm số quảng cáo'],
        ['Nếu một từ khóa nhận nhiều truy vấn lệch chủ đề, nên làm gì?', 'Rà soát match type và negative keywords', 'Tắt đo chuyển đổi', 'Bỏ qua search terms report'],
        ['Tại sao cần phân tích dữ liệu sau khi chạy?', 'Để điều chỉnh chiến dịch theo kết quả thực', 'Vì Quality Score là doanh thu', 'Vì dữ liệu không thay đổi'],
        ['Mối quan hệ giữa quảng cáo và trang đích nên thế nào?', 'Thông điệp nhất quán với nhu cầu tìm kiếm', 'Không cần liên quan nhau', 'Trang đích chỉ chứa biểu mẫu trống'],
    ];

    // https://blog.hubspot.com/marketing/content-marketing-plan
    // https://developers.google.com/search/docs/fundamentals/creating-helpful-content
    private const CONTENT = [
        ['Chiến lược nội dung bắt đầu với điều gì?', 'Mục tiêu và đối tượng rõ ràng', 'Lịch đăng ngẫu nhiên', 'Chỉ số lượt xem bất kỳ'],
        ['Buyer persona giúp quyết định gì?', 'Nội dung đáp ứng nhu cầu từng nhóm người', 'Màu sắc logo duy nhất', 'Giá thầu quảng cáo tự động'],
        ['Editorial calendar mô tả điều gì?', 'Chủ đề lớn theo giai đoạn', 'Mật khẩu tài khoản', 'Số lượt click của từng quảng cáo'],
        ['Content calendar thường quản lý gì?', 'Từng bài đăng và thời điểm cụ thể', 'Chỉ mục URL bị chặn', 'Giá bán sản phẩm trong kho'],
        ['Content cluster là gì?', 'Nhóm bài liên kết quanh một chủ đề', 'Nhóm từ khóa không liên quan', 'Danh sách quảng cáo bị từ chối'],
        ['Nội dung lấy ý tưởng từ khách hàng nên làm gì?', 'Giải đáp câu hỏi thực của họ', 'Chỉ lặp khẩu hiệu', 'Bỏ qua phản hồi'],
        ['Vì sao cần phân phối nội dung?', 'Đưa nội dung đến đúng kênh và người đọc', 'Để thay thế kiểm tra chất lượng', 'Để xóa bản gốc'],
        ['Khi đo hiệu quả nội dung, nên dùng gì?', 'Chỉ số khớp mục tiêu của nội dung', 'Chỉ số dễ nhìn nhưng không liên quan', 'Số màu trong bài'],
        ['Khi một bài có traffic nhưng ít lead, nên kiểm tra gì?', 'Ý định người đọc và lời kêu gọi hành động', 'Chỉ đổi font chữ', 'Bỏ qua trang đích'],
        ['Tái sử dụng nội dung là gì?', 'Chuyển ý tưởng hữu ích sang định dạng phù hợp khác', 'Sao chép nguyên văn mọi nơi', 'Xóa nguồn nghiên cứu'],
        ['Một content brief tốt nên có gì?', 'Đối tượng, mục tiêu, ý chính và bằng chứng', 'Chỉ một từ khóa', 'Chỉ thời hạn đăng'],
        ['Nội dung people-first ưu tiên điều gì?', 'Giúp người đọc hoàn thành mục tiêu', 'Viết chỉ để thao túng thứ hạng', 'Tăng độ dài bằng văn bản lặp'],
        ['Tính nguyên bản của bài viết đến từ đâu?', 'Thông tin, phân tích hoặc góc nhìn có giá trị', 'Sao chép nguyên văn đối thủ', 'Đổi ngày xuất bản'],
        ['Khi cập nhật nội dung cũ, nên làm gì?', 'Bổ sung thông tin thực sự mới và chính xác', 'Chỉ đổi tiêu đề mọi tuần', 'Xóa tác giả'],
        ['Lịch xuất bản giúp nhóm làm gì?', 'Phối hợp chủ đề, người phụ trách và thời hạn', 'Bỏ qua kiểm duyệt', 'Tự động bảo đảm doanh thu'],
        ['Một chủ đề nên chọn dựa trên điều gì?', 'Nhu cầu khán giả và mục tiêu kinh doanh', 'Chỉ xu hướng không liên quan', 'Chỉ độ dài từ khóa'],
        ['Vì sao cần kiểm tra nguồn trước khi xuất bản?', 'Để nội dung đáng tin và tránh sai thông tin', 'Để tăng số chữ bất kể độ đúng', 'Để thay thế trải nghiệm thực'],
        ['Khi content cluster thiếu liên kết nội bộ, nên làm gì?', 'Kết nối các bài có quan hệ chủ đề', 'Xóa trang trụ cột', 'Chuyển mọi bài sang quảng cáo'],
        ['Sau khi đăng bài, vòng lặp hợp lý là gì?', 'Đo lường, học từ dữ liệu và cải thiện', 'Không bao giờ xem lại', 'Chỉ đổi ảnh đại diện'],
        ['Nội dung cho từng giai đoạn hành trình mua nên thế nào?', 'Phù hợp câu hỏi và quyết định ở giai đoạn đó', 'Giống hệt nhau cho mọi người', 'Không cần lời kêu gọi hành động'],
    ];

    public function run(): void
    {
        DB::transaction(function (): void {
            Course::query()->where('price', '<=', 0)->update(['price' => 299000]);
            Exam::query()->whereNull('total_questions')->update(['total_questions' => 3]);

            foreach ([
                'seo-ai-max-01' => self::SEO,
                'google-ads-01' => self::ADS,
                'content-seo-01' => self::CONTENT,
            ] as $slug => $concepts) {
                $exam = Course::query()->where('slug', $slug)->first()?->exam;
                if (! $exam) {
                    continue;
                }

                $exam->update(['max_attempts' => 2, 'total_questions' => 3]);
                foreach (self::CONTEXTS as $contextIndex => $context) {
                    foreach ($concepts as $conceptIndex => [$stem, $correct, $wrongA, $wrongB]) {
                        $content = sprintf('%s: %s', $context, $stem);
                        $question = Question::query()->firstOrCreate(
                            ['exam_id' => $exam->id, 'content' => $content],
                            ['sort_order' => 100 + $contextIndex * 20 + $conceptIndex],
                        );
                        foreach ([$correct, $wrongA, $wrongB] as $answerIndex => $answer) {
                            Answer::query()->updateOrCreate(
                                ['question_id' => $question->id, 'content' => $answer],
                                ['is_correct' => $answerIndex === 0],
                            );
                        }
                    }
                }
            }
        });
    }
}
