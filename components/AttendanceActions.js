"use client";

import { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppContext } from "../context/AppContext";
import {
  validateTimeInterval,
  formatTimestamp,
  getStatusIndicator,
} from "../utils/timeRules";
import { cancelNotificationsByType } from "../utils/notificationUtils";
import {
  validateCheckInTime,
  validateCheckOutTime,
  calculateWorkHours,
} from "../utils/shiftValidation";

/**
 * AttendanceActions Component
 *
 * This component provides buttons for attendance actions (go to work, check in, check out, complete)
 * and displays the attendance history for the current day.
 *
 * It enforces time rules between actions and provides confirmation dialogs for actions
 * that violate these rules or could result in data loss.
 *
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
const AttendanceActions = ({ darkMode }) => {
  const {
    todayLogs,
    addAttendanceLog,
    resetTodayLogs,
    currentShift,
    t,
    soundEnabled,
    vibrationEnabled,
    multiButtonMode,
    updateDailyWorkStatus,
    refreshWeeklyStatus,
  } = useContext(AppContext);

  const [actionDisabled, setActionDisabled] = useState(false);
  const [currentAction, setCurrentAction] = useState("go_work");

  // Determine the current action based on logs
  useEffect(() => {
    if (todayLogs.length === 0) {
      setCurrentAction("go_work");
      setActionDisabled(false);
      return;
    }

    // Sort logs by timestamp
    const sortedLogs = [...todayLogs].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Get the latest log
    const latestLog = sortedLogs[sortedLogs.length - 1];

    // Determine next action based on latest log
    switch (latestLog.type) {
      case "go_work":
        setCurrentAction("check_in");
        break;
      case "check_in":
        setCurrentAction("check_out");
        break;
      case "check_out":
        setCurrentAction("complete");
        break;
      case "complete":
        setCurrentAction("complete");
        setActionDisabled(true);
        break;
      default:
        setCurrentAction("go_work");
    }
  }, [todayLogs]);

  // Handle action button press
  const handleActionPress = async () => {
    // If action is already completed, show message
    if (
      currentAction === "complete" &&
      todayLogs.find((log) => log.type === "complete")
    ) {
      Alert.alert(
        t("already_completed_title") || "Already Completed",
        t("already_completed_message") ||
          "You have already completed your work for today.",
        [{ text: t("ok") || "OK", style: "default" }]
      );
      return;
    }

    // For single-button mode (only "Go to Work" button)
    // If we're in single-button mode and the user presses the button, consider it as completed
    if (!multiButtonMode && currentAction === "go_work") {
      // Perform all actions in sequence
      await performAction(); // Go to work
      await performAction(true, "check_in"); // Check in
      await performAction(true, "check_out"); // Check out
      await performAction(true, "complete"); // Complete
      return;
    }

    // Check if we have an active shift
    if (
      !currentShift &&
      (currentAction === "check_in" || currentAction === "check_out")
    ) {
      Alert.alert(
        t("no_active_shift") || "No Active Shift",
        t("no_active_shift_message") ||
          "You don't have an active shift assigned. Please set up a shift first.",
        [{ text: t("ok") || "OK", style: "default" }]
      );
      return;
    }

    // Validate check-in time against shift
    if (currentAction === "check_in" && currentShift) {
      const now = new Date();
      const validation = validateCheckInTime(now, currentShift);

      if (!validation.isValid) {
        Alert.alert(
          t("invalid_check_in_time") || "Invalid Check-in Time",
          validation.message,
          [
            { text: t("cancel") || "Cancel", style: "cancel" },
            {
              text: t("check_in_anyway") || "Check In Anyway",
              style: "destructive",
              onPress: () => performAction(true),
            },
          ]
        );
        return;
      }
    }

    // Validate check-out time against shift and check-in time
    if (currentAction === "check_out" && currentShift) {
      const checkInLog = todayLogs.find((log) => log.type === "check_in");
      if (checkInLog) {
        const checkInTime = new Date(checkInLog.timestamp);
        const now = new Date();
        const validation = validateCheckOutTime(now, checkInTime, currentShift);

        if (!validation.isValid) {
          Alert.alert(
            t("invalid_check_out_time") || "Invalid Check-out Time",
            validation.message,
            [
              { text: t("cancel") || "Cancel", style: "cancel" },
              {
                text: t("check_out_anyway") || "Check Out Anyway",
                style: "destructive",
                onPress: () => performAction(true),
              },
            ]
          );
          return;
        }
      }
    }

    // Get previous action log for time validation
    let previousActionType = null;
    let previousActionTime = null;

    if (currentAction === "check_in") {
      const goWorkLog = todayLogs.find((log) => log.type === "go_work");
      if (goWorkLog) {
        previousActionType = "go_work";
        previousActionTime = goWorkLog.timestamp;
      }
    } else if (currentAction === "check_out") {
      const checkInLog = todayLogs.find((log) => log.type === "check_in");
      if (checkInLog) {
        previousActionType = "check_in";
        previousActionTime = checkInLog.timestamp;
      }
    }

    // Validate time interval
    const validation = validateTimeInterval(
      previousActionType,
      previousActionTime,
      currentAction
    );

    if (!validation.isValid) {
      // Parse message to get translation key and parameters
      let messageKey = validation.message;
      let params = {};

      if (validation.message && validation.message.includes("|")) {
        const [key, value] = validation.message.split("|");
        messageKey = key;

        // Check which parameter to use based on the key
        if (key === "time_rule_violation_message_check_in") {
          params = { seconds: value };
        } else if (key === "time_rule_violation_message_check_out") {
          params = { minutes: value };
        }
      }

      // Format the message with parameters
      let formattedMessage = t(messageKey) || validation.message;
      if (params.seconds) {
        formattedMessage = formattedMessage.replace(
          "{seconds}",
          params.seconds
        );
      }
      if (params.minutes) {
        formattedMessage = formattedMessage.replace(
          "{minutes}",
          params.minutes
        );
      }

      // Show confirmation dialog if time rule is violated
      Alert.alert(
        t("time_rule_violation") || "Time Rule Violation",
        formattedMessage,
        [
          {
            text: t("cancel") || "Cancel",
            style: "cancel",
          },
          {
            text: t("proceed_anyway") || "Proceed Anyway",
            style: "destructive",
            onPress: () => performAction(true),
          },
        ]
      );
    } else {
      // Proceed with action if time rule is not violated
      performAction();
    }
  };

  // Perform the action (add attendance log)
  const performAction = async (force = false, overrideAction = null) => {
    try {
      // Phản hồi xúc giác nếu được bật
      if (vibrationEnabled) {
        Vibration.vibrate(100);
      }

      const today = new Date().toISOString().split("T")[0];
      const actionToPerform = overrideAction || currentAction;
      const result = await addAttendanceLog(actionToPerform, force);

      if (result.success) {
        // Hủy thông báo tương ứng
        if (actionToPerform === "go_work") {
          await cancelNotificationsByType("departure");
        } else if (actionToPerform === "check_in") {
          await cancelNotificationsByType("check-in");
        } else if (actionToPerform === "check_out") {
          await cancelNotificationsByType("check-out");
        }

        // If this is a check-out action, calculate work hours
        if (actionToPerform === "check_out" && currentShift) {
          const checkInLog = todayLogs.find((log) => log.type === "check_in");
          if (checkInLog) {
            const checkInTime = new Date(checkInLog.timestamp);
            const checkOutTime = new Date();

            // Calculate work hours
            const { regularHours, overtimeHours } = calculateWorkHours(
              checkInTime,
              checkOutTime,
              currentShift
            );

            // Update work status with calculated hours
            const workStatus = {
              status: overtimeHours > 0 ? "OT" : "Đủ công",
              totalWorkTime: regularHours,
              overtime: overtimeHours,
              remarks:
                overtimeHours > 0
                  ? `Làm việc ${regularHours.toFixed(
                      1
                    )} giờ thông thường và ${overtimeHours.toFixed(
                      1
                    )} giờ tăng ca`
                  : `Làm việc ${regularHours.toFixed(1)} giờ thông thường`,
            };

            // Update daily work status
            await updateDailyWorkStatus(today, workStatus);
            refreshWeeklyStatus();
          }
        }

        // Only show success message if not in override mode (used for single-button flow)
        if (!overrideAction) {
          // Show success message
          const actionMessages = {
            go_work:
              t("went_to_work_success") ||
              "You have successfully marked that you are going to work.",
            check_in:
              t("checked_in_success") || "You have successfully checked in.",
            check_out:
              t("checked_out_success") || "You have successfully checked out.",
            complete:
              t("completed_success") ||
              "You have successfully completed your work for today.",
          };

          Alert.alert(
            t("success") || "Success",
            actionMessages[actionToPerform],
            [{ text: t("ok") || "OK", style: "default" }]
          );
        }
      } else if (result.needsConfirmation) {
        // This case is handled by handleActionPress
      } else {
        // Show error message
        Alert.alert(
          t("error") || "Error",
          result.message ||
            t("error_recording_attendance") ||
            "There was an error recording your attendance. Please try again."
        );
      }
    } catch (error) {
      console.error("Error performing action:", error);
      Alert.alert(
        t("error") || "Error",
        t("unexpected_error") ||
          "An unexpected error occurred. Please try again."
      );
    }
  };

  // Handle reset button press
  const handleResetPress = () => {
    Alert.alert(
      t("reset_confirmation_title") || "Reset Work Status",
      t("reset_confirmation_message") ||
        "Are you sure you want to reset today's work status?",
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("reset") || "Reset",
          onPress: async () => {
            try {
              const success = await resetTodayLogs();
              if (success) {
                refreshWeeklyStatus();
              }
              if (!success) {
                Alert.alert(
                  t("error") || "Error",
                  t("error_resetting_logs") ||
                    "There was an error resetting the logs. Please try again."
                );
              }
            } catch (error) {
              console.error("Error resetting logs:", error);
              Alert.alert(
                t("error") || "Error",
                t("unexpected_error") ||
                  "An unexpected error occurred. Please try again."
              );
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Get button icon based on current action
  const getButtonIcon = () => {
    switch (currentAction) {
      case "go_work":
        return "walk-outline";
      case "check_in":
        return "log-in-outline";
      case "check_out":
        return "log-out-outline";
      case "complete":
        return "checkmark-circle-outline";
      default:
        return "walk-outline";
    }
  };

  // Get button label for accessibility
  const getButtonLabel = () => {
    switch (currentAction) {
      case "go_work":
        return t("go_to_work") || "Go to Work";
      case "check_in":
        return t("check_in") || "Check In";
      case "check_out":
        return t("check_out") || "Check Out";
      case "complete":
        return t("complete") || "Complete";
      default:
        return t("go_to_work") || "Go to Work";
    }
  };

  // Render attendance history
  const renderAttendanceHistory = () => {
    if (todayLogs.length === 0) {
      return (
        <View style={styles.emptyHistoryContainer}>
          <Text
            style={{
              color: darkMode ? "#bbb" : "#777",
              fontSize: 16,
              fontStyle: "italic",
            }}
          >
            {t("no_attendance_records") || "No attendance records for today."}
          </Text>
        </View>
      );
    }

    // Sort logs by timestamp
    const sortedLogs = [...todayLogs].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    return (
      <View style={styles.historyContainer}>
        <Text
          style={{
            color: darkMode ? "#fff" : "#000",
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          {t("today_history") || "Today's History"}
        </Text>

        {sortedLogs.map((log, index) => (
          <View key={log.id || index} style={styles.historyItem}>
            <Text style={{ fontSize: 18, marginRight: 10 }}>
              {getStatusIndicator(log.type)}
            </Text>
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                color: darkMode ? "#fff" : "#000",
              }}
            >
              {(() => {
                switch (log.type) {
                  case "go_work":
                    return t("went_to_work") || "Went to Work";
                  case "check_in":
                    return t("checked_in") || "Checked In";
                  case "check_out":
                    return t("checked_out") || "Checked Out";
                  case "complete":
                    return t("completed") || "Completed";
                  default:
                    return log.type;
                }
              })()}
            </Text>
            <Text style={{ fontSize: 14, color: darkMode ? "#bbb" : "#777" }}>
              {formatTimestamp(log.timestamp)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Main Action Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          actionDisabled && styles.disabledButton,
          { backgroundColor: actionDisabled ? "#9d8fe0" : "#6a5acd" },
        ]}
        onPress={handleActionPress}
        disabled={actionDisabled}
        accessibilityLabel={getButtonLabel()}
      >
        <Ionicons
          name={getButtonIcon()}
          size={36}
          color="#fff"
          style={styles.actionIcon}
        />
      </TouchableOpacity>

      {/* Reset Button (only show if there are logs) */}
      {todayLogs.length > 0 && (
        <TouchableOpacity
          style={[
            styles.resetButton,
            {
              backgroundColor: darkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            },
          ]}
          onPress={handleResetPress}
          accessibilityLabel={t("reset") || "Reset"}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={darkMode ? "#fff" : "#000"}
          />
        </TouchableOpacity>
      )}

      {/* Attendance History */}
      {renderAttendanceHistory()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 20,
    position: "relative",
  },
  actionButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionIcon: {
    marginBottom: 0,
  },
  resetButton: {
    position: "absolute",
    right: 10,
    top: 40,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  historyContainer: {
    width: "100%",
    marginTop: 30,
    paddingHorizontal: 16,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  emptyHistoryContainer: {
    marginTop: 30,
    alignItems: "center",
  },
});

export default AttendanceActions;
