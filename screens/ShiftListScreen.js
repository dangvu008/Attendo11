"use client"

import { useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import { formatDuration } from "../utils/dateUtils"

const ShiftListScreen = ({ navigation }) => {
  const { shifts, deleteShift } = useAppContext()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedShift, setSelectedShift] = useState(null)

  const handleShiftPress = (shift) => {
    navigation.navigate("ShiftDetail", { shiftId: shift.id })
  }

  const handleDeletePress = (shift) => {
    setSelectedShift(shift)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (selectedShift) {
      deleteShift(selectedShift.id)
      setShowDeleteConfirm(false)
      setSelectedShift(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setSelectedShift(null)
  }

  // Show delete confirmation
  if (showDeleteConfirm) {
    Alert.alert("Xác nhận xóa", `Bạn có chắc chắn muốn xóa ca "${selectedShift.name}" không?`, [
      { text: "Hủy", onPress: cancelDelete, style: "cancel" },
      { text: "Xóa", onPress: confirmDelete, style: "destructive" },
    ])
    setShowDeleteConfirm(false)
  }

  const renderShiftItem = ({ item }) => {
    const duration = formatDuration(item.breakMinutes)

    return (
      <TouchableOpacity style={styles.shiftCard} onPress={() => handleShiftPress(item)}>
        <View style={styles.shiftHeader}>
          <Text style={styles.shiftName}>{item.name}</Text>
          <TouchableOpacity onPress={() => handleDeletePress(item)}>
            <MaterialIcons name="delete" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.shiftDetails}>
          <View style={styles.shiftTime}>
            <MaterialIcons name="access-time" size={16} color={COLORS.primary} />
            <Text style={styles.shiftTimeText}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>

          <View style={styles.shiftTime}>
            <MaterialIcons name="free-breakfast" size={16} color={COLORS.primary} />
            <Text style={styles.shiftTimeText}>Nghỉ: {duration}</Text>
          </View>
        </View>

        <View style={styles.daysContainer}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <View key={day} style={[styles.dayCircle, item.daysApplied.includes(day) ? styles.activeDayCircle : {}]}>
              <Text style={[styles.dayText, item.daysApplied.includes(day) ? styles.activeDayText : {}]}>
                {day.charAt(0)}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shifts}
        renderItem={renderShiftItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có ca làm việc nào</Text>
            <Text style={styles.emptySubText}>Nhấn nút bên dưới để thêm ca mới</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("ShiftDetail", { isNew: true })}>
        <MaterialIcons name="add" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
  },
  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  shiftName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  shiftDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  shiftTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftTimeText: {
    marginLeft: 4,
    color: COLORS.darkGray,
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDayCircle: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 12,
    color: COLORS.darkGray,
  },
  activeDayText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  emptySubText: {
    color: COLORS.gray,
    textAlign: "center",
  },
})

export default ShiftListScreen
