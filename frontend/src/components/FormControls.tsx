import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface TextFieldProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
  error?: string | undefined;
}

interface SubmitButtonProps extends ComponentPropsWithoutRef<'button'> {
  isLoading?: boolean | undefined;
  icon?: ReactNode | undefined;
}

export const TextField = ({ label, error, id, className = '', ...props }: TextFieldProps) => {
  const inputId = id ?? props.name;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <input
        id={inputId}
        className={`pf-input mt-2 ${className}`}
        {...props}
      />
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </label>
  );
};

export const SubmitButton = ({
  children,
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}: SubmitButtonProps) => {
  return (
    <button
      className={`pf-btn-primary ${className}`}
      disabled={disabled ?? isLoading}
      type="submit"
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
