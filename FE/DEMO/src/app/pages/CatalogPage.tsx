import { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useSearchParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiCategory, ApiCourse, Paginated } from '../lib/contracts';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { CourseCard } from '../components/CourseCard';
import { PageHeader } from '../components/PageHeader';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [catalog, setCatalog] = useState<Paginated<ApiCourse> | null>(null);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
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
  }, [category, page, query, reloadKey, sort]);

  const applyQuery = () => {
    setPage(1);
    setSearchParams({ ...(query && { q: query }), ...(category && { category }), ...(sort !== 'newest' && { sort }) });
    setReloadKey((value) => value + 1);
  };

  return (
    <Box component="section" sx={{ py: { xs: 5, md: 8 }, minHeight: '70dvh' }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, md: 4 }}>
          <PageHeader eyebrow="THƯ VIỆN KHÓA HỌC" title="Tìm đúng lộ trình cho mục tiêu của bạn" description="Tìm theo từ khóa, lọc theo chủ đề và sắp xếp các khóa học đang được xuất bản từ hệ thống." />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' }, gap: { xs: 2.5, md: 3 }, alignItems: 'start' }}>
            <Stack
              component="aside"
              aria-label="Bộ lọc khóa học"
              spacing={2.25}
              sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5, position: { md: 'sticky' }, top: 96 }}
            >
              <Box>
                <Typography component="h2" variant="h6" fontWeight={800}>Bộ lọc</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Thu hẹp danh sách theo nhu cầu học.</Typography>
              </Box>
              <FormControl fullWidth>
                <InputLabel id="course-category-label">Danh mục</InputLabel>
                <Select
                  labelId="course-category-label"
                  label="Danh mục"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                    setSearchParams({ ...(query && { q: query }), ...(event.target.value && { category: event.target.value }), ...(sort !== 'newest' && { sort }) });
                  }}
                >
                  <MenuItem value="">Tất cả danh mục</MenuItem>
                  {categories.map((item) => <MenuItem key={item.id} value={item.slug}>{item.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="course-sort-label">Sắp xếp</InputLabel>
                <Select labelId="course-sort-label" label="Sắp xếp" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
                  <MenuItem value="newest">Mới nhất</MenuItem>
                  <MenuItem value="popular">Phổ biến</MenuItem>
                  <MenuItem value="price_asc">Giá tăng dần</MenuItem>
                  <MenuItem value="price_desc">Giá giảm dần</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack spacing={3} sx={{ minWidth: 0 }}>
              <Stack
                component="form"
                role="search"
                aria-label="Tìm khóa học"
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                onSubmit={(event) => { event.preventDefault(); applyQuery(); }}
                sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}
              >
                <TextField
                  fullWidth
                  label="Tìm khóa học"
                  placeholder="Ví dụ: SEO, Content Marketing..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Button type="submit" variant="contained" size="large" startIcon={<SearchRoundedIcon />} sx={{ whiteSpace: 'nowrap', minWidth: 132 }}>Tìm kiếm</Button>
              </Stack>

              {catalog && (
                <Typography variant="body2" color="text.secondary">
                  {catalog.meta.total.toLocaleString('vi-VN')} khóa học phù hợp
                </Typography>
              )}

              {error && <RequestError message={error} onRetry={() => setReloadKey((value) => value + 1)} />}

              {!catalog && !error && <PageSkeleton rows={4} />}

              {catalog?.data.length === 0 && (
                <EmptyState title="Không tìm thấy khóa học phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc." />
              )}

              {catalog && catalog.data.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
                  {catalog.data.map((course) => <CourseCard key={course.id} course={course} headingLevel="h2" />)}
                </Box>
              )}

              {catalog && catalog.meta.last_page > 1 && (
                <Pagination count={catalog.meta.last_page} page={page} onChange={(_, nextPage) => setPage(nextPage)} color="primary" sx={{ alignSelf: 'center' }} />
              )}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
