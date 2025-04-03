// Format time as HH:MM
export const formatTime = (date) => {
  if (typeof date === "string") {
    return date
  }

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// Get day name
export const getDayName = (dayIndex, t) => {
  const days = [
    t ? t("sunday") : "Chủ Nhật",
    t ? t("monday") : "Thứ Hai",
    t ? t("tuesday") : "Thứ Ba",
    t ? t("wednesday") : "Thứ Tư",
    t ? t("thursday") : "Thứ Năm",
    t ? t("friday") : "Thứ Sáu",
    t ? t("saturday") : "Thứ Bảy",
  ]

  return days[dayIndex]
}

// Get days of the current week
export const getWeekDays = () => {
  const today = new Date()
  const day = today.getDay() // 0 = Sunday, 1 = Monday, ...

  // Calculate the start of the week (Monday)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - day + (day === 0 ? -6 : 1))

  // Generate array of days for the week
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    weekDays.push(date)
  }

  return weekDays
}

// Get days of the current month
export const getMonthDays = (date) => {
  const year = date.getFullYear()
  const month = date.getMonth()

  // First day of the month
  const firstDay = new Date(year, month, 1)

  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)

  // Generate array of days for the month
  const monthDays = []
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    monthDays.push(date)
  }

  return monthDays
}

// Format date as YYYY-MM-DD
export const formatDate = (date) => {
  return date.toISOString().split("T")[0]
}

