<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { margin: 0; padding: 0; }
        .frame {
            border: 10px solid #1e3a8a;
            margin: 30px;
            padding: 60px 50px;
            text-align: center;
        }
        .title { font-size: 34px; color: #1e3a8a; letter-spacing: 3px; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: #64748b; margin-bottom: 40px; }
        .name { font-size: 28px; font-weight: bold; margin: 20px 0; }
        .course { font-size: 20px; color: #0f172a; margin: 12px 0 30px; }
        .meta { font-size: 13px; color: #475569; margin-top: 40px; }
        .code { font-size: 12px; color: #94a3b8; margin-top: 6px; }
    </style>
</head>
<body>
    <div class="frame">
        <div class="title">CHỨNG CHỈ HOÀN THÀNH</div>
        <div class="subtitle">SEONGON — Hệ thống học tập trực tuyến</div>

        <div>Chứng nhận học viên</div>
        <div class="name">{{ $user->name }}</div>
        <div>đã hoàn thành khóa học</div>
        <div class="course">{{ $course->title }}</div>

        <div class="meta">
            Ngày cấp: {{ $certificate->issued_at?->format('d/m/Y') }}
        </div>
        <div class="code">Mã chứng chỉ: {{ $certificate->certificate_code }}</div>
    </div>
</body>
</html>
