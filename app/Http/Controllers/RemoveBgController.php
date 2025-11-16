<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class RemoveBgController extends Controller
{
    public function remove(Request $request)
    {
        if (!$request->hasFile('image')) {
            return response()->json(['error' => 'No image'], 400);
        }

        $image = $request->file('image');

        // Папка для временных файлов
        $tmpDir = storage_path('app/tmp');
        if (!file_exists($tmpDir)) {
            mkdir($tmpDir, 0777, true);
        }

        $inputPath  = $tmpDir . '/' . uniqid('in_') . '.png';
        $outputPath = $tmpDir . '/' . uniqid('out_') . '.png';

        // Сохраняем входной файл
        $image->move($tmpDir, basename($inputPath));

        // Полный путь к rembg.exe
        $rembg = 'D:\\OSPanel\\home\\RemLogo\\py-rembg\\python310\\Scripts\\rembg.exe';

        // Команда rembg
        $cmd = "\"$rembg\" i -m bria-rmbg \"$inputPath\" \"$outputPath\"";
        exec($cmd, $output, $returnVar);

        if (!file_exists($outputPath)) {
            return response()->json(['error' => 'rembg failed'], 500);
        }

        return response()->download($outputPath)->deleteFileAfterSend(true);
    }

    public function straighten(Request $request)
    {
        if (!$request->hasFile('image') || !$request->has('points')) {
            return response()->json(['error' => 'No image or points'], 400);
        }

        // points приходит как JSON-строка → декодируем
        $pointsRaw = $request->input('points');
        $points = json_decode($pointsRaw, true);

        if (!is_array($points) || count($points) !== 4) {
            return response()->json(['error' => 'Invalid points'], 400);
        }

        $tmpDir = storage_path('app/tmp');
        if (!file_exists($tmpDir)) {
            mkdir($tmpDir, 0777, true);
        }

        $inputPath  = $tmpDir . '/' . uniqid('in_') . '.png';
        $outputPath = $tmpDir . '/' . uniqid('out_') . '.png';

        $request->file('image')->move($tmpDir, basename($inputPath));

        $python = 'D:\\OSPanel\\home\\RemLogo\\py-rembg\\python310\\python.exe';
        $script = 'D:\\OSPanel\\home\\RemLogo\\py-rembg\\python310\\warp_logo.py';

        // Распаковываем 4 точки
        [$x1, $y1] = $points[0];
        [$x2, $y2] = $points[1];
        [$x3, $y3] = $points[2];
        [$x4, $y4] = $points[3];

        // На всякий случай приводим к float / строке
        $coords = [
            (float)$x1, (float)$y1,
            (float)$x2, (float)$y2,
            (float)$x3, (float)$y3,
            (float)$x4, (float)$y4,
        ];

        $cmd = "\"$python\" \"$script\" \"$inputPath\" \"$outputPath\" " . implode(' ', $coords);

        exec($cmd, $out, $ret);

        if (!file_exists($outputPath)) {
            return response()->json(['error' => 'warp failed'], 500);
        }

        return response()->file($outputPath);
    }
}
