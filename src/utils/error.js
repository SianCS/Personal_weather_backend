// แปลง error แต่ละแบบให้เป็น HTTP status ที่ถูกต้อง
// (err.code ของ Prisma/axios เป็น string เช่น "P2002", "ERR_BAD_REQUEST" ใช้เป็น status ไม่ได้)
const resolveError = (err) => {
  if (Number.isInteger(err.statusCode)) {
    return { status: err.statusCode, message: err.message };
  }

  // Prisma: unique constraint
  if (err.code === "P2002") {
    return { status: 409, message: "Data already exists" };
  }

  // axios: error จาก OpenWeatherMap
  if (err.isAxiosError) {
    if (err.response?.status === 404) {
      return { status: 404, message: "Location not found" };
    }
    return { status: 502, message: "Weather service is unavailable" };
  }

  return { status: 500, message: "Something Wrong !!!" };
};

const error = (err, req, res, next) => {
  console.error(err);
  const { status, message } = resolveError(err);
  res.status(status).json({ message });
};

export default error;
