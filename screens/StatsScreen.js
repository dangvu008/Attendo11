"use client"

import { useContext, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import { getMonthDays, formatDate } from "../utils/dateUtils"

export default function StatsScreen({ navigation }) {
  const { darkMode, weeklyStatus, t } = useContext(AppContext)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Get days for the current month
  const monthDays = getMonthDays(currentMonth)

  // Format month name
  const monthName = currentMonth.toLocaleString("vi-VN", { month: "long", year: "numeric" })

  // Go to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() - 1)
    setCurrentMonth(newMonth)
  }

  // Go to next month
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + 1)
    setCurrentMonth(newMonth)
  }

  // Get day status
  const getDayStatus = (date) => {
    const dateString = formatDate(date)
    return weeklyStatus[dateString] || { status: "unknown" }
  }

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case "go_work":
        return t("went_to_work")
      case "check_in":
        return t("checked_in")
      case "check_out":
        return t("checked_out")
      case "complete":
        return t("completed")
      default:
        return "--:--"
    }
  }

  // Get day name
  const getDayName = (date) => {
    return date.toLocaleString("vi-VN", { weekday: "short" })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("monthly_stats")}</Text>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Ionicons name="chevron-back" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={[styles.monthName, { color: darkMode ? "#fff" : "#000" }]}>{monthName}</Text>
        <TouchableOpacity onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={[styles.tableContainer, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.dateCell, { color: darkMode ? "#fff" : "#000" }]}>{t("date")}</Text>
            <Text style={[styles.headerCell, styles.dayCell, { color: darkMode ? "#fff" : "#000" }]}>{t("day")}</Text>
            <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
              {t("check_in")}
            </Text>
            <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
              {t("check_out")}
            </Text>
            <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
              {t("regular_hours")}
            </Text>
            <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
              {t("ot_150")}
            </Text>
            <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
              {t("ot_200")}
            </Text>
            <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
              {t("ot_300")}
            </Text>
          </View>

          {monthDays.map((day) => {
            const dayStatus = getDayStatus(day)
            const isToday = day.toDateString() === new Date().toDateString()
            const isFuture = day > new Date()

            return (
              <View
                key={day.toISOString()}
                style={[styles.tableRow, isToday && styles.todayRow, { borderBottomColor: darkMode ? "#333" : "#eee" }]}
              >
                <Text style={[styles.cell, styles.dateCell, { color: darkMode ? "#fff" : "#000" }]}>
                  {day.getDate()}/{day.getMonth() + 1}/{day.getFullYear()}
                </Text>
                <Text style={[styles.cell, styles.dayCell, { color: darkMode ? "#fff" : "#000" }]}>
                  {getDayName(day)}
                </Text>
                <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                  {!isFuture && dayStatus.checkInTime ? dayStatus.checkInTime : "--:--"}
                </Text>
                <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                  {!isFuture && dayStatus.checkOutTime ? dayStatus.checkOutTime : "--:--"}
                </Text>
                <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                  {!isFuture ? "-" : "-"}
                </Text>
                <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                  {!isFuture ? "0.0" : "-"}
                </Text>
                <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                  {!isFuture ? "0.0" : "-"}
                </Text>
                <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                  {!isFuture ? "0.0" : "-"}
                </Text>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  monthName: {
    fontSize: 16,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  tableContainer: {
    margin: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 12,
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  cell: {
    fontSize: 14,
    textAlign: "center",
  },
  dateCell: {
    flex: 1.5,
  },
  dayCell: {
    flex: 1,
  },
  timeCell: {
    flex: 1,
  },
  todayRow: {
    backgroundColor: "rgba(106, 90, 205, 0.1)",
  },
})

