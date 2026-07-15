import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import type { ApiCourse } from '../lib/contracts';
import { layoutTokens } from '../theme';

const FALLBACK_HERO_IMAGE = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=82';

export function HeroBanner({ courses }: { courses: ApiCourse[] }) {
  const featured = courses.slice(0, 3);
  const primary = featured[0];

  if (!primary) return null;

  return (
    <Box
      component="section"
      aria-label="Khóa học nổi bật"
      data-surface="dark"
      sx={{ position: 'relative', minHeight: { xs: 520, md: 460 }, overflow: 'hidden', bgcolor: 'secondary.dark' }}
    >
      <Box
        component="img"
        src={primary.thumbnail ?? FALLBACK_HERO_IMAGE}
        alt=""
        loading="eager"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <Box
        aria-hidden="true"
        sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(11,31,51,.96) 0%, rgba(11,31,51,.82) 48%, rgba(11,31,51,.28) 100%)' }}
      />
      <Container
        maxWidth={false}
        sx={{ maxWidth: layoutTokens.contentMaxWidth, position: 'relative', color: 'common.white', py: { xs: 7, md: 9 } }}
      >
        <Stack spacing={3} justifyContent="center" sx={{ minHeight: { xs: 380, md: 316 }, maxWidth: 720 }}>
          {primary.category?.name && (
            <Typography variant="overline" sx={{ color: 'primary.light', fontWeight: 800, letterSpacing: '.08em' }}>
              {primary.category.name}
            </Typography>
          )}
          <Typography component="h1" variant="h2" sx={{ fontSize: { xs: '2.5rem', sm: '3.35rem', md: '4rem' }, maxWidth: '16ch' }}>
            {primary.title}
          </Typography>
          <Box>
            <Button
              component={Link}
              to={`/courses/${primary.slug}`}
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Xem khóa học
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
