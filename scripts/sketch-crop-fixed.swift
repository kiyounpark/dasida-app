// 아이패드 메모 스크린샷에서 같은 사각형을 잘라 정사각형 흰 캔버스에 놓는다.
// 여러 컷을 같은 자리에 잘라야 캡컷에서 그림이 안 튄다 (recenter는 컷마다 자리가 달라져서 못 씀).
// 사용: swift scripts/sketch-crop-fixed.swift 입력.png 출력.png x y w h
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
let inPath = a[1], outPath = a[2]
let cx = Int(a[3])!, cy = Int(a[4])!, cw = Int(a[5])!, ch = Int(a[6])!

guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: inPath) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("load fail") }

let w = img.width, h = img.height
let cs = CGColorSpaceCreateDeviceRGB()
var buf = [UInt8](repeating: 255, count: w * h * 4)
let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                    space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

// 잘라낸 영역을 정사각형(변 = max(cw, ch)) 가운데에 놓는다. 흑백으로 정리 (회색 UI 잔상 제거).
let side = max(cw, ch)
let ox = (side - cw) / 2, oy = (side - ch) / 2
var out = [UInt8](repeating: 255, count: side * side * 4)
func lum(_ x: Int, _ y: Int) -> Int {
  let i = (y * w + x) * 4
  return (Int(buf[i]) + Int(buf[i+1]) + Int(buf[i+2])) / 3
}
for y in 0..<ch { for x in 0..<cw {
  let sx = cx + x, sy = cy + y
  guard sx >= 0, sy >= 0, sx < w, sy < h else { continue }
  let l = lum(sx, sy)
  if l < 160 {
    // 티끌 제거: 주변 21x21에 잉크가 25픽셀 미만이면 점으로 보고 버림
    var n = 0
    for dy in -10...10 { for dx in -10...10 {
      let px = sx + dx, py = sy + dy
      if px >= 0, py >= 0, px < w, py < h, lum(px, py) < 160 { n += 1 }
    }}
    if n < 25 { continue }
    let o = ((y + oy) * side + (x + ox)) * 4
    out[o] = 17; out[o+1] = 17; out[o+2] = 17; out[o+3] = 255
  }
}}
let octx = CGContext(data: &out, width: side, height: side, bitsPerComponent: 8, bytesPerRow: side * 4,
                     space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let result = octx.makeImage()!
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outPath) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, result, nil)
CGImageDestinationFinalize(dest)
print("ok \(side)x\(side)")
