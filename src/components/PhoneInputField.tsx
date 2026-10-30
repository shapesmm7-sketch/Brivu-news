import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Phone } from 'lucide-react';
import {
  COUNTRY_CODES,
  CountryCodeItem,
  splitPhoneNumber,
  combinePhoneNumber,
  findCountryByPhone,
} from '../data/countryCodes';

export interface PhoneInputFieldProps {
  id?: string;
  label?: string | React.ReactNode;
  value: string;
  onChange: (fullPhoneNumber: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  inputClassName?: string;
  defaultCountryCode?: string; // e.g. '+256'
  helpText?: string;
  error?: string;
  compact?: boolean;
}

export const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  icon: Icon = Phone,
  className = '',
  inputClassName = '',
  defaultCountryCode = '+256',
  helpText,
  error,
  compact = false,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCodeItem>(() => {
    return findCountryByPhone(value, defaultCountryCode);
  });
  const [localNumber, setLocalNumber] = useState<string>(() => {
    const { nationalNumber } = splitPhoneNumber(value, defaultCountryCode);
    return nationalNumber;
  });

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const lastEmittedValueRef = useRef<string>(value || '');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when prop value changes externally (not from user typing in this component)
  useEffect(() => {
    if (value === lastEmittedValueRef.current) {
      return;
    }
    const { country, nationalNumber } = splitPhoneNumber(value, defaultCountryCode);
    setSelectedCountry(country);
    setLocalNumber(nationalNumber);
    lastEmittedValueRef.current = value || '';
  }, [value, defaultCountryCode]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter countries
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [searchQuery]);

  const handleCountrySelect = (country: CountryCodeItem) => {
    setSelectedCountry(country);
    setIsOpen(false);
    const combined = combinePhoneNumber(country.dialCode, localNumber);
    lastEmittedValueRef.current = combined;
    onChange(combined);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;

    // Check if user pasted a full international number with +
    if (inputVal.trim().startsWith('+')) {
      const { country, nationalNumber } = splitPhoneNumber(inputVal, selectedCountry.dialCode);
      setSelectedCountry(country);
      setLocalNumber(nationalNumber);
      const combined = combinePhoneNumber(country.dialCode, nationalNumber);
      lastEmittedValueRef.current = combined;
      onChange(combined);
      return;
    }

    // Standard local number update - keep selectedCountry intact and update number
    setLocalNumber(inputVal);
    const combined = combinePhoneNumber(selectedCountry.dialCode, inputVal);
    lastEmittedValueRef.current = combined;
    onChange(combined);
  };

  const currentPlaceholder =
    placeholder || selectedCountry.sampleFormat || '700 123 456';

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
        >
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div
        ref={dropdownRef}
        className={`relative flex items-center rounded-xl border transition duration-200 bg-white dark:bg-slate-900 ${
          error
            ? 'border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
            : 'border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {/* Country Picker Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-semibold transition shrink-0 rounded-l-xl select-none ${
            compact ? 'py-1.5 text-xs' : 'py-2 text-xs sm:text-sm'
          }`}
          title={`${selectedCountry.name} (${selectedCountry.dialCode}) - Click to change country`}
        >
          <span className="text-base sm:text-lg leading-none">{selectedCountry.flag}</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </button>

        {/* National Number Input Field */}
        <input
          id={id}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={currentPlaceholder}
          required={required}
          disabled={disabled}
          className={`w-full bg-transparent px-3 font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal focus:outline-none rounded-r-xl ${
            compact ? 'py-1.5 text-xs' : 'py-2 text-xs sm:text-sm'
          } ${inputClassName}`}
        />

        {/* Quick clear if text entered */}
        {localNumber && !disabled && (
          <button
            type="button"
            onClick={() => {
              setLocalNumber('');
              lastEmittedValueRef.current = '';
              onChange('');
            }}
            className="pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="Clear number"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Country Selector Dropdown Popover */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 max-w-[90vw] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-80 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Search Box */}
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or code..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Country List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50 dark:divide-slate-800/60 p-1">
              {filteredCountries.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No countries matching "{searchQuery}"
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected =
                    selectedCountry.code === c.code && selectedCountry.dialCode === c.dialCode;
                  return (
                    <button
                      key={`${c.code}-${c.dialCode}`}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-xl leading-none shrink-0">{c.flag}</span>
                        <span className="text-xs truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                          {c.dialCode}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {helpText && !error && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{helpText}</p>
      )}
      {error && <p className="text-[11px] text-rose-500 font-medium mt-1">{error}</p>}
    </div>
  );
};
