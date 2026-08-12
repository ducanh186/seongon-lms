import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { layoutTokens } from '../theme';

const footerLinkSx = {
  color: 'rgba(255,255,255,.68)',
  fontSize: 14,
  textDecoration: 'none',
  width: 'fit-content',
  '&:hover': { color: 'common.white', textDecoration: 'underline' },
} as const;

function FooterHeading({ children }: { children: string }) {
  return (
    <Typography component="h2" variant="subtitle2" sx={{ color: 'common.white', textTransform: 'uppercase', letterSpacing: '.06em', mb: 2 }}>
      {children}
    </Typography>
  );
}

export function PublicFooter() {
  return (
    <Box component="footer" data-surface="dark" sx={{ bgcolor: '#102E38', color: 'common.white', pt: 7.5, pb: 3.75, mt: 'auto' }}>
      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3 }}>
        <Box
          data-testid="public-footer-grid"
          sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 5, mb: 5 }}
        >
          <Box>
            <Typography fontSize={22} fontWeight={800}>SEONGON Academy</Typography>
            <Typography variant="body2" sx={{ mt: 2, maxWidth: 340, color: 'rgba(255,255,255,.68)', lineHeight: 1.8 }}>
              Nền tảng học trực tuyến dành cho những người muốn phát triển năng lực Search Marketing bằng kiến thức thực chiến.
            </Typography>
          </Box>

          <Box>
            <FooterHeading>Khám phá</FooterHeading>
            <Stack spacing={1}>
              <Link component={RouterLink} to="/courses" sx={footerLinkSx}>Tất cả khóa học</Link>
              <Link component={RouterLink} to="/courses?price=free" sx={footerLinkSx}>Khóa học miễn phí</Link>
              <Link component={RouterLink} to="/news" sx={footerLinkSx}>Tin tức &amp; kiến thức</Link>
            </Stack>
          </Box>

          <Box>
            <FooterHeading>Tài khoản</FooterHeading>
            <Stack spacing={1}>
              <Link component={RouterLink} to="/login" sx={footerLinkSx}>Đăng nhập</Link>
              <Link component={RouterLink} to="/my-courses" sx={footerLinkSx}>Khóa học của tôi</Link>
              <Link component={RouterLink} to="/cart" sx={footerLinkSx}>Giỏ hàng</Link>
            </Stack>
          </Box>

          <Box>
            <FooterHeading>Liên hệ &amp; chính sách</FooterHeading>
            <Stack spacing={1}>
              <Link component={RouterLink} to="/news?category=FAQ" sx={footerLinkSx}>Câu hỏi thường gặp</Link>
              <Link component={RouterLink} to="/news?category=Chính sách" sx={footerLinkSx}>Chính sách bảo mật</Link>
              <Link component={RouterLink} to="/news" sx={footerLinkSx}>Hỗ trợ học viên</Link>
            </Stack>
          </Box>
        </Box>

        <Typography variant="body2" textAlign="center" sx={{ borderTop: '1px solid rgba(255,255,255,.1)', pt: 3, color: 'rgba(255,255,255,.58)' }}>
          © 2026 SEONGON Academy. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
