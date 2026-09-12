<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #172033; font-size: 10px; margin: 0; }
        .header { border-bottom: 3px solid #0057ff; margin-bottom: 14px; padding-bottom: 9px; }
        .brand { color: #0f172a; font-size: 15px; font-weight: bold; }
        .brand small { color: #475569; display: block; font-size: 10px; font-weight: normal; margin-top: 3px; }
        .title { color: #0f172a; font-size: 19px; margin: 12px 0 3px; }
        .meta { color: #475569; font-size: 9px; }
        .summary { background: #f8fafc; border: 1px solid #dbe3ed; margin-bottom: 14px; padding: 8px 10px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; vertical-align: top; }
        th { background: #eaf2ff; color: #1e3a5f; font-weight: bold; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        .empty { color: #64748b; padding: 18px; text-align: center; }
        .footer { border-top: 1px solid #cbd5e1; color: #64748b; font-size: 9px; margin-top: 16px; padding-top: 8px; }
    </style>
</head>
<body>
    <header class="header">
        <div class="brand">CÔNG TY TNHH SEONGON<small>SEONGON Learning</small></div>
        <div class="title">{{ $title }}</div>
        <div class="meta">Mã báo cáo: {{ $code }} · Thời điểm tạo: {{ $generatedAt->format('d/m/Y H:i:s') }}</div>
    </header>

    <div class="summary">Tổng số bản ghi: <strong>{{ number_format($total, 0, ',', '.') }}</strong> · Nguồn: dữ liệu hiện tại trong cơ sở dữ liệu</div>

    @if ($rows->isEmpty())
        <div class="empty">Chưa có dữ liệu cho báo cáo này.</div>
    @else
        <table>
            <thead><tr>@foreach ($columns as $column)<th>{{ $column }}</th>@endforeach</tr></thead>
            <tbody>
            @foreach ($rows as $row)
                <tr>@foreach ($row as $value)<td>{{ $value }}</td>@endforeach</tr>
            @endforeach
            </tbody>
        </table>
    @endif

    <footer class="footer">Báo cáo được sinh tự động tại thời điểm tải xuống. Dữ liệu có thể thay đổi ở lần tải tiếp theo.</footer>
</body>
</html>
