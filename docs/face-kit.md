# Face Kit 头像数据与生成

Face Kit（`/face`）把任意文本变成确定性的 SVG 头像。素材是数据不是位图：
`src/data/face.json` 存全部部件，`src/lib/face.ts` 负责选件与序列化，
`src/components/islands/FaceSvg.tsx` 负责渲染，回归测试在 `tests/face.test.ts`。

工具源自 2012 年 `phpz/face-kit`（PHP + GD 把 76 张 64×64 PNG 叠成头像）。这次重写换成
SVG，并修掉了原版的分布缺陷（见下文"选件"）。

## 画布与层序

画布 `viewBox="0 0 100 100"`，脸中心约在 (50, 56)。层**自下而上**固定顺序：

| 层      | 说明         | 变体数 |
| ------- | ------------ | ------ |
| `bg`    | 整幅背景     | 10     |
| `face`  | 脸型与耳朵   | 8      |
| `hair`  | 发型（含帽） | 10     |
| `brow`  | 眉毛         | 6      |
| `eye`   | 眼睛         | 10     |
| `nose`  | 鼻子         | 8      |
| `mouth` | 嘴           | 10     |
| `extra` | 眼镜、腮红等 | 8      |

配色 8 套。组合数 8 × 10 × 8 × 10 × 6 × 10 × 8 × 10 × 8 = **245,760,000**，
`faceCombinations()` 按数据实时算，测试会校验这个数字。

## 形状词汇

每个变体是一组形状，只有四种类型，渲染器和序列化器共用同一套：

```json
{
  "t": "ellipse",
  "cx": 24,
  "cy": 58,
  "rx": 5,
  "ry": 7,
  "f": "skinShade",
  "m": true
}
```

- `t`：`path` | `circle` | `ellipse` | `rect`
- 几何：`d`、`cx`、`cy`、`r`、`rx`、`ry`、`x`、`y`、`w`、`h`
- `f` 填充、`s` 描边、`sw` 描边宽、`cap` 线帽、`o` 透明度
- `m`：**镜像标记**。为真时该形状再画一次，按 `translate(100,0) scale(-1,1)` 沿中线翻转。
  眼睛、眉毛、耳朵、耳环因此只需写一侧；`wink`、`angry` 这类左右不对称的变体不设 `m`，
  两侧分别写。

`f` 与 `s` 只能取配色里的 token（`bg`、`bgAlt`、`skin`、`skinShade`、`hair`、`hairShade`、
`ink`、`white`、`accent`、`outline`）或 `none`，不写死颜色；换配色即整张头像换色。测试会
校验所有 token 存在、每套配色键集一致、颜色都是 `#rrggbb`。

肤色与背景的对比度天然很低（1.0–2.2），所以**每个脸型（含耳朵）都用 `outline` 描边**，
`outline` 是该配色 `skinShade` 的 0.62 倍暗度版本，对 `bg`、`bgAlt`、`skin` 的对比度都
≥ 3。少了这道描边，浅背景上的光头会直接糊进背景里。两条测试分别盯住"脸型必须有描边"
和"`outline` 对比度达标"。

## 选件

```
seed → FNV-1a 32 位 → mulberry32 → 依次取 palette、bg、face、hair、brow、eye、nose、mouth、extra
```

取值一律 `Math.floor(rnd() * count)`，所以各变体等概率。

2012 版的做法是 `md5(name)` 每 5 个十六进制字符求 ASCII 码和再取模。那个和的取值范围是
240–510 共 271 个值且呈钟形分布，导致中间序号的部件出现频率远高于两端——md5 本身的均匀
性被求和这一步毁掉了。此外 `str_split($code, 5)` 把 32 字符切成 7 段却只用了 6 段，末尾
2 个字符从未参与。新实现用 FNV-1a 吃掉全部字符，再用 mulberry32 展开成独立流。
`tests/face.test.ts` 里有一条 20,000 个 seed 的均匀性测试，要求每个变体的出现率与期望值
偏差小于 12%。

同一 seed 永远得到同一张脸；`codeOf(seed)` 给出 8 位十六进制短码，显示在界面上。

## 覆盖与分享

`selectFace(seed, overrides)` 接受按层覆盖（以及 `palette`）。覆盖**不影响其它层的抽取**
——因为每层的随机数在覆盖前就已按固定顺序取好，钉死一层不会让其余部件跟着变。越界的覆盖
值按取模回绕，不会产生空层。

界面把 seed 与全部覆盖写进地址栏（`?seed=Seven&eye=3`），加载时回读，所以一张脸可以直接
用链接分享。

## 部件选择

界面的 Parts 面板是**按层分标签页**（`FaceParts.tsx`）：上方一排标签选层，下方是该层的
选项。选项**不是文字而是图例**：每个选项就是当前这张脸把那一个部件换掉之后的样子，名字
作为小字写在图下面，首项"auto"表示跟随 seed，被钉死的层在标签上带图钉。

分标签页而不是九行折叠条：折叠条每行占满宽度、九行要 790px，而且折叠时每行的缩略图都是
同一张脸，信息量为零；标签页把空间让给选项本身，面板高度降到 313px。Radix Tabs 会卸载
未激活的面板，所以一次只画当前层的缩略图，不会一次画出全部 78 个。

选项网格用 `grid-cols-[repeat(auto-fill,minmax(68px,1fr))]`，各层选项数不同也不会留下
孤零零的尾行。

选 `eye` 与 `brow` 时，预览会临时把 `extra` 设为 `none`——否则眼镜、墨镜会把正在挑的部件
挡住。`OCCLUDED` 常量记录这类"会被遮挡的层"。

## 导出

- `faceToSvg(selection, { size, frame, seed })` 产出独立 SVG 字符串：带 `xmlns`、`title`
  （seed 经 XML 转义）、按 `frame` 生成圆角或圆形裁剪。界面的"Copy SVG"与"SVG"下载用它。
- PNG 导出在浏览器侧完成：把同一份 SVG 转 Blob URL 喂给 `Image`，画进 512×512 canvas 再
  `toBlob`。失败（例如 canvas 不可用）只提示，不影响 SVG 导出。
- 预览与导出共用 `faceShapes` 与 `shapeAttributes`，所以**看到的和存下来的一致**。
