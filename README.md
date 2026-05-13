# Image Provenance

[![Pages](https://img.shields.io/badge/demo-online-2ea44f)](https://863401402.github.io/image-provenance/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Client-side](https://img.shields.io/badge/100%25-client--side-0071e3)](#)

**中文** · [English](README.en.md)

> AI 图片溯源分析工具。**100% 在浏览器里跑,图片从不离开你的设备。**

👉 [**打开在线演示**](https://863401402.github.io/image-provenance/)

---

## 界面预览

![溯源检测主视图](docs/screenshots/main-light.svg)

![转换功能前后对比](docs/screenshots/convert-demo.svg)

## 能做什么

- **多层检测**:C2PA / Content Credentials、Google SynthID、OpenAI DALL-E / Sora、Midjourney、Stable Diffusion / Flux、Adobe Firefly 等 AI 生成签名。带强/中/弱置信度徽标,只有强中信号才报"命中"。
- **元数据详情**:EXIF / XMP / IPTC / ICC 全展开,GPS 带隐私警告 + OSM 链接,XMP 编辑历史完整时间线。
- **频域分析**:Web Worker 里跑 65 个特征 + viridis FFT 热图 + 对数径向谱 + 12 条启发式规则的加权判定。
- **图片转换**:字节级剥 C2PA → Canvas 重编码 → 可选水印扰动 → 注入 17 款真实相机 EXIF(iPhone 17 Pro Max / Sony α1 II / Leica Q3 等)。
- **水印扰动 v2**:8 项技术(含真 2D-FFT 相位扰动)+ 4 档预设(轻量 / 推荐 / 强力 / 极限)。不旋转、不翻转、不改宽高比。

## 技术栈

零构建,单 HTML + ES Modules。仅两个 CDN 依赖:[`exifr`](https://github.com/MikeKovarik/exifr) 读元数据、[`piexifjs`](https://github.com/hMatoba/piexifjs) 注入 EXIF。其余全部手写 —— FFT / DCT / DWT、JUMBF sniffer、8 项水印扰动、65 特征。

## 本地运行

```bash
git clone https://github.com/863401402/image-provenance
cd image-provenance
python3 -m http.server 8000   # 打开 http://localhost:8000
```

ES Modules + Web Worker 需要 HTTP 协议,`file://` 打不开。

## 准确性与伦理

**不是深度学习分类器。** 基于 [Corvi 2023](https://arxiv.org/abs/2304.06408) 等研究,仅靠频域特征对现代扩散模型的二分类准确率约 **70-85%**。工具价值在三层:强信号几乎不会错(C2PA / EXIF 直接声明);中等信号供参考;频域分析让你自己看,不盲信单个数字。

**水印扰动**为学术研究用途,设计用于隐私去识别与鲁棒性评估,**不鼓励**用于虚假信息传播、身份伪造或欺诈。立场参考 [WAVES (NeurIPS 2024)](https://arxiv.org/abs/2401.08573)。

## 交流

**📱 微信交流群**(二维码过期请开 [Issue](https://github.com/863401402/image-provenance/issues))

<img src="docs/screenshots/wechat-qr.jpg" alt="微信交流群二维码" width="240">

**🔗 友情链接** · [LINUX DO](https://linux.do/) · [NodeSeek](https://www.nodeseek.com/)

## 许可

[MIT](LICENSE)
