const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3/search";

// ---- Types ----

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  thumbnailUrl: string;
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

// ---- Fetch ----

export async function searchVideos(query: string): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY || "";
  if (!apiKey) return [];
  if (!query) return [];

  try {
    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      regionCode: "JP",
      relevanceLanguage: "ja",
      maxResults: "20",
      key: apiKey,
    });

    const res = await fetch(`${YOUTUBE_API_BASE}?${params}`, {
      next: { revalidate: 1800 },
    });

    if (!res.ok) return [];

    const data: YouTubeSearchResponse = await res.json();
    return (data.items || [])
      .filter((item): item is YouTubeSearchItem & { id: { videoId: string } } =>
        Boolean(item.id?.videoId),
      )
      .map(mapItem);
  } catch {
    return [];
  }
}

// ---- Mapping ----

function mapItem(
  item: YouTubeSearchItem & { id: { videoId: string } },
): YouTubeVideo {
  const snippet = item.snippet;
  return {
    videoId: item.id.videoId,
    title: snippet?.title || "",
    description: snippet?.description || "",
    channelTitle: snippet?.channelTitle || "",
    channelId: snippet?.channelId || "",
    publishedAt: snippet?.publishedAt || "",
    thumbnail:
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.default?.url ||
      "",
    thumbnailUrl:
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.default?.url ||
      "",
  };
}

// ---- Helpers ----

export function getYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getChannelUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}`;
}

export function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
