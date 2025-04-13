"use client"

import { createContext, useState, useEffect, useContext } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
// Thêm vào phần import
import { getDayOfWeek } from "../utils/dateUtils"

const AppContext = createContext()

const STORAGE_KEYS = {
  USER_SETTINGS: "userSettings",
  SHIFT_LIST: "shiftList",
  ATTENDANCE_RECORDS: "attendanceRecords",
  NOTES: "notes",
  WEATHER_DATA: "weatherData",
  ATTENDANCE_LOGS: "attendanceLogs",
  DAILY_WORK_STATUS: "dailyWorkStatus",
}

const defaultUserSettings = {
  multiButtonMode: "full",
  firstDayOfWeek: "Mon",
  timeFormat: "24h",
  theme: "light",
  alarmSoundEnabled: true,
  alarmVibrationEnabled: true,
  changeShiftReminderMode: "ask_weekly",
  weatherWarningEnabled: true,
  language: "vi",
  onlyGoWorkMode: false,
  weatherLocation: null,
  alarmSound: "alarm_1",
}

export const AppProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [shifts, setShifts] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [notes, setNotes] = useState([])
  const [weatherData, setWeatherData] = useState(null)
  const [userSettings, setUserSettings] = useState(defaultUserSettings)
  // Thêm vào phần state trong AppProvider
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [dailyWorkStatus, setDailyWorkStatus] = useState({})

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS)
        if (storedSettings) {
          setUserSettings(JSON.parse(storedSettings))
        } else {
          // Save default settings if none exist
          await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(defaultUserSettings))
          setUserSettings(defaultUserSettings)
        }
      } catch (error) {
        console.error("Error loading user settings:", error)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(userSettings))
      } catch (error) {
        console.error("Error saving user settings:", error)
      }
    }

    if (!isLoading) {
      saveData()
    }
  }, [userSettings, isLoading])

  useEffect(() => {
    const loadShifts = async () => {
      try {
        const storedShifts = await AsyncStorage.getItem(STORAGE_KEYS.SHIFT_LIST)
        if (storedShifts) {
          setShifts(JSON.parse(storedShifts))
        }
      } catch (error) {
        console.error("Error loading shifts:", error)
      }
    }

    loadShifts()
  }, [])

  useEffect(() => {
    const saveShifts = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.SHIFT_LIST, JSON.stringify(shifts))
      } catch (error) {
        console.error("Error saving shifts:", error)
      }
    }

    if (!isLoading) {
      saveShifts()
    }
  }, [shifts, isLoading])

  useEffect(() => {
    const loadAttendanceRecords = async () => {
      try {
        const storedRecords = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS)
        if (storedRecords) {
          setAttendanceRecords(JSON.parse(storedRecords))
        }
      } catch (error) {
        console.error("Error loading attendance records:", error)
      }
    }

    loadAttendanceRecords()
  }, [])

  useEffect(() => {
    const saveAttendanceRecords = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(attendanceRecords))
      } catch (error) {
        console.error("Error saving attendance records:", error)
      }
    }

    if (!isLoading) {
      saveAttendanceRecords()
    }
  }, [attendanceRecords, isLoading])

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const storedNotes = await AsyncStorage.getItem(STORAGE_KEYS.NOTES)
        if (storedNotes) {
          setNotes(JSON.parse(storedNotes))
        }
      } catch (error) {
        console.error("Error loading notes:", error)
      }
    }

    loadNotes()
  }, [])

  useEffect(() => {
    const saveNotes = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes))
      } catch (error) {
        console.error("Error saving notes:", error)
      }
    }

    if (!isLoading) {
      saveNotes()
    }
  }, [notes, isLoading])

  useEffect(() => {
    const loadWeatherData = async () => {
      try {
        const storedData = await AsyncStorage.getItem(STORAGE_KEYS.WEATHER_DATA)
        if (storedData) {
          setWeatherData(JSON.parse(storedData))
        }
      } catch (error) {
        console.error("Error loading weather data:", error)
      }
    }

    loadWeatherData()
  }, [])

  useEffect(() => {
    const saveWeatherData = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.WEATHER_DATA, JSON.stringify(weatherData))
      } catch (error) {
        console.error("Error saving weather data:", error)
      }
    }

    if (!isLoading) {
      saveWeatherData()
    }
  }, [weatherData, isLoading])

  // Thêm vào phần useEffect để load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Load các dữ liệu khác...

        // Load attendance logs
        const storedLogs = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE_LOGS)
        if (storedLogs) {
          setAttendanceLogs(JSON.parse(storedLogs))
        }

        // Load daily work status
        const storedDailyStatus = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_WORK_STATUS)
        if (storedDailyStatus) {
          setDailyWorkStatus(JSON.parse(storedDailyStatus))
        }
      } catch (error) {
        console.error("Error loading data from AsyncStorage:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Thêm vào phần useEffect để save data
  useEffect(() => {
    const saveLogs = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE_LOGS, JSON.stringify(attendanceLogs))
      } catch (error) {
        console.error("Error saving attendance logs to AsyncStorage:", error)
      }
    }

    if (!isLoading) {
      saveLogs()
    }
  }, [attendanceLogs, isLoading])

  useEffect(() => {
    const saveDailyStatus = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_WORK_STATUS, JSON.stringify(dailyWorkStatus))
      } catch (error) {
        console.error("Error saving daily work status to AsyncStorage:", error)
      }
    }

    if (!isLoading) {
      saveDailyStatus()
    }
  }, [dailyWorkStatus, isLoading])

  const updateSettings = (newSettings) => {
    setUserSettings((prevSettings) => ({ ...prevSettings, ...newSettings }))
  }

  const addShift = (shiftData) => {
    const newShift = { id: `shift_${Date.now()}`, ...shiftData }
    setShifts((prevShifts) => [...prevShifts, newShift])
  }

  const updateShift = (shiftId, shiftData) => {
    setShifts((prevShifts) => prevShifts.map((shift) => (shift.id === shiftId ? { ...shift, ...shiftData } : shift)))
  }

  const deleteShift = (shiftId) => {
    setShifts((prevShifts) => prevShifts.filter((shift) => shift.id !== shiftId))
  }

  const addAttendanceRecord = (record) => {
    const newRecord = { id: `record_${Date.now()}`, ...record }
    setAttendanceRecords((prevRecords) => [...prevRecords, newRecord])
  }

  const updateWeatherData = (data) => {
    const newData = { ...data, lastUpdated: new Date().toISOString() }
    setWeatherData(newData)
  }

  const addNote = (noteData) => {
    const newNote = {
      id: `note_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...noteData,
    }
    setNotes((prevNotes) => [...prevNotes, newNote])
  }

  const updateNote = (noteId, noteData) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === noteId ? { ...note, ...noteData, updatedAt: new Date().toISOString() } : note,
      ),
    )
  }

  const deleteNote = (noteId) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId))
  }

  const getNotesForToday = () => {
    const today = new Date()
    const dayOfWeek = getDayOfWeek(today)

    return notes.filter((note) => {
      // Nếu có ca làm việc liên kết, kiểm tra xem hôm nay có ca làm việc nào không
      if (note.associatedShiftIds && note.associatedShiftIds.length > 0) {
        const hasShiftToday = shifts.some(
          (shift) => shift.daysApplied.includes(dayOfWeek) && note.associatedShiftIds.includes(shift.id),
        )
        return hasShiftToday
      }

      // Nếu không có ca làm việc liên kết, kiểm tra ngày nhắc nhở
      return note.explicitReminderDays && note.explicitReminderDays.includes(dayOfWeek)
    })
  }

  const getNextReminderDate = (note) => {
    const today = new Date()
    const dayOfWeek = getDayOfWeek(today)

    // Nếu có ca làm việc liên kết, không cần tính toán ngày nhắc nhở
    if (note.associatedShiftIds && note.associatedShiftIds.length > 0) {
      return null
    }

    // Nếu không có ngày nhắc nhở cụ thể, trả về null
    if (!note.explicitReminderDays || note.explicitReminderDays.length === 0) {
      return null
    }

    // Tìm ngày nhắc nhở gần nhất trong tương lai
    let nextReminderDate = null

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today)
      currentDate.setDate(today.getDate() + i)
      const currentDayOfWeek = getDayOfWeek(currentDate)

      if (note.explicitReminderDays.includes(currentDayOfWeek)) {
        nextReminderDate = currentDate
        break
      }
    }

    return nextReminderDate
  }

  const isNoteDuplicate = (title, content, excludeNoteId = null) => {
    const normalizedTitle = title.trim().toLowerCase()
    const normalizedContent = content.trim().toLowerCase()

    return notes.some(
      (note) =>
        note.id !== excludeNoteId &&
        note.title.trim().toLowerCase() === normalizedTitle &&
        note.content.trim().toLowerCase() === normalizedContent,
    )
  }

  const exportData = async () => {
    const data = {
      userSettings,
      shifts,
      attendanceRecords,
      notes,
      weatherData,
      attendanceLogs,
      dailyWorkStatus,
    }

    return JSON.stringify(data)
  }

  const importData = async (data) => {
    const parsedData = JSON.parse(data)

    setUserSettings(parsedData.userSettings || defaultUserSettings)
    setShifts(parsedData.shifts || [])
    setAttendanceRecords(parsedData.attendanceRecords || [])
    setNotes(parsedData.notes || [])
    setWeatherData(parsedData.weatherData || null)
    setAttendanceLogs(parsedData.attendanceLogs || [])
    setDailyWorkStatus(parsedData.dailyWorkStatus || {})
  }

  // Thêm các hàm xử lý attendance logs
  const addAttendanceLog = (type, shiftId) => {
    const now = new Date()
    const dateStr = now.toISOString().split("T")[0]

    const newLog = {
      id: `log_${Date.now()}`,
      type,
      shiftId,
      date: now.toISOString(),
      createdAt: now.toISOString(),
    }

    setAttendanceLogs((prev) => [...prev, newLog])

    // Cập nhật daily work status
    updateDailyWorkStatus(dateStr, type, shiftId, now)

    return newLog
  }

  const updateDailyWorkStatus = (dateStr, type, shiftId, timestamp) => {
    setDailyWorkStatus((prev) => {
      const currentStatus = prev[dateStr] || {
        shiftId: null,
        status: "not_started",
        goWorkTime: null,
        checkInTime: null,
        punchTime: null,
        checkOutTime: null,
        completeTime: null,
      }

      const newStatus = { ...currentStatus }

      // Cập nhật trạng thái dựa trên loại log
      switch (type) {
        case "go_work":
          newStatus.shiftId = shiftId
          newStatus.status = "waiting_check_in"
          newStatus.goWorkTime = timestamp.toISOString()
          break
        case "check_in":
          newStatus.status = "working"
          newStatus.checkInTime = timestamp.toISOString()
          break
        case "punch":
          newStatus.punchTime = timestamp.toISOString()
          break
        case "check_out":
          newStatus.status = "ready_to_complete"
          newStatus.checkOutTime = timestamp.toISOString()
          break
        case "complete":
          newStatus.status = "completed"
          newStatus.completeTime = timestamp.toISOString()
          break
        default:
          break
      }

      return { ...prev, [dateStr]: newStatus }
    })
  }

  const resetDailyWorkStatus = (date = new Date()) => {
    const dateStr = date.toISOString().split("T")[0]

    // Xóa tất cả logs cho ngày hiện tại
    setAttendanceLogs((prev) => prev.filter((log) => !log.date.startsWith(dateStr)))

    // Reset trạng thái
    setDailyWorkStatus((prev) => {
      const newStatus = { ...prev }
      delete newStatus[dateStr]
      return newStatus
    })
  }

  const getLogsForDate = (date = new Date()) => {
    const dateStr = date.toISOString().split("T")[0]
    return attendanceLogs
      .filter((log) => log.date.startsWith(dateStr))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  const getDailyStatusForDate = (date = new Date()) => {
    const dateStr = date.toISOString().split("T")[0]
    return (
      dailyWorkStatus[dateStr] || {
        shiftId: null,
        status: "not_started",
        goWorkTime: null,
        checkInTime: null,
        punchTime: null,
        checkOutTime: null,
        completeTime: null,
      }
    )
  }

  // Thêm vào phần value trong return
  const value = {
    isLoading,
    isLoggedIn,
    userInfo,
    shifts,
    attendanceRecords,
    notes,
    weatherData,
    userSettings,
    attendanceLogs,
    dailyWorkStatus,
    updateSettings,
    addShift,
    updateShift,
    deleteShift,
    addAttendanceRecord,
    updateWeatherData,
    addNote,
    updateNote,
    deleteNote,
    getNotesForToday,
    getNextReminderDate,
    isNoteDuplicate,
    exportData,
    importData,
    resetDailyWorkStatus,
    getLogsForDate,
    getDailyStatusForDate,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppContext = () => {
  return useContext(AppContext)
}
