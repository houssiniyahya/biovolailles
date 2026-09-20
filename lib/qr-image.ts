import QRCode from "qrcode";

/** Server-side QR PNG as a data URL — rendered directly via `<img src>`, no client JS, no third-party request. */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: "#12372a", light: "#FFFFFF" } });
}
