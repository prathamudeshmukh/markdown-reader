export interface Comment {
  id: string;
  docSlug: string;
  userId: string | null;
  authorName: string;
  content: string;
  anchorText: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  content: string;
  authorName: string;
  anchorText: string | null;
}

export interface ResolveCommentInput {
  resolved: boolean;
}
