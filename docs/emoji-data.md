# Emoji 数据与搜索

当前词库覆盖 Emoji 17.0 的 **3,944 个 fully-qualified 序列**，包含肤色、旗帜和 ZWJ 组合；每个条目均有简体中文、繁体中文及英文名称，共 **42,796 个不同搜索词**。

## 数据来源

- 标准序列：[Unicode Emoji 17.0 emoji-test.txt](https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt)。只导入 fully-qualified 条目，统一变体选择符并排除独立肤色、发型等 component。
- 名称与关键词：[Unicode CLDR 48.2](https://cldr.unicode.org/index/downloads) 的 `annotations` 与 `annotationsDerived`，语言为 `zh`、`zh_Hant`、`en`。基础文件和派生文件一起提供肤色及组合名称，缺少任一语言名称时生成失败。Unicode-3.0 许可随站点保存在 `public/emoji-unicode-license.txt`。
- 现代 Apple 搜索词：本机 macOS **27.2 / 26B5091g**，CoreEmoji **285.1.2** 的 `zh_CN`、`zh_TW` 资源。保留两套 `document_index.plist` 权重、`term_index.plist` 补充词和 `AppleName.strings` 名称；各 **1,878 条搜索文档全部映射成功**，合并后 **1,915 个 Emoji** 带有 Apple 搜索词。
- 历史别名：原 `emoji.json`、`key.json` 作为历史种子保留，包含旧输入法的口语别名；它们不再是前端运行时词库。

Apple 文件是系统 Emoji 搜索资源，本站没有复刻中文输入法或系统搜索引擎的完整候选算法。Apple 快照记录实际系统版本及原始权重，来源属于 Apple；不将其标成 Unicode 许可数据。

## Apple 内部编号解析

`emoji.dat` 是 UTF-16 trie。节点头为两个小端 uint16（子节点数量、Emoji 编号），每条边为 UTF-16 code unit 与以 16-bit word 为单位的节点偏移。生成器遍历 trie 得到 **4,142 个内部编号**，以编号直接关联两套搜索索引，不通过翻译名称猜测关联。

所有搜索文档与词索引编号都必须能映射到标准 Emoji，未知编号、重复编号、循环或越界偏移直接导致失败。Apple 的四种无修饰握手/牵手 ZWJ 别名归并到对应标准形式；三个 `@CH-SKU` 地区显示名称不是 Unicode 序列，已排除并记录在来源清单中。肤色组合保持独立。

## 更新方式

需要 Python 3 标准库；不安装 Python 包，不需要运行时 Apple 框架。日常构建和 Node 搜索测试直接使用已提交的数据，Python 二进制解析测试使用小型固定样本，因此 CI 不需要 macOS。

```sh
# 用固定版本 CLDR 与已保存的 Apple 快照重建；首次下载，后续读本地缓存。
pnpm emoji:update

# 重新下载同一固定版本的 Unicode 数据。
pnpm emoji:update --refresh

# 在 macOS 上重新提取当前系统的简繁 Apple 搜索资源并重建。
pnpm emoji:update --refresh-apple

# 完整验证。
pnpm verify
```

下载缓存位于忽略的 `.cache/emoji/emoji-17.0-cldr-48.2/`。更新其他 Unicode 版本时需显式修改生成器版本、预期数量和测试，并核对派生文件及 Apple 兼容性；不自动追踪开发版。

产物：`catalogue.json` 是前端词库；`apple-zh.json` 保存已映射的 Apple 名称及原始权重；`sources.json` 保存上游 URL、系统版本、统计和 SHA-256。相同输入重建三个 JSON 文件时逐字节一致。

## 搜索行为

精确 Emoji 直接返回规范序列；文字按 **完整名称 → 精确关键词/同义词 → 前缀 → 子串 → 跨关键词多词匹配** 排序。同档中基础形式优先于肤色变体，并使用 Apple 相对权重及标准序列顺序稳定排序。查询进行 NFKC、英文大小写及空白规范化；候选按实际 Emoji 去重。

例如：`收到` 首位 🫡，`粉心` 返回 🩷，`浴火重生` 返回 🐦‍🔥，`眼袋` 返回 🫩，`指紋` 返回 🫆。`开心` 的精确命中排在 `不开心` 的子串命中之前；保留 `天狗` 等历史别名。

前端加载带内容哈希的静态 JSON，避免把整套词库嵌入 JavaScript；无需外部 API。加载期间允许输入，失败提供重试并保留查询。每次显示 60 个候选，可以继续展开；每个候选可通过键盘或点击复制。输入组合期间暂不更新查询，组合结束后更新候选并保留焦点。

## 已验证

- 全部 3,944 个标准序列直接搜索均返回正确序列；简繁名称、英文大小写、旧 keycap 形式和历史别名通过。
- 名称/同义词/前缀/子串优先级、Apple 权重排序、去重、空白/无匹配、多词搜索通过。
- Apple 二进制固定样本验证 UTF-16 surrogate、真实 ID 与 word offset；损坏、循环、重复编号被拒绝。
- 生产产物包含哈希 JSON 与 Unicode 许可文件；词库重复生成结果完全一致。

浏览器验证细节见 `verification.md`。
