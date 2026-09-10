import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router';
import { PageSkeleton, RequestError } from '../components/AsyncState';
import { ApiError, resolveMaterialUrl } from '../lib/api';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { ApiNewsPost } from '../lib/contracts';
import { sanitizeRichText } from '../lib/sanitizeRichText';

export function NewsDetailPage() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<ApiNewsPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setPost(null);

    applicationRepositories.news.get(slug)
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
            {post.thumbnail && <Box component="img" src={resolveMaterialUrl(post.thumbnail) ?? post.thumbnail} alt="" sx={{ display: 'block', width: '100%', maxHeight: 420, objectFit: 'cover' }} />}
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={2}>
                <Chip label={post.category} color="primary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                <Typography component="h1" variant="h3" fontWeight={800}>{post.title}</Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{post.excerpt}</Typography>
                <Box sx={{ lineHeight: 1.8, '& img': { display: 'block', maxWidth: '100%', height: 'auto', my: 2 }, '& h2, & h3': { mt: 3, mb: 1 } }} dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content, (url) => resolveMaterialUrl(url) ?? url) }} />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
