import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const {
    q = "",
    dateFrom = "",
    dateTo = "",
    page = "1",
    limit = "24",
  } = req.query;

  // Nếu chưa config MongoDB, trả demo data
  const client = await clientPromise;
  if (!client) {
    return res.status(200).json({
      videos: DEMO_DATA,
      total: DEMO_DATA.length,
      page: 1,
      totalPages: 1,
    });
  }

  const db = client.db(process.env.MONGODB_DB || "chevereto");
  const col = db.collection(process.env.MONGODB_COLLECTION || "media");

  const filter = { type: "video" };

  if (q.trim()) {
    filter.$or = [
      { title: { $regex: q.trim(), $options: "i" } },
      { description: { $regex: q.trim(), $options: "i" } },
    ];
  }

  if (dateFrom || dateTo) {
    filter.crawledAt = {};
    if (dateFrom) filter.crawledAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      filter.crawledAt.$lte = end;
    }
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(48, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [videos, total] = await Promise.all([
    col
      .find(filter, {
        projection: { src: 1, poster: 1, title: 1, description: 1, crawledAt: 1, sourceUrl: 1 },
      })
      .sort({ crawledAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    col.countDocuments(filter),
  ]);

  res.status(200).json({
    videos: videos.map((v) => ({
      ...v,
      _id: v._id.toString(),
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
}

// Demo data khi chưa có MongoDB
const DEMO_DATA = [
  {
    _id: "69d4d302b9d82d15f211dd81",
    title: "6937039888798",
    description: "Watch video: 6937039888798",
    poster: "https://s4.zpicdn.lol/bJzCeiFG.fr.jpeg",
    src: "https://s4.zpicdn.lol/bJzCeiFG.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-bJzCeiFG.2W8oFy",
    crawledAt: "2026-04-07T09:48:50.251Z",
    type: "video",
  },
  {
    _id: "69d4d303b9d82d15f211dd82",
    title: "Video 2019800",
    description: "Watch video: Video 2019800",
    poster: "https://s4.zpicdn.lol/5RdklKLR.fr.jpeg",
    src: "https://s4.zpicdn.lol/5RdklKLR.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-5RdklKLR.27hl3T",
    crawledAt: "2026-04-07T09:48:51.063Z",
    type: "video",
  },
  {
    _id: "69d4d303b9d82d15f211dd83",
    title: "Video 2019793",
    description: "Watch video: Video 2019793",
    poster: "https://s4.zpicdn.lol/vZEtNvQ.fr.jpeg",
    src: "https://s4.zpicdn.lol/vZEtNvQ.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-vZEtNvQ.27h3AO",
    crawledAt: "2026-04-07T09:48:51.366Z",
    type: "video",
  },
  {
    _id: "69d4d306b9d82d15f211dd84",
    title: "Video 2017236",
    description: "Watch video: Video 2017236",
    poster: "https://s4.zpicdn.lol/nAbPIlGy.fr.jpeg",
    src: "https://s4.zpicdn.lol/nAbPIlGy.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-nAbPIlGy.24qqxq",
    crawledAt: "2026-04-07T09:48:54.785Z",
    type: "video",
  },
  {
    _id: "69d4d309b9d82d15f211dd85",
    title: "Video 2017279",
    description: "Watch video: Video 2017279",
    poster: "https://s4.zpicdn.lol/0I6s0hnV.fr.jpeg",
    src: "https://s4.zpicdn.lol/0I6s0hnV.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-0I6s0hnV.24rBbd",
    crawledAt: "2026-04-07T09:48:56.935Z",
    type: "video",
  },
];
