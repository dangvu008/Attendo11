import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { getDayOfWeek, isToday, getWeekDates } from "../utils/dateUtils"

const WeeklyStatusGrid = ({ onDayPress }) => {
  const { userSettings, shifts, attendanceRecords } = useAppContext()
  const today = new Date()
  const { startOfWeek } = getWeekDates(today, userSettings.firstDayOfWeek)

  // Generate array of dates for the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    return date
  })

  // Get short day names based on first day of week
  const getDayNames = () => {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
    if (userSettings.firstDayOfWeek === "Mon") {
      return [...days.slice(1), days[0]]
    }
    return days
  }

  const dayNames = getDayNames()

  // Check if a shift is scheduled for a specific date
  const isShiftScheduled = (date) => {
    const dayOfWeek = getDayOfWeek(date)
    return shifts.some((shift) => shift.daysApplied.includes(dayOfWeek))
  }

  // Check if there's an attendance record for a specific date
  const getAttendanceStatus = (date) => {
    const dateStr = date.toISOString().split("T")[0]

    const records = attendanceRecords.filter((record) => record.date.startsWith(dateStr))

    if (records.length === 0) {
      return null
    }

    // Check if there's both check-in and check-out
    const hasCheckIn = records.some((record) => record.type === "check-in")
    const hasCheckOut = records.some((record) => record.type === "check-out")

    if (hasCheckIn && hasCheckOut) {
      return "complete"
    } else if (hasCheckIn) {
      return "partial"
    } else {
      return null
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {dayNames.map((day, index) => (
          <View key={`header-${index}`} style={styles.headerCell}>
            <Text style={styles.headerText}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.daysRow}>
        {weekDays.map((date, index) => {
          const scheduled = isShiftScheduled(date)
          const attendanceStatus = getAttendanceStatus(date)
          const isCurrentDay = isToday(date)

          return (
            <TouchableOpacity
              key={`day-${index}`}
              style={[
                styles.dayCell,
                isCurrentDay && styles.currentDay,
                scheduled && styles.scheduledDay,
                attendanceStatus === "complete" && styles.completeDay,
                attendanceStatus === "partial" && styles.partialDay,
              ]}
              onPress={() => onDayPress(date)}
            >
              <Text
                style={[
                  styles.dayText,
                  isCurrentDay && styles.currentDayText,
                  (scheduled || attendanceStatus) && styles.activeDayText,
                ]}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: COLORS.lightGray,
  },
  headerCell: {
    flex: 1,
    padding: 8,
    alignItems: "center",
  },
  headerText: {
    fontWeight: "bold",
    color: COLORS.darkGray,
  },
  daysRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: COLORS.lightGray,
  },
  dayText: {
    fontSize: 16,
  },
  currentDay: {
    backgroundColor: COLORS.lightGray,
  },
  currentDayText: {
    fontWeight: "bold",
  },
  scheduledDay: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  completeDay: {
    backgroundColor: COLORS.success + "33", // 20% opacity
  },
  partialDay: {
    backgroundColor: COLORS.warning + "33", // 20% opacity
  },
  activeDayText: {
    color: COLORS.black,
    fontWeight: "500",
  },
})

export default WeeklyStatusGrid
