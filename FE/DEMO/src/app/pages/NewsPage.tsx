import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';
import { SectionHeading } from '../components/SectionHeading';
import { ApiError } from '../lib/api';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { ApiNewsList } from '../lib/contracts';

export function NewsPage() {
  const [news, setNews] = useState<ApiNewsList | null>(null);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setNews(null);

    applicationRepositories.news.list({ category: category || undefined, page })
      .then((result) => {
        if (!active) return;
        setNews(result);
        setCategories(result.categories);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof ApiError ? reason.message : 'Không thể tải tin tức.');
      });

    return () => {
      active = false;
    };
  }, [category, page, reloadKey]);

  return (
    <Box component="section" sx={{ py: { xs: 4, md: 7 } }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <SectionHeading
            title="Tin tức & kiến thức"
            description="Cập nhật những xu hướng và kinh nghiệm thực hành mới nhất từ SEONGON."
          />

          <FormControl sx={{ width: { xs: '100%', sm: 260 } }}>
            <InputLabel id="news-category-label">Chuyên mục</InputLabel>
            <Select
              labelId="news-category-label"
              label="Chuyên mục"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Tất cả chuyên mục</MenuItem>
              {categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </Select>
          </FormControl>

          {error && <RequestError message={error} onRetry={() => setReloadKey((value) => value + 1)} />}
          {!news && !error && <PageSkeleton rows={3} />}
          {news?.data.length === 0 && <EmptyState title="Chưa có bài viết nào được xuất bản." />}

          {news && news.data.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
              {news.data.map((post) => (
                <Card key={post.id} variant="outlined" sx={{ height: '100%', borderRadius: 2.5 }}>
                  <CardActionArea component={Link} to={`/news/${post.slug}`} aria-label={post.title} sx={{ height: '100%', alignItems: 'stretch' }}>
                    {post.thumbnail && <CardMedia component="img" height="180" image={post.thumbnail} alt="" />}
                    <CardContent sx={{ height: '100%' }}>
                      <Stack spacing={1.25} sx={{ height: '100%' }}>
                        <Typography variant="overline" color="primary.main">{post.category}</Typography>
                        <Typography component="h2" variant="h6" fontWeight={800}>{post.title}</Typography>
                        <Typography color="text.secondary" sx={{ lineHeight: 1.7, flexGrow: 1 }}>{post.excerpt}</Typography>
                        {post.published_at && <Typography variant="body2" color="text.secondary">{new Date(post.published_at).toLocaleDateString('vi-VN')}</Typography>}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
          {news && news.meta.last_page > 1 && (
            <Pagination
              count={news.meta.last_page}
              page={news.meta.current_page}
              onChange={(_, nextPage) => setPage(nextPage)}
              color="primary"
              aria-label="Phân trang tin tức"
              getItemAriaLabel={(type, nextPage, selected) => {
                if (type === 'page') return selected ? `Trang ${nextPage} hiện tại` : `Đi tới trang ${nextPage}`;
                return type === 'next' ? 'Trang tiếp theo' : 'Trang trước';
              }}
              sx={{ alignSelf: 'center' }}
            />
          )}
        </Stack>
      </Container>
    </Box>
  );
}
