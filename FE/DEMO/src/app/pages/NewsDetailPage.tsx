import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router';
import { PageSkeleton, RequestError } from '../components/AsyncState';
import { api, ApiError } from '../lib/api';
import type { ApiNewsPost } from '../lib/contracts';

export function NewsDetailPage() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<ApiNewsPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setPost(null);

    api.newsPost(slug)
      .then((result) => active && setPost(result.data))
      .catch((reason: unknown) => active && setError(reason instanceof ApiError ? reason.message : 'Không thể tải bài viết.'));

    return () => {
      active = false;
    };
  }, [reloadKey, slug]);

  if (error) return <Container sx={{ py: 6 }}><RequestError message={error} onRetry={() => setReloadKey((value) => value + 1)} /></Container>;
  if (!post) return <Container sx={{ py: 6 }}><PageSkeleton rows={4} /></Container>;

  return (
    <Box component="article" sx={{ py: { xs: 4, md: 7 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Button component={Link} to="/news" sx={{ alignSelf: 'flex-start' }}>Quay lại tin tức</Button>
          <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
            {post.thumbnail && <Box component="img" src={post.thumbnail} alt="" sx={{ display: 'block', width: '100%', maxHeight: 420, objectFit: 'cover' }} />}
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={2}>
                <Chip label={post.category} color="primary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                <Typography component="h1" variant="h3" fontWeight={800}>{post.title}</Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{post.excerpt}</Typography>
                <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                  {post.content}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
