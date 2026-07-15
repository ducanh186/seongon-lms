import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Modal,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiCategory, ApiCourse, Paginated } from '../lib/contracts';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { CourseCard } from '../components/CourseCard';
import { PageHeader } from '../components/PageHeader';
import { useIsMobile } from '../components/ui/use-mobile';

const SORT_OPTIONS = [
  ['newest', 'Mới nhất'],
  ['popular', 'Phổ biến'],
  ['price_asc', 'Giá tăng dần'],
  ['price_desc', 'Giá giảm dần'],
] as const;

export function CatalogPage() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [catalog, setCatalog] = useState<Paginated<ApiCourse> | null>(null);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const syncUrl = (nextCategory = category) => {
    setSearchParams({ ...(query && { q: query }), ...(nextCategory && { category: nextCategory }), ...(sort !== 'newest' && { sort }) });
  };

  const applyQuery = () => {
    setPage(1);
    syncUrl();
    setReloadKey((value) => value + 1);
  };

  const filterPanel = (
    <Stack
      id="course-filters"
      component="aside"
      aria-label="Bộ lọc khóa học"
      spacing={2}
      sx={isMobile
        ? { position: 'fixed', inset: '0 auto 0 0', width: 'min(88vw, 360px)', overflowY: 'auto', bgcolor: 'background.paper', p: 2.5 }
        : { p: 2.5, bgcolor: 'background.paper', boxShadow: 1, borderRadius: 2.5, position: 'sticky', top: 96 }}
    >
      {isMobile && (
        <Button autoFocus onClick={() => setFiltersOpen(false)}>
          Đóng bộ lọc
        </Button>
      )}
      <FormControl fullWidth>
        <InputLabel id="course-category-label">Danh mục</InputLabel>
        <Select
          labelId="course-category-label"
          label="Danh mục"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
            syncUrl(event.target.value);
          }}
        >
          <MenuItem value="">Tất cả danh mục</MenuItem>
          {categories.map((item) => <MenuItem key={item.id} value={item.slug}>{item.name}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="course-sort-label">Sắp xếp</InputLabel>
        <Select labelId="course-sort-label" label="Sắp xếp" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
          {SORT_OPTIONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </Select>
      </FormControl>
    </Stack>
  );

  return (
    <Box component="section" sx={{ py: 6 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <PageHeader title="Tìm đúng lộ trình cho mục tiêu của bạn" />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
            {isMobile ? (
              <>
                <Button
                  variant="outlined"
                  aria-controls="course-filters"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen(true)}
                >
                  Lọc khóa học
                </Button>
                <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)}>
                  {filterPanel}
                </Modal>
              </>
            ) : (
              filterPanel
            )}

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
                  placeholder="SEO, Content Marketing..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Button type="submit" variant="contained" size="large">Tìm kiếm</Button>
              </Stack>

              {catalog && (
                <Typography color="text.secondary">
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
