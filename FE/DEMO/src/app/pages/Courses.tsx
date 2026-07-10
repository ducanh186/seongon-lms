import { useState } from 'react';
import { Link } from 'react-router';
import { Search, Star, Clock, Users, SlidersHorizontal, X } from 'lucide-react';
import { mockCourses } from '../data/mockData';

export function Courses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['all', 'Marketing', 'Writing', 'SEO', 'Social Media', 'Ads'];

  const filteredCourses = mockCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesPrice = course.price >= priceRange[0] && course.price <= priceRange[1];
    const matchesRating = course.rating >= minRating;
    return matchesSearch && matchesCategory && matchesPrice && matchesRating;
  });

  const resetFilters = () => {
    setSelectedCategory('all');
    setPriceRange([0, 5000000]);
    setMinRating(0);
  };

  return (
    <div>
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#00D4E7] via-[#E91E8C] to-[#0BC4D9] text-white overflow-hidden py-16">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJrZXRpbmclMjBhbmFseXRpY3MlMjBkYXNoYm9hcmR8ZW58MXx8fHwxNzc0MDE2MzQ3fDA&ixlib=rb-4.1.0&q=80&w=1080')] opacity-10 bg-cover bg-center"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-4xl md:text-5xl">Khóa học trực tuyến</h1>
          <p className="text-lg opacity-90">
            Khám phá các khóa học Marketing chất lượng cao từ SEONGON
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm khóa học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Courses Grid */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Tìm thấy {filteredCourses.length} khóa học
              </p>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Bộ lọc
              </button>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map(course => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                        {course.category}
                      </span>
                      <span className="px-2 py-1 bg-secondary/10 text-secondary rounded text-sm">
                        {course.level}
                      </span>
                    </div>
                    <h3 className="mb-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{course.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{course.totalStudents}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary">
                        {course.price.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {course.instructor}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredCourses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Không tìm thấy khóa học phù hợp</p>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - Filters */}
          <div className={`lg:col-span-1 order-1 lg:order-2 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-20 bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5" />
                  Bộ lọc
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden p-1 hover:bg-accent rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="mb-3">Danh mục</h4>
                <div className="space-y-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {category === 'all' ? 'Tất cả' : category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="mb-6">
                <h4 className="mb-3">Giá (VNĐ)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Từ</label>
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                      step="100000"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Đến</label>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                      step="100000"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => setPriceRange([0, 2500000])}
                      className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      &lt; 2.5tr
                    </button>
                    <button
                      onClick={() => setPriceRange([2500000, 3500000])}
                      className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      2.5tr - 3.5tr
                    </button>
                    <button
                      onClick={() => setPriceRange([3500000, 5000000])}
                      className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      &gt; 3.5tr
                    </button>
                  </div>
                </div>
              </div>

              {/* Rating Filter */}
              <div className="mb-6">
                <h4 className="mb-3">Đánh giá</h4>
                <div className="space-y-2">
                  {[5, 4.5, 4, 3.5, 0].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        minRating === rating
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {rating === 0 ? (
                        <span>Tất cả</span>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            {[...Array(Math.floor(rating))].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                            {rating % 1 !== 0 && (
                              <Star className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />
                            )}
                          </div>
                          <span className="text-sm">trở lên</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}