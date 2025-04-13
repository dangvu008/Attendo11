"use client"

import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import { useAppContext } from "../context/AppContext"
import { formatDate } from "../utils/dateUtils"
import { useTranslation } from "../i18n/useTranslation"

const NoteItem = ({ note, onEdit, onDelete }) => {
  const { getNextReminderDate, shifts } = useAppContext()
  const { t } = useTranslation()

  // Lấy thời gian nhắc nhở tiếp theo
  const nextReminderDate = getNextReminderDate(note)

  // Định dạng thời gian nhắc nhở
  const formatReminderTime = () => {
    if (!nextReminderDate) return note.reminderTime

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    // Kiểm tra xem có phải hôm nay không
    if (
      nextReminderDate.getDate() === today.getDate() &&
      nextReminderDate.getMonth() === today.getMonth() &&
      nextReminderDate.getFullYear() === today.getFullYear()
    ) {
      return `${t("notes.today")} ${note.reminderTime}`
    }

    // Kiểm tra xem có phải ngày mai không
    if (
      nextReminderDate.getDate() === tomorrow.getDate() &&
      nextReminderDate.getMonth() === tomorrow.getMonth() &&
      nextReminderDate.getFullYear() === tomorrow.getFullYear()
    ) {
      return `${t("notes.tomorrow")} ${note.reminderTime}`
    }

    // Nếu không phải hôm nay hoặc ngày mai, hiển thị ngày đầy đủ
    return formatDate(nextReminderDate, "date") + " " + note.reminderTime
  }

  // Lấy tên các ca liên kết
  const getAssociatedShiftNames = () => {
    if (!note.associatedShiftIds || note.associatedShiftIds.length === 0) return ""

    const shiftNames = note.associatedShiftIds
      .map((id) => {
        const shift = shifts.find((s) => s.id === id)
        return shift ? shift.name : ""
      })
      .filter((name) => name !== "")

    return shiftNames.join(", ")
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {note.title}
        </Text>

        <Text style={styles.noteContent} numberOfLines={3} ellipsizeMode="tail">
          {note.content}
        </Text>

        <View style={styles.reminderInfo}>
          <MaterialIcons name="access-time" size={14} color={COLORS.primary} />
          <Text style={styles.reminderText}>
            {t("notes.nextReminder")}: {formatReminderTime()}
          </Text>
        </View>

        {note.associatedShiftIds && note.associatedShiftIds.length > 0 && (
          <View style={styles.shiftInfo}>
            <MaterialIcons name="work" size={14} color={COLORS.primary} />
            <Text style={styles.shiftText} numberOfLines={1} ellipsizeMode="tail">
              {getAssociatedShiftNames()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(note)}>
          <MaterialIcons name="edit" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(note)}>
          <MaterialIcons name="delete" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  noteContent: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  reminderInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  shiftInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftText: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginLeft: 4,
  },
  actions: {
    justifyContent: "space-between",
  },
  actionButton: {
    padding: 4,
  },
})

export default NoteItem
