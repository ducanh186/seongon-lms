<?php

namespace Database\Seeders;

use App\Models\NewsPost;
use Illuminate\Database\Seeder;

class DemoNewsSeeder extends Seeder
{
    private const POSTS = [
        [
            'slug' => 'ai-seo-va-cach-tim-kiem-dang-thay-doi',
            'title' => 'AI SEO và cách hành vi tìm kiếm đang thay đổi',
            'category' => 'SEO & AI',
            'excerpt' => 'Hiểu vai trò của AI trong nghiên cứu ý định, xây dựng nội dung và đo lường SEO.',
            'content' => "AI không thay thế nền tảng SEO mà mở rộng cách chuyên viên phân tích dữ liệu và ý định tìm kiếm. Một quy trình tốt vẫn bắt đầu từ nhu cầu thật của người dùng, cấu trúc website rõ ràng và nội dung có bằng chứng.\n\nKhi ứng dụng AI, đội ngũ nên dùng công cụ để tổng hợp dữ liệu, gợi ý giả thuyết và kiểm tra khoảng trống nội dung. Quyết định cuối cùng cần dựa trên Search Console, dữ liệu chuyển đổi và kiểm chứng của con người.\n\nNguồn tham khảo: https://seongon.com/blog/seo-ai",
            'thumbnail' => '/images/news/seo-ai.svg',
        ],
        [
            'slug' => 'gemini-ho-tro-quy-trinh-seo',
            'title' => 'Dùng Gemini để hỗ trợ quy trình SEO hiệu quả',
            'category' => 'SEO & AI',
            'excerpt' => 'Các điểm nên dùng AI để tiết kiệm thời gian mà không đánh đổi chất lượng nội dung.',
            'content' => "Gemini có thể hỗ trợ phân nhóm từ khóa, phác thảo brief và phát hiện câu hỏi người đọc còn thiếu. Giá trị lớn nhất nằm ở việc rút ngắn công việc lặp lại để chuyên viên dành thời gian cho chiến lược.\n\nKhông nên xuất bản trực tiếp nội dung do AI tạo ra. Hãy kiểm tra nguồn, bổ sung kinh nghiệm thực tế, chuẩn hóa giọng thương hiệu và đo hiệu quả sau khi phát hành.\n\nNguồn tham khảo: https://seongon.com/blog/seo-ai",
            'thumbnail' => '/images/news/gemini-seo.svg',
        ],
        [
            'slug' => 'aeo-tu-cau-hoi-den-cau-tra-loi-huu-ich',
            'title' => 'AEO: từ câu hỏi tìm kiếm đến câu trả lời hữu ích',
            'category' => 'SEO & AI',
            'excerpt' => 'Cách tổ chức nội dung để người đọc và công cụ trả lời hiểu nhanh giá trị chính.',
            'content' => "Answer Engine Optimization tập trung vào việc trả lời rõ câu hỏi, cung cấp ngữ cảnh và chứng minh độ tin cậy. Nội dung cần có cấu trúc dễ quét, định nghĩa chính xác và ví dụ cụ thể.\n\nAEO không tách rời SEO kỹ thuật. Website vẫn cần khả năng crawl tốt, schema phù hợp và hệ thống liên kết nội bộ giúp máy tìm kiếm hiểu quan hệ giữa các chủ đề.\n\nNguồn tham khảo: https://seongon.com/blog/seo-ai",
            'thumbnail' => '/images/news/aeo.svg',
        ],
        [
            'slug' => 'chon-dinh-dang-content-theo-muc-tieu',
            'title' => 'Chọn định dạng Content theo đúng mục tiêu',
            'category' => 'Content Marketing',
            'excerpt' => 'Không phải định dạng nào cũng phù hợp với mọi giai đoạn trong hành trình khách hàng.',
            'content' => "Bài hướng dẫn, checklist và video giải thích phù hợp với mục tiêu giáo dục thị trường. Case study, trang so sánh và webinar thường hữu ích hơn khi khách hàng đang cân nhắc giải pháp.\n\nTrước khi sản xuất, hãy ghi rõ một mục tiêu, một nhóm người đọc và một hành động mong muốn. Cách này giúp đội ngũ tránh tạo nhiều nội dung nhưng không tạo ra kết quả kinh doanh.\n\nNguồn tham khảo: https://seongon.com/blog/page/23",
            'thumbnail' => '/images/news/content-format.svg',
        ],
        [
            'slug' => 'social-content-tang-tuong-tac-ben-vung',
            'title' => 'Social Content tăng tương tác bền vững',
            'category' => 'Social Media',
            'excerpt' => 'Xây nội dung Facebook và Instagram từ insight thay vì chạy theo xu hướng ngắn hạn.',
            'content' => "Social Content hiệu quả thường kết hợp nội dung chia sẻ kiến thức, câu chuyện thương hiệu, phản hồi khách hàng và lời mời hành động. Mỗi định dạng cần phục vụ một mục tiêu cụ thể thay vì chỉ tìm lượt thích.\n\nHãy bắt đầu bằng lịch thử nghiệm nhỏ, theo dõi tỷ lệ lưu, chia sẻ, bình luận có chất lượng và lượt truy cập đích. Sau đó giữ lại các chủ đề tạo tín hiệu tốt để phát triển thành series.\n\nNguồn tham khảo: https://seongon.com/blog/page/23",
            'thumbnail' => '/images/news/social-content.svg',
        ],
        [
            'slug' => 'xu-huong-content-marketing-va-cach-ap-dung',
            'title' => 'Xu hướng Content Marketing và cách áp dụng thực tế',
            'category' => 'Content Marketing',
            'excerpt' => 'Biến xu hướng thành thử nghiệm nhỏ, đo được và phù hợp với nguồn lực đội ngũ.',
            'content' => "Xu hướng chỉ có giá trị khi giải quyết đúng vấn đề của khách hàng. Thay vì triển khai đồng loạt, doanh nghiệp nên chọn một định dạng, một kênh và một chỉ số kết quả để thử nghiệm.\n\nSau mỗi chu kỳ, hãy đối chiếu chi phí sản xuất với mức độ tiếp cận, tương tác và chuyển đổi. Dữ liệu này giúp đội ngũ quyết định mở rộng, điều chỉnh hay dừng một xu hướng.\n\nNguồn tham khảo: https://seongon.com/blog/digital-marketing/page/6",
            'thumbnail' => '/images/news/content-trends.svg',
        ],
        [
            'slug' => 'content-calendar-tu-ke-hoach-den-van-hanh',
            'title' => 'Content Calendar: từ kế hoạch đến vận hành',
            'category' => 'Content Marketing',
            'excerpt' => 'Một lịch nội dung tốt làm rõ chủ đề, người chịu trách nhiệm, hạn và kênh phát hành.',
            'content' => "Content Calendar giúp đội ngũ nhìn thấy nhịp xuất bản và tránh trùng lặp chủ đề. Mỗi dòng nên có mục tiêu, định dạng, người phụ trách, trạng thái duyệt và ngày phát hành.\n\nLịch không nên quá cứng. Hãy dành dung lượng cho nội dung phản ứng nhanh, nhưng vẫn giữ các series cốt lõi gắn với nhu cầu dài hạn của khách hàng.\n\nNguồn tham khảo: https://seongon.com/blog/digital-marketing/page/6",
            'thumbnail' => '/images/news/content-calendar.svg',
        ],
        [
            'slug' => 'do-luong-chuyen-doi-google-ads',
            'title' => 'Đo lường chuyển đổi Google Ads đúng từ đầu',
            'category' => 'Google Ads',
            'excerpt' => 'Phân biệt chuyển đổi chính, chuyển đổi hỗ trợ và tín hiệu tối ưu chiến dịch.',
            'content' => "Một tài khoản quảng cáo chỉ tối ưu tốt khi dữ liệu chuyển đổi phản ánh đúng giá trị kinh doanh. Doanh nghiệp cần phân biệt hành động chính như mua hàng với tín hiệu hỗ trợ như xem trang hoặc tải tài liệu.\n\nTrước khi tăng ngân sách, hãy kiểm tra thẻ đo lường, loại bỏ sự kiện trùng và đối chiếu số liệu với CRM. Đây là nền tảng để chiến lược đấu thầu học từ dữ liệu đáng tin cậy.\n\nNguồn tham khảo: https://seongon.com/blog/page/19",
            'thumbnail' => '/images/news/google-ads.svg',
        ],
    ];

    public function run(): void
    {
        foreach (self::POSTS as $index => $post) {
            NewsPost::query()->updateOrCreate(
                ['slug' => $post['slug']],
                [
                    ...$post,
                    'status' => 'published',
                    'published_at' => now()->subDays(count(self::POSTS) - $index),
                ],
            );
        }
    }
}
