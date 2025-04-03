import { getActiveShift, getAttendanceLogs, updateDailyWorkStatus, getDailyWorkStatus } from "./database"

// Calculate work status based on attendance logs
export const calculateWorkStatus = async (date) => {
  try {
    // Get active shift
    const activeShift = await getActiveShift()
    if (!activeShift) {
      console.log("No active shift found, cannot calculate work status")
      return null
    }

    // Get attendance logs for the date
    const logs = await getAttendanceLogs(date)
    if (!logs || logs.length === 0) {
      console.log("No attendance logs found for the date")
      return {
        status: "Chưa cập nhật",
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Không có dữ liệu chấm công",
      }
    }

    // Find relevant logs
    const goWorkLog = logs.find((log) => log.type === "go_work")
    const checkInLog = logs.find((log) => log.type === "check_in")
    const checkOutLog = logs.find((log) => log.type === "check_out")
    const completeLog = logs.find((log) => log.type === "complete")

    // Initialize status
    let status = "Đang xử lý"
    let totalWorkTime = 0
    let overtime = 0
    let remarks = ""

    // Parse shift times
    const [startHours, startMinutes] = activeShift.startTime.split(":").map(Number)
    const [officeEndHours, officeEndMinutes] = activeShift.officeEndTime.split(":").map(Number)

    // Create Date objects for shift times
    const shiftStartTime = new Date(date)
    shiftStartTime.setHours(startHours, startMinutes, 0, 0)

    const shiftEndTime = new Date(date)
    shiftEndTime.setHours(officeEndHours, officeEndMinutes, 0, 0)

    // Calculate standard work time (in hours)
    const standardWorkTime = (shiftEndTime - shiftStartTime) / (1000 * 60 * 60)

    // If we have check-in and check-out logs, calculate actual work time
    if (checkInLog && checkOutLog) {
      const checkInTime = new Date(checkInLog.timestamp)
      const checkOutTime = new Date(checkOutLog.timestamp)

      // Calculate actual work time (in hours)
      totalWorkTime = (checkOutTime - checkInTime) / (1000 * 60 * 60)

      // Check if late
      const lateThreshold = 5 // 5 minutes threshold for being late
      const lateMinutes = (checkInTime - shiftStartTime) / (1000 * 60)

      if (lateMinutes > lateThreshold) {
        status = "Vào muộn"
        remarks += `Vào muộn ${Math.round(lateMinutes)} phút. `
      }

      // Check if left early
      const earlyThreshold = 5 // 5 minutes threshold for leaving early
      const earlyMinutes = (shiftEndTime - checkOutTime) / (1000 * 60)

      if (earlyMinutes > earlyThreshold) {
        status = status === "Vào muộn" ? "Vào muộn & Ra sớm" : "Ra sớm"
        remarks += `Ra sớm ${Math.round(earlyMinutes)} phút. `
      }

      // Check for overtime
      if (checkOutTime > shiftEndTime) {
        overtime = (checkOutTime - shiftEndTime) / (1000 * 60 * 60)

        // If overtime is significant (more than 30 minutes)
        if (overtime >= 0.5) {
          status = "OT"
          remarks += `Tăng ca ${Math.round(overtime * 60)} phút. `
        }
      }

      // If no issues found, mark as full day
      if (status === "Đang xử lý") {
        status = "Đủ công"
        remarks = "Chấm công đầy đủ và đúng giờ"
      }
    } else if (checkInLog && !checkOutLog) {
      // Only checked in, not checked out
      status = "Chưa hoàn thành"
      remarks = "Đã chấm công vào nhưng chưa chấm công ra"

      // Calculate work time so far
      const checkInTime = new Date(checkInLog.timestamp)
      const now = new Date()
      totalWorkTime = (now - checkInTime) / (1000 * 60 * 60)
    } else if (goWorkLog && !checkInLog) {
      // Only marked as going to work
      status = "Đang đi làm"
      remarks = "Đã bấm nút đi làm nhưng chưa chấm công vào"
      totalWorkTime = 0
    }

    // Round values for better display
    totalWorkTime = Math.round(totalWorkTime * 10) / 10 // Round to 1 decimal place
    overtime = Math.round(overtime * 10) / 10 // Round to 1 decimal place

    // Create work status object
    const workStatus = {
      status,
      totalWorkTime,
      overtime,
      remarks,
    }

    // Update work status in database
    await updateDailyWorkStatus(date, workStatus)

    return workStatus
  } catch (error) {
    console.error("Error calculating work status:", error)
    return null
  }
}

// Check if a reset is needed
export const checkIfResetNeeded = async () => {
  try {
    // Get active shift
    const activeShift = await getActiveShift()
    if (!activeShift) {
      return false
    }

    // Get today's date
    const today = new Date().toISOString().split("T")[0]

    // Parse shift start time
    const [hours, minutes] = activeShift.startTime.split(":").map(Number)

    // Create Date object for shift start time
    const shiftStartTime = new Date(today)
    shiftStartTime.setHours(hours, minutes, 0, 0)

    // Calculate reset time (6 hours before shift start)
    const resetTime = new Date(shiftStartTime)
    resetTime.setHours(resetTime.getHours() - 6)

    // Get current time
    const now = new Date()

    // If current time is within the reset window (between resetTime and shiftStartTime)
    if (now >= resetTime && now < shiftStartTime) {
      // Check if we've already reset today
      const workStatus = await getDailyWorkStatus(today)

      // If no work status or status is "Chưa cập nhật", we need to reset
      if (!workStatus || workStatus.status === "Chưa cập nhật") {
        return true
      }
    }

    return false
  } catch (error) {
    console.error("Error checking if reset is needed:", error)
    return false
  }
}

// Update work status based on a new attendance log
export const updateWorkStatusForNewLog = async (date, logType) => {
  try {
    // Get current work status
    let workStatus = (await getDailyWorkStatus(date)) || {
      status: "Chưa cập nhật",
      totalWorkTime: 0,
      overtime: 0,
      remarks: "",
    }

    // Update status based on log type
    switch (logType) {
      case "go_work":
        workStatus.status = "Đang đi làm"
        workStatus.remarks = "Đã bấm nút đi làm"
        break
      case "check_in":
        workStatus.status = "Đang làm việc"
        workStatus.remarks = "Đã chấm công vào"
        break
      case "check_out":
        workStatus.status = "Đã check-out"
        workStatus.remarks = "Đã chấm công ra"
        break
      case "complete":
        // Calculate full work status
        workStatus = await calculateWorkStatus(date)
        break
    }

    // Update work status in database
    await updateDailyWorkStatus(date, workStatus)

    return workStatus
  } catch (error) {
    console.error("Error updating work status for new log:", error)
    return null
  }
}

