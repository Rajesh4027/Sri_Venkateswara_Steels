# Sri Venkateswara Steels – ERP & Desktop Software v2.6.0

Official ERP, Inventory Management, Billing & Inward Register application for Sri Venkateswara Steels, Theni.

## Features
- **Real-Time Inventory & Stock Tracking**: Live balance updates, low-stock threshold alerts, and instant inward reconciliation.
- **GST Tax Invoice & Delivery Vouchers**: 18%, 12%, 5%, 28%, and 0% GST support with CGST/SGST breakdown.
- **Delivery History Ledger**: Complete audit trail of dispatched materials, hover summaries, filter by date range, payment mode, and instant Excel export.
- **Inward Register**: Record bulk supplier shipments, vehicle numbers, invoice attachments, and rate reconciliation.
- **Bilingual Interface**: Full English and Tamil language support (தமிழ் பெயர்கள் மற்றும் லேபிள்கள்).
- **Desktop Software (Electron)**: Cross-platform desktop standalone software with native print support and offline reliability.

## Getting Started

### Web Application
```bash
npm install
npm run dev      # Local Vite dev server on http://localhost:5173
npm run build    # Production build in dist/
```

### Electron Desktop Software
```bash
npm run electron:dev    # Launch local Electron desktop window
npm run dist            # Package Windows installer (.exe) & portable desktop executable
```

## Version
**v2.6.0** — Official Production Release: NSIS Setup Installer with Silent Background Downloader & Setup Launcher.
