<?php

namespace App\Support;

final class DemoStudentNames
{
    private const SURNAMES = [
        'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng',
        'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
    ];

    private const GIVEN_NAMES = [
        'Văn An', 'Minh Anh', 'Hoàng Nam', 'Thu Hà', 'Đức Long',
        'Ngọc Mai', 'Quang Huy', 'Thanh Tâm', 'Gia Bảo', 'Hải Yến',
        'Bảo Ngọc', 'Khánh Linh', 'Quốc Huy', 'Thùy Dương', 'Nhật Minh',
        'Phương Anh', 'Tuấn Kiệt', 'Mai Chi', 'Trung Kiên', 'Diệu Linh',
    ];

    public static function forNumber(int $number): string
    {
        $nameCount = count(self::SURNAMES) * count(self::GIVEN_NAMES);
        $index = max(0, $number - 1) % $nameCount;

        return self::SURNAMES[intdiv($index, count(self::GIVEN_NAMES))]
            .' '.self::GIVEN_NAMES[$index % count(self::GIVEN_NAMES)];
    }
}
