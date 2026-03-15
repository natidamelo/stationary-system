export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.DB_URL || 'mongodb://localhost:27017/stationery_management',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  upload: {
    dest: process.env.UPLOAD_DIR || './uploads',
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10), // 5MB
  },
});
