/**
 * Database Utilities Module
 *
 * This module provides functions for interacting with the application's data storage.
 * It handles CRUD operations for user settings, shifts, attendance logs, work status,
 * and notes using AsyncStorage as the persistent data store.
 */

import AsyncStorage from "@react-native-async-storage/async-storage"

// Keys for AsyncStorage - used to store different types of data
export const STORAGE_KEYS = {
  USER_SETTINGS: "userSettings", // User preferences
  SHIFT_LIST: "shiftList", // List of work shifts
  ACTIVE_SHIFT: "activeShift", // Currently active shift
  ATTENDANCE_LOGS: "attendanceLogs", // Daily attendance logs
  DAILY_WORK_STATUS: "dailyWorkStatus", // Daily work status summaries
  NOTES: "notes", // User notes
  LAST_RESET_TIME: "lastResetTime", // Timestamp of last reset
  DB_INITIALIZED: "db_initialized", // Flag to check if DB is initialized
  MANUAL_STATUS_UPDATES: "manualStatusUpdates", // Manual status overrides
  DATA_BACKUP: "dataBackup", // Backup of all data
  LAST_BACKUP_TIME: "lastBackupTime", // Timestamp of last backup
}

/**
 * Safe storage wrapper for AsyncStorage.setItem
 *
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const safeSetItem = async (key, data) => {
  try {
    const jsonData = JSON.stringify(data)
    await AsyncStorage.setItem(key, jsonData)
    return true
  } catch (error) {
    console.error(`Error storing data for ${key}:`, error)
    return false
  }
}

/**
 * Safe storage wrapper for AsyncStorage.getItem
 *
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if item doesn't exist
 * @returns {Promise<any>} - Retrieved data or default value
 */
export const safeGetItem = async (key, defaultValue = null) => {
  try {
    const data = await AsyncStorage.getItem(key)
    if (data === null) return defaultValue
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error retrieving data for ${key}:`, error)
    return defaultValue
  }
}

