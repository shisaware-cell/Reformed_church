export interface User {
  id: string; name: string; email: string;
  profile_image_url?: string; role: 'member' | 'admin'; created_at: string;
}
export interface Article {
  id: string; title: string; subtitle?: string; body?: string; body_html?: string;
  cover_image_url?: string; author_name?: string; category?: string;
  read_time_minutes?: number; is_hero?: boolean; is_published: boolean;
  article_url?: string; external_url?: string; created_at: string;
}
export interface Announcement {
  id: string; title: string; subtitle?: string; content: string;
  image_url?: string; is_published: boolean; created_at: string;
}
export interface Event {
  id: string; title: string; subtitle?: string; description?: string;
  location?: string; event_date: string; end_date?: string;
  image_url?: string; category?: string; is_published: boolean; created_at: string;
}
export interface Sermon {
  id: string; title: string; subtitle?: string; pastor_name: string;
  pastor_image_url?: string; description?: string; audio_url?: string;
  thumbnail_url?: string; duration_seconds?: number; series_name?: string;
  scripture_reference?: string; is_published: boolean; created_at: string;
}
export interface Song {
  id: string;
  title: string;
  artist_name?: string;
  description?: string;
  file_url?: string;
  cover_image_url?: string;
  duration_seconds?: number;
  is_published: boolean;
  created_at: string;
}
export interface Teaching {
  id: string;
  title: string;
  topic?: string;
  description?: string;
  media_url?: string;
  media_type?: 'audio' | 'video';
  thumbnail_url?: string;
  is_published: boolean;
  created_at: string;
}
export interface Post {
  id: string; user_id: string; content: string; image_url?: string;
  likes_count: number; comments_count?: number; is_hidden: boolean; created_at: string; updated_at?: string;
  users?: User; user?: { name: string; profile_image_url?: string };
}
export interface PostComment {
  id: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  content: string;
  created_at: string;
  user?: { name: string; profile_image_url?: string };
}
export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  content: string;
  created_at: string;
  user?: User;
  replies?: Comment[];
}
export interface Message {
  id: string; user_id: string; content?: string; image_url?: string;
  is_deleted: boolean; created_at: string; users?: User;
  user?: { name: string; profile_image_url?: string };
}
export interface Note {
  id: string; user_id: string; title: string; body: string;
  sermon_id?: string; scripture_reference?: string; tags?: string[];
  created_at: string; updated_at: string; sermons?: Sermon;
}
