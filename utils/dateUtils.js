// Format date to display in the app
export const formatDate = (date, format = "full") => {
  if (!date) return ""

  const d = new Date(date)

  if (isNaN(d.getTime())) {
    return ""
  }

  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, "0")
  const minutes = d.getMinutes().toString().padStart(2, "0")

  switch (format) {
    case "date":
      return `${day}/${month}/${year}`
    case "time":
      return `${hours}:${minutes}`
    case "full":
    default:
      return `${day}/${month}/${year} ${hours}:${minutes}`
  }
}

// Parse time string (HH:MM) to minutes since midnight
export const timeToMinutes = (timeString) => {
  if (!timeString) return 0

  const [hours, minutes] = timeString.split(":").map(Number)
  return hours * 60 + minutes
}

// Convert minutes since midnight to time string (HH:MM)
export const minutesToTime = (minutes) => {
  if (minutes === undefined || minutes === null) return ""

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

// Get day of week from date
export const getDayOfWeek = (date) => {
  const d = new Date(date)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return days[d.getDay()]
}

// Check if a date is today
export const isToday = (date) => {
  const today = new Date()
  const d = new Date(date)

  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

// Get start and end of week dates
export const getWeekDates = (date, firstDayOfWeek = "Mon") => {
  const d = new Date(date)
  const day = d.getDay()

  // Adjust for first day of week
  const firstDayOffset = firstDayOfWeek === "Mon" ? 1 : 0
  const diff = (day + 7 - firstDayOffset) % 7

  // Calculate start of week
  const startOfWeek = new Date(d)
  startOfWeek.setDate(d.getDate() - diff)
  startOfWeek.setHours(0, 0, 0, 0)

  // Calculate end of week
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return { startOfWeek, endOfWeek }
}

// Calculate duration between two times in minutes
export const calculateDuration = (startTime, endTime) => {
  const start = timeToMinutes(startTime)
  let end = timeToMinutes(endTime)

  // Handle overnight shifts
  if (end < start) {
    end += 24 * 60 // Add 24 hours
  }

  return end - start
}

// Format duration in minutes to hours and minutes
export const formatDuration = (minutes) => {
  if (minutes === undefined || minutes === null) return ""

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins} phút`
  } else if (mins === 0) {
    return `${hours} giờ`
  } else {
    return `${hours} giờ ${mins} phút`
  }
}
