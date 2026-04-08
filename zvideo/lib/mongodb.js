import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

let clientPromise;

if (!uri || uri.trim() === "") {
  // Không có URI → API routes sẽ dùng demo data
  clientPromise = Promise.resolve(null);
} else if (process.env.NODE_ENV === "development") {
  // Dev: global cache tránh tạo nhiều connection khi hot-reload
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect().catch((err) => {
      console.error("[MongoDB] Kết nối thất bại:", err.message);
      return null;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production (Vercel serverless)
  const client = new MongoClient(uri, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
  clientPromise = client.connect().catch((err) => {
    console.error("[MongoDB] Kết nối thất bại:", err.message);
    return null;
  });
}

export default clientPromise;
