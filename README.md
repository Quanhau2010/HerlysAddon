# HerlysAddon — website

Trang giới thiệu tĩnh cho **HerlysAddon** (Meteor Client Addon cho Minecraft 1.21.11).
Không cần build, không cần Node/npm, không phụ thuộc thư viện ngoài.

- **Miễn phí 100%** — không paywall, không license/key.
- Tải bản mới nhất tại **https://dsc.gg/herlysaddon**.
- Phát triển bởi **DragonHerlys** và **Tr0ngX**.

## Chạy thử

Mở trực tiếp `index.html` bằng trình duyệt, hoặc serve để mọi đường dẫn tương đối hoạt động chuẩn:

```powershell
python -m http.server 5173 --directory website
# http://127.0.0.1:5173/
```

## Cấu trúc

```
website/
├─ index.html        # toàn bộ markup + SVG icon sprite
├─ css/styles.css    # design system dark/light, responsive, reveal, print
├─ js/data.js        # danh mục 110 module (eco / pvp / esp)
├─ js/app.js         # tương tác: theme, explorer, tabs, modal, copy, toast
└─ assets/logo.png   # logo lấy từ src/main/resources/icon.png
```

## Tính năng

- **Hero** với mock ClickGUI bấm được (toggle module) và số liệu thật từ registry.
- **Module explorer**: tìm kiếm không dấu tiếng Việt, lọc theo 3 category, đếm kết quả,
  "Xem thêm" theo trang 24 module, nút đặt lại, phím `/` để focus ô tìm kiếm.
- **Lệnh chat**: 5 lệnh thật (`/msgallreset`, `/ai`, `/tat`, `/chat`, `/nickname`) + copy clipboard.
- **Cài đặt**: 3 tab (client / source / server), yêu cầu hệ thống, lưu ý nền tảng.
- **Bảo vệ**: string vault, envelope `HERLYSE2` (AES-256-GCM), VM bytecode, anti-tamper,
  split loader, agent watch — giải thích rõ đây là chống dịch ngược, không phải paywall.
- **Đội ngũ**: card giới thiệu DragonHerlys và Tr0ngX + callout Discord.
- **Changelog** + **FAQ** + **CTA**, modal tải bản (Windows/macOS) dẫn thẳng tới Discord.
- **Theme** sáng/tối lưu `localStorage`, tôn trọng `prefers-reduced-motion`,
  skip-link, focus trap trong modal, `aria-*` đầy đủ.

## Cập nhật nội dung

- Thêm/bớt module: sửa mảng `window.HERLYS_MODULES` trong `js/data.js`
  (`{ n: tên, c: "eco" | "pvp" | "esp", d: mô tả }`). Số đếm, hero stat và bộ lọc tự cập nhật.
- Đổi phiên bản: cập nhật `window.HERLYS_META` trong `js/data.js` và mục changelog trong `index.html`.
- Đổi màu thương hiệu: các token `--brand*`, `--accent`, `--eco/--pvp/--esp` ở đầu `css/styles.css`.
- Đổi link tải: tìm `dsc.gg/herlysaddon` trong `index.html` / `js/app.js`.

## Lưu ý

- Addon phát hành **miễn phí**; nút tải trỏ tới Discord chính thức (`dsc.gg/herlysaddon`),
  nơi chứa file mới nhất cho Windows và macOS. Không có link jar giả trong site.
- Trang này độc lập hoàn toàn với pipeline Gradle/Meteor của addon; không ảnh hưởng build jar.
