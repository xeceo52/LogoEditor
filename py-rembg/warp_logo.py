import sys
import cv2
import numpy as np

# usage:
# python warp_logo.py input.png output.png x1 y1 x2 y2 x3 y3 x4 y4

if len(sys.argv) != 11:
    print("Usage: python warp_logo.py input.png output.png x1 y1 x2 y2 x3 y3 x4 y4")
    sys.exit(1)

input_path = sys.argv[1]
output_path = sys.argv[2]

coords = list(map(float, sys.argv[3:]))

# Точки в том порядке, как пришли (порядок кликов уже не важен)
pts = np.array([
    [coords[0], coords[1]],
    [coords[2], coords[3]],
    [coords[4], coords[5]],
    [coords[6], coords[7]],
], dtype="float32")


def order_points(pts_array: np.ndarray) -> np.ndarray:
    """
    Упорядочить 4 точки:
    0 - top-left
    1 - top-right
    2 - bottom-right
    3 - bottom-left
    """
    rect = np.zeros((4, 2), dtype="float32")

    # сумма координат: min -> TL, max -> BR
    s = pts_array.sum(axis=1)
    rect[0] = pts_array[np.argmin(s)]
    rect[2] = pts_array[np.argmax(s)]

    # разница координат: min -> TR, max -> BL
    diff = np.diff(pts_array, axis=1)
    rect[1] = pts_array[np.argmin(diff)]
    rect[3] = pts_array[np.argmax(diff)]

    return rect


rect = order_points(pts)
(tl, tr, br, bl) = rect

# ширины и высоты по двум сторонам, берём среднее
width_top = np.linalg.norm(tr - tl)
width_bottom = np.linalg.norm(br - bl)
max_width = int(round((width_top + width_bottom) / 2.0))

height_left = np.linalg.norm(bl - tl)
height_right = np.linalg.norm(br - tr)
max_height = int(round((height_left + height_right) / 2.0))

# защита от нулей
if max_width < 1:
    max_width = 1
if max_height < 1:
    max_height = 1

dst = np.array([
    [0, 0],
    [max_width - 1, 0],
    [max_width - 1, max_height - 1],
    [0, max_height - 1]
], dtype="float32")

M = cv2.getPerspectiveTransform(rect, dst)
image = cv2.imread(input_path)
warped = cv2.warpPerspective(image, M, (max_width, max_height))

cv2.imwrite(output_path, warped)
