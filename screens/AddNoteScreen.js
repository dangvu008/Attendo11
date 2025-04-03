"use client"

import { useState, useContext, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ToastAndroid,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { AppContext } from "../context/AppContext"
import { generateId } from "../utils/idGenerator"

/**
 * AddNoteScreen Component
 *
 * This screen allows users to add new notes or edit existing ones.
 * It includes form validation, character limits, and confirmation dialogs.
 *
 * @param {Object} navigation - React Navigation object for screen navigation
 * @param {Object} route - Contains route parameters, including note data when editing
 */
export default function AddNoteScreen({ navigation, route }) {
  // Get context values and check if we're editing an existing note
  const { darkMode, notes, addNote, updateNote, t } = useContext(AppContext)
  const editingNote = route.params?.note
  const isEditing = !!editingNote

  // Form state
  const [title, setTitle] = useState(editingNote?.title || "")
  const [content, setContent] = useState(editingNote?.content || "")
  const [reminderTime, setReminderTime] = useState(
    editingNote?.reminderTime ? new Date(editingNote.reminderTime) : new Date(),
  )
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedDays, setSelectedDays] = useState(editingNote?.days || [false, true, true, true, true, true, false]) // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Character limits
  const TITLE_LIMIT = 100
  const CONTENT_LIMIT = 300

  // Track unsaved changes
  useEffect(() => {
    // Only set unsaved changes if form has been modified
    if (
      title !== (editingNote?.title || "") ||
      content !== (editingNote?.content || "") ||
      reminderTime.getTime() !==
        (editingNote?.reminderTime ? new Date(editingNote.reminderTime).getTime() : new Date().getTime()) ||
      JSON.stringify(selectedDays) !== JSON.stringify(editingNote?.days || [false, true, true, true, true, true, false])
    ) {
      setHasUnsavedChanges(true)
    }
  }, [
    title,
    content,
    reminderTime,
    selectedDays,
    editingNote?.title,
    editingNote?.content,
    editingNote?.reminderTime,
    editingNote?.days,
  ])

  // Handle time change
  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false)
    if (selectedTime) {
      setReminderTime(selectedTime)
    }
  }

  // Toggle day selection
  const toggleDay = (index) => {
    const newSelectedDays = [...selectedDays]
    newSelectedDays[index] = !newSelectedDays[index]
    setSelectedDays(newSelectedDays)
  }

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  // Reset form to initial values
  const resetForm = () => {
    if (isEditing) {
      setTitle(editingNote.title || "")
      setContent(editingNote.content || "")
      setReminderTime(editingNote.reminderTime ? new Date(editingNote.reminderTime) : new Date())
      setSelectedDays(editingNote.days || [false, true, true, true, true, true, false])
    } else {
      setTitle("")
      setContent("")
      setReminderTime(new Date())
      setSelectedDays([false, true, true, true, true, true, false])
    }
    setHasUnsavedChanges(false)

    // Show toast notification
    if (Platform.OS === "android") {
      ToastAndroid.show(t("form_reset") || "Form reset", ToastAndroid.SHORT)
    }
  }

  // Confirm reset
  const confirmReset = () => {
    if (!hasUnsavedChanges) {
      resetForm()
      return
    }

    Alert.alert(
      t("reset_form") || "Reset Form",
      t("reset_form_confirmation") || "Are you sure you want to reset the form? All unsaved changes will be lost.",
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("reset") || "Reset",
          onPress: resetForm,
          style: "destructive",
        },
      ],
    )
  }

  // Save note
  const saveNote = async () => {
    // Validate inputs
    if (!title.trim()) {
      Alert.alert(t("error"), t("title_required"))
      return
    }

    if (!content.trim()) {
      Alert.alert(t("error"), t("content_required"))
      return
    }

    if (title.length > TITLE_LIMIT) {
      Alert.alert(t("error"), t("title_too_long", { limit: TITLE_LIMIT }))
      return
    }

    if (content.length > CONTENT_LIMIT) {
      Alert.alert(t("error"), t("content_too_long", { limit: CONTENT_LIMIT }))
      return
    }

    try {
      // Create new note object
      const newNote = {
        id: editingNote?.id || generateId(),
        title: title.trim(),
        content: content.trim(),
        reminderTime: reminderTime.toISOString(),
        days: selectedDays,
        createdAt: editingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update notes array
      let success = false
      if (isEditing) {
        success = await updateNote(newNote)
      } else {
        const result = await addNote(newNote)
        success = !!result
      }

      if (success) {
        // Show success message
        Alert.alert(
          isEditing ? t("note_updated") || "Note Updated" : t("note_saved") || "Note Saved",
          isEditing
            ? t("note_updated_message") || "Your note has been updated successfully."
            : t("note_saved_message") || "Your note has been saved successfully.",
          [{ text: t("ok") || "OK", onPress: () => navigation.goBack() }],
        )
      } else {
        // Show error message
        Alert.alert(
          t("error") || "Error",
          isEditing
            ? t("error_updating_note") || "There was an error updating your note. Please try again."
            : t("error_saving_note") || "There was an error saving your note. Please try again.",
        )
      }
    } catch (error) {
      console.error("Error saving note:", error)
      Alert.alert(t("error") || "Error", t("unexpected_error") || "An unexpected error occurred. Please try again.")
    }
  }

  // Confirm save
  const confirmSave = () => {
    Alert.alert(
      isEditing ? t("update_note") : t("save_note"),
      isEditing ? t("update_note_confirmation") : t("save_note_confirmation"),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: isEditing ? t("update") : t("save"),
          onPress: saveNote,
        },
      ],
    )
  }

  // Confirm navigation back if there are unsaved changes
  const handleBackPress = () => {
    if (!hasUnsavedChanges) {
      navigation.goBack()
      return
    }

    Alert.alert(
      t("unsaved_changes") || "Unsaved Changes",
      t("unsaved_changes_message") || "You have unsaved changes. Are you sure you want to go back?",
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("discard") || "Discard",
          onPress: () => navigation.goBack(),
          style: "destructive",
        },
      ],
    )
  }

  // Day names
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}>
          {isEditing ? t("edit_note") : t("add_note")}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("title")}</Text>
            <View style={styles.inputWithCounter}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: darkMode ? "#fff" : "#000",
                    backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder={t("enter_title")}
                placeholderTextColor={darkMode ? "#999" : "#777"}
                maxLength={TITLE_LIMIT}
              />
              <Text style={[styles.charCounter, { color: darkMode ? "#bbb" : "#777" }]}>
                {title.length}/{TITLE_LIMIT}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("content")}</Text>
            <View style={styles.inputWithCounter}>
              <TextInput
                style={[
                  styles.input,
                  styles.contentInput,
                  {
                    color: darkMode ? "#fff" : "#000",
                    backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  },
                ]}
                value={content}
                onChangeText={setContent}
                placeholder={t("enter_content")}
                placeholderTextColor={darkMode ? "#999" : "#777"}
                multiline
                maxLength={CONTENT_LIMIT}
              />
              <Text style={[styles.charCounter, { color: darkMode ? "#bbb" : "#777" }]}>
                {content.length}/{CONTENT_LIMIT}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("reminder_time")}</Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                },
              ]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.timePickerText, { color: darkMode ? "#fff" : "#000" }]}>
                {formatTime(reminderTime)}
              </Text>
              <Ionicons name="time-outline" size={20} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onTimeChange}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("days_to_show")}</Text>
            <View style={styles.daysContainer}>
              {dayNames.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    selectedDays[index] && styles.selectedDayButton,
                    {
                      backgroundColor: selectedDays[index] ? "#6a5acd" : darkMode ? "#2d2d2d" : "#f0f0f0",
                    },
                  ]}
                  onPress={() => toggleDay(index)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: selectedDays[index] ? "#fff" : darkMode ? "#fff" : "#000",
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
          onPress={confirmReset}
          accessibilityLabel={t("reset") || "Reset"}
          accessibilityHint={t("reset_form_hint") || "Reset all form fields"}
        >
          <Ionicons name="refresh-outline" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: "#6a5acd" }]}
          onPress={confirmSave}
          accessibilityLabel={isEditing ? t("update") : t("save")}
          accessibilityHint={isEditing ? t("update_note_hint") : t("save_note_hint") || "Save the note"}
        >
          <Ionicons name={isEditing ? "checkmark-circle-outline" : "save-outline"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>
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
    position: "relative",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    right: 16,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputWithCounter: {
    position: "relative",
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  contentInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  charCounter: {
    position: "absolute",
    right: 12,
    bottom: 10,
    fontSize: 12,
  },
  timePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  timePickerText: {
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDayButton: {
    backgroundColor: "#6a5acd",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    flexDirection: "row",
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
})

