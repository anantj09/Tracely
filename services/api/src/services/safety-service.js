/**
 * Derive masked initials from a full name to protect passenger privacy on RPF dashboards.
 * Example: "Rahul Kumar" -> "R.K."
 * Example: "Rahul" -> "R."
 * If the input is empty or invalid, returns "U.K." (Unknown).
 * 
 * @param {string} name 
 * @returns {string} masked initials
 */
function deriveMaskedInitials(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'U.K.';
  }

  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + '.')
    .join('');
}

module.exports = {
  deriveMaskedInitials
};
