import { Avatar, Box, Container, Stack, Typography } from '@mui/material';
import { layoutTokens } from '../theme';
import { SectionHeading } from './SectionHeading';

const testimonials = [
  {
    image: '/generated-images/testimonial-01.webp',
    name: 'Nguyễn Minh Anh',
    context: 'Khóa học SEO thực chiến',
    quote: 'Nội dung được sắp xếp rõ ràng, giúp tôi hiểu cách chuyển từ nghiên cứu từ khóa sang một kế hoạch SEO có thể triển khai.',
  },
  {
    image: '/generated-images/testimonial-02.webp',
    name: 'Trần Quốc Huy',
    context: 'Khóa học Google Ads',
    quote: 'Các ví dụ thực hành giúp tôi nhìn chiến dịch theo mục tiêu kinh doanh thay vì chỉ theo dõi từng chỉ số rời rạc.',
  },
  {
    image: '/generated-images/testimonial-03.webp',
    name: 'Lê Khánh Linh',
    context: 'Khóa học Digital Analytics',
    quote: 'Tôi thích cách bài học kết nối dữ liệu, hành vi người dùng và quyết định tối ưu trong một quy trình dễ theo dõi.',
  },
];

export function IllustrativeTestimonials() {
  return (
    <Box component="section" sx={{ bgcolor: '#E7F5F5', py: layoutTokens.sectionPadding }}>
      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3 }}>
        <SectionHeading title="Học viên nói gì về trải nghiệm học" description="Các tình huống minh họa cho trải nghiệm mà SEONGON Academy hướng tới." />
        <Box role="region" aria-label="Tin nhắn đánh giá của học viên" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 3, mt: 4 }}>
          {testimonials.map((item) => (
            <Stack component="article" key={item.name} aria-label={`Đánh giá của ${item.name}`} direction="row" spacing={1.5} alignItems="flex-end">
              <Avatar src={item.image} alt="" sx={{ width: 48, height: 48, flexShrink: 0 }} />
              <Box sx={{ position: 'relative', minWidth: 0, p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '18px 18px 18px 5px', boxShadow: '0 10px 24px rgba(16,46,56,.07)' }}>
                <Typography component="blockquote" sx={{ m: 0, lineHeight: 1.75 }}>“{item.quote}”</Typography>
                <Typography fontWeight={800} sx={{ mt: 1.75 }}>{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">{item.context}</Typography>
              </Box>
            </Stack>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
