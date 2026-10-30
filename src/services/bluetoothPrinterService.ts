import { Receipt, ThermalPrinterDevice, BusinessProfile } from '../types';

// Cached active GATT connection device in runtime memory
let cachedBluetoothDevice: any = null;

// Common Bluetooth GATT Service UUIDs used by ESC/POS Thermal Printers
const THERMAL_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS / Thermal
  '00001101-0000-1000-8000-00805f9b34fb', // SPP Serial Port
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // MPT-II / Xprinter
  '495353c0-1e4d-4a90-b38d-05b5fe6d9d00', // GOOJPRT / Zjiang
  '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
  '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
];

export class BluetoothPrinterService {
  /**
   * Check if Web Bluetooth API or Native Bluetooth thermal printing is supported
   */
  static isSupported(): boolean {
    const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
    return isNative || (typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  }

  /**
   * Trigger Bluetooth printer discovery or pair Android Bluetooth thermal printer
   */
  static async searchForPrinter(paperWidth: '58mm' | '80mm' = '58mm'): Promise<{
    success: boolean;
    printer?: ThermalPrinterDevice;
    message: string;
  }> {
    const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());

    // 1. Try Web Bluetooth API discovery if available in current browser session
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        const available = await (navigator.bluetooth as any).getAvailability().catch(() => false);
        if (!available) {
          return {
            success: false,
            message: 'Bluetooth is turned off or not available on this device. Please turn on your phone Bluetooth in Settings and try again.',
          };
        }

        // @ts-ignore - Web Bluetooth API Navigator extensions
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: THERMAL_PRINTER_SERVICES,
        });

        if (device) {
          // Actively verify connection capability to make sure it's a real, responding thermal printer
          try {
            const server = await device.gatt.connect();
            await server.disconnect(); // Disconnect to release connection slot

            cachedBluetoothDevice = device;

            const printerConfig: ThermalPrinterDevice = {
              id: device.id,
              name: device.name || `Bluetooth Printer (${device.id.slice(-4)})`,
              paperWidth,
              autoPrintOnSave: true,
              connectedAt: new Date().toISOString(),
            };

            return {
              success: true,
              printer: printerConfig,
              message: `Connected & saved default printer "${printerConfig.name}" successfully!`,
            };
          } catch (connErr: any) {
            return {
              success: false,
              message: `Could not connect to "${device.name || 'selected device'}": ${connErr.message || 'Signal too weak or not a responding printer.'} Please ensure your physical thermal printer is powered on and close to your phone.`,
            };
          }
        } else {
          return {
            success: false,
            message: 'No Bluetooth printer was selected or detected.',
          };
        }
      } catch (err: any) {
        console.warn('Web Bluetooth discovery note:', err);
        if (err.name === 'NotFoundError') {
          return { success: false, message: 'Bluetooth search cancelled. No printer selected.' };
        }
        return {
          success: false,
          message: `Could not detect printer: Please ensure Bluetooth is enabled, the physical printer is turned on and ready to pair.`,
        };
      }
    }

    // 2. Android Native WebView / Unsupported Browser truth report
    return {
      success: false,
      message: 'No Bluetooth printer detected. Bluetooth scanning is not supported in this WebView/browser. Please ensure your physical ESC/POS printer is powered on, Bluetooth is enabled, and try opening the app in Google Chrome to connect.',
    };
  }

  /**
   * Print a receipt via Bluetooth GATT or fallback system thermal printer spooler
   */
  static async printReceipt(
    printer: ThermalPrinterDevice,
    receipt: Receipt
  ): Promise<{ success: boolean; message: string }> {
    // If user explicitly configured system-default, print via system spooler
    if (printer.id === 'system-default') {
      return this.triggerThermalSystemPrint(receipt, printer);
    }

    // Otherwise, it's a real Bluetooth printer. We must try to connect to it and print.
    if (this.isSupported()) {
      try {
        let device = cachedBluetoothDevice;
        const navBluetooth = typeof navigator !== 'undefined' ? (navigator as any).bluetooth : null;
        if (!device && navBluetooth && typeof navBluetooth.getDevices === 'function') {
          const devices = await navBluetooth.getDevices().catch(() => []);
          device = (devices || []).find((d: any) => d.id === printer.id);
        }

        if (device) {
          cachedBluetoothDevice = device;
          return await this.sendEscPosViaGatt(device, receipt, printer.paperWidth);
        } else {
          return {
            success: false,
            message: `Could not print: No active Bluetooth connection to printer "${printer.name}". Please ensure your physical printer is powered on, has Bluetooth enabled, and is close to your phone.`,
          };
        }
      } catch (err: any) {
        console.warn('Bluetooth print GATT error:', err);
        return {
          success: false,
          message: `Connection failed to printer "${printer.name}": ${err.message || 'Device is offline or out of range.'} Please verify your printer is powered on.`,
        };
      }
    }

    return {
      success: false,
      message: `Bluetooth printing is not supported on this browser or platform. Please use the "System Default" printer fallback.`,
    };
  }

  /**
   * Print a test page to verify thermal printer setup
   */
  static async printTestPage(printer: ThermalPrinterDevice): Promise<{ success: boolean; message: string }> {
    const dummyReceipt: Receipt = {
      id: 'test-receipt',
      receiptNumber: 'TEST-001',
      createdAt: new Date().toISOString(),
      businessSnapshot: {
        name: 'QuickReceipt POS',
        description: 'Thermal Printer Setup Test',
        address: 'One-Tap Bluetooth Printing',
        phone: '+256 700 000 000',
        currency: 'UGX',
      } as BusinessProfile,
      customerName: 'Default Printer Test',
      items: [
        {
          id: 'item-1',
          name: 'Thermal Receipt Alignment Test',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
        },
        {
          id: 'item-2',
          name: 'ESC/POS Character Spacing',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
        },
      ],
      subtotal: 0,
      discount: 0,
      discountType: 'fixed',
      discountAmount: 0,
      total: 0,
      amountPaid: 0,
      balance: 0,
      paymentMethod: 'Cash',
      paymentStatus: 'paid',
      notes: `Paper Width: ${printer.paperWidth} | Connected: ${new Date().toLocaleTimeString()}`,
      template: 'thermal',
    };

    return this.printReceipt(printer, dummyReceipt);
  }

  /**
   * Low-level GATT write for Web Bluetooth
   */
  private static async sendEscPosViaGatt(
    device: any,
    receipt: Receipt,
    paperWidth: '58mm' | '80mm'
  ): Promise<{ success: boolean; message: string }> {
    let server = device.gatt;
    if (!server.connected) {
      server = await device.gatt.connect();
    }

    let writeCharacteristic: any = null;

    // Search services for writable GATT characteristic
    const services = await server.getPrimaryServices();
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
      } catch {}
      if (writeCharacteristic) break;
    }

    if (!writeCharacteristic) {
      throw new Error('No writable GATT characteristic found on printer.');
    }

    const escPosBytes = this.buildEscPosBytes(receipt, paperWidth);

    // Send in chunks of 128 bytes
    const chunkSize = 128;
    for (let i = 0; i < escPosBytes.length; i += chunkSize) {
      const chunk = escPosBytes.slice(i, i + chunkSize);
      if (writeCharacteristic.properties.writeWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }
      await new Promise((res) => setTimeout(res, 30));
    }

    return {
      success: true,
      message: `Printed successfully to ${device.name || 'Bluetooth Printer'}!`,
    };
  }

  /**
   * System Thermal Spooler fallback with 58mm/80mm roll CSS
   */
  private static triggerThermalSystemPrint(
    receipt: Receipt,
    printer: ThermalPrinterDevice
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const is80 = printer.paperWidth === '80mm';
      const widthCss = is80 ? '78mm' : '56mm';

      const dateStr = receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
      const timeStr = receipt.createdAt ? new Date(receipt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      const printContainer = document.createElement('div');
      printContainer.id = 'thermal-print-spooler';
      printContainer.innerHTML = `
        <style>
          @media print {
            body * { visibility: hidden; }
            #thermal-print-spooler, #thermal-print-spooler * {
              visibility: visible;
            }
            #thermal-print-spooler {
              position: absolute;
              left: 0;
              top: 0;
              width: ${widthCss};
              margin: 0;
              padding: 4px;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.3;
              color: #000;
              background: #fff;
            }
            @page {
              size: ${widthCss} auto;
              margin: 0;
            }
          }
        </style>
        <div style="width: ${widthCss}; margin: 0 auto; padding: 4px; font-family: monospace; font-size: 11px;">
          ${(() => {
            const bName = (receipt.businessSnapshot?.name || '').trim();
            if (bName && bName.toLowerCase() !== 'business name' && bName.toLowerCase() !== 'quickreceipt') {
              return `<div style="text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase;">${escapeHtml(bName)}</div>`;
            }
            return '';
          })()}
          ${receipt.businessSnapshot.description ? `<div style="text-align: center; font-size: 10px;">${escapeHtml(receipt.businessSnapshot.description)}</div>` : ''}
          ${receipt.businessSnapshot.phone ? `<div style="text-align: center; font-size: 10px;">Tel: ${escapeHtml(receipt.businessSnapshot.phone)}</div>` : ''}
          ${receipt.businessSnapshot.address ? `<div style="text-align: center; font-size: 10px;">${escapeHtml(receipt.businessSnapshot.address)}</div>` : ''}
          
          <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
          
          <div style="display: flex; justify-content: space-between;">
            <span>${escapeHtml(receipt.documentType === 'invoice' ? 'INVOICE' : 'RECEIPT')}:</span>
            <span style="font-weight: bold;">${escapeHtml(receipt.receiptNumber)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Date: ${escapeHtml(dateStr)}</span>
            <span>${escapeHtml(timeStr)}</span>
          </div>
          ${receipt.customerName ? `<div>Client: <strong>${escapeHtml(receipt.customerName)}</strong></div>` : ''}
          
          <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 1px solid #000; text-align: left;">
                <th style="padding-bottom: 2px;">Qty & Item</th>
                <th style="text-align: right; padding-bottom: 2px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 3px 0;">
                    ${item.quantity}x ${escapeHtml(item.name)}
                    ${item.unitPrice ? `<br><span style="font-size: 9px; color: #555;">@ ${receipt.businessSnapshot.currency || 'UGX'} ${item.unitPrice.toLocaleString()}</span>` : ''}
                  </td>
                  <td style="text-align: right; vertical-align: top; padding: 3px 0; font-weight: bold;">
                    ${receipt.businessSnapshot.currency || 'UGX'} ${item.subtotal.toLocaleString()}
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          
          <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
          
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
            <span>TOTAL:</span>
            <span>${receipt.businessSnapshot.currency || 'UGX'} ${receipt.total.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
            <span>Payment: ${escapeHtml(receipt.paymentMethod)}</span>
            <span style="text-transform: uppercase;">STATUS: ${escapeHtml(receipt.paymentStatus)}</span>
          </div>
          
          ${receipt.notes ? `<div style="margin-top: 6px; font-size: 10px; font-style: italic;">Notes: ${escapeHtml(receipt.notes)}</div>` : ''}
          
          <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
          <div style="text-align: center; font-size: 10px; font-weight: bold; margin-top: 4px;">
            Thank you for your business!
          </div>
          <div style="text-align: center; font-size: 9px; color: #666; margin-top: 2px;">
            Printed via ${escapeHtml(printer.name)}
          </div>
        </div>
      `;

      document.body.appendChild(printContainer);

      setTimeout(() => {
        window.print();
        setTimeout(() => {
          if (document.body.contains(printContainer)) {
            document.body.removeChild(printContainer);
          }
          resolve({
            success: true,
            message: `One-tap print sent to ${printer.name}!`,
          });
        }, 500);
      }, 150);
    });
  }

  /**
   * Helper: Build raw ESC/POS binary commands
   */
  private static buildEscPosBytes(receipt: Receipt, paperWidth: '58mm' | '80mm'): Uint8Array {
    const encoder = new TextEncoder();
    const bytes: number[] = [];

    const pushBytes = (...b: number[]) => bytes.push(...b);
    const pushString = (str: string) => {
      const encoded = encoder.encode(str);
      for (let i = 0; i < encoded.length; i++) {
        bytes.push(encoded[i]);
      }
    };

    const cols = paperWidth === '80mm' ? 48 : 32;

    // ESC @ (Initialize)
    pushBytes(0x1b, 0x40);

    // Center align
    pushBytes(0x1b, 0x61, 0x01);

    // Header Business Name
    const bName = (receipt.businessSnapshot?.name || '').trim();
    if (bName && bName.toLowerCase() !== 'business name' && bName.toLowerCase() !== 'quickreceipt') {
      // Double height & width for header
      pushBytes(0x1d, 0x21, 0x11);
      pushString(bName.toUpperCase() + '\n');
    }

    // Normal text size
    pushBytes(0x1d, 0x21, 0x00);
    if (receipt.businessSnapshot.phone) {
      pushString(`Tel: ${receipt.businessSnapshot.phone}\n`);
    }
    if (receipt.businessSnapshot.address) {
      pushString(`${receipt.businessSnapshot.address}\n`);
    }

    pushString('-'.repeat(cols) + '\n');

    // Left align
    pushBytes(0x1b, 0x61, 0x00);
    pushString(`${receipt.documentType === 'invoice' ? 'INVOICE' : 'RECEIPT'}: ${receipt.receiptNumber}\n`);
    const dateStr = receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString() : '';
    pushString(`Date: ${dateStr}\n`);
    if (receipt.customerName) {
      pushString(`Customer: ${receipt.customerName}\n`);
    }

    pushString('-'.repeat(cols) + '\n');

    // Items List
    receipt.items.forEach((item) => {
      const qtyName = `${item.quantity}x ${item.name}`;
      const priceStr = `${receipt.businessSnapshot.currency || 'UGX'} ${item.subtotal.toLocaleString()}`;

      if (qtyName.length + priceStr.length + 1 <= cols) {
        const spaces = cols - (qtyName.length + priceStr.length);
        pushString(qtyName + ' '.repeat(spaces) + priceStr + '\n');
      } else {
        pushString(qtyName + '\n');
        const spaces = cols - priceStr.length;
        pushString(' '.repeat(Math.max(0, spaces)) + priceStr + '\n');
      }
    });

    pushString('-'.repeat(cols) + '\n');

    // Right align totals
    pushBytes(0x1b, 0x61, 0x02);
    pushBytes(0x1b, 0x45, 0x01); // Bold ON
    const totalStr = `TOTAL: ${receipt.businessSnapshot.currency || 'UGX'} ${receipt.total.toLocaleString()}`;
    pushString(totalStr + '\n');
    pushBytes(0x1b, 0x45, 0x00); // Bold OFF

    // Center align footer
    pushBytes(0x1b, 0x61, 0x01);
    pushString(`Payment: ${receipt.paymentMethod} (${receipt.paymentStatus.toUpperCase()})\n`);
    pushString('\nThank you for your business!\n');

    // Feed lines & cut
    pushBytes(0x1b, 0x64, 0x04); // Feed 4 lines
    pushBytes(0x1d, 0x56, 0x42, 0x00); // Cut paper

    return new Uint8Array(bytes);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
