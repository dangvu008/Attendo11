"use client";

import { useState, useContext, useEffect, Platform } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  ToastAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppContext } from "../context/AppContext";
import { generateId } from "../utils/idGenerator";
import { formatTime } from "../utils/dateUtils";

/**
 * AddShiftScreen Component
 *
 * This screen allows users to add new work shifts or edit existing ones.
 * It includes form validation, time pickers, and confirmation dialogs.
 *
 * @param {Object} navigation - React Navigation object for screen navigation
 * @param {Object} route - Contains route parameters, including shift data when editing
 */
export default function AddShiftScreen({ navigation, route }) {
  // Get context values and check if we're editing an existing shift
  const { darkMode, shifts, addShift, updateShift, t } = useContext(AppContext);
  const editingShift = route.params?.shift;
  const isEditing = !!editingShift;

  // Form state
  const [name, setName] = useState(editingShift?.name || "");
  const [departureTime, setDepartureTime] = useState(
    editingShift?.departureTime
      ? new Date(`2000-01-01T${editingShift.departureTime}`)
      : new Date()
  );
  const [startTime, setStartTime] = useState(
    editingShift?.startTime
      ? new Date(`2000-01-01T${editingShift.startTime}`)
      : new Date()
  );
  const [officeEndTime, setOfficeEndTime] = useState(
    editingShift?.officeEndTime
      ? new Date(`2000-01-01T${editingShift.officeEndTime}`)
      : new Date()
  );
  const [endTime, setEndTime] = useState(
    editingShift?.endTime
      ? new Date(`2000-01-01T${editingShift.endTime}`)
      : new Date()
  );
  const [remindBeforeStart, setRemindBeforeStart] = useState(
    editingShift?.remindBeforeStart || 15
  );
  const [remindAfterEnd, setRemindAfterEnd] = useState(
    editingShift?.remindAfterEnd || 15
  );
  const [showSignButton, setShowSignButton] = useState(
    editingShift?.showSignButton ?? true
  );
  const [daysApplied, setDaysApplied] = useState(
    editingShift?.daysApplied || [false, true, true, true, true, true, false]
  ); // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [activeTimePicker, setActiveTimePicker] = useState(null);

  // Character limit
  const NAME_LIMIT = 200;

  // Reminder options
  const reminderOptions = [5, 10, 15, 30];

  // Track unsaved changes
  useEffect(() => {
    // Only set unsaved changes if form has been modified
    if (
      name !== (editingShift?.name || "") ||
      departureTime.toTimeString() !==
        (editingShift?.departureTime
          ? new Date(`2000-01-01T${editingShift.departureTime}`).toTimeString()
          : new Date().toTimeString()) ||
      startTime.toTimeString() !==
        (editingShift?.startTime
          ? new Date(`2000-01-01T${editingShift.startTime}`).toTimeString()
          : new Date().toTimeString()) ||
      officeEndTime.toTimeString() !==
        (editingShift?.officeEndTime
          ? new Date(`2000-01-01T${editingShift.officeEndTime}`).toTimeString()
          : new Date().toTimeString()) ||
      endTime.toTimeString() !==
        (editingShift?.endTime
          ? new Date(`2000-01-01T${editingShift.endTime}`).toTimeString()
          : new Date().toTimeString()) ||
      remindBeforeStart !== (editingShift?.remindBeforeStart || 15) ||
      remindAfterEnd !== (editingShift?.remindAfterEnd || 15) ||
      showSignButton !== (editingShift?.showSignButton ?? true) ||
      JSON.stringify(daysApplied) !==
        JSON.stringify(
          editingShift?.daysApplied || [
            false,
            true,
            true,
            true,
            true,
            true,
            false,
          ]
        )
    ) {
      setHasUnsavedChanges(true);
    }
  }, [
    name,
    departureTime,
    startTime,
    officeEndTime,
    endTime,
    remindBeforeStart,
    remindAfterEnd,
    showSignButton,
    daysApplied,
    editingShift?.name,
    editingShift?.departureTime,
    editingShift?.startTime,
    editingShift?.officeEndTime,
    editingShift?.endTime,
    editingShift?.remindBeforeStart,
    editingShift?.remindAfterEnd,
    editingShift?.showSignButton,
    editingShift?.daysApplied,
  ]);

  // Handle time change
  const onTimeChange = (event, selectedTime) => {
    setActiveTimePicker(null);
    if (selectedTime) {
      switch (activeTimePicker) {
        case "departure":
          setDepartureTime(selectedTime);
          break;
        case "start":
          setStartTime(selectedTime);
          break;
        case "officeEnd":
          setOfficeEndTime(selectedTime);
          break;
        case "end":
          setEndTime(selectedTime);
          break;
      }
    }
  };

  // Toggle day selection
  const toggleDay = (index) => {
    const newDaysApplied = [...daysApplied];
    newDaysApplied[index] = !newDaysApplied[index];
    setDaysApplied(newDaysApplied);
  };

  // Save shift
  const saveShift = async () => {
    // Validate inputs
    if (!name.trim()) {
      Alert.alert(t("error"), t("name_required"));
      return;
    }

    if (name.length > NAME_LIMIT) {
      Alert.alert(t("error"), t("name_too_long", { limit: NAME_LIMIT }));
      return;
    }

    // Check for special characters that aren't allowed in names
    // Allowing alphanumeric, spaces, and Vietnamese characters
    if (/[^a-zA-Z0-9\s\u00C0-\u1EF9_]/.test(name)) {
      Alert.alert(t("error"), t("name_special_chars"));
      return;
    }

    // Check for duplicate name
    const duplicateName = shifts.find(
      (shift) =>
        shift.name === name && (!isEditing || shift.id !== editingShift.id)
    );
    if (duplicateName) {
      Alert.alert(t("error"), t("name_duplicate"));
      return;
    }

    try {
      // Format times as HH:MM
      const formatTimeString = (date) => {
        return date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      };

      // Create new shift object
      const newShift = {
        id: editingShift?.id || generateId(),
        name: name.trim(),
        departureTime: formatTimeString(departureTime),
        startTime: formatTimeString(startTime),
        officeEndTime: formatTimeString(officeEndTime),
        endTime: formatTimeString(endTime),
        remindBeforeStart,
        remindAfterEnd,
        showSignButton,
        daysApplied,
        createdAt: editingShift?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update shifts array
      let success = false;
      if (isEditing) {
        success = await updateShift(newShift);
      } else {
        const result = await addShift(newShift);
        success = !!result;
      }

      if (success) {
        // Show success message
        Alert.alert(
          isEditing
            ? t("shift_updated") || "Shift Updated"
            : t("shift_saved") || "Shift Saved",
          isEditing
            ? t("shift_updated_message") ||
                "Your work shift has been updated successfully."
            : t("shift_saved_message") ||
                "Your work shift has been saved successfully.",
          [{ text: t("ok") || "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        // Show error message
        Alert.alert(
          t("error") || "Error",
          isEditing
            ? t("error_updating_shift") ||
                "There was an error updating your work shift. Please try again."
            : t("error_saving_shift") ||
                "There was an error saving your work shift. Please try again."
        );
      }
    } catch (error) {
      console.error("Error saving shift:", error);
      Alert.alert(
        t("error") || "Error",
        t("unexpected_error") ||
          "An unexpected error occurred. Please try again."
      );
    }
  };

  // Confirm save
  const confirmSave = () => {
    Alert.alert(
      isEditing ? t("update_shift") : t("save_shift"),
      isEditing ? t("update_shift_confirmation") : t("save_shift_confirmation"),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: isEditing ? t("update") : t("save"),
          onPress: saveShift,
        },
      ]
    );
  };

  // Reset form to initial values
  const resetForm = () => {
    if (isEditing) {
      setName(editingShift.name);
      setDepartureTime(new Date(`2000-01-01T${editingShift.departureTime}`));
      setStartTime(new Date(`2000-01-01T${editingShift.startTime}`));
      setOfficeEndTime(new Date(`2000-01-01T${editingShift.officeEndTime}`));
      setEndTime(new Date(`2000-01-01T${editingShift.endTime}`));
      setRemindBeforeStart(editingShift.remindBeforeStart);
      setRemindAfterEnd(editingShift.remindAfterEnd);
      setShowSignButton(editingShift.showSignButton);
      setDaysApplied(editingShift.daysApplied);
    } else {
      setName("");
      setDepartureTime(new Date());
      setStartTime(new Date());
      setOfficeEndTime(new Date());
      setEndTime(new Date());
      setRemindBeforeStart(15);
      setRemindAfterEnd(15);
      setShowSignButton(true);
      setDaysApplied([false, true, true, true, true, true, false]);
    }
    setHasUnsavedChanges(false);

    // Show toast notification
    if (Platform && Platform.OS === "android") {
      ToastAndroid.show(t("form_reset") || "Form reset", ToastAndroid.SHORT);
    }
  };

  // Confirm reset
  const confirmReset = () => {
    if (!hasUnsavedChanges) {
      resetForm();
      return;
    }

    Alert.alert(
      t("reset_form") || "Reset Form",
      t("reset_form_confirmation") ||
        "Are you sure you want to reset the form? All unsaved changes will be lost.",
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
      ]
    );
  };

  // Confirm navigation back if there are unsaved changes
  const handleBackPress = () => {
    if (!hasUnsavedChanges) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      t("unsaved_changes") || "Unsaved Changes",
      t("unsaved_changes_message") ||
        "You have unsaved changes. Are you sure you want to go back?",
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
      ]
    );
  };

  // Day names
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: darkMode ? "#121212" : "#f5f5f5" },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}
        >
          {isEditing ? t("edit_shift") : t("add_shift")}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}
            >
              {t("shift_name")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: darkMode ? "#fff" : "#000",
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t("enter_shift_name")}
              placeholderTextColor={darkMode ? "#999" : "#777"}
              maxLength={NAME_LIMIT}
            />
            <Text
              style={[
                styles.charCounter,
                { color: darkMode ? "#bbb" : "#777" },
              ]}
            >
              {name.length}/{NAME_LIMIT}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}
            >
              {t("departure_time")}
            </Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                },
              ]}
              onPress={() => setActiveTimePicker("departure")}
            >
              <Text
                style={[
                  styles.timePickerText,
                  { color: darkMode ? "#fff" : "#000" },
                ]}
              >
                {formatTime(departureTime)}
              </Text>
              <Ionicons
                name="time-outline"
                size={20}
                color={darkMode ? "#6a5acd" : "#6a5acd"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}
            >
              {t("start_time")}
            </Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                },
              ]}
              onPress={() => setActiveTimePicker("start")}
            >
              <Text
                style={[
                  styles.timePickerText,
                  { color: darkMode ? "#fff" : "#000" },
                ]}
              >
                {formatTime(startTime)}
              </Text>
              <Ionicons
                name="time-outline"
                size={20}
                color={darkMode ? "#6a5acd" : "#6a5acd"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}
            >
              {t("office_end_time")}
            </Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                },
              ]}
              onPress={() => setActiveTimePicker("officeEnd")}
            >
              <Text
                style={[
                  styles.timePickerText,
                  { color: darkMode ? "#fff" : "#000" },
                ]}
              >
                {formatTime(officeEndTime)}
              </Text>
              <Ionicons
                name="time-outline"
                size={20}
                color={darkMode ? "#6a5acd" : "#6a5acd"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}
            >
              {t("end_time")}
            </Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                },
              ]}
              onPress={() => setActiveTimePicker("end")}
            >
              <Text
                style={[
                  styles.timePickerText,
                  { color: darkMode ? "#fff" : "#000" },
                ]}
              >
                {formatTime(endTime)}
              </Text>
              <Ionicons
                name="time-outline"
                size={20}
                color={darkMode ? "#6a5acd" : "#6a5acd"}
              />
            </TouchableOpacity>
          </View>

          {activeTimePicker && (
            <DateTimePicker
              value={
                activeTimePicker === "departure"
                  ? departureTime
                  : activeTimePicker === "start"
                  ? startTime
                  : activeTimePicker === "officeEnd"
                  ? officeEndTime
                  : endTime
              }
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}
            >
              {t("remind_before_start")}
            </Text>
            <View style={styles.reminderOptionsContainer}>
              {reminderOptions.map((option) => (
                <TouchableOpacity
                  key={`before-${option}`}
                  style={[
                    styles.reminderOption,
                    remindBeforeStart === option &&
                      styles.selectedReminderOption,
                    {
                      backgroundColor:
                        remindBeforeStart === option
                          ? "#6a5acd"
                          : darkMode
                          ? "#2d2d2d"
                          : "#f0f0f0",
                    },
                  ]}
                  onPress={() => setRemindBeforeStart(option)}
                >
                  <Text
                    style={[
                      styles.reminderOptionText,
                      {
                        color:
                          remindBeforeStart === option
                            ? "#fff"
                            : darkMode
                            ? "#fff"
                            : "#000",
                      },
                    ]}
                  >
                    {option} {t("minutes")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}
            >
              {t("remind_after_end")}
            </Text>
            <View style={styles.reminderOptionsContainer}>
              {reminderOptions.map((option) => (
                <TouchableOpacity
                  key={`after-${option}`}
                  style={[
                    styles.reminderOption,
                    remindAfterEnd === option && styles.selectedReminderOption,
                    {
                      backgroundColor:
                        remindAfterEnd === option
                          ? "#6a5acd"
                          : darkMode
                          ? "#2d2d2d"
                          : "#f0f0f0",
                    },
                  ]}
                  onPress={() => setRemindAfterEnd(option)}
                >
                  <Text
                    style={[
                      styles.reminderOptionText,
                      {
                        color:
                          remindAfterEnd === option
                            ? "#fff"
                            : darkMode
                            ? "#fff"
                            : "#000",
                      },
                    ]}
                  >
                    {option} {t("minutes")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.switchContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: darkMode ? "#fff" : "#000" },
                ]}
              >
                {t("show_sign_button")}
              </Text>
              <Switch
                value={showSignButton}
                onValueChange={setShowSignButton}
                trackColor={{ false: "#767577", true: "#6a5acd" }}
                thumbColor="#f4f3f4"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}
            >
              {t("days_applied")}
            </Text>
            <View style={styles.daysContainer}>
              {dayNames.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    daysApplied[index] && styles.selectedDayButton,
                    {
                      backgroundColor: daysApplied[index]
                        ? "#6a5acd"
                        : darkMode
                        ? "#2d2d2d"
                        : "#f0f0f0",
                    },
                  ]}
                  onPress={() => toggleDay(index)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: daysApplied[index]
                          ? "#fff"
                          : darkMode
                          ? "#fff"
                          : "#000",
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
          style={[
            styles.iconButton,
            {
              backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
            },
          ]}
          onPress={confirmReset}
          accessibilityLabel={t("reset") || "Reset"}
          accessibilityHint={t("reset_form_hint") || "Reset all form fields"}
        >
          <Ionicons
            name="refresh-outline"
            size={24}
            color={darkMode ? "#fff" : "#000"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: "#6a5acd" }]}
          onPress={confirmSave}
          accessibilityLabel={isEditing ? t("update") : t("save")}
          accessibilityHint={
            isEditing
              ? t("update_shift_hint")
              : t("save_shift_hint") || "Save the shift"
          }
        >
          <Ionicons
            name={isEditing ? "checkmark-circle-outline" : "save-outline"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
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
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  charCounter: {
    textAlign: "right",
    fontSize: 12,
    marginTop: 4,
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
  reminderOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  reminderOption: {
    width: "48%",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  selectedReminderOption: {
    backgroundColor: "#6a5acd",
  },
  reminderOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
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
});
