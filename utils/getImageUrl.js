// utils/getImageUrl.js
const getImageUrl = (filePath) => {
  if (!filePath) return null;

  // If it's already an http(s) URL, return as-is
  if (/^https?:\/\//i.test(filePath)) return filePath;

  // Normalize Windows backslashes and remove leading slashes
  const cleaned = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

  // Ensure BASE_URL has no trailing slash
  const base = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

  return `${base}/${cleaned}`;
};

module.exports = getImageUrl;
