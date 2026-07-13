import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { Link } from 'react-router';
import type { ApiCourse } from '../lib/contracts';

const FALLBACK_COURSE_IMAGE = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80';

const levelLabels = { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' } as const;

function priceLabel(price: string | number): string {
  return Number(price) === 0 ? 'Miễn phí' : `${Number(price).toLocaleString('vi-VN')} đ`;
}

export function CourseCard({ course, headingLevel = 'h3' }: { course: ApiCourse; headingLevel?: 'h2' | 'h3' }) {
  return (
    <Card sx={{ height: '100%', overflow: 'hidden', transition: 'transform 180ms ease, box-shadow 180ms ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
      <CardActionArea component={Link} to={`/courses/${course.slug}`} sx={{ height: '100%', display: 'flex', alignItems: 'stretch', flexDirection: 'column' }}>
        <Box component="img" src={course.thumbnail ?? FALLBACK_COURSE_IMAGE} alt="" sx={{ width: '100%', height: 176, objectFit: 'cover', bgcolor: 'primary.light' }} />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, width: '100%', flexGrow: 1, p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={levelLabels[course.level ?? 'beginner']} size="small" color="primary" variant="outlined" />
            {course.category?.name && <Typography variant="caption" color="text.secondary" fontWeight={600}>{course.category.name}</Typography>}
          </Stack>
          <Typography component={headingLevel} variant="h6">{course.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 }}>
            {course.description || 'Khóa học được thiết kế theo lộ trình thực hành rõ ràng.'}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" color="text.secondary">
            <Typography variant="caption">{course.lessons_count ?? 0} bài học</Typography>
            {course.rating != null && <Stack direction="row" spacing={0.25} alignItems="center"><StarRoundedIcon sx={{ fontSize: 17, color: '#A15C07' }} /><Typography variant="caption">{course.rating.toFixed(1)}</Typography></Stack>}
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.5 }}>
            <Typography fontWeight={800} color="primary.dark">{priceLabel(course.price)}</Typography>
            <ArrowForwardRoundedIcon color="primary" aria-hidden="true" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
