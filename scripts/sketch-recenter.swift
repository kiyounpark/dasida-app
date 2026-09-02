import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let inPath = args[1], outPath = args[2]
let pad = Int(args[3]) ?? 80

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

// ink bbox: ignore isolated stray dots by requiring a row/col to have >= 3 dark pixels
var rowCount = [Int](repeating: 0, count: h), colCount = [Int](repeating: 0, count: w)
for y in 0..<h { for x in 0..<w {
  let i = (y * w + x) * 4
  let lum = (Int(buf[i]) + Int(buf[i+1]) + Int(buf[i+2])) / 3
  if lum < 128 { rowCount[y] += 1; colCount[x] += 1 }
}}
// keep only runs of >= 20 consecutive ink rows/cols (drops stray dots and tiny marks)
func runs(_ counts: [Int]) -> [Int] {
  var kept: [Int] = []; var run: [Int] = []
  for (i, c) in counts.enumerated() {
    if c >= 3 { run.append(i) } else { if run.count >= 20 { kept += run }; run = [] }
  }
  if run.count >= 20 { kept += run }
  return kept
}
let rows = runs(rowCount), cols = runs(colCount)
guard let y0 = rows.min(), let y1 = rows.max(), let x0 = cols.min(), let x1 = cols.max() else { fatalError("no ink") }
// bitmap row 0 = image top, so no flip
let top = y0, bottom = y1
let bw = x1 - x0 + 1, bh = bottom - top + 1
let side = max(bw, bh) + pad * 2
print("ink bbox x:\(x0)-\(x1) y:\(top)-\(bottom) → \(bw)x\(bh), canvas \(side)x\(side)")

let crop = img.cropping(to: CGRect(x: x0, y: top, width: bw, height: bh))!
let out = CGContext(data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: side * 4,
                    space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
out.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
out.fill(CGRect(x: 0, y: 0, width: side, height: side))
out.draw(crop, in: CGRect(x: (side - bw) / 2, y: (side - bh) / 2, width: bw, height: bh))
let result = out.makeImage()!
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outPath) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, result, nil)
CGImageDestinationFinalize(dest)
print("wrote \(outPath)")
