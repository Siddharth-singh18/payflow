import { useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
}

const otpLength = 6;

export const OtpInput = ({ value, onChange, error }: OtpInputProps) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: otpLength }, (_, index) => value[index] ?? '');

  const updateDigit = (index: number, digit: string): void => {
    const nextDigits = digits.slice();
    nextDigits[index] = digit;
    onChange(nextDigits.join('').replace(/\D/g, '').slice(0, otpLength));

    if (digit && index < otpLength - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (text: string): void => {
    const pastedOtp = text.replace(/\D/g, '').slice(0, otpLength);
    onChange(pastedOtp);
    inputs.current[Math.min(pastedOtp.length, otpLength - 1)]?.focus();
  };

  return (
    <div>
      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            aria-label={`OTP digit ${String(index + 1)}`}
            className="h-12 rounded-lg border border-slate-200 bg-white text-center text-lg font-semibold text-slate-950 outline-none transition focus:border-payflow-teal focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-teal-900/40"
            inputMode="numeric"
            key={index}
            maxLength={1}
            onChange={(event) => {
              updateDigit(index, event.target.value.replace(/\D/g, '').slice(-1));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digit && index > 0) {
                inputs.current[index - 1]?.focus();
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              handlePaste(event.clipboardData.getData('text'));
            }}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            type="text"
            value={digit}
          />
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
};
