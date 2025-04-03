import {
  getActiveShift,
  getAttendanceLogs,
  updateDailyWorkStatus,
  getDailyWorkStatus,
} from "./database";

// Mã trạng thái làm việc
export const WORK_STATUS = {
  FULL_WORK: "FULL_WORK", // Đủ công
  MISSING_CHECKIN: "MISSING_CHECKIN", // Thiếu chấm công
  NOT_UPDATED: "NOT_UPDATED", // Chưa cập nhật
  LEAVE: "LEAVE", // Nghỉ phép
  SICK_LEAVE: "SICK_LEAVE", // Nghỉ bệnh
  HOLIDAY: "HOLIDAY", // Nghỉ lễ
  ABSENT: "ABSENT", // Vắng không lý do
  LATE_EARLY: "LATE_EARLY", // Vào muộn / Ra sớm
};

// Ký hiệu hiển thị
export const STATUS_ICONS = {
  [WORK_STATUS.FULL_WORK]: "✅",
  [WORK_STATUS.MISSING_CHECKIN]: "❗",
  [WORK_STATUS.NOT_UPDATED]: "❓",
  [WORK_STATUS.LEAVE]: "📩",
  [WORK_STATUS.SICK_LEAVE]: "🛌",
  [WORK_STATUS.HOLIDAY]: "🎌",
  [WORK_STATUS.ABSENT]: "❌",
  [WORK_STATUS.LATE_EARLY]: "⚠️",
};

// Định nghĩa ngưỡng thời gian cho phép trễ/sớm (phút)
const TIME_THRESHOLDS = {
  LATE_THRESHOLD: 5, // Số phút cho phép đi muộn
  EARLY_THRESHOLD: 5, // Số phút cho phép về sớm
};

// Calculate work status based on attendance logs
export const calculateWorkStatus = async (date) => {
  try {
    // Get active shift
    const activeShift = await getActiveShift();
    if (!activeShift || !activeShift.startTime) {
      console.log("No active shift found, cannot calculate work status");
      return {
        status: WORK_STATUS.NOT_UPDATED,
        statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Không có ca làm việc được áp dụng",
      };
    }

    // Get attendance logs for the date
    const logs = await getAttendanceLogs(date);
    if (!logs || logs.length === 0) {
      console.log("No attendance logs found for the date");

      // Kiểm tra xem ngày này có phải ngày nghỉ lễ, phép, bệnh không
      // Logic này sẽ cần cập nhật khi có thêm tính năng quản lý nghỉ phép/bệnh/lễ
      // Hiện tại chúng ta chỉ đánh dấu là chưa cập nhật

      return {
        status: WORK_STATUS.NOT_UPDATED,
        statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Không có dữ liệu chấm công",
      };
    }

    // Find relevant logs
    const goWorkLog = logs.find((log) => log.type === "go_work");
    const checkInLog = logs.find((log) => log.type === "check_in");
    const checkOutLog = logs.find((log) => log.type === "check_out");
    const completeLog = logs.find((log) => log.type === "complete");

    // Kiểm tra thiếu chấm công
    if (goWorkLog && !checkInLog && !checkOutLog) {
      return {
        status: WORK_STATUS.MISSING_CHECKIN,
        statusDisplay: STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Đã bấm nút đi làm nhưng thiếu chấm công vào/ra",
        goWorkTime: new Date(goWorkLog.timestamp).toLocaleTimeString(),
      };
    }

    // Thiếu chấm công ra
    if ((goWorkLog || checkInLog) && !checkOutLog) {
      return {
        status: WORK_STATUS.MISSING_CHECKIN,
        statusDisplay: STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Thiếu chấm công ra",
        checkInTime: checkInLog
          ? new Date(checkInLog.timestamp).toLocaleTimeString()
          : null,
        goWorkTime: goWorkLog
          ? new Date(goWorkLog.timestamp).toLocaleTimeString()
          : null,
      };
    }

    // Parse shift times
    const [startHours, startMinutes] = activeShift.startTime
      .split(":")
      .map(Number);
    const [officeEndHours, officeEndMinutes] = activeShift.officeEndTime
      .split(":")
      .map(Number);

    // Create Date objects for shift times
    const shiftStartTime = new Date(date);
    shiftStartTime.setHours(startHours, startMinutes, 0, 0);

    const shiftEndTime = new Date(date);
    shiftEndTime.setHours(officeEndHours, officeEndMinutes, 0, 0);

    // Calculate standard work time (in hours)
    const standardWorkTime = (shiftEndTime - shiftStartTime) / (1000 * 60 * 60);

    // Nếu có check-in và check-out logs, tính toán thời gian làm việc thực tế
    if (checkInLog && checkOutLog) {
      const checkInTime = new Date(checkInLog.timestamp);
      const checkOutTime = new Date(checkOutLog.timestamp);

      // Tính thời gian làm việc thực tế (theo giờ)
      const actualWorkTime = (checkOutTime - checkInTime) / (1000 * 60 * 60);

      // Kiểm tra đi muộn
      const lateMinutes = (checkInTime - shiftStartTime) / (1000 * 60);
      const isLate = lateMinutes > TIME_THRESHOLDS.LATE_THRESHOLD;

      // Kiểm tra về sớm
      const earlyMinutes = (shiftEndTime - checkOutTime) / (1000 * 60);
      const isEarly = earlyMinutes > TIME_THRESHOLDS.EARLY_THRESHOLD;

      // Tính tăng ca
      let overtime = 0;
      if (checkOutTime > shiftEndTime) {
        overtime = (checkOutTime - shiftEndTime) / (1000 * 60 * 60);
      }

      // Làm tròn giá trị
      const roundedActualWorkTime = Math.round(actualWorkTime * 10) / 10;
      const roundedOvertime = Math.round(overtime * 10) / 10;

      // Xác định trạng thái
      let status = WORK_STATUS.FULL_WORK;
      let statusDisplay = STATUS_ICONS[WORK_STATUS.FULL_WORK];
      let remarks = "Chấm công đầy đủ và đúng giờ";

      // Nếu đi muộn hoặc về sớm
      if (isLate || isEarly) {
        status = WORK_STATUS.LATE_EARLY;
        statusDisplay = STATUS_ICONS[WORK_STATUS.LATE_EARLY];

        if (isLate && isEarly) {
          remarks = `Vào muộn ${Math.round(
            lateMinutes
          )} phút & Ra sớm ${Math.round(earlyMinutes)} phút`;
        } else if (isLate) {
          remarks = `Vào muộn ${Math.round(lateMinutes)} phút`;
        } else {
          remarks = `Ra sớm ${Math.round(earlyMinutes)} phút`;
        }
      }

      // Nếu có tăng ca đáng kể (hơn 30 phút)
      if (overtime >= 0.5) {
        remarks +=
          overtime >= 0.5 ? ` Tăng ca ${Math.round(overtime * 60)} phút` : "";
      }

      return {
        status,
        statusDisplay,
        totalWorkTime: roundedActualWorkTime,
        overtime: roundedOvertime,
        remarks,
        checkInTime: checkInTime.toLocaleTimeString(),
        checkOutTime: checkOutTime.toLocaleTimeString(),
        isLate,
        isEarly,
        lateMinutes: isLate ? Math.round(lateMinutes) : 0,
        earlyMinutes: isEarly ? Math.round(earlyMinutes) : 0,
      };
    } else if (checkInLog && !checkOutLog) {
      // Chỉ chấm công vào, chưa chấm công ra
      const checkInTime = new Date(checkInLog.timestamp);

      return {
        status: WORK_STATUS.MISSING_CHECKIN,
        statusDisplay: STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Đã chấm công vào nhưng chưa chấm công ra",
        checkInTime: checkInTime.toLocaleTimeString(),
      };
    } else if (goWorkLog && !checkInLog) {
      // Chỉ bấm đi làm
      return {
        status: WORK_STATUS.MISSING_CHECKIN,
        statusDisplay: STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN],
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Đã bấm nút đi làm nhưng chưa chấm công vào",
        goWorkTime: new Date(goWorkLog.timestamp).toLocaleTimeString(),
      };
    }

    // Trường hợp còn lại - không xác định
    return {
      status: WORK_STATUS.NOT_UPDATED,
      statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
      totalWorkTime: 0,
      overtime: 0,
      remarks: "Trạng thái làm việc không xác định",
    };
  } catch (error) {
    console.error("Error calculating work status:", error);
    return {
      status: WORK_STATUS.NOT_UPDATED,
      statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
      totalWorkTime: 0,
      overtime: 0,
      remarks: "Lỗi khi tính toán trạng thái làm việc",
    };
  }
};

// Cập nhật trạng thái làm việc dựa trên log mới
export const updateWorkStatusForNewLog = async (date, logType) => {
  try {
    // Lấy trạng thái làm việc hiện tại
    let workStatus = (await getDailyWorkStatus(date)) || {
      status: WORK_STATUS.NOT_UPDATED,
      statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
      totalWorkTime: 0,
      overtime: 0,
      remarks: "Chưa cập nhật",
    };

    // Cập nhật trạng thái dựa trên loại log
    switch (logType) {
      case "go_work":
        workStatus.status = WORK_STATUS.MISSING_CHECKIN;
        workStatus.statusDisplay = STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN];
        workStatus.remarks = "Đã bấm nút đi làm";
        break;
      case "check_in":
        workStatus.status = WORK_STATUS.MISSING_CHECKIN;
        workStatus.statusDisplay = STATUS_ICONS[WORK_STATUS.MISSING_CHECKIN];
        workStatus.remarks = "Đã chấm công vào";
        break;
      case "check_out":
        // Tính toán lại toàn bộ trạng thái làm việc dựa trên check-in và check-out
        workStatus = await calculateWorkStatus(date);
        break;
      case "complete":
        // Tính toán đầy đủ trạng thái làm việc
        workStatus = await calculateWorkStatus(date);
        break;
    }

    // Cập nhật trạng thái làm việc trong CSDL
    await updateDailyWorkStatus(date, workStatus);

    return workStatus;
  } catch (error) {
    console.error("Error updating work status for new log:", error);
    return null;
  }
};

// Tính toán trạng thái làm việc cho một tuần
export const calculateWeeklyStatus = async (startDate, endDate) => {
  try {
    const result = {};

    // Chuyển đổi thành objects Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Lặp qua từng ngày trong tuần
    for (
      let day = new Date(start);
      day <= end;
      day.setDate(day.getDate() + 1)
    ) {
      const dateStr = day.toISOString().split("T")[0];

      // Lấy trạng thái làm việc của ngày từ DB
      const dailyStatus = await getDailyWorkStatus(dateStr);

      if (dailyStatus) {
        result[dateStr] = dailyStatus;
      } else {
        // Nếu không có dữ liệu, đặt trạng thái mặc định
        result[dateStr] = {
          status: WORK_STATUS.NOT_UPDATED,
          statusDisplay: STATUS_ICONS[WORK_STATUS.NOT_UPDATED],
          totalWorkTime: 0,
          overtime: 0,
          remarks: "Chưa cập nhật",
        };
      }
    }

    return result;
  } catch (error) {
    console.error("Error calculating weekly status:", error);
    return {};
  }
};

// Xác định ngày nghỉ lễ
export const isHoliday = (date) => {
  // Triển khai logic kiểm tra ngày nghỉ lễ ở đây
  // Có thể sử dụng API bên ngoài hoặc danh sách cố định
  return false;
};

// Xác định nghỉ phép/bệnh
export const getLeaveStatus = async (date) => {
  // Triển khai logic lấy trạng thái nghỉ phép/bệnh từ DB
  // Trả về null nếu không có, LEAVE hoặc SICK_LEAVE nếu có
  return null;
};
