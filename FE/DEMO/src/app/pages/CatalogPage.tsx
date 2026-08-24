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
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { CourseCard } from '../components/CourseCard';
import { ApiError } from '../lib/api';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { ApiCategory, ApiCourse, Paginated } from '../lib/contracts';
import { layoutTokens } from '../theme';

type CatalogFilters = {
  q: string;
  category: string;
  level: string;
  priceSort: string;
  dateSort: string;
};

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo<CatalogFilters>(() => ({
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    level: searchParams.get('level') ?? '',
    priceSort: searchParams.get('price_sort') ?? '',
    dateSort: searchParams.get('date_sort') ?? 'newest',
  // Read the initial URL once. Subsequent changes are controlled by Apply/Pagination.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') ?? 1)));
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [catalog, setCatalog] = useState<Paginated<ApiCourse> | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applicationRepositories.catalog.listCategories().then(({ data }) => setCategories(data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    setError(null);
    setCatalog(null);

    applicationRepositories.catalog.listCourses({
      q: applied.q || undefined,
      category: applied.category || undefined,
      level: applied.level || undefined,
      price_sort: applied.priceSort || undefined,
      date_sort: applied.dateSort,
      page,
    })
      .then((result) => active && setCatalog(result))
      .catch((reason: unknown) => active && setError(reason instanceof ApiError ? reason.message : 'Không thể tải danh sách khóa học.'));

    return () => { active = false; };
  }, [applied, page, reloadKey]);

  const writeUrl = (filters: CatalogFilters, nextPage: number) => {
    const next = new URLSearchParams();
    if (filters.q) next.set('q', filters.q);
    if (filters.category) next.set('category', filters.category);
    if (filters.level) next.set('level', filters.level);
    if (filters.priceSort) next.set('price_sort', filters.priceSort);
    if (filters.dateSort !== 'newest') next.set('date_sort', filters.dateSort);
    if (nextPage > 1) next.set('page', String(nextPage));
    setSearchParams(next);
  };

  const applyFilters = () => {
    setPage(1);
    setApplied({ ...draft });
    writeUrl(draft, 1);
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    writeUrl(applied, nextPage);
  };

  return (
    <Box component="section">
      <Box sx={{ bgcolor: '#071B31', color: 'common.white', overflow: 'hidden' }}>
        <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3 }}>
          <Box sx={{ minHeight: 310, display: 'grid', gridTemplateColumns: '5fr 7fr', alignItems: 'center', gap: 4 }}>
            <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
              <Typography component="h1" variant="h2" color="common.white">Khám phá khóa học</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.76)', maxWidth: 520, fontSize: 17, lineHeight: 1.75 }}>
                Tìm chương trình học phù hợp với mục tiêu SEO, Google Ads, Content và AI Search của bạn.
              </Typography>
            </Stack>
            <Box component="img" src="/generated-images/catalog-hero.webp" alt="Không gian học Search Marketing có cấu trúc" sx={{ width: 'calc(100% + 48px)', height: 310, objectFit: 'cover' }} />
          </Box>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3, py: 6 }}>
        <Stack spacing={3}>
          <Box
            component="form"
            aria-label="Bộ lọc khóa học"
            onSubmit={(event) => { event.preventDefault(); applyFilters(); }}
            sx={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.6fr) repeat(4, minmax(150px, 1fr)) auto', gap: 1.5, alignItems: 'center', p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}
          >
            <FormControl>
              <InputLabel id="course-category-label" sx={{ whiteSpace: 'nowrap' }}>Danh mục</InputLabel>
              <Select labelId="course-category-label" label="Danh mục" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
                <MenuItem value="">Tất cả danh mục</MenuItem>
                {categories.map((item) => <MenuItem key={item.id} value={item.slug}>{item.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Tên khóa học" placeholder="SEO, Content Marketing..." value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} InputLabelProps={{ sx: { whiteSpace: 'nowrap' } }} />
            <FormControl>
              <InputLabel id="course-level-label" sx={{ whiteSpace: 'nowrap' }}>Cấp độ</InputLabel>
              <Select labelId="course-level-label" label="Cấp độ" value={draft.level} onChange={(event) => setDraft((current) => ({ ...current, level: event.target.value }))}>
                <MenuItem value="">Tất cả cấp độ</MenuItem>
                <MenuItem value="beginner">Cơ bản</MenuItem>
                <MenuItem value="intermediate">Trung cấp</MenuItem>
                <MenuItem value="advanced">Nâng cao</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="course-price-label" sx={{ whiteSpace: 'nowrap' }}>Sắp xếp theo giá</InputLabel>
              <Select labelId="course-price-label" label="Sắp xếp theo giá" value={draft.priceSort} onChange={(event) => setDraft((current) => ({ ...current, priceSort: event.target.value }))}>
                <MenuItem value="">Không sắp xếp theo giá</MenuItem>
                <MenuItem value="asc">Giá thấp đến cao</MenuItem>
                <MenuItem value="desc">Giá cao đến thấp</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="course-sort-label" sx={{ whiteSpace: 'nowrap' }}>Ngày xuất bản</InputLabel>
              <Select labelId="course-sort-label" label="Ngày xuất bản" value={draft.dateSort} onChange={(event) => setDraft((current) => ({ ...current, dateSort: event.target.value }))}>
                <MenuItem value="newest">Mới nhất</MenuItem>
                <MenuItem value="oldest">Cũ nhất</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" sx={{ whiteSpace: 'nowrap' }}>Áp dụng bộ lọc</Button>
          </Box>

          {catalog && <Typography color="text.secondary">{catalog.meta.total.toLocaleString('vi-VN')} khóa học phù hợp</Typography>}
          {error && <RequestError message={error} onRetry={() => setReloadKey((value) => value + 1)} />}
          {!catalog && !error && <PageSkeleton rows={4} />}
          {catalog?.data.length === 0 && <EmptyState title="Không tìm thấy khóa học phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
          {catalog && catalog.data.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2.5 }}>
              {catalog.data.map((course) => <CourseCard key={course.id} course={course} headingLevel="h2" />)}
            </Box>
          )}
          {catalog && catalog.meta.last_page > 1 && (
            <Pagination count={catalog.meta.last_page} page={page} onChange={(_, nextPage) => changePage(nextPage)} color="primary" aria-label="Phân trang khóa học" sx={{ alignSelf: 'center' }} />
          )}
        </Stack>
      </Container>
    </Box>
  );
}
