function hex2rgba (hex) {
  if (typeof hex !== 'string') {
    throw new Error('Color should be defined as hex string')
  }

  var hexCode = hex.slice().replace('#', '').split('')
  if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
    throw new Error('Invalid hex color: ' + hex)
  }

  // Convert from short to long form (fff -> ffffff)
  if (hexCode.length === 3 || hexCode.length === 4) {
    hexCode = Array.prototype.concat.apply([], hexCode.map(function (c) {
      return [c, c]
    }))
  }

  // Add default alpha value
  if (hexCode.length === 6) hexCode.push('F', 'F')

  var hexValue = parseInt(hexCode.join(''), 16)

  return {
    r: (hexValue >> 24) & 255,
    g: (hexValue >> 16) & 255,
    b: (hexValue >> 8) & 255,
    a: hexValue & 255,
    hex: '#' + hexCode.slice(0, 6).join('')
  }
}

exports.getOptions = function getOptions (options) {
  if (!options) options = {}
  if (!options.color) options.color = {}

  var margin = typeof options.margin === 'undefined' ||
    options.margin === null ||
    options.margin < 0 ? 4 : options.margin

  var width = options.width && options.width >= 21 ? options.width : undefined
  var scale = options.scale || 4

  return {
    // 新加参数
    randomColor: options.randomColor || null,
    // old
    width: width,
    scale: width ? 4 : scale,
    margin: margin,
    color: {
      dark: hex2rgba(options.color.dark || '#000000ff'),
      light: hex2rgba(options.color.light || '#ffffffff')
    },
    type: options.type,
    rendererOpts: options.rendererOpts || {}
  }
}

exports.getScale = function getScale (qrSize, opts) {
  return opts.width && opts.width >= qrSize + opts.margin * 2
    ? opts.width / (qrSize + opts.margin * 2)
    : opts.scale
}

exports.getImageWidth = function getImageWidth (qrSize, opts) {
  var scale = exports.getScale(qrSize, opts)
  return Math.floor((qrSize + opts.margin * 2) * scale)
}

exports.qrToImageData = function qrToImageData (imgData, qr, opts) {
  // different version(1~40) have different different size
  // version 1 : 21 * 21
  // version 2 : 25 * 25
  var size = qr.modules.size;
  // data每个元素表示每个module的色值,0白色，1黑色；总共size * size个module
  var data = qr.modules.data;
  // 每个modules，所占据多少像素
  // scale = x ( per module have x pixel)
  var scale = exports.getScale(size, opts);
  // 生成图片后的像素
  var symbolSize = Math.floor((size + opts.margin * 2) * scale);
  var scaledMargin = opts.margin * scale;
  var palette = [opts.color.light, opts.color.dark]
  console.log(size, scale, symbolSize, palette, data.length, data[0], data[8], data[12], data[13]);

  // 想弄成module遍历（以为能减少遍历次数)，发现没必要
  // const symbolModuleSize = size + opts.margin * 2;
  // const moduleMargin = opts.margin;
  // const halfScale = scale / 2;
  // for (let i = 0; i < symbolModuleSize; i++) {
  //   for (let j = 0; j < symbolModuleSize; j++) {
  //     if (i >= moduleMargin && j >= moduleMargin &&
  //       i < symbolModuleSize - moduleMargin && j < symbolModuleSize - moduleMargin) {
  //     }
  //     const firstPixel = i * scale * symbolSize + j * scale;
  //     const secondPixel = firstPixel + 1;
  //     const thridPixel = (i * scale + 1) * symbolSize + j * scale;
  //     const fourthPixel = thridPixel + 1;

  //     const moduleTh = (i - moduleMargin) * size + (j - moduleMargin);
  //     if (moduleTh === 0) {
  //       console.log(i, j, size, moduleMargin, 'hhh', firstPixel, secondPixel, thridPixel, fourthPixel);
  //       console.log(data[0], 'hh', data[7], data[14]);
  //     }
  //   }
  // }
  // let tag = 0;

  console.log('opts', opts.randomColor);
  // 横轴i, 纵轴j
  for (var i = 0; i < symbolSize; i++) {
    for (var j = 0; j < symbolSize; j++) {
      var posDst = (i * symbolSize + j) * 4;
      // console.log('posDst', posDst);
      var pxColor = opts.color.light;

      if (i >= scaledMargin && j >= scaledMargin &&
        i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
        // 每个module位置
        var iSrc = Math.floor((i - scaledMargin) / scale);
        var jSrc = Math.floor((j - scaledMargin) / scale);
        pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0]

        if (opts.randomColor && (
            exports.judgeIsCanColor(iSrc, jSrc, data, size) ||
            exports.judgeFinderPattern(i, j, {
              margin: opts.margin,
              size,
              scale,
            })
          )
        ) {
          pxColor = hex2rgba(opts.randomColor);
        }
      }

      // img元素填充rgba
      imgData[posDst++] = pxColor.r
      imgData[posDst++] = pxColor.g
      imgData[posDst++] = pxColor.b
      imgData[posDst] = pxColor.a
    }
  }
}

// 判断x, y像素是否处在 定位标识
exports.judgeFinderPattern = function (i, j, opts) {
  const { margin, size, scale } = opts;
  const ll = (margin + 2) * scale;
  const llPlus2 = (margin + 5) * scale;
  const rr = (margin + size - 5) * scale;
  const rrPlus2 = (margin + size - 2) * scale;
  // console.log(`i >= ${ll} && i < ${llPlus2} && j >= ${ll} && j < ${llPlus2}`);
  // if (i >= ( 6*4 ) && i < (9*4) && j >= (6 * 4) && j < (9*4)) {
  //   return true;
  // }
  // return false;
  if(
    (ll <= i && i < llPlus2 && ll <= j && j < llPlus2) ||
    (rr <= i && i < rrPlus2 && ll <= j && j < llPlus2) ||
    (ll <= i && i < llPlus2 && rr <= j && j < rrPlus2)
  ) {
    return true;
  }
  return false
}

// 随机上色(把周围8个module都是白色的,中间module上色)
exports.judgeIsCanColor = function (iSrc, jSrc, data, size) {
  return iSrc >=1 && jSrc >=1 && iSrc <= (size - 1) && jSrc <= (size - 1) && (
    [-1, 0, 1].every(i => {
      return [-1, 0, 1].every(j => {
        const aroundModule = (iSrc + i) * size + (jSrc + j);
        // 周围都是0
        return (i === 0 && j === 0) || !data[aroundModule];
      });
    })
  );
}
