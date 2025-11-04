/**
 * Utility functions for number handling and precision
 */

/**
 * Round number to avoid floating point precision issues
 * @param {Number} num - Number to round
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @returns {Number} - Rounded number
 */
const roundToDecimals = (num, decimals = 2) => {
  if (isNaN(num) || num === null || num === undefined) {
    return 0;
  }
  return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Format number for display with proper decimal places
 * @param {Number} num - Number to format
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @returns {String} - Formatted number string
 */
const formatNumber = (num, decimals = 2) => {
  const rounded = roundToDecimals(num, decimals);
  return rounded.toFixed(decimals);
};

/**
 * Safe addition to avoid floating point precision issues
 * @param {Number} a - First number
 * @param {Number} b - Second number
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @returns {Number} - Rounded sum
 */
const safeAdd = (a, b, decimals = 2) => {
  return roundToDecimals((a || 0) + (b || 0), decimals);
};

/**
 * Safe subtraction to avoid floating point precision issues
 * @param {Number} a - First number
 * @param {Number} b - Second number
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @returns {Number} - Rounded difference
 */
const safeSubtract = (a, b, decimals = 2) => {
  return roundToDecimals((a || 0) - (b || 0), decimals);
};

/**
 * Safe multiplication to avoid floating point precision issues
 * @param {Number} a - First number
 * @param {Number} b - Second number
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @returns {Number} - Rounded product
 */
const safeMultiply = (a, b, decimals = 2) => {
  return roundToDecimals((a || 0) * (b || 0), decimals);
};

/**
 * Safe division to avoid floating point precision issues
 * @param {Number} a - First number
 * @param {Number} b - Second number
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @returns {Number} - Rounded quotient
 */
const safeDivide = (a, b, decimals = 2) => {
  if (b === 0 || b === null || b === undefined) {
    return 0;
  }
  return roundToDecimals((a || 0) / b, decimals);
};

module.exports = {
  roundToDecimals,
  formatNumber,
  safeAdd,
  safeSubtract,
  safeMultiply,
  safeDivide
};
