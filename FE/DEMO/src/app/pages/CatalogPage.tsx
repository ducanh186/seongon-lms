import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiCategory, ApiCourse, Paginated } from '../lib/contracts';

const FALLBACK_COURSE_IMAGE = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80';

function priceLabel(price: string | number): string {
  return `${Number(price).toLocaleString('vi-VN')} đ`;
}

function levelLabel(level: ApiCourse['level']): string {
  return ({ beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' } as const)[level ?? 'beginner'];
}

export function CatalogPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [catalog, setCatalog] = useState<Paginated<ApiCourse> | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.categories().then(({ data }) => setCategories(data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    setError(null);
    setCatalog(null);

    api.courses({ q: query || undefined, category: category || undefined, sort, page })
      .then((result) => active && setCatalog(result))
      .catch((reason: unknown) => active && setError(reason instanceof ApiError ? reason.message : 'Không thể tải danh sách khóa học.'));

    return () => {
      active = false;
    };
  }, [category, page, query, sort]);

  const applyQuery = () => setPage(1);

  return (
    <Box component="section" sx={{ py: { xs: 4, md: 7 }, bgcolor: '#f7fafb', minHeight: '70dvh' }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography component="h1" variant="h3" fontWeight={800} color="primary.main">
              Khóa học thực chiến
            </Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary', maxWidth: 650 }}>
              Chọn một lộ trình rõ ràng, học theo từng bài và theo dõi tiến độ của bạn trong một nơi.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              fullWidth
              label="Tìm khóa học"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && applyQuery()}
            />
            <FormControl fullWidth>
              <InputLabel id="course-category-label">Danh mục</InputLabel>
              <Select
                labelId="course-category-label"
                label="Danh mục"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">Tất cả danh mục</MenuItem>
                {categories.map((item) => <MenuItem key={item.id} value={item.slug}>{item.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="course-sort-label">Sắp xếp</InputLabel>
              <Select labelId="course-sort-label" label="Sắp xếp" value={sort} onChange={(event) => setSort(event.target.value)}>
                <MenuItem value="newest">Mới nhất</MenuItem>
                <MenuItem value="popular">Phổ biến</MenuItem>
                <MenuItem value="price_asc">Giá tăng dần</MenuItem>
                <MenuItem value="price_desc">Giá giảm dần</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" size="large" onClick={applyQuery} sx={{ whiteSpace: 'nowrap' }}>Tìm kiếm</Button>
          </Stack>

          {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={applyQuery}>Thử lại</Button>}>{error}</Alert>}

          {!catalog && !error && (
            <Stack alignItems="center" spacing={2} sx={{ py: 10 }} aria-label="Đang tải khóa học">
              <CircularProgress />
              <Typography color="text.secondary">Đang tải khóa học...</Typography>
            </Stack>
          )}

          {catalog?.data.length === 0 && (
            <Alert severity="info">Không tìm thấy khóa học phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc.</Alert>
          )}

          {catalog && catalog.data.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 3 }}>
              {catalog.data.map((course) => (
                <Card key={course.id} sx={{ height: '100%', borderRadius: 3, boxShadow: '0 8px 28px rgb(11 81 96 / 10%)' }}>
                  <CardActionArea component={Link} to={`/courses/${course.slug}`} sx={{ height: '100%', alignItems: 'stretch' }}>
                    <CardMedia component="img" height="168" image={course.thumbnail ?? FALLBACK_COURSE_IMAGE} alt={course.title} />
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={levelLabel(course.level)} size="small" color="primary" variant="outlined" />
                        {course.rating && <Typography variant="body2" color="text.secondary">{course.rating.toFixed(1)} / 5</Typography>}
                      </Stack>
                      <Typography component="h2" variant="h6" fontWeight={750}>{course.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {course.description || 'Khóa học được thiết kế theo lộ trình thực hành rõ ràng.'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{course.lessons_count ?? 0} bài học</Typography>
                      <Typography variant="subtitle1" fontWeight={800} color="primary.main">{priceLabel(course.price)}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}

          {catalog && catalog.meta.last_page > 1 && (
            <Pagination count={catalog.meta.last_page} page={page} onChange={(_, nextPage) => setPage(nextPage)} color="primary" sx={{ alignSelf: 'center' }} />
          )}
        </Stack>
      </Container>
    </Box>
  );
}
