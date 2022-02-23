/**
 * Emoticon Kit
 * Author: Seven Yu
 * Version: 3.0.0
 * URL: https://phpz.xyz/emoticon/
 */

// let eyeCount, faceCount, lArmCount, rArmCount, mouseCount, plusCount,
const assets = {
  lEye: ['￣', '—', '＿', '﹁', '^', '~', '=', '@', '·', '‵', '>', '→',
    '〒', '┬', 'T', '゜', '。', '●', '◎', '⊙', '○', '╯', '︶',
    '〃', 'Φ', 'Θ', '+', 'x', '$', '≧', 'ｕ', 'Ｕ', '→', '←', '•̀',
    '꒪', '´'
  ],
  rEye: ['￣', '—', '＿', '﹁', '^', '~', '=', '@', '·', '′', '<', '←',
    '〒', '┬', 'T', '゜', '。', '●', '◎', '⊙', '○', '╰', '︶',
    '〃', 'Φ', 'Θ', '+', 'x', '$', '≦', 'ｕ', 'Ｕ', '→', '←', '•́',
    '꒪', '`'
  ],
  lFace: ['(', '[', '{', '|', '(̵̵́'],
  rFace: [')', ']', '}', '|', ')̵̵̀'],
  mouse: [' ', 'C', 'c', 't', '(○○)', '(工)', '-', 'ゝ', '(··)', '—', '-',
    '_', '。', '，', '.', 'o', 'O', '3', 'ε', 'ｪ', 'v', 'u', '_', 'ω',
    'Д', '﹏', 'ヘ', '︶', '︿', '▽', '△', '∀', '<>', '○', 'ロ', '□',
    'Ｑ', '＠', '皿', '◇', '︹', '＾', '﹌', 'c', 'ｰ', '⌓', '.̫', '▿'
  ],
  lArm: ['╭∩╮', 'n', 'm', 'v', 'y', 'w', '<', 'o', 'O', '○', '~', '凸', 'ψ',
    '=', '—', '～', '︿', 'b', 'ㄟ', '╰', '╭', '\\', '┌', '┗', '┑', '┍', 'ง',
    'ヽ', 'ᕙ'
  ],
  rArm: ['╭∩╮', 'n', 'm', 'v', 'y', 'w', '>', 'o', 'O', '○', '~', '凸', 'ψ',
    '=', '—', '～', '︿', 'd', 'ㄏ', '╮', '╯', '/', '┘', '┛', '┍', '┑',
    '☞', 'つ', 'σ', 'ゞ', 'ﾉ', 'っ', 'づ', '彡', '↘', '↗', 'ง', 'ᕗ'
  ],
  plus: ['\'\'', 'b', '||', '#', '╬', '＊', '//', ';;', '::', 'メ', '〆', 'z', '✧']
};

const randInd = (count: number, probability: number) => {
  var ind = Math.floor(count / probability * Math.random());
  // debug([count, ind, probability]);
  return ind >= count ? -1 : ind;
};

const debug = (msg: string) => {
  console.log(msg);
};

debug('--== ψ⊙ヘ⊙ Hello My Friend ⊙ヘ⊙ψ ==--');

const eyeCount = assets.lEye.length;
const faceCount = assets.lFace.length;
const lArmCount = assets.lArm.length;
const rArmCount = assets.rArm.length;
const mouseCount = assets.mouse.length;
const plusCount = assets.plus.length;

/*
debug(assets.lEye.join());
debug(assets.rEye.join());
debug(assets.lArm.join());
debug(assets.rArm.join());
debug(assets.mouse.join());
debug(assets.lFace.join());
debug(assets.rFace.join());
debug(assets.plus.join());
*/

const Emoticon = () => {
  // debug('--------------------------------------');
  const result = [];

  const faceInd = randInd(faceCount, 0.7);
  const eyeInd = randInd(eyeCount, 1.0);
  const mouseInd = randInd(mouseCount, 0.6);
  const lArmInd = randInd(lArmCount, 0.5);
  const rArmInd = randInd(rArmCount, 0.5);
  const plusInd = randInd(plusCount, 0.3);

  const getItem = (arr: string[], ind: number) => {
    return ind < 0 ? '' : arr[ind];
  };

  result.push(getItem(assets.lArm, lArmInd));
  result.push(getItem(assets.lFace, faceInd));
  result.push(getItem(assets.lEye, eyeInd));
  result.push(getItem(assets.mouse, mouseInd));
  result.push(getItem(assets.rEye, eyeInd));
  result.push(getItem(assets.rFace, faceInd));
  result.push(getItem(assets.plus, plusInd));
  result.push(getItem(assets.rArm, rArmInd));

  return result.join('');
}

export default Emoticon;
