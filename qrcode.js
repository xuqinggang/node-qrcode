const qrcode = require('./lib');

qrcode.toFile('./qrcode.png', 'xxx', {
  // version: 2,
  width: 100,
  scale: 3,
  randomColor: '#FF0000',
  type: 'png',
  color: {
    dark: '#000',  // Blue dots
    light: '#fff' // Transparent background
  },
})
// const rt = qrcode.create('xxx', {
//   type: 'png',
//   color: {
//     dark: '#000',  // Blue dots
//     light: '#fff' // Transparent background
//   },
// });
// console.log(rt);
