import sys
import math
import cv2
import numpy as np


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Упорядочить 4 точки в порядке:
    [top-left, top-right, bottom-right, bottom-left]
    """
    rect = np.zeros((4, 2), dtype="float32")

    # сумма координат: tl имеет минимальную сумму, br – максимальную
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right

    # разность координат: tr имеет минимальную разность, bl – максимальную
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left

    return rect


def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """
    Перспективное преобразование по 4 точкам.
    pts – массив shape (4, 2).
    """
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # ширина результата
    widthA = math.dist(br, bl)
    widthB = math.dist(tr, tl)
    maxWidth = int(max(widthA, widthB))

    # высота результата
    heightA = math.dist(tr, br)
    heightB = math.dist(tl, bl)
    maxHeight = int(max(heightA, heightB))

    if maxWidth < 1:
        maxWidth = 1
    if maxHeight < 1:
        maxHeight = 1

    # целевые точки
    dst = np.array(
        [
            [0, 0],
            [maxWidth - 1, 0],
            [maxWidth - 1, maxHeight - 1],
            [0, maxHeight - 1],
        ],
        dtype="float32",
    )

    # матрица преобразования и сам warp
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(
        image,
        M,
        (maxWidth, maxHeight),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return warped


def main():
    # ожидаем: script, input, output, 8 чисел
    if len(sys.argv) != 11:
        print(
            "Usage:\n"
            "  python warp_logo.py input.png output.png "
            "x1 y1 x2 y2 x3 y3 x4 y4"
        )
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        coords = list(map(float, sys.argv[3:11]))
    except ValueError:
        print("Error: coordinates must be numbers.")
        sys.exit(1)

    pts = np.array(coords, dtype="float32").reshape(4, 2)

    # читаем изображение с сохранением альфы, если есть
    image = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if image is None:
        print(f"Error: cannot read input image: {input_path}")
        sys.exit(1)

    warped = four_point_transform(image, pts)

    ok = cv2.imwrite(output_path, warped)
    if not ok:
        print(f"Error: cannot write output image: {output_path}")
        sys.exit(1)

    print(f"Saved warped image to: {output_path}")


if __name__ == "__main__":
    main()
