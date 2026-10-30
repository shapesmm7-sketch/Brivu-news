import React, { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { generateReceiptQrDataUrl, ReceiptDataForQr } from '../utils/qrCode';
import { Receipt } from '../types';

interface ReceiptQrCodeSectionProps {
  data: ReceiptDataForQr | Receipt;
  className?: string;
  size?: number;
  darkBg?: boolean;
}

export const ReceiptQrCodeSection: React.FC<ReceiptQrCodeSectionProps> = ({
  data,
  className = '',
  size = 52,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    generateReceiptQrDataUrl(data, 240).then((url) => {
      if (isMounted) setQrUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [data]);

  return (
    <div className={`flex flex-col items-center justify-center shrink-0 ${className}`}>
      {/* High Quality Small Offline QR Code Box */}
      <div className="p-1 bg-white rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs inline-block">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="Receipt QR Code"
            style={{ width: `${size}px`, height: `${size}px` }}
            className="block rounded-xs object-contain"
          />
        ) : (
          <div
            style={{ width: `${size}px`, height: `${size}px` }}
            className="flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-[8px]"
          >
            <QrCode className="w-5 h-5 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};
