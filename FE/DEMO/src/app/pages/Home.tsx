import { useEffect, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { Link } from 'react-router';
import { CourseCard } from '../components/CourseCard';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { HeroBanner } from '../components/HeroBanner';
import { MetricsStrip } from '../components/MetricsStrip';
import { SectionHeading } from '../components/SectionHeading';
import { api, ApiError } from '../lib/api';
import type { ApiCategory, ApiCourse } from '../lib/contracts';
import { focusTokens, layoutTokens } from '../theme';

const benefits = [
  { icon: AutoStoriesOutlinedIcon, title: 'Lộ trình rõ ràng', detail: 'Học theo thứ tự bài học và luôn biết bước tiếp theo.' },
  { icon: InsightsOutlinedIcon, title: 'Tiến độ minh bạch', detail: 'Theo dõi mức hoàn thành của từng khóa học.' },
  { icon: WorkspacePremiumOutlinedIcon, title: 'Chứng chỉ hoàn thành', detail: 'Nhận chứng chỉ khi hoàn thành bài học và vượt qua bài thi.' },
];

const capabilities = [
  { icon: <AutoStoriesOutlinedIcon fontSize="small" />, label: 'Lộ trình bài học' },
  { icon: <InsightsOutlinedIcon fontSize="small" />, label: 'Theo dõi tiến độ' },
  { icon: <FactCheckOutlinedIcon fontSize="small" />, label: 'Bài kiểm tra cuối khóa' },
  { icon: <WorkspacePremiumOutlinedIcon fontSize="small" />, label: 'Chứng chỉ hoàn thành' },
  { icon: <RateReviewOutlinedIcon fontSize="small" />, label: 'Đánh giá khóa học' },
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
        setCourses(courseResult.data.slice(0, 8));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Không thể tải nội dung trang chủ.');
      });

    return () => { active = false; };
  }, [reloadKey]);

  const discoveryCourses = courses?.slice(1) ?? null;

  return (
    <>
      {!courses && !error && (
        <Box component="section" aria-label="Đang tải khóa học nổi bật" sx={{ minHeight: { xs: 520, md: 460 }, bgcolor: 'secondary.dark', display: 'grid', alignItems: 'center' }}>
          <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth }}>
            <PageSkeleton rows={2} />
          </Container>
        </Box>
      )}
      {courses && <HeroBanner courses={courses} />}
      <MetricsStrip items={capabilities} />

      <Container component="section" maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, py: layoutTokens.sectionPadding }}>
        <SectionHeading
          title="Khám phá theo chủ đề"
          description="Chọn đúng lĩnh vực để bắt đầu với lộ trình phù hợp."
          action={<Button component={Link} to="/courses" endIcon={<ArrowForwardRoundedIcon />}>Xem tất cả</Button>}
        />
        {!categories && !error && <Box sx={{ mt: 4 }}><PageSkeleton rows={2} /></Box>}
        {error && <Box sx={{ mt: 4 }}><RequestError message={error} onRetry={() => setReloadKey((value) => value + 1)} /></Box>}
        {categories && categories.length === 0 && <Box sx={{ mt: 4 }}><EmptyState title="Chưa có danh mục khóa học." /></Box>}
        {categories && categories.length > 0 && (
          <Box component="nav" aria-label="Danh mục khóa học" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5, mt: 4 }}>
            {categories.map((category) => (
              <Box
                key={category.id}
                component={Link}
                to={`/courses?category=${category.slug}`}
                aria-label={`Khám phá khóa học ${category.name}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  minHeight: 76,
                  p: 2,
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  bgcolor: 'background.paper',
                  transition: 'transform 160ms ease',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' },
                  '&:focus-visible': { outline: `3px solid ${focusTokens.onLight}`, outlineOffset: 3 },
                }}
              >
                <Typography component="h3" variant="body1" fontWeight={800}>{category.name}</Typography>
                {category.courses_count != null && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{category.courses_count} khóa học</Typography>}
              </Box>
            ))}
          </Box>
        )}
      </Container>

      <Box component="section" sx={{ bgcolor: 'primary.light', py: layoutTokens.sectionPadding }}>
        <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth }}>
          <SectionHeading
            title="Khóa học phổ biến"
            description="Dữ liệu được lấy trực tiếp từ danh mục đang xuất bản của SEONGON Academy."
          />
          {!discoveryCourses && !error && <Box sx={{ mt: 4 }}><PageSkeleton rows={3} /></Box>}
          {discoveryCourses && discoveryCourses.length === 0 && <Box sx={{ mt: 4 }}><EmptyState title="Chưa có thêm khóa học phổ biến." /></Box>}
          {discoveryCourses && discoveryCourses.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mt: 4 }}>
              {discoveryCourses.map((course) => <CourseCard key={course.id} course={course} compact />)}
            </Box>
          )}
        </Container>
      </Box>

      <Container component="section" maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, py: layoutTokens.sectionPadding }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 4fr) minmax(0, 8fr)' }, gap: { xs: 4, md: 8 }, alignItems: 'start' }}>
          <SectionHeading
            title="Một nơi cho toàn bộ quá trình học"
            description="Từ bài học đầu tiên đến khi hoàn thành khóa học."
          />
          <Stack sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          {benefits.map(({ icon: Icon, title, detail }) => (
            <Box key={title} sx={{ display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr)', gap: 2.5, py: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '8px', bgcolor: 'primary.light' }}><Icon color="primary" /></Box>
              <Box>
                <Typography component="h3" variant="h6">{title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.7 }}>{detail}</Typography>
              </Box>
            </Box>
          ))}
          </Stack>
        </Box>
      </Container>
    </>
  );
}
