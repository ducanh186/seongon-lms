import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { Box, Button, Card, CardActionArea, CardContent, Container, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { CourseCard } from '../components/CourseCard';
import { HomeHero } from '../components/HomeHero';
import { IllustrativeTestimonials } from '../components/IllustrativeTestimonials';
import { MetricsStrip } from '../components/MetricsStrip';
import { SectionHeading } from '../components/SectionHeading';
import { api, ApiError } from '../lib/api';
import type { ApiCategory, ApiCourse, ApiNewsPost } from '../lib/contracts';
import { focusTokens, layoutTokens } from '../theme';

const metrics = [
  { icon: <AutoGraphRoundedIcon />, value: '14+ năm', label: 'Kinh nghiệm Search Marketing' },
  { icon: <BusinessCenterOutlinedIcon />, value: '2.500+', label: 'Khách hàng đồng hành' },
  { icon: <SchoolOutlinedIcon />, value: '6', label: 'Nhóm khóa học chuyên sâu' },
  { icon: <VerifiedOutlinedIcon />, value: '100%', label: 'Thực chiến từ SEONGON' },
];

export function Home() {
  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [courses, setCourses] = useState<ApiCourse[] | null>(null);
  const [news, setNews] = useState<ApiNewsPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setCategories(null);
    setCourses(null);
    setNews(null);

    Promise.all([api.categories(), api.courses({ sort: 'popular' }), api.news({ page: 1 })])
      .then(([categoryResult, courseResult, newsResult]) => {
        if (!active) return;
        setCategories(categoryResult.data);
        setCourses(courseResult.data.slice(0, 8));
        setNews(newsResult.data.slice(0, 3));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Không thể tải nội dung trang chủ.');
      });

    return () => { active = false; };
  }, [reloadKey]);

  return (
    <>
      <HomeHero />
      <MetricsStrip items={metrics} />

      <Container component="section" maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3, py: layoutTokens.sectionPadding }}>
        <SectionHeading
          title="Khám phá theo chủ đề"
          description="Chọn danh mục phù hợp để bắt đầu học những kỹ năng Marketing bạn đang cần."
          action={<Button component={Link} to="/courses" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>Xem tất cả</Button>}
        />
        {!categories && !error && <Box sx={{ mt: 4 }}><PageSkeleton rows={2} /></Box>}
        {error && <Box sx={{ mt: 4 }}><RequestError message={error} onRetry={() => setReloadKey((value) => value + 1)} /></Box>}
        {categories?.length === 0 && <Box sx={{ mt: 4 }}><EmptyState title="Chưa có danh mục khóa học." /></Box>}
        {categories && categories.length > 0 && (
          <Box component="nav" aria-label="Danh mục khóa học" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, mt: 4 }}>
            {categories.map((category) => (
              <Box
                key={category.id}
                component={Link}
                to={`/courses?category=${category.slug}`}
                aria-label={`Khám phá khóa học ${category.name}`}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, minHeight: 86, p: 2.5, textDecoration: 'none', color: 'inherit', border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper', transition: 'transform 160ms ease', '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' }, '&:focus-visible': { outline: `3px solid ${focusTokens.onLight}`, outlineOffset: 3 } }}
              >
                <Typography component="h3" variant="h6">{category.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{category.courses_count ?? 0} khóa học</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Container>

      <Box component="section" sx={{ bgcolor: '#E7F5F5', py: layoutTokens.sectionPadding }}>
        <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3 }}>
          <SectionHeading title="Khóa học phổ biến" description="Tám khóa học được quan tâm từ danh mục đang xuất bản của SEONGON Academy." />
          {!courses && !error && <Box sx={{ mt: 4 }}><PageSkeleton rows={3} /></Box>}
          {courses?.length === 0 && <Box sx={{ mt: 4 }}><EmptyState title="Chưa có khóa học phổ biến." /></Box>}
          {courses && courses.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', justifyContent: 'center', gap: 2.5, mt: 4 }}>
              {courses.map((course) => <CourseCard key={course.id} course={course} compact />)}
            </Box>
          )}
        </Container>
      </Box>

      <IllustrativeTestimonials />

      <Container component="section" maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3, py: layoutTokens.sectionPadding }}>
        <SectionHeading
          title="Tin tức & kiến thức mới nhất"
          description="Cập nhật xu hướng và kinh nghiệm thực hành từ đội ngũ SEONGON."
          action={<Button component={Link} to="/news" variant="outlined" endIcon={<ArrowForwardRoundedIcon />}>Xem tất cả bài viết</Button>}
        />
        {!news && !error && <Box sx={{ mt: 4 }}><PageSkeleton rows={2} /></Box>}
        {news?.length === 0 && <Box sx={{ mt: 4 }}><EmptyState title="Chưa có bài viết nào được xuất bản." /></Box>}
        {news && news.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2.5, mt: 4 }}>
            {news.map((post) => (
              <Card key={post.id} component="article" aria-label={`Bài viết ${post.title}`}>
                <CardActionArea component={Link} to={`/news/${post.slug}`} sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={1.25}>
                      <Typography variant="overline" color="primary.dark">{post.category}</Typography>
                      <Typography component="h3" variant="h6">{post.title}</Typography>
                      <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{post.excerpt}</Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </>
  );
}
