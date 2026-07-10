import { Link } from 'react-router';
import { ArrowRight, Award, TrendingUp, Users, Zap } from 'lucide-react';

type BannerVariant = 'primary' | 'secondary' | 'gradient';

interface MotivationalBannerProps {
  variant?: BannerVariant;
}

const bannerContent = [
  {
    variant: 'primary' as BannerVariant,
    icon: Award,
    title: 'Bắt đầu hành trình học tập của bạn',
    description: 'Tham gia cùng 5,000+ học viên đã thành công với SEONGON Academy',
    cta: 'Khám phá khóa học',
    link: '/courses',
    gradient: 'from-[#2DD0D1] to-[#489EE2]',
  },
  {
    variant: 'secondary' as BannerVariant,
    icon: TrendingUp,
    title: 'Đạt được mục tiêu sự nghiệp của bạn',
    description: '85% học viên có việc làm sau khi hoàn thành chương trình đào tạo',
    cta: 'Xem combo khóa học',
    link: '/combos',
    gradient: 'from-[#DA1564] to-[#8F349C]',
  },
  {
    variant: 'gradient' as BannerVariant,
    icon: Zap,
    title: 'Nâng cao kỹ năng, tăng thu nhập',
    description: 'Học từ các chuyên gia hàng đầu với kinh nghiệm 10+ năm',
    cta: 'Đăng ký ngay',
    link: '/login',
    gradient: 'from-[#8F349C] via-[#DA1564] to-[#489EE2]',
  },
  {
    variant: 'primary' as BannerVariant,
    icon: Users,
    title: 'Tham gia cộng đồng SEONGON',
    description: 'Kết nối với hàng ngàn học viên và chuyên gia trong ngành',
    cta: 'Tìm hiểu thêm',
    link: '/internships',
    gradient: 'from-[#489EE2] to-[#2DD0D1]',
  },
];

export function MotivationalBanner({ variant = 'primary' }: MotivationalBannerProps) {
  // Randomly select a banner or use the variant
  const selectedBanner = variant 
    ? bannerContent.find(b => b.variant === variant) || bannerContent[0]
    : bannerContent[Math.floor(Math.random() * bannerContent.length)];

  const Icon = selectedBanner.icon;

  return (
    <section className={`py-12 bg-gradient-to-r ${selectedBanner.gradient} text-white overflow-hidden relative`}>
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920')] opacity-10 bg-cover bg-center"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="hidden sm:block p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl mb-2">{selectedBanner.title}</h3>
              <p className="text-white/90">{selectedBanner.description}</p>
            </div>
          </div>
          <Link
            to={selectedBanner.link}
            className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:shadow-xl transition-all transform hover:scale-105 whitespace-nowrap"
          >
            {selectedBanner.cta}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}