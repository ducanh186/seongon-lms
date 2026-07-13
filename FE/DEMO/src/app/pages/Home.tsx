import { useEffect, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { Link } from 'react-router';
import { CourseCard } from '../components/CourseCard';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { api, ApiError } from '../lib/api';
import type { ApiCategory, ApiCourse } from '../lib/contracts';

const benefits = [
  { icon: AutoStoriesOutlinedIcon, title: 'Lộ trình rõ ràng', detail: 'Học theo thứ tự bài học và luôn biết bước tiếp theo.' },
  { icon: InsightsOutlinedIcon, title: 'Tiến độ minh bạch', detail: 'Theo dõi mức hoàn thành của từng khóa học.' },
  { icon: WorkspacePremiumOutlinedIcon, title: 'Chứng chỉ hoàn thành', detail: 'Nhận chứng chỉ khi hoàn thành bài học và vượt qua bài thi.' },
];

export function Home() {
  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [courses, setCourses] = useState<ApiCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setCategories(null);
    setCourses(null);

    Promise.all([api.categories(), api.courses({ sort: 'popular' })])
      .then(([categoryResult, courseResult]) => {
        if (!active) return;
        setCategories(categoryResult.data);
        setCourses(courseResult.data.slice(0, 6));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Không thể tải nội dung trang chủ.');
      });

    return () => { active = false; };
  }, [reloadKey]);

  return (
    <>
      <Box component="section" sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#E9F7F5', py: { xs: 7, md: 11 }, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box aria-hidden="true" sx={{ position: 'absolute', width: 430, height: 430, borderRadius: '50%', bgcolor: 'rgba(182,43,113,.10)', right: { xs: -300, md: -90 }, top: -220 }} />
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Box sx={{ maxWidth: 780 }}>
            <Typography variant="overline" color="secondary.dark" fontWeight={800} letterSpacing=".11em">SEONGON ACADEMY</Typography>
            <Typography component="h1" variant="h1" sx={{ fontSize: { xs: '2.55rem', sm: '3.4rem', md: '4.35rem' }, mt: 1 }}>
              Học marketing với một lộ trình thật sự rõ ràng.
            </Typography>
            <Typography sx={{ mt: 3, fontSize: { xs: '1.05rem', md: '1.2rem' }, color: 'text.secondary', maxWidth: 650, lineHeight: 1.75 }}>
              Tìm khóa học phù hợp, học theo từng bài, kiểm tra kiến thức và theo dõi tiến độ trong cùng một không gian.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button component={Link} to="/courses" size="large" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>Khám phá khóa học</Button>
              <Button component={Link} to="/login" size="large" variant="outlined">Bắt đầu học</Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container component="section" maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'end' }} spacing={2}>
          <Box>
            <Typography variant="overline" color="primary.dark" fontWeight={800}>KHÁM PHÁ THEO CHỦ ĐỀ</Typography>
            <Typography component="h2" variant="h3" sx={{ mt: 0.5 }}>Bắt đầu từ điều bạn muốn giỏi hơn</Typography>
          </Box>
          <Button component={Link} to="/courses" endIcon={<ArrowForwardRoundedIcon />}>Xem tất cả</Button>
        </Stack>
        {!categories && !error && <Box sx={{ mt: 4 }}><PageSkeleton rows={2} /></Box>}
        {error && <Box sx={{ mt: 4 }}><RequestError message={error} onRetry={() => setReloadKey((value) => value + 1)} /></Box>}
        {categories && categories.length === 0 && <Box sx={{ mt: 4 }}><EmptyState title="Chưa có danh mục khóa học." /></Box>}
        {categories && categories.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2, mt: 4 }}>
            {categories.map((category, index) => (
              <Box
                key={category.id}
                component={Link}
                to={`/courses?category=${category.slug}`}
                aria-label={`Khám phá ${category.courses_count ?? 0} khóa học ${category.name}`}
                sx={{ textDecoration: 'none', color: 'inherit', p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', transition: 'transform 160ms ease, border-color 160ms ease', '&:hover': { transform: 'translateY(-2px)', borderColor: index === 0 ? 'secondary.main' : 'primary.main' }, '&:focus-visible': { outline: '3px solid rgba(8,126,139,.3)', outlineOffset: 3 } }}
              >
                <Typography variant="caption" color={index === 0 ? 'secondary.dark' : 'primary.dark'} fontWeight={800}>{String(index + 1).padStart(2, '0')}</Typography>
                <Typography component="h3" variant="h6" sx={{ mt: 1 }}>{category.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{category.courses_count ?? 0} khóa học</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Container>

      <Box component="section" sx={{ bgcolor: '#EEF5F5', py: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'end' }} spacing={2}>
            <Box>
              <Typography variant="overline" color="secondary.dark" fontWeight={800}>ĐƯỢC QUAN TÂM</Typography>
              <Typography component="h2" variant="h3" sx={{ mt: 0.5 }}>Khóa học phổ biến</Typography>
            </Box>
            <Typography color="text.secondary" sx={{ maxWidth: 470 }}>Dữ liệu được lấy trực tiếp từ danh mục đang xuất bản của SEONGON Academy.</Typography>
          </Stack>
          {!courses && !error && <Box sx={{ mt: 4 }}><PageSkeleton rows={3} /></Box>}
          {courses && courses.length === 0 && <Box sx={{ mt: 4 }}><EmptyState title="Chưa có khóa học đang xuất bản." /></Box>}
          {courses && courses.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3, mt: 4 }}>
              {courses.map((course) => <CourseCard key={course.id} course={course} />)}
            </Box>
          )}
        </Container>
      </Box>

      <Container component="section" maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Typography component="h2" variant="h3">Một nơi cho toàn bộ quá trình học</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mt: 4 }}>
          {benefits.map(({ icon: Icon, title, detail }) => (
            <Box key={title} sx={{ p: 3.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'inline-grid', placeItems: 'center', width: 52, height: 52, borderRadius: 2.5, bgcolor: 'primary.light' }}><Icon color="primary" /></Box>
              <Typography component="h3" variant="h6" sx={{ mt: 2.5 }}>{title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>{detail}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </>
  );
}
