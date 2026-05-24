"""SVG QR code generation for per-business public review URLs.

Pure-Python — uses qrcode's built-in SVG factory so we don't pull in Pillow
(~6MB) as a dependency. SVG scales cleanly for any print or embed use.
"""

import io

import qrcode
import qrcode.image.svg


def make_qr_svg(url: str) -> bytes:
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(url, image_factory=factory, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue()
