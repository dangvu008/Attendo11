/**
 * Alarm Utilities Module
 *
 * This module provides functions for creating and managing alarms in the Attendo app.
 * It uses Notifee for advanced notification features and Expo AV for audio playback.
 */

import * as Notifications from "expo-notifications"
import { Audio } from "expo-av"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as BackgroundFetch from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"
import { Platform, Vibration } from "react-native"
import notifee, { AndroidImportance, EventType } from "notifee"
import * as KeepAwake from "expo-keep-awake"
import { STORAGE_KEYS } from "./database"

// Define task names
const BACKGROUND_ALARM_TASK = "BACKGROUND_ALARM_TASK"
const ALARM_CHANNEL_ID = "attendo-alarms"

// Sound objects
let alarmSound = null
let isPlaying = false
let activeAlarmId = null
const vibrationInterval = null

/**
 * Initialize alarm system
 *
 * @returns {Promise<boolean>} - True if initialization was successful
 */
export const initializeAlarmSystem = async () => {
  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== "granted") {
      console.log("Notification permissions not granted")
      return false
    }

    // Create notification channel for Android
    if (Platform.OS === "android") {
      await notifee.createChannel({
        id: ALARM_CHANNEL_ID,
        name: "Attendo Alarms",
        lights: true,
        vibration: true,
        importance: AndroidImportance.HIGH,
        sound: "default",
      })
    }

    // Register background task
    await registerBackgroundAlarmTask()

    // Set up event listeners for notifee
    setupNotifeeListeners()

    // Load and prepare alarm sound
    await prepareAlarmSound()

    return true
  } catch (error) {
    console.error("Error initializing alarm system:", error)
    return false
  }
}

/**
 * Prepare alarm sound for playback
 *
 * @returns {Promise<void>}
 */
const prepareAlarmSound = async () => {
  try {
    // Ensure audio mode is set correctly
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    })

    // Load the sound file
    const soundObject = new Audio.Sound()
    await soundObject.loadAsync(require("../assets/sounds/alarm.mp3"))
    alarmSound = soundObject
  } catch (error) {
    console.error("Error preparing alarm sound:", error)
  }
}

/**
 * Set up Notifee event listeners
 */
const setupNotifeeListeners = () => {
  // Set up foreground event listener
  notifee.onForegroundEvent(({ type, detail }) => {
    switch (type) {
      case EventType.PRESS:
        // User pressed the notification
        stopAlarm()
        break
      case EventType.ACTION_PRESS:
        // User pressed an action
        if (detail.pressAction.id === "stop_alarm") {
          stopAlarm()
        }
        break
    }
  })

  // Set up background event listener
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS || (type === EventType.ACTION_PRESS && detail.pressAction.id === "stop_alarm")) {
      await stopAlarm()
    }
  })
}

/**
 * Register background task for alarms
 *
 * @returns {Promise<void>}
 */
const registerBackgroundAlarmTask = async () => {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ALARM_TASK)

    if (!isRegistered) {
      // Define task
      TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
        try {
          // Check for upcoming alarms and schedule them
          const result = await checkAndScheduleAlarms()
          return result ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData
        } catch (error) {
          console.error("Error in background alarm task:", error)
          return BackgroundFetch.BackgroundFetchResult.Failed
        }
      })

      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      })
    }
  } catch (error) {
    console.error("Error registering background alarm task:", error)
  }
}

/**
 * Check for upcoming alarms and schedule them
 *
 * @returns {Promise<boolean>} - True if alarms were scheduled
 */
const checkAndScheduleAlarms = async () => {
  // Implementation will depend on your app's specific needs
  // This is a placeholder for the actual implementation
  return false
}

/**
 * Schedule an alarm
 *
 * @param {Object} options - Alarm options
 * @param {string} options.title - Alarm title
 * @param {string} options.body - Alarm body
 * @param {Date} options.triggerTime - When to trigger the alarm
 * @param {string} options.type - Alarm type (e.g., 'departure', 'check-in', 'check-out')
 * @param {Object} options.data - Additional data to include with the alarm
 * @returns {Promise<string>} - Alarm ID
 */
export const scheduleAlarm = async ({ title, body, triggerTime, type, data = {} }) => {
  try {
    // Get user settings
    const settings = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS)
    const { soundEnabled = true, vibrationEnabled = true } = settings ? JSON.parse(settings) : {}

    // Calculate trigger time in seconds
    const now = new Date()
    const triggerAt = triggerTime.getTime()

    // If trigger time is in the past, don't schedule
    if (triggerAt <= now.getTime()) {
      console.log("Alarm trigger time is in the past, not scheduling")
      return null
    }

    // Schedule with Notifee for advanced features
    const alarmId = await notifee.createTriggerNotification(
      {
        title,
        body,
        android: {
          channelId: ALARM_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          sound: soundEnabled ? "default" : undefined,
          vibrationPattern: vibrationEnabled ? [0, 500, 500, 500] : undefined,
          pressAction: {
            id: "default",
            launchActivity: "default",
          },
          actions: [
            {
              title: "Tắt báo thức",
              pressAction: {
                id: "stop_alarm",
              },
            },
          ],
          fullScreenAction: {
            id: "alarm_screen",
            launchActivity: "default",
          },
        },
        ios: {
          critical: true,
          sound: soundEnabled ? "default" : undefined,
          attachments: [],
          interruptionLevel: "critical",
        },
        data: {
          type,
          alarmType: "attendo_alarm",
          ...data,
        },
      },
      {
        type: "timestamp",
        timestamp: triggerAt,
      },
    )

    console.log(`Scheduled alarm for ${triggerTime.toLocaleString()}, ID: ${alarmId}`)
    return alarmId
  } catch (error) {
    console.error("Error scheduling alarm:", error)
    return null
  }
}

/**
 * Trigger an alarm immediately
 *
 * @param {Object} options - Alarm options
 * @param {string} options.title - Alarm title
 * @param {string} options.body - Alarm body
 * @param {string} options.type - Alarm type
 * @param {Object} options.data - Additional data
 * @returns {Promise<string>} - Alarm ID
 */
export const triggerAlarmNow = async ({ title, body, type, data = {} }) => {
  try {
    // Get user settings
    const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS)
    const settings = settingsStr ? JSON.parse(settingsStr) : {}
    const soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true
    const vibrationEnabled = settings.vibrationEnabled !== undefined ? settings.vibrationEnabled : true

    // Create a unique ID for this alarm
    const alarmId = Date.now().toString()
    activeAlarmId = alarmId

    // Keep screen awake while alarm is active
    KeepAwake.activateKeepAwake()

    // Play sound if enabled
    if (soundEnabled && alarmSound) {
      try {
        await alarmSound.setIsLoopingAsync(true)
        await alarmSound.setVolumeAsync(1.0)
        await alarmSound.playAsync()
        isPlaying = true
      } catch (soundError) {
        console.error("Error playing alarm sound:", soundError)
      }
    }

    // Start vibration if enabled
    if (vibrationEnabled) {
      // Vibrate in a pattern (500ms on, 500ms off)
      Vibration.vibrate([0, 500, 500], true)
    }

    // Show full-screen notification with Notifee
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: ALARM_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        ongoing: true,
        autoCancel: false,
        sound: "default",
        vibrationPattern: vibrationEnabled ? [0, 500, 500, 500] : undefined,
        pressAction: {
          id: "default",
          launchActivity: "default",
        },
        actions: [
          {
            title: "Tắt báo thức",
            pressAction: {
              id: "stop_alarm",
            },
          },
        ],
        fullScreenAction: {
          id: "alarm_screen",
          launchActivity: "default",
        },
      },
      ios: {
        critical: true,
        sound: "default",
        interruptionLevel: "critical",
      },
      data: {
        type,
        alarmType: "attendo_alarm",
        alarmId,
        ...data,
      },
    })

    return alarmId
  } catch (error) {
    console.error("Error triggering alarm:", error)
    return null
  }
}

/**
 * Stop the currently playing alarm
 *
 * @returns {Promise<boolean>} - True if alarm was stopped
 */
export const stopAlarm = async () => {
  try {
    // Stop sound
    if (alarmSound && isPlaying) {
      await alarmSound.stopAsync()
      isPlaying = false
    }

    // Stop vibration
    Vibration.cancel()

    // Allow screen to sleep again
    KeepAwake.deactivateKeepAwake()

    // Cancel the notification if it exists
    if (activeAlarmId) {
      await notifee.cancelNotification(activeAlarmId)
      activeAlarmId = null
    }

    return true
  } catch (error) {
    console.error("Error stopping alarm:", error)
    return false
  }
}

/**
 * Cancel a scheduled alarm by ID
 *
 * @param {string} alarmId - ID of the alarm to cancel
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAlarm = async (alarmId) => {
  try {
    if (!alarmId) return false

    await notifee.cancelNotification(alarmId)
    console.log(`Canceled alarm: ${alarmId}`)
    return true
  } catch (error) {
    console.error(`Error canceling alarm ${alarmId}:`, error)
    return false
  }
}

/**
 * Cancel all alarms of a specific type
 *
 * @param {string} type - Type of alarms to cancel
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAlarmsByType = async (type) => {
  try {
    // Get all scheduled notifications
    const notifications = await notifee.getTriggerNotifications()

    // Filter by type
    const alarmsToCancel = notifications.filter((notification) => notification.notification.data?.type === type)

    // Cancel each alarm
    for (const alarm of alarmsToCancel) {
      await notifee.cancelNotification(alarm.notification.id)
      console.log(`Canceled ${type} alarm: ${alarm.notification.id}`)
    }

    return true
  } catch (error) {
    console.error(`Error canceling ${type} alarms:`, error)
    return false
  }
}

/**
 * Cancel all scheduled alarms
 *
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAllAlarms = async () => {
  try {
    await notifee.cancelAllNotifications()
    console.log("Canceled all alarms")
    return true
  } catch (error) {
    console.error("Error canceling all alarms:", error)
    return false
  }
}

/**
 * Handle alarm response
 *
 * @param {Object} notification - Notification object
 * @returns {Promise<boolean>} - True if handled successfully
 */
export const handleAlarmResponse = async (notification) => {
  try {
    const { type, alarmId } = notification.request.content.data || {}

    if (!type) return false

    // Stop the alarm
    await stopAlarm()

    // Log the response time
    console.log(`Alarm response for ${type} at ${new Date().toISOString()}`)

    // Additional logic based on alarm type
    // ...

    return true
  } catch (error) {
    console.error("Error handling alarm response:", error)
    return false
  }
}

