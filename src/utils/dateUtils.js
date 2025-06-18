export const formatDate = (dateString, format = 'YYYY-MM-DD') => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hours}:${minutes}`
    case 'MM-DD':
      return `${month}-${day}`
    case 'YYYY-MM':
      return `${year}-${month}`
    default:
      return `${year}-${month}-${day}`
  }
}

export const formatDateTime = (dateString) => {
  return formatDate(dateString, 'YYYY-MM-DD HH:mm:ss')
}

export const formatDateOnly = (dateString) => {
  return formatDate(dateString, 'YYYY-MM-DD')
}