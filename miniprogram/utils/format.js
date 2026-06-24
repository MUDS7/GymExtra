function padNumber(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());

  return `${year}-${month}-${day}`;
}

module.exports = {
  formatDate
};
