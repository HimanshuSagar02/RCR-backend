import Attendance from "../models/attendanceModel.js";
import Course from "../models/courseModel.js";
import User from "../models/userModel.js";

const ensureEducatorForCourse = async (courseId, userId) => {
  const course = await Course.findById(courseId);
  if (!course) throw { status: 404, message: "Course not found" };
  const user = await User.findById(userId);
  if (user?.role === "admin") return course;
  if (course.creator.toString() !== userId.toString()) {
    throw { status: 403, message: "Educator access required" };
  }
  return course;
};

export const markAttendance = async (req, res) => {
  try {
    const { courseId, lectureId, date, records } = req.body;
    if (!courseId || !date || !Array.isArray(records)) {
      return res.status(400).json({ message: "courseId, date, records required" });
    }
    await ensureEducatorForCourse(courseId, req.userId);
    const day = new Date(date);
    
    // Normalize date to start of day for comparison
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Check if attendance already exists for this course and date
    const existingAttendance = await Attendance.findOne({
      courseId,
      date: { $gte: dayStart, $lte: dayEnd },
      ...(lectureId && { lectureId }),
    });

    if (existingAttendance) {
      return res.status(200).json({
        message: "Attendance for this date has already been recorded",
        alreadyExists: true,
        attendance: existingAttendance,
      });
    }

    const attendance = await Attendance.create({
      courseId,
      lectureId,
      educatorId: req.userId,
      date: day,
      records,
    });
    
    return res.status(201).json({
      message: "Attendance recorded successfully",
      alreadyExists: false,
      attendance,
    });
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({ message: error?.message || `Mark failed: ${error}` });
  }
};

export const listCourseAttendance = async (req, res) => {
  try {
    const { courseId } = req.params;
    const records = await Attendance.find({ courseId })
      .populate("records.studentId", "name email")
      .sort({ date: -1 });
    return res.status(200).json(records);
  } catch (error) {
    return res.status(500).json({ message: `Fetch attendance failed: ${error}` });
  }
};

export const listMyAttendance = async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = { "records.studentId": req.userId };
    if (courseId) filter.courseId = courseId;
    const records = await Attendance.find(filter).sort({ date: -1 });
    // flatten to student view
    const mine = records.map((rec) => {
      const r = rec.records.find((x) => x.studentId.toString() === req.userId.toString());
      return { _id: rec._id, courseId: rec.courseId, date: rec.date, status: r?.status };
    });
    return res.status(200).json(mine);
  } catch (error) {
    return res.status(500).json({ message: `Fetch my attendance failed: ${error}` });
  }
};

export const listAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate("courseId", "title")
      .populate("records.studentId", "name email")
      .sort({ date: -1 });
    return res.status(200).json(records);
  } catch (error) {
    return res.status(500).json({ message: `Fetch attendance failed: ${error}` });
  }
};

