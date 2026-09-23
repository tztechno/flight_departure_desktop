# Itami Airport Flight Departure Simulator - Desktop App

大阪国際空港（伊丹空港・R/W 32L）からの離陸・上昇飛行（Standard Instrument Departure）を体験できる、Three.js & Tauri v2 によるクロスプラットフォーム（macOS / Windows）3Dフライトシミュレーターデスクトップアプリです。

## 特徴
- **リアルな3D地形・滑走路表示**: 伊丹空港 32L 滑走路および大阪平野〜六甲山系の地形メッシュ
- **物理・計器連携シミュレーション**: 速度（IAS）、対地高度（ALT）、昇降率（V/S）、機首方位（HDG）、ピッチ/バンク角のリアルタイム計器表示
- **クロスプラットフォーム対応**: macOS (DMG / App) & Windows (EXE / MSI)

## 開発・ローカルビルド

### 必要環境
- **Node.js**: v18+
- **Rust**: stable toolchain

### コマンド
```bash
# 依存関係インストール
npm install

# 開発モード起動 (Tauri Dev)
npm run tauri dev

# Web版プレビュー
npm run dev

# デスクトップアプリ (macOS DMG / Windows EXE) ビルド
npm run tauri build
```
