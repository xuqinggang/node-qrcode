# -*- coding: utf-8 -*-

import os
from frame import logger
from cStringIO import StringIO
try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    import Image
    import ImageDraw

import qrcode
import qrcode.image.base
import requests

class PilImage(qrcode.image.base.BaseImage):
    """
    PIL image builder, default format is PNG.
    """
    kind = "PNG"

    def new_image(self, **kwargs):
        back_color = kwargs.get("back_color", "white")
        mode = "RGB"
        img = Image.new(mode, (self.pixel_size, self.pixel_size), back_color)
        self._idr = ImageDraw.Draw(img)
        return img

    def drawrect(self, row, col, color):
        box = self.pixel_box(row, col)
        self._idr.rectangle(box, fill=color)

    def save(self, stream, format=None, **kwargs):
        if format is None:
            format = kwargs.get("kind", self.kind)
        if "kind" in kwargs:
            del kwargs["kind"]
        # print "size", self._img.size
        self._img.save(stream, format=format, **kwargs)

    def add_icon(self, icon_file="4ad3000601071450e33b.png"):
        icon = Image.open(os.path.join(os.path.dirname(__file__), icon_file))
        icon_area = icon.size[0] * icon.size[1]
        if icon_area == 0:
            return 
        total_area = self._img.size[0] * self._img.size[1]
        can_distory = total_area * 0.06
        import math
        radio = math.sqrt(can_distory / icon_area)
        
        icon_re = icon.resize((int(icon.size[0] * radio), int(icon.size[1] * radio)), Image.ANTIALIAS)
        # print icon_re.size[0] * icon_re.size[1] * 1.0 / (self._img.size[0] * self._img.size[1])
        pos_x = (self._img.size[0] - icon_re.size[0]) / 2
        pos_y = (self._img.size[1] - icon_re.size[1]) / 2
        self._img.paste(icon_re, (pos_x, pos_y), icon_re)

    def __getattr__(self, name):
        return getattr(self._img, name)


def deal(matrix, r, c):
    le = len(matrix)
    ll, rr = 2, le-5
    if (ll<=r<=ll+2 and ll<=c<=ll+2) or (rr<=r<=rr+2 and ll<=c<=ll+2) or (ll<=r<=ll+2 and rr<=c<=rr+2):
        return True

    ok = True
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if (0 <= dx + r < le) and (0 <= dy + c < le) and (dx != 0 or dy != 0):
                if matrix[dx+r][dy+c]:
                    return False
    return True


# 默认值icon_file为头条图标，colorful表示是否在二维码中添加彩色
def getqrcode(url, icon_file="4ad3000601071450e33b.png", colorful=True):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=24,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    try:
        im = PilImage(qr.border, qr.modules_count, qr.box_size)
        for r in range(qr.modules_count):
            for c in range(qr.modules_count):
                if qr.modules[r][c]:
                    if colorful and deal(qr.modules, r, c):
                        im.drawrect(r, c, "#ff0000")
                    else:
                        im.drawrect(r, c, "#000000")

        s = StringIO()
        im.add_icon(icon_file)
        im.save(s, "jpeg")
        data = s.getvalue()
    except Exception, ex:
        logger.exception("GetMediaQrcodeUri: fail to get qrcode_uri[url=%s exception=%s]", url, ex)
        return None
    return data
