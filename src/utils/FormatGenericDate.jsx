import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Common user typing input patterns
export const DEFAULT_INPUT_FORMATS = [
  'YYYY-MM-DD',
  'DD-MMM-YYYY',
  'DD-MMM-YY',
  'DD.MM.YY',
  'DD.MM.YYYY',
  'DD/MM/YY',
  'DD/MM/YYYY',
  'DD-MM-YY',
  'DD-MM-YYYY',
  'DDMMYY',
  'DDMMYYYY',
];

/**
 * Generic Date Formatter & Parser
 *
 * @param {string|Date|object} dateInput - The raw date string or dayjs object
 * @param {string} outputFormat - Desired output format (e.g., 'DD-MMM-YY', 'YYYY-MM-DD')
 * @param {string[]} inputFormats - Supported formats for flexible user inputs
 * @param {string} fallback - String returned if input is invalid
 * @returns {string} Formatted date string or fallback
 */
export const formatGenericDate = (
  dateInput,
  outputFormat = 'DD-MMM-YY',
  inputFormats = DEFAULT_INPUT_FORMATS,
  fallback = ''
) => {
  if (!dateInput) return fallback;

  let parsed = dayjs(dateInput);

  // If input is a raw string typed by the user, parse against supported patterns
  if (typeof dateInput === 'string') {
    parsed = dayjs(dateInput.trim(), inputFormats, true);
  }

  return parsed.isValid() ? parsed.format(outputFormat) : fallback;
};

/**
 * Convert input string to standard ISO 'YYYY-MM-DD'
 */
export const toISODate = (dateInput) => {
  return formatGenericDate(dateInput, 'YYYY-MM-DD');
};

/**
 * Get weekday name (e.g., "Monday")
 */
export const getDayName = (dateInput) => {
  return formatGenericDate(dateInput, 'dddd');
};