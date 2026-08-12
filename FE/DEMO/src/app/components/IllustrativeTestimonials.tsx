import { Box, Card, CardContent, Chip, Container, Typography } from '@mui/material';
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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 3, mt: 4 }}>
          {testimonials.map((item) => (
            <Card component="article" key={item.name} aria-label={`Đánh giá minh họa của ${item.name}`} sx={{ overflow: 'hidden' }}>
              <Box component="img" src={item.image} alt="" sx={{ width: '100%', height: 230, objectFit: 'cover', objectPosition: 'center 28%' }} />
              <CardContent sx={{ p: 3 }}>
                <Chip label="Nội dung minh họa" size="small" color="primary" variant="outlined" />
                <Typography component="blockquote" sx={{ m: 0, mt: 2, lineHeight: 1.8 }}>
                  “{item.quote}”
                </Typography>
                <Typography fontWeight={800} sx={{ mt: 2.5 }}>{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">{item.context}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
