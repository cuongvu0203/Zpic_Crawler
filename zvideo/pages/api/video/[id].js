import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

const DEMO = {
  "69d4d302b9d82d15f211dd81": {
    _id: "69d4d302b9d82d15f211dd81",
    title: "6937039888798",
    description: "Watch video: 6937039888798",
    poster: "https://s4.zpicdn.lol/bJzCeiFG.fr.jpeg",
    src: "https://s4.zpicdn.lol/bJzCeiFG.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-bJzCeiFG.2W8oFy",
    crawledAt: "2026-04-07T09:48:50.251Z",
    type: "video",
  },
  "69d4d303b9d82d15f211dd82": {
    _id: "69d4d303b9d82d15f211dd82",
    title: "Video 2019800",
    description: "Watch video: Video 2019800",
    poster: "https://s4.zpicdn.lol/5RdklKLR.fr.jpeg",
    src: "https://s4.zpicdn.lol/5RdklKLR.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-5RdklKLR.27hl3T",
    crawledAt: "2026-04-07T09:48:51.063Z",
    type: "video",
  },
  "69d4d303b9d82d15f211dd83": {
    _id: "69d4d303b9d82d15f211dd83",
    title: "Video 2019793",
    description: "Watch video: Video 2019793",
    poster: "https://s4.zpicdn.lol/vZEtNvQ.fr.jpeg",
    src: "https://s4.zpicdn.lol/vZEtNvQ.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-vZEtNvQ.27h3AO",
    crawledAt: "2026-04-07T09:48:51.366Z",
    type: "video",
  },
  "69d4d306b9d82d15f211dd84": {
    _id: "69d4d306b9d82d15f211dd84",
    title: "Video 2017236",
    description: "Watch video: Video 2017236",
    poster: "https://s4.zpicdn.lol/nAbPIlGy.fr.jpeg",
    src: "https://s4.zpicdn.lol/nAbPIlGy.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-nAbPIlGy.24qqxq",
    crawledAt: "2026-04-07T09:48:54.785Z",
    type: "video",
  },
  "69d4d309b9d82d15f211dd85": {
    _id: "69d4d309b9d82d15f211dd85",
    title: "Video 2017279",
    description: "Watch video: Video 2017279",
    poster: "https://s4.zpicdn.lol/0I6s0hnV.fr.jpeg",
    src: "https://s4.zpicdn.lol/0I6s0hnV.mp4",
    sourceUrl: "https://zpic.biz/view/videoanhmoe-0I6s0hnV.24rBbd",
    crawledAt: "2026-04-07T09:48:56.935Z",
    type: "video",
  },
};

export default async function handler(req, res) {
  const { id } = req.query;

  const client = await clientPromise;
  if (!client) {
    const demo = DEMO[id];
    if (!demo) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(demo);
  }

  const db = client.db(process.env.MONGODB_DB || "chevereto");
  const col = db.collection(process.env.MONGODB_COLLECTION || "media");

  let video;
  try {
    video = await col.findOne({ _id: new ObjectId(id) });
  } catch {
    return res.status(404).json({ error: "Not found" });
  }

  if (!video) return res.status(404).json({ error: "Not found" });

  res.status(200).json({ ...video, _id: video._id.toString() });
}
