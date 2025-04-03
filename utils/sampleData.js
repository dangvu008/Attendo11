import { generateId } from "./idGenerator";

// Hàm tạo dữ liệu mẫu
export const generateSampleData = async () => {
  try {
    // 1. Tạo ca làm việc mẫu
    const sampleShifts = [
      {
        id: generateId(),
        name: "Ca sáng - Văn phòng",
        departureTime: "07:30",
        startTime: "08:00",
        officeEndTime: "17:00",
        endTime: "17:30",
        remindBeforeStart: 15,
        remindAfterEnd: 15,
        showSignButton: true,
        daysApplied: [false, true, true, true, true, true, false],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "Ca chiều - Văn phòng",
        departureTime: "13:30",
        startTime: "14:00",
        officeEndTime: "22:00",
        endTime: "22:30",
        remindBeforeStart: 15,
        remindAfterEnd: 15,
        showSignButton: true,
        daysApplied: [false, true, true, true, true, true, false],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "Ca làm việc từ xa",
        departureTime: "08:30",
        startTime: "09:00",
        officeEndTime: "17:00",
        endTime: "17:30",
        remindBeforeStart: 10,
        remindAfterEnd: 5,
        showSignButton: false,
        daysApplied: [false, true, true, true, true, false, false],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 2. Tạo nhật ký chấm công mẫu cho ngày hôm nay
    const today = new Date().toISOString().split("T")[0];
    const sampleLogs = [
      {
        id: generateId(),
        date: today,
        type: "go_work",
        timestamp: (() => {
          const date = new Date();
          date.setHours(7, 50, 0, 0);
          return date.toISOString();
        })(),
      },
      {
        id: generateId(),
        date: today,
        type: "check_in",
        timestamp: (() => {
          const date = new Date();
          date.setHours(8, 5, 0, 0);
          return date.toISOString();
        })(),
      },
    ];

    // 3. Tạo ghi chú mẫu
    const sampleNotes = [
      {
        id: generateId(),
        title: "Họp nhóm hàng tuần",
        content:
          "Thứ 2 hàng tuần lúc 9:00 AM, cần chuẩn bị báo cáo tiến độ dự án.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminderTime: null,
        daysToShow: [1, 2, 3, 4, 5],
      },
      {
        id: generateId(),
        title: "Nộp báo cáo tháng",
        content: "Cần chuẩn bị báo cáo tháng, hạn chót ngày 30 mỗi tháng.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminderTime: null,
        daysToShow: [1, 2, 3, 4, 5],
      },
    ];

    // 4. Tạo trạng thái làm việc mẫu
    const sampleWorkStatus = {
      status: "Đang làm việc",
      totalWorkTime: 0,
      overtime: 0,
      remarks: "Đã chấm công vào",
    };

    return {
      shifts: sampleShifts,
      logs: sampleLogs,
      notes: sampleNotes,
      workStatus: sampleWorkStatus,
    };
  } catch (error) {
    console.error("Lỗi khi tạo dữ liệu mẫu:", error);
    return null;
  }
};
